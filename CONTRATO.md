# CONTRATO — La Vaca

Este archivo lo leen las DOS sesiones de Claude Code. **No se cambia sin avisar al otro.**

- **Han's** → `frontend/` (Vite + React + TS + Tailwind), puerto **5173**
- **Camilo** → `backend/` (Node + Express), puerto **3000**

Estado en memoria (un `Map`). Sin base de datos. Sin login.

---

## Endpoints — solo estos 5

### POST /api/bills

```json
// body
{
  "restaurantWallet": "https://ilp.interledger-test.dev/restaurante",
  "total": 90000,
  "participantes": [
    { "nombre": "Han's",  "monto": 30000 },
    { "nombre": "Camilo", "monto": 30000 },
    { "nombre": "Ana",    "monto": 30000 }
  ]
}
// res
{ "billId": "abc123" }
```

El backend crea el incoming payment con `incomingAmount` = total.
Los montos van en **unidades enteras de la moneda** (90000 = $90.000 COP).
El backend convierte a la escala del asset leyendo la wallet address.

### GET /api/bills/:id

```json
{
  "id": "abc123",
  "restaurantWallet": "https://...",
  "total": 90000,
  "recibido": 60000,
  "porcentaje": 66.7,
  "completado": false,
  "assetCode": "COP",
  "participantes": [
    { "id": "p1", "nombre": "Han's",  "monto": 30000, "estado": "pagado",
      "monedaPago": "COP", "montoPagado": 30000 },
    { "id": "p2", "nombre": "Camilo", "monto": 30000, "estado": "pagado",
      "monedaPago": "EUR", "montoPagado": 6.5 },
    { "id": "p3", "nombre": "Ana",    "monto": 30000, "estado": "pendiente",
      "monedaPago": null, "montoPagado": null }
  ]
}
```

`estado`: `"pendiente"` | `"procesando"` | `"pagado"`

### POST /api/bills/:id/pay

```json
// body
{ "participanteId": "p2", "walletAddress": "https://ilp.interledger-test.dev/viajero" }
// res
{ "redirectUrl": "https://auth.interledger-test.dev/4CF492..." }
```

El front hace `window.location.href = redirectUrl`.

### GET /callback?nonce=...&interact_ref=...

No lo llama el front. Lo llama el auth server.
Al terminar redirige a `FRONT_URL/pagar/:billId/gracias`.

### POST /api/bills/:id/complete

```json
{
  "recibo": {
    "billId": "abc123",
    "restaurantWallet": "https://...",
    "total": 90000,
    "assetCode": "COP",
    "fecha": "2026-08-01T14:30:00Z",
    "incomingPaymentId": "https://ilp.interledger-test.dev/.../incoming-payments/uuid",
    "participantes": [ /* mismo shape que arriba */ ]
  }
}
```

Devuelve **400** si `porcentaje < 100`.

---

## Tipos para el frontend

```ts
export type EstadoParticipante = 'pendiente' | 'procesando' | 'pagado'

export interface Participante {
  id: string
  nombre: string
  monto: number
  estado: EstadoParticipante
  monedaPago: string | null
  montoPagado: number | null
}

export interface Bill {
  id: string
  restaurantWallet: string
  total: number
  recibido: number
  porcentaje: number
  completado: boolean
  assetCode: string
  participantes: Participante[]
}

export interface Recibo {
  billId: string
  restaurantWallet: string
  total: number
  assetCode: string
  fecha: string
  incomingPaymentId: string
  participantes: Participante[]
}
```

---

## Rutas del front

| Ruta | Pantalla |
|---|---|
| `/` | Pantalla 1 — formulario Info |
| `/vaca/:id` | Modal QR + El Vaso + botón Enviar |
| `/vaca/:id/recibo` | Pantalla 4 |
| `/pagar/:id` | Pantalla del amigo |
| `/pagar/:id/gracias` | Confirmación tras el Accept |

---

## Reglas que no se rompen

1. **CORS abierto** en Express: `app.use(cors())`. Una línea, evita 30 minutos de dolor.
2. **El front hace polling** a `GET /api/bills/:id` cada 1.5s. Nada de websockets.
3. **Montos en unidades enteras** en toda la API. La escala del asset se maneja SOLO dentro del backend.
4. **Nunca hardcodear `assetScale`.** Se lee de la wallet address.
5. **El botón Enviar NO mueve plata.** La plata ya se movió pago por pago. Enviar hace `complete` del incoming payment y emite el recibo.

## El callback y los celulares

`BASE_URL` del backend debe ser la **IP local**, no `localhost`, para que los
celulares en el mismo wifi puedan volver del Accept:

```
BASE_URL=http://192.168.1.X:3000
FRONT_URL=http://192.168.1.X:5173
```

`ipconfig` en Windows para sacarla. Vite ya tiene `host: true`.

Si el wifi del evento aísla los dispositivos, plan B: túnel con
`cloudflared tunnel --url http://localhost:PUERTO`, o todos pagan desde
pestañas del portátil.
