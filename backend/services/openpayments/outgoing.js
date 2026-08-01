import { randomUUID } from 'node:crypto'
import { client, getWallet } from './client.js'
import { isFinalizedGrantWithAccessToken } from '@interledger/open-payments'

export async function requestOutgoingGrant ({ payerWallet, quote, finishUri }) {
  const wallet = await getWallet(payerWallet)

  const grant = await client.grant.request(
    { url: wallet.authServer },
    {
      access_token: {
        access: [
          {
            type: 'outgoing-payment',
            actions: ['create'],
            identifier: wallet.id,
            limits: {
              debitAmount: quote.debitAmount
            }
          }
        ]
      },
      interact: {
        start: ['redirect'],
        finish: {
          method: 'redirect',
          uri: finishUri,
          nonce: randomUUID()
        }
      }
    }
  )

  return {
    redirectUrl: grant.interact.redirect,
    continueUri: grant.continue.uri,
    continueAccessToken: grant.continue.access_token.value
  }
}

export async function continueOutgoingGrant ({ continueUri, continueAccessToken, interactRef }) {
  const grant = await client.grant.continue(
    {
      url: continueUri,
      accessToken: continueAccessToken
    },
    { interact_ref: interactRef }
  )

  if (!isFinalizedGrantWithAccessToken(grant)) {
    throw new Error('El grant de outgoing-payment no se finalizó correctamente')
  }

  return grant
}

export async function createOutgoingPayment ({ payerWallet, quote, accessToken }) {
  const wallet = await getWallet(payerWallet)

  return client.outgoingPayment.create(
    {
      url: wallet.resourceServer,
      accessToken
    },
    {
      walletAddress: wallet.id,
      quoteId: quote.id
    }
  )
}
