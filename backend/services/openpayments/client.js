import { createAuthenticatedClient } from "@interledger/open-payments";

export const client = createAuthenticatedClient({
  walletAddressUrl: process.env.WALLET_ADDRESS,
  privateKey: process.env.PRIVATE_KEY,
  keyId: process.env.KEY_ID,
  logLevel: 'debug'
})

export const wallet = client.walletAddress.get({
  url: process.env.WALLET_ADDRESS
})
