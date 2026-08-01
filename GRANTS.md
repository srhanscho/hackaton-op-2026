# GRANTS — guía para Camilo (backend)

> **El error más común es pedirle el grant al auth server equivocado.**
> Cada grant va a un auth server distinto, y ese auth server sale de hacerle
> `GET` a la wallet address correspondiente. Si te equivocas ahí, el error que
> devuelve no te dice nada útil.

## Los 3 grants de un vistazo

| Grant | A qué auth server | ¿Interactivo? | Cuándo |
|---|---|---|---|
| `incoming-payment` | El del **restaurante** (quien recibe) | NO | Al crear la vaca |
| `quote` | El del **amigo** (quien paga) | NO | Cuando el amigo pulsa Pagar |
| `outgoing-payment` | El del **amigo** (quien paga) | **SÍ** | Justo después del quote |

**Regla mental:** recibir plata no necesita permiso de nadie — por eso los dos
primeros son automáticos. Sacar plata de una cuenta **siempre** necesita que el
dueño diga que sí — por eso el tercero abre una pantalla.

---

## De dónde sale cada auth server

```js
const restaurante = await client.walletAddress.get({ url: RESTAURANTE_WALLET })
const amigo       = await client.walletAddress.get({ url: AMIGO_WALLET })

restaurante.authServer      // grant de incoming-payment
restaurante.resourceServer  // aquí se CREA el incoming payment
restaurante.assetCode       // "COP"
restaurante.assetScale      // 2   <- LEER SIEMPRE, nunca hardcodear

amigo.authServer            // grants de quote Y outgoing
amigo.resourceServer        // aquí se crean el quote y el outgoing
```

---

## GRANT 1 — incoming-payment

**Cuándo:** al crear la vaca (`POST /api/bills`). No interactivo.

```js
const grant = await client.grant.request(
  { url: restaurante.authServer },
  {
    access_token: {
      access: [{
        type: "incoming-payment",
        actions: ["create", "read", "complete"],
        identifier: RESTAURANTE_WALLET
      }]
    }
  }
)

const token = grant.access_token.value
```

> ⚠️ **Incluye `"complete"` en las actions.** Es lo que después deja cerrar la
> cuenta con el botón Enviar. Si se te olvida ahora, a las 2pm el botón te va a
> dar 403 y toca rehacer el grant.

**Guarda ese token.** Lo usas tres veces: crear el incoming payment, consultar
el `receivedAmount` en cada polling, y el `complete` final.

### Crear el incoming payment

```js
const incoming = await client.incomingPayment.create(
  { url: restaurante.resourceServer, accessToken: token },
  {
    walletAddress: RESTAURANTE_WALLET,
    incomingAmount: {
      value: String(total * 10 ** restaurante.assetScale), // 90000 -> "9000000"
      assetCode: restaurante.assetCode,
      assetScale: restaurante.assetScale
    },
    metadata: { descripcion: "La Vaca" }
  }
)

incoming.id  // la URL contra la que van a pagar TODOS los amigos
```

---

## GRANT 2 — quote

**Cuándo:** el amigo pulsa Pagar (`POST /api/bills/:id/pay`). No interactivo.

```js
const quoteGrant = await client.grant.request(
  { url: amigo.authServer },          // OJO: el del AMIGO
  { access_token: { access: [{ type: "quote", actions: ["create", "read"] }] } }
)

const quote = await client.quote.create(
  { url: amigo.resourceServer, accessToken: quoteGrant.access_token.value },
  {
    walletAddress: AMIGO_WALLET,
    receiver: incoming.id,
    method: "ilp",
    debitAmount: {
      value: String(monto * 10 ** amigo.assetScale),
      assetCode: amigo.assetCode,
      assetScale: amigo.assetScale
    }
  }
)

quote.id            // guardar
quote.debitAmount   // lo que le sale al amigo EN SU MONEDA
quote.receiveAmount // lo que llega al restaurante EN COP
```

> 🌍 **El cross-currency ocurre solo aquí.** Si el amigo tiene wallet en EUR, el
> `debitAmount` sale en EUR y el `receiveAmount` en COP. Guarda los dos en el
> participante — son los que Han's necesita para pintar la conversión.

---

## GRANT 3 — outgoing-payment (el interactivo)

**Cuándo:** justo después del quote, en la misma petición.
No devuelve token: devuelve una URL para mandar al usuario.

