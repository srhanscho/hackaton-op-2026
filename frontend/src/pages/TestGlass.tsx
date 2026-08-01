import { useState } from 'react'
import Glass from '../components/Glass'

// Banco de pruebas del vaso. No es parte del demo, es para verlo sin backend.
const ATAJOS = [0, 33, 66, 100]

export default function TestGlass() {
  const [pct, setPct] = useState(0)

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 p-6">
      <h1 className="text-2xl font-bold">Banco de pruebas — El vaso</h1>

      <div className="flex items-end justify-center gap-10">
        {/* Tamaño de la pantalla principal */}
        <Glass percentage={pct} className="h-[500px]" />

        {/* Miniatura: la de la pantalla de gracias */}
        <div className="flex flex-col items-center gap-2">
          <Glass percentage={pct} className="h-[160px]" />
          <span className="text-sm text-muted">160px</span>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl bg-surface p-5">
        <label className="flex flex-col gap-2">
          <span className="text-muted">
            Porcentaje: <strong className="tabular text-white">{pct}%</strong>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={pct}
            onChange={(e) => setPct(Number(e.target.value))}
            className="w-full accent-[var(--liquid-2)]"
          />
        </label>

        <div className="flex gap-3">
          {ATAJOS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setPct(v)}
              className="rounded-xl border border-white/20 px-5 py-2 text-lg font-semibold tabular hover:border-white/60"
            >
              {v}%
            </button>
          ))}
        </div>
      </div>
    </main>
  )
}
