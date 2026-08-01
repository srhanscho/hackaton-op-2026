import { client, getWallet, scaleValue } from './client.js'

export async function createIncomingPayment ({ total, descripcion }) {
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

  const accessToken = grant.access_token.value

  const incomingPayment = await client.incomingPayment.create(
    {
      url: wallet.resourceServer,
      accessToken
    },
    {
      walletAddress: wallet.id,
      incomingAmount: {
        value: scaleValue(total, wallet.assetScale),
        assetCode: wallet.assetCode,
        assetScale: wallet.assetScale
      },
      metadata: {
        descripcion
      }
    }
  )

  return { incomingPayment, accessToken }
}

export async function getIncomingPayment ({ id, accessToken }) {
  return client.incomingPayment.get({ url: id, accessToken })
}
