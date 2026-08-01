import 'dotenv/config'
import { createAuthenticatedClient } from '@interledger/open-payments'

export const WALLET_ADDRESS = process.env.WALLET_ADDRESS

export const client = await createAuthenticatedClient({
  walletAddressUrl: WALLET_ADDRESS,
  privateKey: process.env.PRIVATE_KEY,
  keyId: process.env.KEY_ID,
  logLevel: 'debug'
})

export async function getWallet (url = WALLET_ADDRESS) {
  return client.walletAddress.get({ url })
}

export function scaleValue (value, assetScale) {
  return String(Math.round(value * 10 ** assetScale))
}
