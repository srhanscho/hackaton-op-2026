import { client, getWallet, scaleValue } from './client.js'

export async function createQuote ({ payerWallet, receiver, debitAmount }) {
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

  const quote = await client.quote.create(
    {
      url: wallet.resourceServer,
      accessToken: grant.access_token.value
    },
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
