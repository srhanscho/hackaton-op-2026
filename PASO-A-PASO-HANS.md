# PASO A PASO — Han's (frontend)

**Empiezas AHORA. No esperas a Camilo.**
Trabajas contra datos falsos y enchufas el backend cuando él tenga 2 endpoints.

Todo se corre desde `frontend/`.

---

## ⏱️ Bloque 0 — Setup (10 min)

```bash
cd frontend
pnpm add react-router-dom qrcode.react
pnpm add -D tailwindcss @tailwindcss/vite
```

Después de instalar, **prompt a Claude Code:**

```
Lee CONTRATO.md y FLUJO.md de la raiz del repo antes de empezar.

Configura Tailwind v4 en este proyecto Vite:
1. Agrega tailwindcss() a los plugins de vite.config.ts (ya tiene host:true, no lo quites)
2. Reemplaza src/index.css por: @import "tailwindcss"; mas las variables de
   color de FLUJO.md como :root
3. Borra src/App.css y las imagenes de la plantilla de Vite
4. Deja src/App.tsx SOLO con el router de react-router-dom y las 5 rutas de
   FLUJO.md, cada una apuntando a un componente placeholder en src/pages/

Fondo oscuro por defecto en el body. Nada de la plantilla de Vite debe quedar.
```

✅ **Checkpoint:** `pnpm dev` levanta, ves las 5 rutas vacías con fondo oscuro.
Abre `http://TU_IP:5173` desde tu celular. Si no carga, avisa YA.

---

## ⏱️ Bloque 1 — Datos falsos y el hook (10 min)

```
Crea la capa de datos, todavia SIN backend real:

src/types.ts
  Los tipos exactos de las respuestas de CONTRATO.md: Bill, Participante.

src/api/client.ts
  const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
  Funciones: createBill, getBill, payShare, completeBill.
  Cada una con un flag USE_MOCK que por ahora esta en true y devuelve datos
  de src/api/mock.ts.

src/api/mock.ts
  Una bill de $90.000 con 3 participantes. getBill() debe ir subiendo el
  porcentaje solo cada vez que lo llaman (0 -> 33 -> 66 -> 100) para poder
  probar la animacion del vaso sin backend.

src/hooks/useBill.ts
  Polling cada 1.5s a getBill. Expone { bill, loading, error }.
  Deja de hacer polling cuando completado sea true.
```

✅ **Checkpoint:** un `console.log` en la consola muestra el porcentaje subiendo solo.

---

## ⏱️ Bloque 2 — El vaso ⭐ (20 min)

**Este es el componente que gana el hackatón. Hazlo antes que las otras pantallas.**

```
Crea src/components/Glass.tsx segun la especificacion de FLUJO.md.

Props: { percentage: number; className?: string }

- SVG de vaso: trapecio invertido, mas ancho arriba que abajo, borde blanco
  grueso
- El liquido llena de abajo hacia arriba con degradado de --liquid-1 a
  --liquid-2
- La superficie del liquido es un <path> de onda que se mueve en bucle con
  animacion CSS pura, sin librerias
- El porcentaje en el centro del liquido, tipografia grande y bold
- Al cambiar percentage el liquido sube con transicion suave de 800ms, nunca
  salta
- Al llegar a 100 el liquido rebosa un poco y hace una celebracion breve
- Se ve bien a 500px y a 160px

Ademas crea una pagina temporal en /test con un slider de 0 a 100 conectado
al vaso, para poder probarlo sin backend.
```

✅ **Checkpoint:** mueves el slider en `/test` y el vaso se llena bonito.
**Si esto quedó bien, ya tienes el 40% del impacto del demo.**

---

## ⏱️ Bloque 3 — Pantalla 1, crear vaca (15 min)

```
Implementa src/pages/CreateBill.tsx en la ruta / segun FLUJO.md.

- Campo wallet address del restaurante
- Campo total
- Campo numero de personas (2 a 8)
- Al cambiar el numero se generan las filas: nombre editable + monto editable
- Los montos arrancan repartidos en partes iguales
- Editar un monto NO recalcula los demas, solo actualiza el contador
- Contador: "Asignado: X de Y" en verde si cuadra, "Faltan por asignar: Z"
  en rojo si no
- El boton Crear vaca esta deshabilitado hasta que la suma cuadre exacto
- Boton discreto "Datos de demo" arriba a la derecha que precarga wallet del
  restaurante y 3 participantes de $30.000

Al enviar: createBill() y navegar a /vaca/{billId}?qr=1
```

