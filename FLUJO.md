# FLUJO — La Vaca (frontend)

Complemento de `CONTRATO.md`. Aquí está **qué se ve en pantalla**.
El contrato manda sobre los datos; este archivo manda sobre las vistas.

Carpetas reales del repo: `frontend/` y `backend/` (no `/front` y `/back`).

---

## Alcance real

Cuatro pantallas. **No hay** login, home, tab bar, historial ni configuración.
La ruta `/` **es** el formulario de crear vaca.

| Prioridad | Qué | Cuándo |
|---|---|---|
| **P0** | Pantalla 1 → 2 → 3 + pantalla del amigo | Sin esto no hay demo |
| **P1** | Botón Enviar + Recibo | Solo cuando P0 corra de punta a punta |
| **P2** | Nada. En serio. | — |

---

## Rutas

```
/                    Pantalla 1 — formulario Info
/vaca/:id            Pantalla 2 (modal QR) + Pantalla 3 (vaso) + 3.5 (Enviar)
/vaca/:id/recibo     Pantalla 4 — boucher
/pagar/:id           Pantalla del amigo (móvil)
/pagar/:id/gracias   Confirmación tras el Accept
```

`/vaca/:id` es **una sola ruta con tres estados**, no tres páginas:

- `qrAbierto` → modal encima del vaso
- `porcentaje < 100` → vaso llenándose, botón Enviar deshabilitado
- `porcentaje >= 100` → vaso lleno, botón Enviar activo

---

## Árbol de componentes

```
src/
  api/
    client.ts            fetch tipado contra el backend
  hooks/
    useBill.ts           polling cada 1.5s a GET /api/bills/:id
  components/
    Glass.tsx            EL VASO
    QrModal.tsx
    ParticipantList.tsx
    ParticipantRow.tsx
    Money.tsx            formatea montos
    Button.tsx
  pages/
    CreateBill.tsx       Pantalla 1
    VacaScreen.tsx       Pantallas 2, 3, 3.5
    Receipt.tsx          Pantalla 4
    PayScreen.tsx        Pantalla del amigo
    ThanksScreen.tsx
  App.tsx                solo el router
  main.tsx
```

---

## Pantalla 1 — Crear vaca (`/`)

**Campos**

- Wallet address del restaurante (texto, ancho completo)
- Total de la cuenta (número)
- Número de personas (número, 2 a 8)

**Comportamiento**

Al cambiar el número de personas se generan las filas con nombre editable
y monto repartido en partes iguales.

Editar un monto **NO** recalcula los otros. Solo se muestra un contador:

```
Asignado: $90.000 de $90.000   ✅
Faltan por asignar: $5.000     ⚠️  (en rojo, bloquea el botón)
```

El botón **Crear vaca** solo se activa cuando la suma cuadra exacto.

**Botón "Datos de demo"** — arriba a la derecha, discreto. Precarga wallet del
restaurante y tres participantes con montos. En el escenario nadie quiere
escribir URLs de 50 caracteres. Esto no es opcional, es seguro de vida.

Al enviar: `POST /api/bills` → navegar a `/vaca/{billId}` con el modal QR abierto.

---

## Pantalla 2 — Modal QR

Se abre **solo** al crear la vaca. Encima del vaso, con fondo oscurecido.

- QR grande (mínimo 240px) apuntando a `${FRONT_URL}/pagar/${billId}`
- El link en texto pequeño, seleccionable
- Botón **Copiar** → cambia a "¡Copiado!" por 2 segundos
- Botón **WhatsApp** → `https://wa.me/?text=${encodeURIComponent(mensaje)}`
- La X cierra y descubre el vaso

Desde el vaso hay un botón de QR para volver a abrirlo.

Librería: `qrcode.react` → `<QRCodeSVG value={url} size={240} />`

---

## Pantalla 3 — El vaso ⭐

**Este es el componente que el jurado va a recordar. Es donde va tu tiempo.**

```
        $90.000
    ┌───────────┐
     \         /
      \  66%  /       ← porcentaje dentro del líquido
       \~~~~~/        ← superficie con onda animada
        \███/
         \█/
    └───────────┘
    $60.000 de $90.000

   [ Han's    $30.000  ✅ pagado    ]
   [ Camilo   $30.000  🇪🇺 €6.50    ]
   [ Ana      $30.000  ⏳ pendiente ]

        [ Enviar ]  ← gris hasta el 100%
```

