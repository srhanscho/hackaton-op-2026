import type { Participante } from './Participant.js'

export interface Bill {
  id: string
  /** Wallet del restaurante tal como la mandó el front. */
  restaurantWallet: string
  /** Moneda del incoming payment. Se lee de la wallet, nunca se recibe. */
  assetCode: string
  assetScale: number
  total: number
  incomingPaymentUrl: string
  accessToken: string
  participantes: Participante[]
  createdAt: string
  /** Cuándo se cerró la cuenta. Es la fecha que sale en el recibo. */
  completadoAt?: string
}
