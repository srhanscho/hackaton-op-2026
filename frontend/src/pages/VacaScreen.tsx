import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useBill } from '../hooks/useBill'
import { completeBill } from '../api/client'
import Glass from '../components/Glass'
import Money from '../components/Money'
import ParticipantList from '../components/ParticipantList'
import QrModal from '../components/QrModal'

export default function VacaScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { bill, loading, error } = useBill(id)

  // El QR se abre solo cuando se acaba de crear la vaca: Pantalla 1 navega
  // aquí con `?qr=1`. Al volver desde el vaso, el modal arranca cerrado.
  const [qrAbierto, setQrAbierto] = useState(() => params.get('qr') === '1')
  const [enviando, setEnviando] = useState(false)
  const [falloEnvio, setFalloEnvio] = useState<string | null>(null)

  function cerrarQr() {
    setQrAbierto(false)
    // Sin esto, recargar la pantalla lo volvería a abrir.
    if (params.get('qr') === null) return
    const limpio = new URLSearchParams(params)
    limpio.delete('qr')
    setParams(limpio, { replace: true })
  }

  async function enviar() {
    if (!id) return
    setEnviando(true)
    setFalloEnvio(null)
    try {
      // Esto NO mueve plata: cierra el incoming payment y devuelve el recibo.
      const recibo = await completeBill(id)
      // Se lo pasamos hecho al recibo para que no tenga que pedir nada.
      // `enviando` se queda en true a propósito: ya nos vamos de esta pantalla.
      navigate(`/vaca/${id}/recibo`, { state: { recibo } })
    } catch (e) {
      setFalloEnvio(e instanceof Error ? e.message : 'No se pudo cerrar la cuenta')
      setEnviando(false)
    }
  }

  if (!bill) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-6 text-xl text-muted">
        {loading ? 'Cargando la vaca…' : (error ?? 'No encontramos esta vaca')}
      </main>
    )
  }

  const completo = bill.porcentaje >= 100

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-5 p-5 pt-16">
      <button
        type="button"
        onClick={() => setQrAbierto(true)}
        aria-label="Mostrar el código QR para compartir"
        className="fixed top-4 right-4 z-10 rounded-full border border-white/20 bg-surface p-3 hover:border-white/60"
      >
        <svg viewBox="0 0 24 24" className="size-6" fill="currentColor" aria-hidden="true">
          <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm8-2h3v3h-3v-3zm5 0h3v3h-3v-3zm-5 5h3v3h-3v-3zm5 0h3v3h-3v-3z" />
        </svg>
      </button>

      {/* Si el polling falla suelto, el vaso se queda donde iba y esto avisa. */}
      {error && (
        <p className="rounded-xl border border-bad/40 bg-bad/10 px-3 py-2 text-center text-sm text-bad">
          Se perdió la conexión, reintentando…
        </p>
      )}

      <p className="text-center text-5xl font-bold">
        <Money value={bill.total} code={bill.assetCode} />
      </p>

      <div className="flex justify-center">
        <Glass percentage={bill.porcentaje} className="h-[46vh] max-h-[480px]" />
      </div>

      <p className="text-center text-xl text-muted">
        <Money
          value={bill.recibido}
          code={bill.assetCode}
          className="text-2xl font-bold text-white"
        />{' '}
        de <Money value={bill.total} code={bill.assetCode} />
      </p>

      <ParticipantList participantes={bill.participantes} assetCode={bill.assetCode} />

      {falloEnvio && (
        <p className="rounded-xl border border-bad/40 bg-bad/10 px-3 py-2 text-center font-semibold text-bad">
          {falloEnvio}
        </p>
      )}

      <button
        type="button"
        disabled={!completo || enviando}
        onClick={enviar}
        className="rounded-2xl bg-white px-6 py-4 text-xl font-bold text-bg disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-muted"
      >
        {enviando ? 'Cerrando la cuenta…' : 'Enviar'}
      </button>

      <QrModal billId={bill.id} open={qrAbierto} onClose={cerrarQr} />
    </main>
  )
}
