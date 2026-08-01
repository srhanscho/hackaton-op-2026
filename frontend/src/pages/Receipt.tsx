import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import type { Participante, Recibo } from '../types'
import { useBill } from '../hooks/useBill'
import Money from '../components/Money'

/** El último segmento de la wallet del restaurante hace de nombre. */
function nombreRestaurante(wallet: string) {
  try {
    const seg = new URL(wallet).pathname.split('/').filter(Boolean).pop()
    if (!seg) return 'El restaurante'
    return decodeURIComponent(seg)
      .replace(/[-_]+/g, ' ')
      .replace(/^\p{L}/u, (c) => c.toUpperCase())
  } catch {
    return wallet
  }
}

/** La fecha del recibo viene ISO del backend. Si viene rara, no se muestra. */
function fechaLarga(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(d)
}

/** Solo hay conversión que mostrar si pagó en una moneda distinta a la cuenta. */
function convirtio(p: Participante, assetCode: string) {
  return p.monedaPago != null && p.monedaPago !== assetCode && p.montoPagado != null
}

/**
 * Pantalla 4. Los datos llegan en `state.recibo` desde VacaScreen; si alguien
 * recarga o entra directo, se rearma con `useBill`. Aquí NUNCA se llama a
 * `completeBill()`: la cuenta ya se cerró en la pantalla anterior.
 */
export default function Receipt() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state } = useLocation() as { state: { recibo?: Recibo } | null }

  const recibo = state?.recibo
  // Sin recibo en el state hay que ir por la bill; con recibo no se sondea nada.
  const { bill, loading } = useBill(recibo ? undefined : id)

  const [copiado, setCopiado] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const fuente = recibo ?? bill
  if (!fuente) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-6 text-center text-xl text-muted">
        {loading ? 'Cargando el recibo…' : 'No encontramos esta cuenta'}
      </main>
    )
  }

  const { restaurantWallet, total, assetCode, participantes } = fuente
  const restaurante = nombreRestaurante(restaurantWallet)
  // La bill no trae ni fecha ni comprobante: eso solo existe en el recibo.
  const fecha = recibo ? fechaLarga(recibo.fecha) : null
  const comprobante = recibo?.incomingPaymentId ?? null

  const mensaje = `Cuenta cerrada en ${restaurante}. Pagamos entre ${participantes.length} por Interledger.`

  async function compartir() {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: 'La Vaca — cuenta cerrada', text: mensaje, url })
        return
      }
      await navigator.clipboard.writeText(`${mensaje} ${url}`)
      setCopiado(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopiado(false), 2000)
    } catch {
      // Cancelar el diálogo de compartir también cae aquí: no es un error
      // que valga la pena mostrarle a nadie.
    }
  }

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-8 p-5 pt-10 pb-12">
      <header className="flex flex-col items-center gap-4 text-center">
        <svg
          viewBox="0 0 24 24"
          role="img"
          aria-label="Cuenta cerrada"
          className="h-28 w-28 text-ok"
        >
          <circle cx="12" cy="12" r="11" fill="currentColor" opacity="0.16" />
          <circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M6.5 12.5 L10.5 16.5 L17.5 8"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <h1 className="text-4xl leading-tight font-bold text-ok">Cuenta cerrada</h1>

        <div className="flex flex-col gap-1">
          <p className="text-2xl font-semibold">{restaurante}</p>
          <Money
            value={total}
            code={assetCode}
            className="text-5xl leading-none font-bold"
          />
          {fecha && <p className="text-muted">{fecha}</p>}
        </div>
      </header>

      <section className="rounded-2xl bg-surface p-5">
        <h2 className="mb-2 text-lg font-semibold text-muted">Quién pagó qué</h2>

        <table className="w-full border-collapse text-left">
          <tbody>
            {participantes.map((p) => (
              <tr key={p.id} className="border-b border-white/10 last:border-0">
                <td className="py-3 pr-3 align-top">
                  <span className="text-lg font-semibold">{p.nombre}</span>
                  {/* Lo que impresiona al jurado: pagó en euros y al
                      restaurante le llegaron pesos. */}
                  {convirtio(p, assetCode) && (
                    <span className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
                      <span aria-hidden="true">🌍</span>
                      pagó <Money value={p.montoPagado!} code={p.monedaPago!} />
                    </span>
                  )}
                </td>
                <td className="py-3 text-right align-top">
                  <Money
                    value={p.monto}
                    code={assetCode}
                    className="text-lg font-bold whitespace-nowrap"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {comprobante && (
        <section className="flex min-w-0 flex-col gap-2 rounded-2xl border border-white/10 p-4">
          <h2 className="text-sm font-semibold text-muted">
            Comprobante verificable en Interledger
          </h2>
          {/* URL larguísima: que corte por donde sea antes que estirar la página. */}
          <p className="overflow-hidden font-mono text-xs leading-relaxed break-all text-white/70">
            {comprobante}
          </p>
        </section>
      )}

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={compartir}
          className="rounded-2xl bg-white px-6 py-4 text-xl font-bold text-bg"
        >
          {copiado ? '¡Copiado!' : 'Compartir'}
        </button>

        <button
          type="button"
          onClick={() => navigate('/')}
          className="rounded-2xl border border-white/20 px-6 py-4 text-xl font-bold hover:border-white/60"
        >
          Nueva vaca
        </button>
      </div>
    </main>
  )
}
