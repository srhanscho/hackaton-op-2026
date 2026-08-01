import { client, getWallet, scaleValue } from './client.js'
import { isFinalizedGrantWithAccessToken } from '@interledger/open-payments'
import type { IncomingPayment, IncomingPaymentWithPaymentMethods, WalletAddress } from '@interledger/open-payments'

export interface CreateIncomingPaymentResult {
  incomingPayment: IncomingPaymentWithPaymentMethods
  accessToken: string
  /** La wallet del restaurante. De aquí sale la moneda de la cuenta. */
  wallet: WalletAddress
}

/**
 * Crea el incoming payment EN LA WALLET DEL RESTAURANTE. La plata nunca pasa
 * por la nuestra: cada pago va directo del amigo al restaurante, sin custodia.
 * La app solo firma la petición con su llave.
 */
export async function createIncomingPayment ({
  restaurantWallet,
  total,
  descripcion
}: { restaurantWallet: string, total: number, descripcion: string }): Promise<CreateIncomingPaymentResult> {
  const wallet = await getWallet(restaurantWallet)

  const grant = await client.grant.request(
    // El authServer del restaurante, no el nuestro. Un grant de
    // incoming-payment es no interactivo: no hace falta que el dueño de la
    // wallet apruebe nada para que le puedan pagar.
    { url: wallet.authServer },
    {
      access_token: {
        access: [
          {
            type: 'incoming-payment',
            // 'complete' va desde el principio: es el mismo token que usa
            // después el botón Enviar para cerrar el pago. Sin esto da 403.
            actions: ['create', 'read', 'complete']
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

  return { incomingPayment, accessToken, wallet }
}

export async function getIncomingPayment ({
  id,
  accessToken
}: { id: string, accessToken: string }): Promise<IncomingPaymentWithPaymentMethods> {
  return client.incomingPayment.get({ url: id, accessToken })
}

/** Cierra el incoming payment: nadie más le puede meter plata. */
export async function completeIncomingPayment ({
  id,
  accessToken
}: { id: string, accessToken: string }): Promise<IncomingPayment> {
  return client.incomingPayment.complete({ url: id, accessToken })
}
