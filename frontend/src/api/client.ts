import type { Bill, Recibo } from '../types'
import * as mock from './mock'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

// Se apaga cuando Camilo tenga los endpoints. Es el único switch.
const USE_MOCK: boolean = true

/** Body de POST /api/bills. */
export interface CrearBillInput {
  restaurantWallet: string
  total: number
  participantes: { nombre: string; monto: number }[]
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} en ${path}`)
  return (await res.json()) as T
}

/** POST /api/bills → devuelve el billId. */
export async function createBill(input: CrearBillInput): Promise<string> {
  if (USE_MOCK) return mock.createBill()
  const { billId } = await req<{ billId: string }>('/api/bills', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return billId
}

/** GET /api/bills/:id */
export async function getBill(id: string): Promise<Bill> {
  if (USE_MOCK) return mock.getBill(id)
  return req<Bill>(`/api/bills/${id}`)
}

/** POST /api/bills/:id/pay → devuelve el redirectUrl del auth server. */
export async function payShare(
  id: string,
  participanteId: string,
  walletAddress: string,
): Promise<string> {
  if (USE_MOCK) return mock.payShare(id)
  const { redirectUrl } = await req<{ redirectUrl: string }>(
    `/api/bills/${id}/pay`,
    {
      method: 'POST',
      body: JSON.stringify({ participanteId, walletAddress }),
    },
  )
  return redirectUrl
}

/** POST /api/bills/:id/complete → devuelve el recibo. Tira 400 si falta plata. */
export async function completeBill(id: string): Promise<Recibo> {
  if (USE_MOCK) return mock.completeBill(id)
  const { recibo } = await req<{ recibo: Recibo }>(
    `/api/bills/${id}/complete`,
    { method: 'POST' },
  )
  return recibo
}
