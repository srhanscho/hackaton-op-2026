import { randomUUID } from 'node:crypto'
import { client, getWallet } from './client.js'
import { isFinalizedGrantWithAccessToken } from '@interledger/open-payments'
import type { GrantWithAccessToken, OutgoingPaymentWithSpentAmounts, Quote } from '@interledger/open-payments'

export interface OutgoingGrantInfo {
  redirectUrl: string
  continueUri: string
  continueAccessToken: string
}

export async function requestOutgoingGrant ({
  payerWallet,
  quote,
  finishUri
}: { payerWallet: string, quote: Quote, finishUri: string }): Promise<OutgoingGrantInfo> {
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

  if (!('interact' in grant) || !grant.interact.redirect) {
    throw new Error('El grant de outgoing-payment no requiere interacción')
  }

  return {
    redirectUrl: grant.interact.redirect,
    continueUri: grant.continue.uri,
    continueAccessToken: grant.continue.access_token.value
  }
}

export async function continueOutgoingGrant ({
  continueUri,
  continueAccessToken,
  interactRef
}: { continueUri: string, continueAccessToken: string, interactRef: string }): Promise<GrantWithAccessToken> {
  const grant = await client.grant.continue(
    { url: continueUri, accessToken: continueAccessToken },
    { interact_ref: interactRef }
  )

  if (!isFinalizedGrantWithAccessToken(grant)) {
    throw new Error('El grant de outgoing-payment no se finalizó correctamente')
  }

  return grant
}

export async function createOutgoingPayment ({
  payerWallet,
  quote,
  accessToken
}: { payerWallet: string, quote: Quote, accessToken: string }): Promise<OutgoingPaymentWithSpentAmounts> {
  const wallet = await getWallet(payerWallet)

  return client.outgoingPayment.create(
    { url: wallet.resourceServer, accessToken },
    { walletAddress: wallet.id, quoteId: quote.id }
  )
}
