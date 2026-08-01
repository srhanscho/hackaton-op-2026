// Datos falsos para trabajar sin backend.
// Se apaga desde USE_MOCK en client.ts cuando Camilo tenga los endpoints.

import type { Bill, Participante, Recibo } from '../types'

const WALLET = 'https://ilp.interledger-test.dev/restaurante'
const TOTAL = 90000
const PARTE = 30000

// Cómo paga cada uno cuando le toca. Camilo va en EUR a propósito:
// es el que dispara el badge de cross-currency en la lista.
const GENTE = [
  { id: 'p1', nombre: "Han's", monedaPago: 'COP', montoPagado: 30000 },
  { id: 'p2', nombre: 'Camilo', monedaPago: 'EUR', montoPagado: 6.5 },
  { id: 'p3', nombre: 'Ana', monedaPago: 'COP', montoPagado: 30000 },
]

// Cada llamada a getBill avanza un paso. Así el vaso se llena solo
// y se puede probar la animación sin que nadie pague de verdad.
const PASOS = [
  { porcentaje: 0, recibido: 0, pagados: 0 },
  { porcentaje: 33, recibido: 30000, pagados: 1 },
  { porcentaje: 66, recibido: 60000, pagados: 2 },
  { porcentaje: 100, recibido: 90000, pagados: 3 },
]

let paso = 0
let completado = false

function participantes(pagados: number): Participante[] {
  return GENTE.map((p, i) =>
    i < pagados
      ? {
          id: p.id,
          nombre: p.nombre,
          monto: PARTE,
          estado: 'pagado',
          monedaPago: p.monedaPago,
          montoPagado: p.montoPagado,
        }
      : {
          id: p.id,
          nombre: p.nombre,
          monto: PARTE,
          estado: 'pendiente',
          monedaPago: null,
          montoPagado: null,
        },
  )
}

function bill(id: string): Bill {
  const s = PASOS[Math.min(paso, PASOS.length - 1)]
  return {
    id,
    restaurantWallet: WALLET,
    total: TOTAL,
    recibido: s.recibido,
    porcentaje: s.porcentaje,
    completado,
    assetCode: 'COP',
    participantes: participantes(s.pagados),
  }
}

/** Vuelve a dejar el vaso vacío. */
export function reset() {
  paso = 0
  completado = false
}

export function createBill(): string {
  reset()
  return 'mock123'
}

/** Devuelve la bill y avanza un paso, hasta quedarse clavada en 100%. */
export function getBill(id: string): Bill {
  const actual = bill(id)
  if (paso < PASOS.length - 1) paso++
  return actual
}

// El mock ignora quién pagó: el que manda es el contador de pasos.
// Devuelve la pantalla de gracias para poder recorrer el flujo del amigo
// entero sin auth server.
export function payShare(billId: string): string {
  return `${window.location.origin}/pagar/${billId}/gracias`
}

export function completeBill(billId: string): Recibo {
  completado = true
  const b = bill(billId)
  return {
    billId,
    restaurantWallet: WALLET,
    total: TOTAL,
    assetCode: 'COP',
    fecha: new Date().toISOString(),
    incomingPaymentId: `${WALLET}/incoming-payments/8f3c1a90-mock-4b2e-9d77-0a1e5c2f6b44`,
    participantes: b.participantes,
  }
}
