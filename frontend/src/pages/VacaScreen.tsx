import { useParams } from 'react-router-dom'

export default function VacaScreen() {
  const { id } = useParams()

  return <h1 className="p-6 text-3xl font-bold">Pantalla 3 — El vaso ({id})</h1>
}
