import { useParams } from 'react-router-dom'
import { useBill } from '../hooks/useBill'
import Glass from '../components/Glass'
import Money from '../components/Money'

export default function ThanksScreen() {
  const { id } = useParams()
  // El mismo polling de 1.5s del vaso grande: aquí es para que el amigo vea
  // su propio pago entrar y el nivel subir, sin recargar nada.
  const { bill } = useBill(id)

  const faltan = bill ? bill.participantes.filter((p) => p.estado !== 'pagado').length : 0
  const completa = !!bill && faltan === 0

  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-8 p-6 pt-12 text-center">
      <svg viewBox="0 0 24 24" role="img" aria-label="Pago confirmado" className="h-28 w-28 text-ok">
        <circle cx="12" cy="12" r="11" fill="currentColor" opacity="0.16" />
        <circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M6.5 12.5 L10.5 16.5 L17.5 8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <h1 className="text-4xl leading-tight font-bold">Tu parte quedó paga</h1>

      <Glass percentage={bill?.porcentaje ?? 0} className="h-[160px]" />

      {bill && (
        <p className="text-lg text-muted">
          <Money value={bill.recibido} code={bill.assetCode} className="text-white" /> de{' '}
          <Money value={bill.total} code={bill.assetCode} className="text-white" />
        </p>
      )}

      <p className={['text-2xl font-bold', completa ? 'text-ok' : 'text-white'].join(' ')}>
        {completa
          ? 'La cuenta está completa'
          : `Faltan ${faltan} ${faltan === 1 ? 'persona' : 'personas'} por pagar`}
      </p>
    </main>
  )
}
