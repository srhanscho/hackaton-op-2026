import { createQuote } from './openPayments/quote.js'
import { unscaleValue } from './openPayments/client.js'
import { BillError } from './billService.js'
import { continueOutgoingGrant, createOutgoingPayment, requestOutgoingGrant } from './openPayments/outgoing.js'
import { billRepository } from '../repositories/memoryBillRepository.js'

export interface IniciarPagoInput {
  billId: string
  participanteId: string
  walletAddress: string
  finishUri: string
}

export async function iniciarPago ({ billId, participanteId, walletAddress, finishUri }: IniciarPagoInput) {
  const bill = billRepository.getById(billId)
  if (!bill) throw new Error('Cuenta no encontrada')

  const participante = bill.participantes.find((p) => p.id === participanteId)
  if (!participante) throw new Error('Participante no encontrado')

  if (participante.estado === 'pagado') throw new Error('Este participante ya pagó')

  const quote = await createQuote({
    payerWallet: walletAddress,
    receiver: bill.incomingPaymentUrl,
    debitAmount: participante.monto
  })

  const { redirectUrl, continueUri, continueAccessToken } = await requestOutgoingGrant({
    payerWallet: walletAddress,
    quote,
    finishUri
  })

  participante.estado = 'procesando'
  participante.grantSession = {
    billId,
    participanteId,
    walletAddress,
    quote,
    continueUri,
    continueAccessToken,
    redirectUrl,
    createdAt: new Date().toISOString()
  }
  billRepository.save(bill)

  return { redirectUrl }
}

export async function finalizarPago ({ billId, participanteId, interactRef }: { billId: string, participanteId: string, interactRef: string }) {
  const bill = billRepository.getById(billId)
  if (!bill) throw new Error('Cuenta no encontrada')

  const participante = bill.participantes.find((p) => p.id === participanteId)
  if (!participante?.grantSession) throw new Error('Sesión de pago no encontrada')

  const { grantSession } = participante

  const grant = await continueOutgoingGrant({
    continueUri: grantSession.continueUri,
    continueAccessToken: grantSession.continueAccessToken,
    interactRef
  })

  await createOutgoingPayment({
    payerWallet: grantSession.walletAddress,
    quote: grantSession.quote,
    accessToken: grant.access_token.value
  })

  // Lo que salió de SU wallet, que puede ser otra moneda: es el badge de
  // cross-currency del vaso y la línea de conversión del recibo.
  const { debitAmount } = grantSession.quote
  participante.estado = 'pagado'
  participante.monedaPago = debitAmount.assetCode
  participante.montoPagado = unscaleValue(debitAmount.value, debitAmount.assetScale)
  delete participante.grantSession
  billRepository.save(bill)

  return { billId }
}

/**
 * Salida de emergencia del demo: suelta a un participante que se quedó
 * trabado en 'procesando' (cerró la pestaña del Accept, se le fue el wifi)
 * para que otro pueda pagar esa parte.
 *
 * Solo toca estado local: no habla con Open Payments ni revoca el grant. Si
 * el amigo termina el Accept después, el callback no encuentra grantSession
 * y se va a `?error=1` sin mover un peso.
 */
export function cancelarPago ({ billId, participanteId }: { billId: string, participanteId: string }) {
  const bill = billRepository.getById(billId)
  if (!bill) throw new BillError('Cuenta no encontrada', 404)

  const participante = bill.participantes.find((p) => p.id === participanteId)
  if (!participante) throw new BillError('Participante no encontrado', 404)

  if (participante.estado === 'pagado') {
    throw new BillError('Este participante ya pagó, no se puede cancelar', 400)
  }

  participante.estado = 'pendiente'
  participante.monedaPago = null
  participante.montoPagado = null
  delete participante.grantSession
  billRepository.save(bill)

  return { ok: true }
}
