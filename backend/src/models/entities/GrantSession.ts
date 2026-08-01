import type { Quote } from '@interledger/open-payments'

export interface GrantSession {
  billId: string
  participanteId: string
  walletAddress: string
  quote: Quote
  continueUri: string
  continueAccessToken: string
  redirectUrl: string
  createdAt: string
}
