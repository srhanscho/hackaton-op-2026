import { randomUUID } from 'node:crypto'
import { completeIncomingPayment, createIncomingPayment, getIncomingPayment } from './openPayments/incoming.js'
import { unscaleValue } from './openPayments/client.js'
import { billRepository } from '../repositories/memoryBillRepository.js'
import type { Bill } from '../entities/Bill.js'
import type { Participante } from '../entities/Participant.js'

/** Error con el status HTTP que le toca, para que el controller no adivine. */
export class BillError extends Error {
  readonly status: number

  constructor (message: string, status: number) {
    super(message)
    this.status = status
  }
}

export interface CrearCuentaInput {
  restaurantWallet: string
  total: number
  participantes: Array<{ nombre: string, monto: number }>
}

export async function crearCuenta (input: CrearCuentaInput) {
  // La moneda NO se recibe: sale de la wallet del restaurante, que es donde
  // vive el incoming payment. Así `assetCode`, `recibido` y `total` siempre
  // hablan del mismo asset.
  const { incomingPayment, accessToken, wallet } = await createIncomingPayment({
    restaurantWallet: input.restaurantWallet,
    total: input.total,
    descripcion: `Cuenta La Vaca ${Date.now()}`
  })

  const bill: Bill = {
    id: randomUUID(),
    restaurantWallet: input.restaurantWallet,
    assetCode: wallet.assetCode,
    assetScale: wallet.assetScale,
    total: input.total,
    incomingPaymentUrl: incomingPayment.id,
    accessToken,
    participantes: input.participantes.map((p): Participante => ({
      id: randomUUID(),
      nombre: p.nombre,
      monto: p.monto,
      estado: 'pendiente',
      monedaPago: null,
      montoPagado: null
    })),
    createdAt: new Date().toISOString()
  }

  billRepository.save(bill)

  return {
    billId: bill.id,
    incomingPaymentUrl: bill.incomingPaymentUrl,
    total: bill.total,
    participantes: bill.participantes
  }
}

export async function obtenerEstado (billId: string) {
  const bill = billRepository.getById(billId)
  if (!bill) throw new BillError('Cuenta no encontrada', 404)

  const estado = await getIncomingPayment({
    id: bill.incomingPaymentUrl,
    accessToken: bill.accessToken
  })

  const recibido = unscaleValue(estado.receivedAmount.value, estado.receivedAmount.assetScale)
  const porcentaje = bill.total > 0 ? Math.round((recibido / bill.total) * 10000) / 100 : 0

  return {
    id: bill.id,
    restaurantWallet: bill.restaurantWallet,
    total: bill.total,
    recibido,
    porcentaje,
    completado: estado.completed || porcentaje >= 100,
    // Sin esto el front no puede formatear ni un solo monto.
    assetCode: bill.assetCode,
    participantes: bill.participantes.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      monto: p.monto,
      estado: p.estado,
      monedaPago: p.monedaPago,
      montoPagado: p.montoPagado
    }))
  }
}

/**
 * El botón Enviar. NO mueve plata: eso ya pasó pago por pago. Cierra el
 * incoming payment en el protocolo y devuelve el recibo.
 */
export async function cerrarCuenta (billId: string) {
  const bill = billRepository.getById(billId)
  if (!bill) throw new BillError('Cuenta no encontrada', 404)

  const estado = await obtenerEstado(billId)
  if (estado.porcentaje < 100) {
    throw new BillError(`La cuenta va en ${estado.porcentaje}%, todavía falta plata`, 400)
  }

  try {
    await completeIncomingPayment({
      id: bill.incomingPaymentUrl,
      accessToken: bill.accessToken
    })
  } catch (error) {
    // 409 "wrong state" = Rafiki ya cerró el incoming payment solo al llegar
    // al incomingAmount. La cuenta está cerrada: no es un error para nosotros.
    const status = (error as { status?: number }).status
    if (status !== 409) throw error
  }

  // Si alguien vuelve a pulsar Enviar, el recibo mantiene la fecha del cierre
  // de verdad en vez de moverse.
  bill.completadoAt ??= new Date().toISOString()
  billRepository.save(bill)

  return {
    billId: bill.id,
    restaurantWallet: bill.restaurantWallet,
    total: bill.total,
    assetCode: bill.assetCode,
    fecha: bill.completadoAt,
    incomingPaymentId: bill.incomingPaymentUrl,
    participantes: estado.participantes
  }
}
