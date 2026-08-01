import { client, getWallet, scaleValue } from './client.js'
import { isFinalizedGrantWithAccessToken } from '@interledger/open-payments'
import type { IncomingPaymentWithPaymentMethods } from '@interledger/open-payments'

export interface CreateIncomingPaymentResult {
  incomingPayment: IncomingPaymentWithPaymentMethods
  accessToken: string
}

export async function createIncomingPayment ({
  total,
  descripcion
}: { total: number, descripcion: string }): Promise<CreateIncomingPaymentResult> {
  const wallet = await getWallet()

  const grant = await client.grant.request(
    { url: wallet.authServer },
    {
      access_token: {
        access: [
          {
            type: 'incoming-payment',
            actions: ['create', 'read']
          }
        ]
      }
    }
  )

  if (!isFinalizedGrantWithAccessToken(grant)) {
    throw new Error('El grant de incoming-payment no se finalizó correctamente')
  }

  const accessToken = grant.access_token.value

  const incomingPayment = await client.incomingPayment.create(
    { url: wallet.resourceServer, accessToken },
    {
      walletAddress: wallet.id,
      incomingAmount: {
        value: scaleValue(total, wallet.assetScale),
        assetCode: wallet.assetCode,
        assetScale: wallet.assetScale
      },
      metadata: { descripcion }
    }
  )

  return { incomingPayment, accessToken }
}

export async function getIncomingPayment ({
  id,
  accessToken
}: { id: string, accessToken: string }): Promise<IncomingPaymentWithPaymentMethods> {
  return client.incomingPayment.get({ url: id, accessToken })
}
