import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createBill } from '../api/client'
import Money from '../components/Money'

interface Fila {
  nombre: string
  monto: string
}

const DEMO_WALLET = 'https://ilp.interledger-test.dev/restaurante'

const num = (s: string) => {
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

/** El contrato manda unidades enteras, así que aquí no hay decimales. */
const entero = (s: string) => Math.max(0, Math.round(num(s)))

/**
 * Partes iguales. Lo que no divide exacto se le suma al primero, así la
 * suma siempre cuadra de entrada y el botón arranca habilitado.
 */
function repartir(total: number, n: number): number[] {
  const base = Math.floor(total / n)
  const sobra = total - base * n
  return Array.from({ length: n }, (_, i) => (i === 0 ? base + sobra : base))
}

function filasIniciales(total: number, n: number, previas: Fila[] = []): Fila[] {
  const montos = repartir(total, n)
  return Array.from({ length: n }, (_, i) => ({
    nombre: previas[i]?.nombre ?? `Persona ${i + 1}`,
    monto: String(montos[i]),
  }))
}

const INPUT =
  'w-full rounded-xl border border-white/15 bg-surface px-4 py-3 text-lg outline-none focus:border-white/50'

export default function CreateBill() {
  const navigate = useNavigate()

  const [wallet, setWallet] = useState('')
  const [total, setTotal] = useState('')
  const [personas, setPersonas] = useState(3)
  const [filas, setFilas] = useState<Fila[]>(() => filasIniciales(0, 3))
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalNum = entero(total)
  const asignado = filas.reduce((suma, f) => suma + entero(f.monto), 0)
  const diferencia = totalNum - asignado
  const cuadra = totalNum > 0 && diferencia === 0
  const puedeEnviar = cuadra && wallet.trim().length > 0 && !enviando

  // Cambiar el total o la cantidad de gente sí reparte de nuevo. Lo que
  // nunca recalcula a los demás es editar un monto a mano.
  function cambiarTotal(v: string) {
    setTotal(v)
    setFilas((prev) => filasIniciales(entero(v), prev.length, prev))
  }

  function cambiarPersonas(v: string) {
    const n = Math.min(8, Math.max(2, Math.round(num(v)) || 2))
    setPersonas(n)
    setFilas((prev) => filasIniciales(totalNum, n, prev))
  }

  function editarFila(i: number, campo: keyof Fila, valor: string) {
    setFilas((prev) => prev.map((f, j) => (j === i ? { ...f, [campo]: valor } : f)))
  }

  function datosDemo() {
    setWallet(DEMO_WALLET)
    setTotal('90000')
    setPersonas(3)
    setFilas([
      { nombre: "Han's", monto: '30000' },
      { nombre: 'Camilo', monto: '30000' },
      { nombre: 'Ana', monto: '30000' },
    ])
    setError(null)
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!puedeEnviar) return
    setEnviando(true)
    setError(null)
    try {
      const billId = await createBill({
        restaurantWallet: wallet.trim(),
        total: totalNum,
        participantes: filas.map((f, i) => ({
          nombre: f.nombre.trim() || `Persona ${i + 1}`,
          monto: entero(f.monto),
        })),
      })
      navigate(`/vaca/${billId}?qr=1`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la vaca')
      setEnviando(false)
    }
  }

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 p-5">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-3">
          <img
            src="/logo.png"
            alt="La Vaca"
            width={64}
            height={64}
            className="h-16 w-16"
          />
          <h1 className="text-3xl font-bold">Nueva vaca</h1>
        </div>
        <button
          type="button"
          onClick={datosDemo}
          className="shrink-0 rounded-lg border border-white/15 px-3 py-1.5 text-sm text-muted hover:border-white/40 hover:text-white"
        >
          Datos de demo
        </button>
      </header>

      <form onSubmit={enviar} className="flex flex-col gap-6">
        <label className="flex flex-col gap-2">
          <span className="text-muted">Wallet del restaurante</span>
          <input
            type="text"
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            placeholder="https://ilp.interledger-test.dev/..."
            autoComplete="off"
            spellCheck={false}
            className={INPUT}
          />
        </label>

        <div className="flex gap-4">
          <label className="flex flex-1 flex-col gap-2">
            <span className="text-muted">Total de la cuenta</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={total}
              onChange={(e) => cambiarTotal(e.target.value)}
              placeholder="90000"
              className={`${INPUT} tabular`}
            />
          </label>
          <label className="flex w-32 flex-col gap-2">
            <span className="text-muted">Personas</span>
            <input
              type="number"
              inputMode="numeric"
              min={2}
              max={8}
              value={personas}
              onChange={(e) => cambiarPersonas(e.target.value)}
              className={`${INPUT} tabular`}
            />
          </label>
        </div>

        <div className="flex flex-col gap-2">
          {filas.map((f, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={f.nombre}
                onChange={(e) => editarFila(i, 'nombre', e.target.value)}
                aria-label={`Nombre de la persona ${i + 1}`}
                className={INPUT}
              />
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={f.monto}
                onChange={(e) => editarFila(i, 'monto', e.target.value)}
                aria-label={`Monto de la persona ${i + 1}`}
                className={`${INPUT} w-36 text-right tabular`}
              />
            </div>
          ))}
        </div>

        {/* El contador es lo único que reacciona a editar un monto. */}
        <p
          aria-live="polite"
          className="text-xl font-semibold"
          style={{
            color: totalNum === 0 ? 'var(--muted)' : cuadra ? 'var(--ok)' : 'var(--bad)',
          }}
        >
          {totalNum === 0 ? (
            // Sin total todavía no hay nada que cuadrar: ni verde ni rojo.
            'Escribe el total de la cuenta'
          ) : cuadra ? (
            <>
              Asignado: <Money value={asignado} /> de <Money value={totalNum} /> ✅
            </>
          ) : diferencia > 0 ? (
            <>
              Faltan por asignar: <Money value={diferencia} /> ⚠️
            </>
          ) : (
            <>
              Te pasaste por: <Money value={-diferencia} /> ⚠️
            </>
          )}
        </p>

        {error && <p style={{ color: 'var(--bad)' }}>{error}</p>}

        <button
          type="submit"
          disabled={!puedeEnviar}
          className="rounded-2xl bg-white px-6 py-4 text-xl font-bold text-bg disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-muted"
        >
          {enviando ? 'Creando…' : 'Crear vaca'}
        </button>
      </form>
    </main>
  )
}
