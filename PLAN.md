# 🐄 La Vaca — Plan de Hackathón

**Reto Interledger · Grupo CaribeDev · 8:00am – 3:00pm**
Repo: https://github.com/srhanscho/hackaton-op-2026

---

## 1. El producto

**La Vaca** divide la cuenta del restaurante entre amigos, en tiempo real, sin que nadie tenga que poner la plata primero.

Uno crea la cuenta y define las partes. Cada amigo escanea el QR desde su celular, confirma su parte, y la plata sale de **su propia wallet** directo al restaurante. En la pantalla del restaurante una barra se va llenando. Cuando llega al 100%, la cuenta se cierra sola.

Nadie presta plata. Nadie persigue a nadie por WhatsApp. Nadie es intermediario.

---

## 2. El problema

Salen 6 a comer. Llega la cuenta. Solo hay un datáfono y hace fila. Uno termina pagando todo "y después me pasan", y ese "después" tarda semanas o no llega. En Colombia esto se resuelve con capturas de pantalla, Nequi y memoria.

Las apps de split existentes (Splitwise y compañía) **solo llevan la cuenta de quién debe qué** — no mueven la plata. El problema real nunca se resuelve.

---

## 3. Por qué esto solo funciona con Interledger

Tres cosas que no puedes hacer con un datáfono ni con una app de pagos tradicional:

1. **Fan-in nativo.** Varios pagos salientes, desde wallets distintas y de proveedores distintos, convergen sobre **un mismo incoming payment**. El `receivedAmount` acumula solo y el pago se completa cuando alcanza el `incomingAmount`. No hay que reconciliar nada a mano.

2. **Cero custodia.** La app nunca toca la plata. Open Payments separa la *instrucción* de pago de la *ejecución*. Por eso podemos construir esto sin ser entidad regulada ni pedirle a nadie que confíe en nosotros con su dinero.

3. **Cross-currency transparente.** El amigo que anda de viaje paga su parte en EUR; el restaurante recibe COP. El quote hace la conversión y la barra avanza igual. Wallets de distintas monedas, un solo cobro.

Y la wallet address funciona como un correo: pública, compartible, sin exponer datos de tarjeta.

---

## 4. Arquitectura

### Flujo completo

```
1. Anfitrión crea la cuenta       → POST /api/bills
                                     Backend crea 1 incoming payment
                                     en la wallet del restaurante
                                     con incomingAmount = total

2. Se genera el QR               → apunta a /pay/:billId

3. Cada amigo abre el link       → ve su parte
   y confirma                      → POST /api/bills/:id/pay
                                     a) grant de quote (no interactivo)
                                     b) crear quote → receiver = incoming payment URL
                                     c) grant de outgoing-payment (INTERACTIVO)
                                     d) redirect al Accept

4. Amigo aprueba en el navegador → callback captura interact_ref
                                   → grant.continue → access token
                                   → crear outgoing payment

5. Pantalla del restaurante      → polling GET incoming payment cada 1.5s
                                   → lee receivedAmount
                                   → barra sube

6. receivedAmount >= incomingAmount → la cuenta se completa sola 🎉
```

### Notas técnicas que ahorran horas

- **El grant de `incoming-payment` es no interactivo.** Cualquier cliente puede crear un incoming payment hacia cualquier wallet address — recibir plata no requiere permiso del dueño. Por eso el paso 1 es instantáneo.
- **Un solo grant de incoming sirve para todas las wallets del test wallet**, porque todas pertenecen a la misma ASE (`auth.interledger-test.dev`).
- **El grant de `outgoing-payment` SIEMPRE es interactivo.** Uno por amigo. No lo peleen: es la garantía de seguridad del protocolo y es parte del pitch.
- **Nunca hardcodeen `assetCode` ni `assetScale`.** Léanlos del `GET` a la wallet address. COP y EUR tienen escalas distintas y ahí se pierden horas depurando montos que no cuadran.
- **Los IDs de quote caducan.** Si un paso tardío falla, regeneren desde el quote.
- **`401 invalid_client` / `invalid signature`** = descuadre entre walletAddress, keyId y archivo `.key` del mismo wallet. Es siempre eso.

### Stack

