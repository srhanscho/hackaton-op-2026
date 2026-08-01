import type { Participante } from '../types'
import ParticipantRow from './ParticipantRow'

interface ParticipantListProps {
  participantes: Participante[]
  assetCode: string
}

export default function ParticipantList({ participantes, assetCode }: ParticipantListProps) {
  return (
    <ul className="flex flex-col gap-2">
      {participantes.map((p) => (
        <ParticipantRow key={p.id} participante={p} assetCode={assetCode} />
      ))}
    </ul>
  )
}