**Props de `Glass.tsx`**

```ts
{ percentage: number; className?: string }
```

**Requisitos**

- SVG de vaso (trapecio invertido, más ancho arriba)
- El líquido llena de abajo hacia arriba según `percentage`
- La superficie con un `<path>` de onda animada en bucle — CSS puro,
  sin librerías de animación
- Porcentaje grande y centrado dentro del líquido
- Transición suave al cambiar de valor: `transition: height 800ms ease-out`
- Al 100%: el líquido rebosa un poco y hay una celebración breve
- Se ve bien a 500px (pantalla principal) y a 160px (miniatura)

**Estados de participante**

| Estado | Visual |
|---|---|
| `pendiente` | gris, ícono de reloj |
| `procesando` | ámbar, spinner, "esperando confirmación" |
| `pagado` | verde, check, y si `monedaPago !== assetCode` muestra la conversión |

---

## Pantalla 3.5 — Enviar

Cuando `porcentaje >= 100` el botón se activa.

`POST /api/bills/:id/complete` → navegar a `/vaca/:id/recibo`.

> **El botón Enviar NO mueve plata.** La plata ya se movió, pago por pago,
> mientras el vaso se llenaba. Enviar cierra el incoming payment en el
> protocolo y emite el recibo. Si el jurado pregunta dónde estuvo el dinero
> mientras tanto, la respuesta es: **nunca estuvo con nosotros, cada pago fue
> directo del amigo al restaurante.**

---

## Pantalla 4 — Recibo (`/vaca/:id/recibo`)

- Check grande verde + **"Cuenta cerrada"**
- Restaurante, total, fecha
- Tabla de participantes: nombre, monto, y moneda si pagó en otra
- El `incomingPaymentId` en fuente monoespaciada pequeña, con etiqueta
  **"Comprobante verificable en Interledger"** — esto impresiona al jurado
- Botones: Compartir y Nueva vaca

---

## Pantalla del amigo (`/pagar/:id`)

**Sin login. Móvil. Es lo que se abre al escanear el QR.**

1. Nombre del restaurante y total de la cuenta
2. **"¿Quién eres?"** → lista de participantes con estado `pendiente`
3. Al elegirse: campo para su wallet address
4. Muestra **su parte** en grande
5. Botón **Pagar mi parte** → `POST /api/bills/:id/pay` →
   `window.location.href = redirectUrl`

Después del Accept, el auth server lo devuelve al backend, y el backend lo
manda a `/pagar/:id/gracias`.

**Pantalla de gracias:** check verde, "Tu parte quedó paga", y el vaso en
miniatura subiendo con polling. Que vea que su pago sí llegó.

---

## Estilo

Se tiene que leer **desde la fila 5 de un auditorio**. Sin grises claros.

```css
--bg:        #0F0A1E   /* fondo, morado casi negro */
--surface:   #1C1533
--liquid-1:  #FFC978   /* degradado del líquido */
--liquid-2:  #FF9A3C
--glass:     #FFFFFF   /* borde del vaso, 90% opacidad */
--ok:        #4ADE80   /* pagado */
--wait:      #FBBF24   /* procesando */
--muted:     #8B85A0   /* pendiente */
```

Tipografía grande. Montos con `tabular-nums` para que no bailen al actualizar.

Mobile-first, pero `/vaca/:id` tiene que verse bien proyectado en grande.

---

## Formateo de montos

El backend **siempre** manda unidades enteras (`90000` = $90.000 COP).
El front **nunca** divide entre 100.

```ts
export function money(v: number, code: string) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: code, maximumFractionDigits: code === 'COP' ? 0 : 2
  }).format(v)
}
```

---

## Orden de construcción

1. Limpiar `App.tsx`, instalar router + tailwind + qrcode, montar las 5 rutas vacías
2. `api/client.ts` y `hooks/useBill.ts` con polling
3. **Pantalla 1** completa → primer `POST` real al backend
4. **`Glass.tsx`** → probarlo con un slider antes de conectarlo
5. **Pantalla 3** con datos reales
6. **Pantalla del amigo** → aquí se cierra el círculo del demo
7. Modal QR
8. Enviar + Recibo
9. Pulido: animaciones, badge de cross-currency, botón de demo

> **No pases al 5 sin que el 3 le pegue de verdad al backend.** Integrar
> temprano y feo le gana a integrar tarde y bonito, siempre.
