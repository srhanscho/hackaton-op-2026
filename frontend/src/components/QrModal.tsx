import { useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

type Props = {
  billId: string
  open: boolean
  onClose: () => void
}

// Este link es el que escanea la gente en la mesa, no lo tocamos con estado.
function payUrl(billId: string) {
  return `${window.location.origin}/pagar/${billId}`
}

export default function QrModal({ billId, open, onClose }: Props) {
  const [copiado, setCopiado] = useState(false)
  const timer = useRef<number | null>(null)

  const url = payUrl(billId)
  const mensaje = `Paga tu parte de la cuenta aquí: ${url}`

  // Escape cierra. Se registra solo cuando el modal está abierto para no
  // robarle la tecla al resto de la pantalla.
  useEffect(() => {
    if (!open) return

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  // Al cerrar, el botón vuelve a "Copiar" para la próxima vez que se abra.
  useEffect(() => {
    if (open) return
    if (timer.current) window.clearTimeout(timer.current)
    setCopiado(false)
  }, [open])

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [])

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // Sin permiso de portapapeles no hay nada que hacer: el link está
      // ahí abajo y es seleccionable.
      return
    }
    setCopiado(true)
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopiado(false), 2000)
  }

  function abrirWhatsapp() {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(mensaje)}`,
      '_blank',
      'noopener,noreferrer'
    )
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        // El click dentro del modal no se propaga al overlay, si no se cierra
        // apenas tocas el QR.
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Código QR para pagar"
        className="relative w-full max-w-sm rounded-3xl bg-surface p-6 shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-2xl leading-none text-muted transition hover:bg-white/10 hover:text-white"
        >
          ×
        </button>

        <h2 className="mb-5 pr-10 text-xl font-bold">Escanea para pagar</h2>

        {/* El QR va sobre blanco puro: sobre el morado del fondo los lectores
            sufren. */}
        <div className="flex justify-center rounded-2xl bg-white p-4">
          <QRCodeSVG value={url} size={240} level="M" />
        </div>

        <p className="mt-4 select-all break-all text-center text-xs text-muted">
          {url}
        </p>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={copiar}
            className="flex-1 rounded-xl border border-white/20 px-4 py-3 text-base font-semibold transition hover:border-white/60"
          >
            {copiado ? '¡Copiado!' : 'Copiar'}
          </button>

          <button
            type="button"
            onClick={abrirWhatsapp}
            className="flex-1 rounded-xl bg-ok px-4 py-3 text-base font-semibold text-bg transition hover:brightness-110"
          >
            WhatsApp
          </button>
        </div>
      </div>
    </div>
  )
}
