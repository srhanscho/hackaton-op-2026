import { useEffect, useState } from 'react'
import type { Bill } from '../types'
import { getBill } from '../api/client'

/**
 * Polling cada 1.5s a GET /api/bills/:id.
 * Para de sondear cuando la cuenta queda cerrada (`completado`).
 */
export function useBill(id: string | undefined) {
  const [bill, setBill] = useState<Bill | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    const billId = id
    let vivo = true
    // Encadenado en vez de setInterval: así una respuesta lenta no deja
    // peticiones montadas una encima de otra.
    let timer: ReturnType<typeof setTimeout> | undefined

    async function tick() {
      try {
        const b = await getBill(billId)
        if (!vivo) return
        setBill(b)
        setError(null)
        if (b.completado) return // cuenta cerrada, no se reprograma
      } catch (e) {
        if (!vivo) return
        // Un fallo suelto no borra lo que ya se mostraba: el vaso se queda
        // donde iba y el siguiente intento sigue.
        setError(e instanceof Error ? e.message : 'No se pudo cargar la vaca')
      } finally {
        if (vivo) setLoading(false)
      }
      if (vivo) timer = setTimeout(tick, 1500)
    }

    tick()

    return () => {
      vivo = false
      clearTimeout(timer)
    }
  }, [id])

  return { bill, loading: id ? loading : false, error }
}
