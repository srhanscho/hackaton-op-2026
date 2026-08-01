# 🔬 SPIKE — 8:00 a 8:45am

**Objetivo único:** responder una pregunta con un `console.log`, no con una opinión.

> ¿Pueden **varios remitentes distintos** pagar contra **un mismo incoming payment** y ver acumular el `receivedAmount`?

Todo el producto se apoya en esto. Si funciona, el resto del día es construcción. Si no funciona, cambiamos de arquitectura a las 8:45 y perdimos 45 minutos en vez de 5 horas.

**No abran el editor de UI hasta que esto esté resuelto.** Los dos en el mismo computador.

---

## Antes de empezar (debería estar listo de anoche)

5 wallets en https://wallet.interledger-test.dev, todas fondeadas, con keys descargadas:

| Rol | Moneda | Variable |
|---|---|---|
| Restaurante | COP | `RESTAURANTE` |
| Amigo 1 | COP | `AMIGO1` |
| Amigo 2 | COP | `AMIGO2` |
| Amigo 3 | COP | `AMIGO3` |
| Amigo viajero | EUR | `VIAJERO` |

Para cada una necesitan los tres datos juntos: **walletAddress** (con `https://`, no `$`), **keyId**, y la ruta al archivo **`.key`**. Mezclar el keyId de una con la key de otra es la causa del 90% de los `401 invalid_client`.

---

## El experimento — `spike.js`

Un solo archivo. Sin frameworks. Sin UI. Corre con `node spike.js`.

### Paso 1 — Leer las wallets (2 min)

```js
const restaurante = await client.walletAddress.get({ url: RESTAURANTE_WALLET })
console.log(restaurante.assetCode, restaurante.assetScale)
```

**Qué confirma:** que las keys sirven y que saben la escala real de COP. Anótenla — la van a necesitar todo el día y **no la deben hardcodear**.

### Paso 2 — Crear UN incoming payment con monto objetivo (5 min)

En la wallet del **restaurante**, con `incomingAmount` = el total de la cuenta (ej. 90.000 COP en su escala).

```js
const incoming = await client.incomingPayment.create(
  { url: restaurante.resourceServer, accessToken: token },
  {
    walletAddress: RESTAURANTE_WALLET,
    incomingAmount: { value: "9000000", assetCode: "COP", assetScale: 2 },
    metadata: { descripcion: "Almuerzo La Vaca" }
  }
)
console.log(incoming.id, incoming.receivedAmount)
```

**Guarden ese `incoming.id`.** Es la URL contra la que van a pagar todos.

### Paso 3 — Amigo 1 paga una parte (15 min) ⭐

Este es el paso que de verdad importa. Amigo 1 paga **30.000**, no los 90.000.

1. Grant de `quote` (no interactivo) desde el AS de Amigo 1
2. Crear quote con `receiver = incoming.id` y `debitAmount = 30.000`
3. Grant de `outgoing-payment` **interactivo**
4. Abrir el `interact.redirect` en el navegador → **Accept**
5. `grant.continue` con el `interact_ref`
6. Crear el outgoing payment

**Para el spike está bien copiar y pegar el `interact_ref` a mano.** Automatizarlo es tarea de las 10am, no de ahora.

### Paso 4 — LA PREGUNTA (5 min) 🎯

```js
const estado = await client.incomingPayment.get({ url: incoming.id, accessToken: token })
console.log("recibido:", estado.receivedAmount)
console.log("completado:", estado.completed)
```

**✅ Si `receivedAmount` dice 30.000 y `completed` es `false` → PLAN A. Sigan al paso 5.**

**❌ Si el pago falló, rebotó, o el incoming se cerró de una → PLAN B. Salten al final.**

### Paso 5 — Amigo 2 paga sobre el mismo incoming (10 min) 🎯🎯

Repitan el paso 3 con las credenciales de **Amigo 2**, mismo `incoming.id`, otros 30.000.

Luego vuelvan a consultar:

```js
// esperado: receivedAmount = 60.000, completed = false
```

**Si acumuló a 60.000 → confirmado. El fan-in funciona. Ese es el corazón del producto y ya está probado a las 8:45.**

### Paso 6 — Cross-currency, si sobran minutos (5 min)

Un quote desde la wallet **EUR** contra el mismo incoming payment en COP. No hace falta ejecutar el pago — con ver que el quote devuelve un `debitAmount` en EUR y un `receiveAmount` en COP ya saben que la conversión funciona.

Si esto responde bien, su diferenciador #1 está garantizado y pueden prometerlo en el pitch sin nervios.

---

## 🚦 Decisión a las 8:45 — se toma y no se revisa

### PLAN A — el fan-in funcionó
Un incoming payment por cuenta. Todos pagan contra él. El backend solo consulta `receivedAmount` y lo divide por `incomingAmount` para la barra.

### PLAN B — no funcionó
Un incoming payment **por participante** en la wallet del restaurante. El backend guarda los N ids y suma los `receivedAmount` para calcular el porcentaje.

**Cuesta ~20 líneas más y en pantalla se ve exactamente igual.** El demo no pierde nada — la barra sube igual, la cuenta se cierra igual. Solo cambia la narrativa técnica del pitch: en vez de "convergieron sobre un mismo incoming payment", dicen "coordinamos N pagos independientes y los liquidamos como una sola cuenta". Sigue siendo más de lo que va a mostrar cualquier otro equipo.

**Lo que NO pueden hacer a las 11am es seguir debatiendo cuál plan usar.** Escriban la decisión en el README, en una línea, y sigan.

---

## Errores que se van a encontrar y qué significan

| Error | Causa real |
|---|---|
| `401 invalid_client` | walletAddress, keyId y `.key` no son del mismo wallet |
| `invalid signature` | lo mismo de arriba |
| El quote falla | el `receiver` no es la URL completa del incoming payment |
| Montos absurdos (×100, ÷100) | hardcodearon el `assetScale` en vez de leerlo |
| El grant no continúa | mezclaron un `continue.access_token` viejo con un `interact_ref` nuevo — regeneren los dos juntos |
| El outgoing rebota | el quote caducó, regeneren desde el quote |
