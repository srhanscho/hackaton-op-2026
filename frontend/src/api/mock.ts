// Datos falsos para trabajar sin backend.
// Se apaga desde USE_MOCK en client.ts cuando Camilo tenga los endpoints.
//
// Se comporta como el backend real: el vaso sube porque alguien pagó, no
// porque pasó el tiempo — si no, con el polling cada 1.5s la vaca llegaba a
// 100% antes de poder ensayar nada.
//
// Y el pago no es instantáneo: payShare() deja al participante en procesando
// y el monto entra 2.5s después, como cuando el auth server de Open Payments
// devuelve al callback.
//
// El estado vive en localStorage, no en una variable del módulo: el flujo de
// pago sale de la app con `window.location.href`, y en la recarga un estado
// en memoria se perdería y el vaso llegaría a gracias en 0%. De paso, todas
// las pestañas del mismo navegador ven la misma vaca.

import type { Bill, Participante, Recibo } from '../types'

const WALLET = 'https://ilp.interledger-test.dev/restaurante'
const TOTAL = 90000
const PARTE = 30000
const MONEDA = 'COP'
const CLAVE = 'vaca-mock'

const GENTE = [
  { id: 'p1', nombre: "Han's" },
  { id: 'p2', nombre: 'Camilo' },
  { id: 'p3', nombre: 'Ana' },
]

// Camilo paga en euros a propósito: es el que dispara el badge de
// cross-currency en la lista. COP por EUR, más o menos.
const CRUZADO = 'Camilo'
const TASA_EUR = 4615

/** Lo que tarda el "auth server" en confirmar. */
const ESPERA = 2500

interface Estado {
  participantes: Participante[]
  completado: boolean
  /**
   * id → cuándo entró en procesando (epoch ms). Va aparte de `Participante`
   * a propósito: ese tipo es del CONTRATO y no se le inventan campos.
   */
  procesandoDesde: Record<string, number>
}

function vacio(): Estado {
  return {
    participantes: GENTE.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      monto: PARTE,
      estado: 'pendiente',
      monedaPago: null,
      montoPagado: null,
    })),
    completado: false,
    procesandoDesde: {},
  }
}

// Respaldo por si localStorage no está (modo privado, iOS con cookies
// bloqueadas). Ahí el mock funciona igual, solo que sin sobrevivir recargas.
let memoria = vacio()

function leer(): Estado {
  try {
    const crudo = localStorage.getItem(CLAVE)
    if (crudo) {
      const e = JSON.parse(crudo) as Estado
      // Puede venir de una versión anterior sin este campo.
      return { ...e, procesandoDesde: e.procesandoDesde ?? {} }
    }
  } catch {
    /* sin storage: se sigue con lo que haya en memoria */
  }
  return memoria
}

function guardar(e: Estado) {
  memoria = e
  try {
    localStorage.setItem(CLAVE, JSON.stringify(e))
  } catch {
    /* ídem */
  }
}

/** Vuelve a dejar el vaso vacío. */
export function reset() {
  guardar(vacio())
}

function bill(id: string, e: Estado): Bill {
  // El recibido se deriva de quién pagó, no se lleva en un contador aparte:
  // así no hay forma de que los dos números se desincronicen.
  const recibido = e.participantes
    .filter((p) => p.estado === 'pagado')
    .reduce((suma, p) => suma + p.monto, 0)

  return {
    id,
    restaurantWallet: WALLET,
    total: TOTAL,
    recibido,
    // Un decimal, como el ejemplo del CONTRATO (66.7).
    porcentaje: Math.round((recibido / TOTAL) * 1000) / 10,
    completado: e.completado,
    assetCode: MONEDA,
    participantes: e.participantes,
  }
}

/** Sella el pago: es lo único que mueve el recibido y el porcentaje. */
function acreditar(p: Participante) {
  p.estado = 'pagado'
  const cruzado = p.nombre === CRUZADO
  p.monedaPago = cruzado ? 'EUR' : MONEDA
  p.montoPagado = cruzado ? Math.round((p.monto / TASA_EUR) * 100) / 100 : p.monto
}

/**
 * Asciende a pagado a todo el que ya cumplió su espera. Idempotente, así que
 * da igual quién lo llame ni cuántas veces.
 */
function confirmarVencidos(e: Estado): boolean {
  let cambio = false
  for (const p of e.participantes) {
    const desde = e.procesandoDesde[p.id]
    if (p.estado !== 'procesando' || desde == null) continue
    if (Date.now() - desde < ESPERA) continue
    acreditar(p)
    delete e.procesandoDesde[p.id]
    cambio = true
  }
  return cambio
}

export function createBill(): string {
  reset()
  return 'mock123'
}

/**
 * GET /api/bills/:id — no decide nada, solo cobra los pagos que ya vencieron.
 *
 * El temporizador de payShare() casi nunca llega a dispararse: esa función
 * termina con `window.location.href` hacia el auth server, y la navegación se
 * lleva el setTimeout por delante. Como la fecha de inicio quedó guardada, es
 * el polling el que termina de confirmar — igual que el backend real, donde la
 * confirmación llega por el callback y no por la pestaña del que pagó.
 */
export function getBill(id: string): Bill {
  const e = leer()
  if (confirmarVencidos(e)) guardar(e)
  return bill(id, e)
}

/**
 * POST /api/bills/:id/pay — deja al participante en procesando y se va.
 *
 * El pago NO queda hecho aquí: el monto entra al recibido 2.5s después, que
 * es lo que pasa con Open Payments cuando el auth server devuelve al callback.
 * Mientras tanto la fila sale en ámbar con el spinner y el vaso no se mueve.
 *
 * `participanteId` es opcional solo para no romper a quien todavía llame
 * `payShare(id)`: en ese caso cae sobre el primer pendiente. El backend real
 * siempre lo exige.
 */
export function payShare(
  billId: string,
  participanteId?: string,
  // El mock no la usa, pero client.ts la manda y el backend real la necesita
  // para armar el outgoing payment. El preset no perdona el prefijo `_`.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _walletAddress?: string,
): string {
  const e = leer()
  const yo = participanteId
    ? e.participantes.find((p) => p.id === participanteId)
    : e.participantes.find((p) => p.estado === 'pendiente')

  if (yo && yo.estado === 'pendiente') {
    yo.estado = 'procesando'
    e.procesandoDesde[yo.id] = Date.now()
    guardar(e)

    // Confirma si esta pestaña sigue viva a los 2.5s. Cuando el que paga sale
    // hacia el auth server, la navegación mata este timer y el respaldo es
    // confirmarVencidos() dentro de getBill().
    setTimeout(() => {
      const actual = leer()
      if (confirmarVencidos(actual)) guardar(actual)
    }, ESPERA)
  }

  // Sin auth server: se va derecho a la pantalla de gracias.
  return `${window.location.origin}/pagar/${billId}/gracias`
}

export function completeBill(billId: string): Recibo {
  const e = leer()
  e.completado = true
  guardar(e)

  return {
    billId,
    restaurantWallet: WALLET,
    total: TOTAL,
    assetCode: MONEDA,
    fecha: new Date().toISOString(),
    incomingPaymentId: `${WALLET}/incoming-payments/8f3c1a90-mock-4b2e-9d77-0a1e5c2f6b44`,
    participantes: e.participantes,
  }
}
