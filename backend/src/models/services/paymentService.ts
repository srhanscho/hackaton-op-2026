import { createQuote } from './openPayments/quote.js'
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

  participante.estado = 'pagado'
  delete participante.grantSession
  billRepository.save(bill)

  return { billId }
}
