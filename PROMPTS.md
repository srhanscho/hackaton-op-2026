# 🤖 Prompts para Claude Code

Uno por bloque del cronograma. Péguenlos tal cual.

**Antes de todo:** guarden `PLAN.md` y `SPIKE.md` en la raíz del repo y arranquen cada sesión con `Lee PLAN.md antes de empezar.` Eso le da todo el contexto de una y evita que reinvente decisiones ya tomadas.

---

## 🔴 8:00 — SPIKE (los dos juntos)

```
Lee PLAN.md y SPIKE.md.

Crea un solo archivo spike.js que ejecute los pasos 1 a 5 de SPIKE.md
contra el test wallet de Interledger, usando @interledger/open-payments.

Requisitos:
- Un solo archivo, sin frameworks, corre con `node spike.js`
- constants.js aparte con las 5 wallets (walletAddress, keyId, ruta al .key)
- Lee assetCode y assetScale de la wallet address, NO los hardcodees
- Para el paso del interact_ref, pausa y pídeme que lo pegue por stdin
- console.log claro en cada paso, especialmente receivedAmount después
  de cada pago

El objetivo es responder una sola pregunta: ¿acumula el receivedAmount
cuando dos remitentes distintos pagan contra el mismo incoming payment?
```

---

## 👤 PERSONA A — Motor

### 9:00 — Base del cliente

```
Lee PLAN.md. Trabajamos en el PLAN [A o B] según el spike.

Crea la estructura del backend:
- src/op/client.js       → createAuthenticatedClient por wallet, cacheado
- src/op/incoming.js     → crear y consultar incoming payments
- src/op/quote.js        → grant de quote + crear quote
- src/op/outgoing.js     → grant interactivo + continue + crear outgoing
- src/store.js           → Map en memoria de bills. Sin base de datos.
- server.js              → Express con el contrato de API de PLAN.md sección 6

Implementa POST /api/bills y GET /api/bills/:id completos.
Los demás endpoints déjalos como stubs que devuelvan 501.

Lee siempre assetCode y assetScale de la wallet address.
Maneja errores con try/catch y console.error, sin sobreingeniería.
```

### 10:00 — ⭐ El callback automático (lo más importante del día)

```
Ahora lo crítico: automatizar el interact_ref.

Hoy en el tutorial hay que copiarlo a mano entre terminales. Necesito que
sea automático de punta a punta.

Implementa:
1. POST /api/bills/:id/pay
   - grant de quote → crear quote → grant interactivo de outgoing-payment
   - genera un nonce único, guarda en el store el continue.uri,
     el continue.access_token y el billId asociados a ese nonce
   - interact.finish.uri = http://localhost:3000/callback?nonce=<nonce>
   - devuelve { redirectUrl }

2. GET /callback
   - lee interact_ref y nonce del query
   - verifica el hash
   - recupera del store lo asociado al nonce
   - llama grant.continue con el interact_ref
   - crea el outgoing payment
   - marca al participante como "pagado" en el store
   - redirige a /gracias

Después de esto, un amigo debe poder pagar completo sin que yo toque
la terminal ni una vez.
```

### 11:30 — N participantes

```
Extiende el flujo a N participantes en paralelo sobre la misma cuenta.

- Varios amigos pueden estar en el flujo de consentimiento al mismo tiempo
  sin pisarse (por eso cada uno tiene su propio nonce)
- GET /api/bills/:id devuelve el estado real de cada participante
- El porcentaje sale de consultar el incoming payment real, no de sumar
  lo que creemos que pagamos
- Cuando receivedAmount >= incomingAmount, marca completado: true
```

### 12:30 — Cross-currency

```
Haz que un participante con wallet en EUR pueda pagar su parte de una
cuenta en COP.

- El quote se crea desde la wallet EUR con receiver = el incoming payment
  en COP
- Devuelve en la respuesta tanto el debitAmount (EUR) como el
  receiveAmount (COP) para que el frontend muestre la conversión
- Verifica que el receivedAmount del incoming sube en COP correctamente

Esto es nuestro diferenciador principal en el pitch, así que déjalo
funcionando y con logs claros de la conversión.
```

---

## 👤 PERSONA B — Producto

### 9:00 — Las dos pantallas con mocks

```
Lee PLAN.md, especialmente la sección 6 (contrato de API).

Crea el frontend con Vite + React + Tailwind, un solo proyecto,
contra un mock del backend (src/api/mock.js) que respete exactamente
ese contrato. Debe poder cambiarse a la API real cambiando una sola
constante BASE_URL.

Dos vistas:

1. /bill/:id — pantalla del restaurante (se proyecta, optimizada para
   pantalla grande)
   - Total de la cuenta, grande
   - Barra de progreso gruesa y muy visible
   - Tarjetas de participantes con estado: pendiente / procesando / pagado
   - QR grande apuntando a /pay/:id

2. /pay/:id — pantalla móvil
   - "Tu parte: $30.000"
   - Selector de quién soy
   - Botón grande "Pagar mi parte"

Estética: limpia, alto contraste, se tiene que leer desde la fila 5 de
un auditorio. Nada de gris claro sobre blanco.
```

### 10:00 — Tiempo real

```
Implementa el polling y las animaciones.

- GET /api/bills/:id cada 1.5s en la vista del restaurante
- La barra anima suave entre valores, no salta
- Cuando un participante pasa a "pagado", su tarjeta hace una animación
  breve y satisfactoria
- Al llegar a 100%: celebración en pantalla ("¡Cuenta cerrada!"), algo
  que se vea bien en el video

Genera el QR con la librería `qrcode` apuntando a la URL real de /pay/:id.

No uses WebSockets. Polling es suficiente y no tenemos tiempo.
```

### 12:30 — El toque de cross-currency

```
Cuando un participante paga en una moneda distinta a la de la cuenta,
la UI lo tiene que celebrar visualmente:

- Badge "🇪🇺 pagando en EUR" en su tarjeta
- Mostrar la conversión: "€6.50 → $30.000 COP"
- La barra sube igual que con los demás

Este es el momento del pitch donde el jurado entiende que esto no es
una app de pagos normal. Que se vea.
```

---

## 🎬 13:30 — Freeze y respaldo

```
FREEZE. No agregues funcionalidad.

1. Escribe un README.md del repo con: qué es, el problema, cómo correrlo,
   qué partes de Open Payments usamos y por qué no se puede hacer sin
   Interledger.
2. Revisa que no haya keys privadas ni .key commiteados. Actualiza
   .gitignore si hace falta.
3. Dame un checklist de 10 pasos para ejecutar el demo en vivo sin
   improvisar, en orden exacto, con qué pestaña abrir en cada momento.
```

---

## Consejos de uso

- **Un prompt, un bloque.** No le pidan tres cosas a la vez — con 7 horas, revisar un diff gigante es más caro que escribirlo.
- **Cuando algo falle, peguen el error completo**, no lo resuman. Los errores de GNAP son crípticos pero muy específicos.
- **`git commit` cada vez que algo funcione**, aunque esté feo. A las 13:00 van a querer volver a algún punto y lo van a agradecer.
- **Ramas separadas**, merge en la integración de las 11:00. Trabajar los dos sobre `main` a esta velocidad termina mal.
