import { useParams } from 'react-router-dom'

export default function PayScreen() {
  const { id } = useParams()

  return <h1 className="p-6 text-3xl font-bold">Pantalla del amigo ({id})</h1>
}
