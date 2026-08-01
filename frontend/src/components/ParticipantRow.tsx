import { useState } from 'react'
import type { Participante } from '../types'
import { cancelPago } from '../api/client'
import Money from './Money'

interface ParticipantRowProps {
  participante: Participante
  /** El assetCode de la bill: con esto se decide si hubo cambio de moneda. */
  assetCode: string
  /** Para poder soltar a alguien que se quedó trabado en 'procesando'. */
  billId: string
}

export default function ParticipantRow({
  participante: p,
  assetCode,
  billId,
}: ParticipantRowProps) {
  const [cancelando, setCancelando] = useState(false)

  // Solo hay conversión que mostrar si pagó en una moneda distinta a la
  // de la cuenta. El contrato deja monedaPago en null mientras no ha pagado.
  const convirtio =
    p.estado === 'pagado' &&
    p.monedaPago != null &&
    p.monedaPago !== assetCode &&
    p.montoPagado != null

  async function cancelar() {
    setCancelando(true)
    try {
      await cancelPago(billId, p.id)
      // No se toca nada más: el polling trae la fila ya en 'pendiente' y este
      // botón desaparece solo.
    } catch {
      // Si falla, lo único que se puede hacer es dejar reintentar. El estado
      // de verdad lo manda el backend, no esta fila.
      setCancelando(false)
    }
  }

  return (
    <li
      className={[
        'flex flex-col gap-1 rounded-2xl border px-4 py-3',
        p.estado === 'pagado'
          ? 'border-ok/40 bg-ok/10'
          : p.estado === 'procesando'
            ? 'border-wait/40 bg-wait/10'
            : 'border-white/10 bg-surface',
      ].join(' ')}
    >
      <div className="flex items-center gap-3">
        <span className="min-w-0 flex-1 truncate text-lg font-semibold">{p.nombre}</span>

        <Money
          value={p.monto}
          code={assetCode}
          className="text-lg font-bold whitespace-nowrap"
        />

        {p.estado === 'pagado' && (
          <span className="flex shrink-0 items-center gap-1.5 text-ok">
            <span aria-hidden="true">✅</span>
            <span className="text-sm font-semibold">pagado</span>
          </span>
        )}

        {p.estado === 'procesando' && (
          <span className="flex shrink-0 items-center gap-1.5 text-wait">
            <span
              aria-hidden="true"
              className="size-4 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin"
            />
            <span className="text-sm font-semibold">esperando confirmación</span>
            {/* Salida de emergencia: si se quedó trabado, esto libera su
                parte para que otro la pague. */}
            <button
              type="button"
              onClick={cancelar}
              disabled={cancelando}
              aria-label={`Cancelar el pago de ${p.nombre}`}
              className="rounded-md border border-white/20 px-2 py-0.5 text-xs font-semibold text-muted hover:border-white/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Cancelar
            </button>
          </span>
        )}

        {p.estado === 'pendiente' && (
          <span className="flex shrink-0 items-center gap-1.5 text-muted">
            <span aria-hidden="true">⏳</span>
            <span className="text-sm font-semibold">pendiente</span>
          </span>
        )}
      </div>

      {/* Lo que impresiona al jurado: pagó en euros y al restaurante le
          llegaron pesos. */}
      {convirtio && (
        <p className="flex items-center gap-1.5 self-end text-sm text-muted">
          <span aria-hidden="true">🌍</span>
          <Money value={p.montoPagado!} code={p.monedaPago!} />
          <span aria-hidden="true">→</span>
          <Money value={p.monto} code={assetCode} className="text-ok" />
        </p>
      )}
    </li>
  )
}
