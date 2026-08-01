import { randomUUID } from 'node:crypto'
import { createIncomingPayment, getIncomingPayment } from './openPayments/incoming.js'
import { billRepository } from '../repositories/memoryBillRepository.js'
import type { Bill } from '../entities/Bill.js'
import type { Participante } from '../entities/Participant.js'

export interface CrearCuentaInput {
  restauranteWallet: string
  moneda: string
  total: number
  participantes: Array<{ nombre: string, monto: number }>
}

export async function crearCuenta (input: CrearCuentaInput) {
  const { incomingPayment, accessToken } = await createIncomingPayment({
    total: input.total,
    descripcion: `Cuenta La Vaca ${Date.now()}`
  })

  const bill: Bill = {
    id: randomUUID(),
    restauranteWallet: input.restauranteWallet,
    moneda: input.moneda,
    total: input.total,
    incomingPaymentUrl: incomingPayment.id,
    accessToken,
    participantes: input.participantes.map((p): Participante => ({
      id: randomUUID(),
      nombre: p.nombre,
      monto: p.monto,
      estado: 'pendiente'
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
  if (!bill) throw new Error('Cuenta no encontrada')

  const estado = await getIncomingPayment({
    id: bill.incomingPaymentUrl,
    accessToken: bill.accessToken
  })

  const recibido = Number(estado.receivedAmount.value) / 10 ** estado.receivedAmount.assetScale
  const porcentaje = bill.total > 0 ? Math.round((recibido / bill.total) * 10000) / 100 : 0

  return {
    total: bill.total,
    recibido,
    porcentaje,
    completado: estado.completed || porcentaje >= 100,
    participantes: bill.participantes.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      monto: p.monto,
      estado: p.estado
    }))
  }
}