- **Backend:** Node.js + Express + `@interledger/open-payments`
- **Frontend:** Vite + React + Tailwind
- **Estado:** en memoria (un `Map`). **No monten base de datos.** Son 7 horas.
- **Tiempo real:** polling cada 1.5s. **No monten WebSockets.** Nadie en el jurado va a notar la diferencia y les cuesta una hora.

---

## 5. ⚠️ El spike crítico — primeros 45 minutos

Todo el proyecto se apoya en una suposición sin verificar:

> **¿Pueden varios remitentes distintos pagar contra un mismo incoming payment y ver acumular el `receivedAmount`?**

Estoy convencido de que sí — así está diseñado el protocolo. Pero eso no se decide a las 8am con una opinión. Ver `SPIKE.md`.

**Plan B si falla:** crear un incoming payment **por amigo** en la wallet del restaurante y sumar los `receivedAmount` en el frontend. Se ve idéntico en pantalla, funciona con certeza, y solo cuesta ~20 líneas más.

**La decisión se toma a las 8:45am y no se revisa.**

---

## 6. Contrato de API — se congela a las 9:00am

Esto existe para que las dos personas trabajen en paralelo sin bloquearse. Persona 2 mockea estas respuestas y arranca la UI sin esperar al backend.

```
POST   /api/bills
  body → { restauranteWallet, total, moneda, participantes: [{nombre, monto}] }
  res  → { billId, incomingPaymentUrl, total, participantes }

GET    /api/bills/:id
  res  → { total, recibido, porcentaje, completado,
           participantes: [{nombre, monto, estado}] }
         estado: "pendiente" | "procesando" | "pagado"

POST   /api/bills/:id/pay
  body → { participanteId, walletAddress }
  res  → { redirectUrl }        ← el navegador va aquí para el Accept

GET    /callback                ← captura interact_ref, continúa el grant,
                                  crea el outgoing payment, redirige a /gracias

POST   /api/bills/:id/cover     ← "yo cubro a Juan" (si da el tiempo)
  body → { pagadorWallet, participanteIds: [] }
  res  → { redirectUrl }
```

---

## 7. División de trabajo

### 👤 Persona A — Motor (backend + Open Payments)

Dueño de todo lo que toca el protocolo.

- Cliente autenticado, keys, `constants.js`
- Crear incoming payment con `incomingAmount`
- Grants de quote y de outgoing-payment
- **Callback automático del `interact_ref`** ← lo más importante del día
- Endpoint de estado que lee `receivedAmount`
- Cross-currency: quote desde wallet EUR

**Su primera victoria (antes de las 10am):** un pago completo de punta a punta **sin copiar y pegar nada entre terminales**. El tutorial es manual; su trabajo es automatizarlo. Todo lo demás depende de eso.

### 👤 Persona B — Producto (frontend + demo)

Dueña de todo lo que el jurado ve.

- Pantalla del restaurante: barra de progreso + tarjetas de participantes
- Pantalla móvil: ver mi parte → botón confirmar
- Generación del QR
- Polling y animaciones de estado
- **El pitch, las diapositivas y el video de respaldo**

**Su primera victoria (antes de las 10am):** las dos pantallas funcionando completas **contra datos mockeados**. Cuando el backend esté listo, solo se cambia la URL base.

### Regla de oro

**Ninguno de los dos espera al otro en ningún momento.** El mock es el contrato. Si Persona B está esperando al backend, algo salió mal en la planeación.

---

## 8. Cronograma

