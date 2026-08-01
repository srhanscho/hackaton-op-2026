import type { GrantSession } from './GrantSession.js'

export type ParticipanteEstado = 'pendiente' | 'procesando' | 'pagado'

export interface Participante {
  id: string
  nombre: string
  monto: number
  estado: ParticipanteEstado
  grantSession?: GrantSession
}
