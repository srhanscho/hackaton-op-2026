import type { Participante } from './Participant.js'

export interface Bill {
  id: string
  restauranteWallet: string
  moneda: string
  total: number
  incomingPaymentUrl: string
  accessToken: string
  participantes: Participante[]
  createdAt: string
}