| Hora | Persona A | Persona B |
|---|---|---|
| **8:00–8:45** | 🔴 **SPIKE** — los dos juntos. Wallets, keys, validar el fan-in. | 🔴 **SPIKE** — crear las 5 wallets, fondearlas, generar keys |
| **8:45–9:00** | 🚦 **Decisión Plan A / Plan B. Congelar contrato de API.** | ← igual |
| **9:00–10:00** | Cliente autenticado + incoming payment + quote | Layout de las dos pantallas con mocks |
| **10:00–11:00** | ⭐ Grant interactivo + callback automático | Barra de progreso + polling + QR |
| **11:00–11:30** | 🔗 **Primera integración.** Un amigo paga de verdad. | 🔗 **Primera integración** |
| **11:30–12:30** | N participantes en paralelo | Estados por participante, animaciones |
| **12:30–13:00** | Cross-currency (el amigo que paga en EUR) | Pulir, mostrar la conversión en pantalla |
| **13:00–13:30** | 🍔 Refrigerio | 🍔 Refrigerio |
| **13:30–14:00** | 🎬 **FREEZE DE CÓDIGO.** Grabar el video del demo. | 🎬 Grabar el video + armar diapositivas |
| **14:00–14:30** | Ensayo del pitch × 3, cronometrado | Ensayo del pitch × 3 |
| **14:30–15:00** | Buffer. Solo se arreglan cosas rotas, no se agrega nada. | Buffer |

### Las tres reglas que no se rompen

1. **FREEZE a las 13:30.** Lo que no funcione a esa hora, no existe. Ningún equipo perdió por tener una función de menos; muchos pierden por romper lo que ya servía.
2. **El video se graba apenas funcione, no al final.** Si el wifi del auditorio se cae mientras presentan, tienen el video. Esto ha salvado más hackathones que cualquier feature.
3. **Integrar a las 11:00, no a las 14:00.** Integrar temprano y feo es infinitamente mejor que integrar tarde y bonito.

---

## 9. Guion del pitch — 3 minutos

**[0:00–0:30] El problema, sin diapositivas**
> "Ayer salimos a comer seis. Llegó la cuenta, había un solo datáfono, y terminé pagando yo. Todavía me deben. Todos aquí han vivido esto."

**[0:30–1:00] Por qué las apps actuales no lo resuelven**
> "Splitwise te dice cuánto debes. No mueve la plata. El problema no es el cálculo — es la transferencia."

**[1:00–2:15] EL DEMO — que hable la pantalla**
> Proyectan la cuenta. Tres celulares escanean. La barra sube: 33%… 66%…
> **"Y este amigo está de viaje: paga en euros. El restaurante recibe pesos."**
> 100%. La cuenta se cierra sola.

**[2:15–2:45] La profundidad técnica**
> "Tres pagos de wallets distintas convergieron sobre un mismo incoming payment de Open Payments. En dos monedas. Y nuestra app **nunca tocó la plata** — solo emitió instrucciones. Por eso esto no necesita ser un banco para existir."

**[2:45–3:00] El cierre**
> "Cada persona autorizó su propio pago con un grant firmado, con tope y revocable. Eso no es una limitación que tuvimos que aceptar: es la razón por la que esto es seguro."

**Consejo:** si algo falla en vivo, no lo arreglen frente al jurado. Corten al video sin pedir disculpas y sigan hablando. La mayoría ni se da cuenta.

---

## 10. Alcance — qué entra y qué no

### ✅ Debe estar a las 12:30 (sin esto no hay proyecto)
- Crear cuenta con N participantes
- Cada uno paga su parte desde su wallet
- Barra en tiempo real
- Auto-completado al 100%

### 🎯 Diferenciadores (en este orden)
1. **Cross-currency** — el amigo que paga en EUR ← el de mejor relación impacto/esfuerzo
2. **"Yo cubro a Juan"** — un consentimiento, dos pagos, bajo un grant con tope
3. Dividir por ítems del menú en vez de partes iguales

### ❌ NO construyan (son trampas de tiempo)
- Login / registro de usuarios
- Base de datos
- WebSockets
- App móvil nativa — es una web responsive y se ve igual en el proyector
- Manejo de errores bonito — un `try/catch` con `console.error` alcanza hoy
- Tests

---

## 11. Checklist de la noche anterior

- [ ] 5 wallets creadas y fondeadas en https://wallet.interledger-test.dev
  - 1 restaurante (COP) · 3 amigos (COP) · 1 amigo viajero (EUR)
- [ ] Keys generadas y descargadas para cada una
- [ ] `constants.js` lleno y verificado
- [ ] `npm i @interledger/open-payments uuid express` corriendo
- [ ] Repo clonado en las dos máquinas, ramas creadas
- [ ] Claude Code funcionando en ambas
- [ ] **Confirmado por escrito con los organizadores que se permite IA** ← no arranquen sin esto
