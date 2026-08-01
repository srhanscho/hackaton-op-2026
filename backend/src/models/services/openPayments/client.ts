import 'dotenv/config'
import { createAuthenticatedClient } from '@interledger/open-payments'
import type { AuthenticatedClient, WalletAddress } from '@interledger/open-payments'

export const WALLET_ADDRESS = process.env.WALLET_ADDRESS as string

export const client: AuthenticatedClient = await createAuthenticatedClient({
  walletAddressUrl: WALLET_ADDRESS,
  privateKey: process.env.PRIVATE_KEY as string,
  keyId: process.env.KEY_ID as string,
  logLevel: 'debug'
})

export async function getWallet (url: string = WALLET_ADDRESS): Promise<WalletAddress> {
  return client.walletAddress.get({ url })
}

export function scaleValue (value: number, assetScale: number): string {
  return String(Math.round(value * 10 ** assetScale))
}
