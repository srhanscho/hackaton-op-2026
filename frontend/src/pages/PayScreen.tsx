import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useBill } from '../hooks/useBill'
import { payShare } from '../api/client'
import Money from '../components/Money'

// Se precarga en el input para que el amigo solo escriba su nombre. Nadie
// va a teclear 40 caracteres de URL con el mesero mirando.
const PREFIJO = 'https://ilp.interledger-test.dev/'

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

/** Pide algo después de la última barra: si no, el backend falla igual. */
function walletValida(v: string) {
  const t = v.trim()
  if (!/^https?:\/\//i.test(t)) return false
  try {
    return new URL(t).pathname.split('/').filter(Boolean).length > 0
  } catch {
    return false
  }
}

export default function PayScreen() {
  const { id } = useParams()
  const { bill, loading, error } = useBill(id)

  const [yoId, setYoId] = useState<string | null>(null)
  const [wallet, setWallet] = useState(PREFIJO)
  const [enviando, setEnviando] = useState(false)
  const [fallo, setFallo] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Al elegirse, el cursor queda DESPUÉS del prefijo: escribe el nombre y ya.
  useEffect(() => {
    if (!yoId) return
    const el = inputRef.current
    if (!el) return
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
  }, [yoId])

  if (loading && !bill) {
    return <p className="p-6 text-xl text-muted">Cargando la cuenta…</p>
  }

  if (!bill) {
    return (
      <main className="mx-auto flex max-w-md flex-col gap-3 p-6">
        <h1 className="text-2xl font-bold text-bad">No encontramos esta cuenta</h1>
        <p className="text-muted">{error ?? 'Pídele el link otra vez a quien la creó.'}</p>
      </main>
    )
  }

  // Se busca en cada render: si el polling lo marca pagado mientras dudaba,
  // la pantalla se entera sola.
  const yo = bill.participantes.find((p) => p.id === yoId) ?? null
  const puedePagar = yo?.estado === 'pendiente' && walletValida(wallet) && !enviando

  async function pagar() {
    if (!id || !yo) return
    setEnviando(true)
    setFallo(null)
    try {
      const redirectUrl = await payShare(id, yo.id, wallet.trim())
      // Sale de la app hacia el auth server. `enviando` se queda en true a
      // propósito: el botón no se reactiva mientras el navegador navega.
      window.location.href = redirectUrl
    } catch (e) {
      setFallo(e instanceof Error ? e.message : 'No se pudo iniciar el pago')
      setEnviando(false)
    }
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-8 p-5 pb-12">
      <header className="flex flex-col gap-1">
        <p className="text-muted">Estás pagando en</p>
        <h1 className="text-3xl leading-tight font-bold">
          {nombreRestaurante(bill.restaurantWallet)}
        </h1>
        <p className="text-lg text-muted">
          Cuenta total <Money value={bill.total} code={bill.assetCode} className="text-white" />
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl font-bold">¿Quién eres?</h2>

        <ul className="flex flex-col gap-3">
          {bill.participantes.map((p) => {
            const pagado = p.estado === 'pagado'
            const procesando = p.estado === 'procesando'
            const bloqueado = pagado || procesando
            const elegido = p.id === yoId

            return (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={bloqueado}
                  onClick={() => {
                    setYoId(p.id)
                    setWallet(PREFIJO)
                    setFallo(null)
                  }}
                  className={[
                    'flex w-full items-center justify-between gap-3 rounded-2xl border-2 px-4 py-4 text-left transition-colors',
                    bloqueado
                      ? 'cursor-not-allowed border-white/10 bg-surface/60'
                      : elegido
                        ? 'border-liquid-2 bg-surface'
                        : 'border-white/15 bg-surface hover:border-white/40',
                  ].join(' ')}
                >
                  <span className="flex flex-col">
                    <span
                      className={[
                        'text-xl font-semibold',
                        bloqueado ? 'text-muted' : 'text-white',
                      ].join(' ')}
                    >
                      {p.nombre}
                    </span>
                    <Money
                      value={p.monto}
                      code={bill.assetCode}
                      className={pagado ? 'text-ok' : procesando ? 'text-wait' : 'text-muted'}
                    />
                  </span>

                  {pagado && (
                    <span className="flex shrink-0 items-center gap-2 text-ok">
                      <span className="font-semibold">Pagó</span>
                      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7">
                        <circle cx="12" cy="12" r="11" fill="currentColor" opacity="0.18" />
                        <path
                          d="M7 12.5 L10.5 16 L17 8.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  )}
                  {procesando && (
                    <span className="shrink-0 font-semibold text-wait">Procesando…</span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      {yo && (
        <section className="flex flex-col gap-5 rounded-2xl bg-surface p-5">
          <label className="flex flex-col gap-2">
            <span className="text-lg font-semibold">Tu wallet address</span>
            <input
              ref={inputRef}
              type="url"
              inputMode="url"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              className="w-full rounded-xl border-2 border-white/20 bg-bg px-4 py-3 text-lg outline-none focus:border-liquid-2"
            />
            <span className="text-sm text-muted">
              Ya te pusimos el servidor de prueba. Solo escribe tu nombre al final.
            </span>
          </label>

          <div className="flex flex-col gap-1">
            <span className="text-muted">Tu parte</span>
            <Money
              value={yo.monto}
              code={bill.assetCode}
              className="text-5xl leading-none font-bold"
            />
          </div>

          {yo.estado !== 'pendiente' && (
            <p className="font-semibold text-ok">Esta parte ya quedó paga.</p>
          )}
          {fallo && <p className="font-semibold text-bad">{fallo}</p>}

          <button
            type="button"
            onClick={pagar}
            disabled={!puedePagar}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-liquid-2 px-5 py-4 text-xl font-bold text-bg transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            {enviando ? (
              <>
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 animate-spin">
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    opacity="0.3"
                  />
                  <path
                    d="M21 12a9 9 0 0 0-9-9"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
                Abriendo tu wallet…
              </>
            ) : (
              'Pagar mi parte'
            )}
          </button>
        </section>
      )}
    </main>
  )
}
