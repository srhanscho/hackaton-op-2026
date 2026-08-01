import { useState } from 'react'
import QrModal from '../components/QrModal'

// Banco de pruebas del modal QR, fuera del flujo del demo.
export default function TestQr() {
  const [open, setOpen] = useState(false)
  const [billId, setBillId] = useState('demo-bill-123')

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 p-6">
      <h1 className="text-2xl font-bold">Banco de pruebas — Modal QR</h1>

      <div className="flex flex-col gap-4 rounded-2xl bg-surface p-5">
        <label className="flex flex-col gap-2">
          <span className="text-muted">billId</span>
          <input
            value={billId}
            onChange={(e) => setBillId(e.target.value)}
            className="rounded-xl border border-white/20 bg-bg px-4 py-3 text-base"
          />
        </label>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-xl border border-white/20 px-5 py-3 text-lg font-semibold hover:border-white/60"
        >
          Abrir modal QR
        </button>
      </div>

      <QrModal billId={billId} open={open} onClose={() => setOpen(false)} />
    </main>
  )
}
