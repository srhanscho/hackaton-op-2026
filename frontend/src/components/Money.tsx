import { money } from '../lib/money'

interface MoneyProps {
  value: number
  /** Del `assetCode` de la bill. Mientras no haya bill, la cuenta es en COP. */
  code?: string
  className?: string
}

/** Monto formateado con `.tabular`, para que no baile mientras hay polling. */
export default function Money({ value, code = 'COP', className }: MoneyProps) {
  return (
    <span className={['tabular', className].filter(Boolean).join(' ')}>
      {money(value, code)}
    </span>
  )
}