✅ **Checkpoint:** llenas el formulario, cuadran los montos, navega a la vaca.

---

## ⏱️ Bloque 4 — Pantalla 3, la vaca (15 min)

```
Implementa src/pages/VacaScreen.tsx en /vaca/:id.

Una sola pagina con tres estados, segun FLUJO.md:
- Total arriba, grande
- <Glass percentage={bill.porcentaje} />
- Debajo: "recibido de total" formateado
- <ParticipantList> con los estados pendiente / procesando / pagado
  y el badge de conversion si monedaPago es distinto a assetCode
- Boton Enviar, deshabilitado hasta porcentaje >= 100
- Boton flotante de QR que abre el modal

Usa useBill(id). Crea src/components/Money.tsx con el Intl.NumberFormat de
FLUJO.md. El front NUNCA divide entre 100.
```

✅ **Checkpoint:** el vaso sube solo con el mock. Ya se ve como un producto.

---

## 🔗 Bloque 5 — INTEGRAR con Camilo

**En cuanto Camilo tenga `POST /api/bills` y `GET /api/bills/:id` funcionando.**
No esperes a que tenga los 5 endpoints.

```bash
# frontend/.env.local
VITE_API_URL=http://192.168.1.X:3000    # la IP de la maquina de Camilo
```

```
Pon USE_MOCK en false en src/api/client.ts y conecta contra el backend real.
Si un endpoint todavia no existe en el backend, deja ESE en mock y el resto
real. Agrega manejo de error visible: si el fetch falla, un banner rojo
arriba con el mensaje, no un console.log silencioso.
```

✅ **Checkpoint:** creas una vaca desde tu formulario y Camilo ve el
incoming payment creado en el test wallet. **Ese es el momento clave del día.**

---

## ⏱️ Bloque 6 — Pantalla del amigo (15 min)

**Aquí se cierra el círculo del demo. Es la pantalla que hace que se sienta real.**

```
Implementa src/pages/PayScreen.tsx en /pagar/:id. Mobile-first, sin login.

1. Nombre del restaurante y total
2. "Quien eres?" - lista de participantes con estado pendiente, seleccionable
3. Al elegirse: campo para su wallet address
4. Muestra su parte en grande
5. Boton Pagar mi parte -> payShare() -> window.location.href = redirectUrl

Y src/pages/ThanksScreen.tsx en /pagar/:id/gracias:
check verde, "Tu parte quedo paga", y el vaso en miniatura con polling.
```

✅ **Checkpoint:** escaneas el QR con tu celular, eliges tu nombre, pagas,
y el vaso sube en el portátil. **Cuando esto pase, ya tienen demo.**

---

## ⏱️ Bloque 7 — Modal QR (10 min)

```
Implementa src/components/QrModal.tsx segun FLUJO.md.

- Se abre automatico si la URL trae ?qr=1
- QRCodeSVG de qrcode.react, size 240, con la URL
  ${window.location.origin}/pagar/${billId}
- El link en texto pequeno seleccionable
- Boton Copiar que cambia a "Copiado!" por 2 segundos
- Boton WhatsApp con https://wa.me/?text=
- X para cerrar
```

---

## ⏱️ Bloque 8 — Enviar y recibo (15 min)

```
1. El boton Enviar de VacaScreen llama a completeBill() y navega a
   /vaca/:id/recibo

2. src/pages/Receipt.tsx segun FLUJO.md:
   - Check verde grande y "Cuenta cerrada"
   - Restaurante, total, fecha
   - Tabla de participantes con moneda de pago
   - El incomingPaymentId en monoespaciada con la etiqueta
     "Comprobante verificable en Interledger"
   - Botones Compartir y Nueva vaca
```

---

## ⏱️ Bloque 9 — Pulido, solo si sobra

- Animación al pasar un participante a `pagado`
- Celebración al 100%
- Borrar la ruta `/test`
- Revisar que todo se lea proyectado en grande

---

## 🚫 Lo que NO construyes

Login · Home · Tab bar · Historial · Configuración · Manejo de errores bonito · Tests

Si Claude Code te propone alguna de estas, **dile que no.**

---

## Reglas

1. **`git commit` cada vez que algo funcione**, aunque esté feo.
2. **Rama `front`.** No trabajes sobre `main`.
3. **Nunca toques `backend/`.** Si necesitas algo de ahí, se lo pides a Camilo.
4. **Un prompt, un bloque.** No le pidas tres cosas juntas a Claude Code.
5. **Cuando algo falle, pega el error completo**, no lo resumas.
6. **Graba el video del demo apenas funcione**, no al final.