```js
const nonce = crypto.randomUUID()

const outGrant = await client.grant.request(
  { url: amigo.authServer },
  {
    access_token: {
      access: [{
        type: "outgoing-payment",
        actions: ["create", "read"],
        identifier: AMIGO_WALLET,          // obligatorio en outgoing
        limits: {
          receiver: incoming.id,
          debitAmount: quote.debitAmount   // el objeto tal cual del quote
        }
      }]
    },
    interact: {
      start: ["redirect"],
      finish: { method: "redirect", uri: `${BASE_URL}/callback?nonce=${nonce}`, nonce }
    }
  }
)

outGrant.interact.redirect           // -> el front manda aquí al usuario
outGrant.continue.uri                // -> GUARDAR
outGrant.continue.access_token.value // -> GUARDAR
```

**Guarda en el `Map`, con el `nonce` como llave:**

```js
sesiones.set(nonce, {
  billId,
  participanteId,
  continueUri:   outGrant.continue.uri,
  continueToken: outGrant.continue.access_token.value,
  quoteId:       quote.id,
  amigoWallet:   AMIGO_WALLET
})
```

Devuelve al front: `{ redirectUrl: outGrant.interact.redirect }`

---

## El regreso — GET /callback

```js
app.get('/callback', async (req, res) => {
  const { nonce, interact_ref } = req.query
  const s = sesiones.get(nonce)

  // 1. Continuar el grant -> AHORA SÍ llega el access token
  const finalGrant = await client.grant.continue(
    { url: s.continueUri, accessToken: s.continueToken },
    { interact_ref }
  )

  // 2. Crear el outgoing payment
  const amigo = await client.walletAddress.get({ url: s.amigoWallet })
  const outgoing = await client.outgoingPayment.create(
    { url: amigo.resourceServer, accessToken: finalGrant.access_token.value },
    { walletAddress: s.amigoWallet, quoteId: s.quoteId }
  )

  // 3. Marcar al participante como pagado (guardar debitAmount y receiveAmount)
  // 4. Redirigir al front
  res.redirect(`${FRONT_URL}/pagar/${s.billId}/gracias`)
})
```

> ⏱️ **Entre el Pagar y el Accept no pueden pasar minutos: el quote caduca.**
> Si un amigo deja la pantalla abierta cinco minutos, ese pago falla — y es
> normal, no es bug tuyo. En el demo, que cada uno pague de una.

---

## El polling — GET /api/bills/:id

El porcentaje **no** se calcula sumando lo que crees que pagaste. Se le
pregunta a Open Payments:

```js
const estado = await client.incomingPayment.get({
  url: bill.incomingPaymentId,
  accessToken: bill.incomingToken   // el del GRANT 1
})

const recibido   = Number(estado.receivedAmount.value)
const objetivo   = Number(estado.incomingAmount.value)
const porcentaje = (recibido / objetivo) * 100
```

---

## El botón Enviar — POST /api/bills/:id/complete

```js
if (porcentaje < 100) return res.status(400).json({ error: 'Aún no está completa' })

await client.incomingPayment.complete({
  url: bill.incomingPaymentId,
  accessToken: bill.incomingToken
})
```

> **Esto NO mueve plata** — ya se movió, pago por pago. `complete` cierra el
> incoming payment en el protocolo. Si el jurado pregunta dónde estuvo el dinero
> mientras el vaso se llenaba: **nunca estuvo con nosotros, cada pago fue directo
> del amigo al restaurante.**

---

## Errores y qué significan de verdad

| Error | Causa real |
|---|---|
| `401 invalid_client` | walletAddressUrl, keyId y private key no son del MISMO wallet |
| `invalid signature` | lo mismo de arriba |
| El quote da 404 o 400 | el `receiver` no es la URL completa del incoming payment |
| `403` al hacer complete | faltó `"complete"` en las actions del GRANT 1 |
| El `grant.continue` falla | mezclaste un continue token viejo con un interact_ref nuevo |
| El outgoing rebota | el quote caducó — rehacer desde el quote |
| Montos ×100 o ÷100 | hardcodeaste el `assetScale` en vez de leerlo |
| El celular no vuelve del Accept | `BASE_URL` apunta a localhost en vez de la IP local o la URL del túnel |

---

## Orden de implementación

1. `client.js` — `createAuthenticatedClient` cacheado
2. GRANT 1 + crear incoming payment → **`POST /api/bills` ya sirve**
3. Polling con `incomingPayment.get` → **`GET /api/bills/:id` ya sirve**
4. ⭐ **AVISARLE A HAN'S AQUÍ.** Con esos dos ya puede integrar.
5. GRANT 2 + GRANT 3 + `/callback` → el flujo de pago completo
6. `complete` → el botón Enviar

> No esperes a tener los 5 endpoints para avisarle a Han's. Apenas el 2 y el 3
> respondan, avísale — él cambia un flag y sigue contra datos reales mientras tú
> haces el resto.
