// Copiado tal cual de la sección "Tipos para el frontend" de CONTRATO.md.
// No se cambia sin avisarle a Camilo.

export type EstadoParticipante = 'pendiente' | 'procesando' | 'pagado'

export interface Participante {
  id: string
  nombre: string
  monto: number
  estado: EstadoParticipante
  monedaPago: string | null
  montoPagado: number | null
}

export interface Bill {
  id: string
  restaurantWallet: string
  total: number
  recibido: number
  porcentaje: number
  completado: boolean
  assetCode: string
  participantes: Participante[]
}

export interface Recibo {
  billId: string
  restaurantWallet: string
  total: number
  assetCode: string
  fecha: string
  incomingPaymentId: string
  participantes: Participante[]
}
