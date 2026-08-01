import { client, getWallet, scaleValue } from './client.js'
import { isFinalizedGrantWithAccessToken } from '@interledger/open-payments'
import type { Quote } from '@interledger/open-payments'

export async function createQuote ({
  payerWallet,
  receiver,
  debitAmount
}: { payerWallet: string, receiver: string, debitAmount: number }): Promise<Quote> {
  const wallet = await getWallet(payerWallet)

  const grant = await client.grant.request(
    { url: wallet.authServer },
    {
      access_token: {
        access: [
          {
            type: 'quote',
            actions: ['create', 'read']
          }
        ]
      }
    }
  )

  if (!isFinalizedGrantWithAccessToken(grant)) {
    throw new Error('El grant de quote no se finalizó correctamente')
  }

  const quote = await client.quote.create(
    { url: wallet.resourceServer, accessToken: grant.access_token.value },
    {
      walletAddress: wallet.id,
      receiver,
      method: 'ilp',
      debitAmount: {
        value: scaleValue(debitAmount, wallet.assetScale),
        assetCode: wallet.assetCode,
        assetScale: wallet.assetScale
      }
    }
  )

  return quote
}
