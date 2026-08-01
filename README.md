# La Vaca

Divide la cuenta del restaurante y cobra cada parte de verdad: cada amigo paga desde su propia wallet directo al restaurante, y la cuenta se cierra sola cuando llega al 100%.

---

## El problema

Salen seis a comer. Hay un solo datáfono. Uno paga los $90.000 y se pasa las siguientes dos semanas persiguiendo a los otros cinco por WhatsApp.

Las apps que existen no resuelven eso. Splitwise lleva la contabilidad de quién le debe qué a quién — es una hoja de cálculo con notificaciones. **No mueve la plata.** Al final del día alguien sigue teniendo que hacer cinco transferencias a mano, o resignarse.

El problema nunca fue calcular la división. Fue cobrarla.

---

## Cómo funciona

1. **El anfitrión crea la vaca.** Pone la wallet del restaurante, el total y cuánto pone cada uno.
2. **Aparece un QR.** Se pasa por la mesa, o se manda por WhatsApp.
3. **Cada amigo escanea, elige su wallet y confirma.** La autorización ocurre en el proveedor de su wallet, no en nuestra app.
4. **La plata sale directo al restaurante.** No pasa por el anfitrión ni por nosotros.
5. **El vaso se llena en tiempo real.** Cada pago que entra lo sube. El porcentaje no es una estimación nuestra: es el `receivedAmount` que reporta Open Payments.
6. **Al 100% la cuenta se cierra** y se emite el recibo con el desglose de quién pagó qué y en qué moneda.

---

## Por qué esto solo se puede hacer con Interledger

Estas tres cosas no son detalles de implementación. Son las que hacen que el producto exista.

**Fan-in nativo.** Varios pagos salientes, desde wallets distintas y de proveedores distintos, convergen sobre **un mismo incoming payment**. El `receivedAmount` acumula solo: nadie tiene que reconciliar nada, ni sumar transferencias a mano, ni conciliar comprobantes. El restaurante ve una sola cuenta por cobrar, no seis.

**Cero custodia.** La app nunca toca el dinero. Open Payments separa la *instrucción* de pago de su *ejecución*: nosotros armamos la instrucción, el proveedor de la wallet del amigo la ejecuta después de que él la autoriza. En ningún momento hay un saldo nuestro. Por eso esto puede existir sin ser una entidad regulada — que es exactamente la razón por la que las apps de división de cuentas se quedan en llevar la cuenta.

**Cross-currency.** Un amigo de paso paga en EUR y el restaurante recibe COP. El quote hace la conversión antes de que el amigo confirme, él ve exactamente cuánto le sale en su moneda, y el vaso sube en COP igual que con todos los demás. Sin integraciones de FX, sin cuentas en cada moneda.

---

## Qué usamos de Open Payments

**Tres grants**, cada uno contra el auth server que corresponde:

| Grant | Auth server | Interactivo | Cuándo |
|---|---|---|---|
| `incoming-payment` | El del restaurante | No | Al crear la vaca |
| `quote` | El del amigo | No | Cuando el amigo pulsa Pagar |
| `outgoing-payment` | El del amigo | **Sí** | Justo después del quote |

Recibir dinero no necesita el permiso de nadie, por eso los dos primeros son automáticos. Sacar dinero de una cuenta siempre necesita que el dueño diga que sí, por eso el tercero abre la pantalla de autorización de su proveedor.

**Continuación del grant.** El grant de outgoing no devuelve un token: devuelve una URL. Mandamos ahí al amigo, él autoriza en su wallet, y su auth server lo devuelve a nuestro callback con un `interact_ref`. Con ese `interact_ref` continuamos el grant, ahí sí recibimos el access token, y creamos el outgoing payment contra el quote que ya estaba armado.

**El límite del grant es el quote.** La autorización que da el amigo está acotada al `debitAmount` exacto y al receiver exacto. No se puede cobrar de más ni cobrar a otro lado.

**`complete` para cerrar.** El botón Enviar hace `complete` sobre el incoming payment. Eso no mueve dinero — el dinero ya se movió, pago por pago, directo del amigo al restaurante. `complete` cierra la cuenta en el protocolo y dispara el recibo.

**El porcentaje no lo calculamos nosotros.** Se le pregunta al incoming payment: `receivedAmount / incomingAmount`. La fuente de verdad del vaso es la red, no nuestra memoria.

---

## Cómo correrlo

Requiere Node 20+ y wallets del [test wallet de Interledger](https://wallet.interledger-test.dev).

### Backend — puerto 3000

```bash
cd backend
npm install
cp .env.example .env    # llenar (ver abajo)
npm run dev
```

### Frontend — puerto 5173

```bash
cd frontend
npm install
npm run dev
```

### Variables de entorno

`backend/.env`:

```bash
PORT=3000

# IP local, NO localhost: si no, los celulares no pueden volver
# de la pantalla de autorización. (Windows: ipconfig)
BASE_URL=http://192.168.1.X:3000
FRONT_URL=http://192.168.1.X:5173

# Identidad de la app en Open Payments
OP_APP_WALLET=https://ilp.interledger-test.dev/vaca-app
OP_APP_KEY_ID=
OP_APP_KEY_PATH=./private.key

# Wallets del demo
DEMO_RESTAURANTE=https://ilp.interledger-test.dev/restaurante
DEMO_HANS=https://ilp.interledger-test.dev/hans
DEMO_CAMILO=https://ilp.interledger-test.dev/camilo
DEMO_VIAJERO=https://ilp.interledger-test.dev/viajero
```

`OP_APP_WALLET`, `OP_APP_KEY_ID` y la llave privada tienen que ser **de la misma wallet**. Si no coinciden, el error que devuelve el auth server es `invalid_client` y no dice mucho más.

El frontend apunta al backend con `VITE_API_URL` (por defecto `http://localhost:3000`). Para probar desde celulares, ponerlo en la misma IP local del `BASE_URL`.

---

## Stack

**Frontend** — React + TypeScript + Tailwind + Vite
**Backend** — Node + Express + TypeScript
**Pagos** — `@interledger/open-payments`

Estado en memoria, sin base de datos y sin login: la única fuente de verdad de cuánto se ha pagado es el incoming payment de Open Payments.
