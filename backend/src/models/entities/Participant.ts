import type { GrantSession } from './GrantSession.js'

export type ParticipanteEstado = 'pendiente' | 'procesando' | 'pagado'

export interface Participante {
  id: string
  nombre: string
  monto: number
  estado: ParticipanteEstado
  /** Moneda en la que pagó de verdad. Null mientras no haya pagado. */
  monedaPago: string | null
  /** Lo que salió de SU wallet, en unidades enteras de `monedaPago`. */
  montoPagado: number | null
  grantSession?: GrantSession
}
