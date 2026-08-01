import { useId } from 'react'
import './Glass.css'

interface GlassProps {
  percentage: number
  className?: string
}

// Geometría en unidades del viewBox. Como todo escala con el viewBox, el
// mismo dibujo sirve a 500px de alto y a 160px sin tocar nada.
const ARRIBA = 20
const ABAJO = 240
// 6 unidades de más para que al 100% el líquido se monte sobre el borde
// en vez de quedar justo a ras.
const RECORRIDO = ABAJO - ARRIBA + 6

// Trapecio invertido, más ancho arriba. Abierto por arriba, esquinas de
// abajo redondeadas.
const VASO = 'M 20 20 L 56 230 Q 58 240 68 240 L 132 240 Q 142 240 144 230 L 180 20'
const VASO_CERRADO = `${VASO} Z`

// Onda de 8 medios periodos (400 de ancho) para un viewBox de 200: sobra
// por los dos lados, así se puede desplazar un periodo entero sin que se
// vea el salto. La superficie está en y=0; el relleno baja hasta 600.
const ONDA =
  'M -200 0 q 25 -8 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 L 200 600 L -200 600 Z'

const GOTAS = [
  { cx: 32, cy: 30, r: 5, delay: '820ms' },
  { cx: 168, cy: 34, r: 4, delay: '1000ms' },
  { cx: 47, cy: 24, r: 3, delay: '1180ms' },
]

const CHISPAS = [
  { cx: 26, cy: 52, r: 4, delay: '800ms' },
  { cx: 174, cy: 60, r: 3.5, delay: '900ms' },
  { cx: 100, cy: 8, r: 4.5, delay: '860ms' },
  { cx: 58, cy: 6, r: 3, delay: '1000ms' },
  { cx: 146, cy: 10, r: 3.5, delay: '960ms' },
]

export default function Glass({ percentage, className }: GlassProps) {
  const uid = useId().replace(/:/g, '')
  const gradId = `g-${uid}`
  const vasoClip = `vc-${uid}`
  const liquidoMask = `lm-${uid}`

  const pct = Math.min(100, Math.max(0, Number.isFinite(percentage) ? percentage : 0))
  const lleno = pct >= 100

  // La onda tiene su superficie en y=0, así que basta con bajarla.
  const nivel = { transform: `translateY(${ABAJO - (pct / 100) * RECORRIDO}px)` }

  // El mismo líquido se dibuja dos veces: en ámbar para verlo, y en blanco
  // dentro de una <mask> para recortar el número. Comparten clases, así que
  // se mueven exactamente igual. Tiene que ser <mask> y no <clipPath>:
  // clipPath ignora los <g>, y el nivel y la onda son dos grupos anidados.
  const liquido = (relleno: string) => (
    <g className="vaca-nivel" style={nivel}>
      <g className="vaca-onda">
        <path d={ONDA} fill={relleno} />
      </g>
    </g>
  )

  return (
    <svg
      viewBox="0 0 200 260"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Vaso lleno al ${Math.round(pct)} por ciento`}
      className={['vaca-vaso', lleno ? 'vaca-lleno' : '', className]
        .filter(Boolean)
        .join(' ')}
    >
      <defs>
        {/* Claro en la superficie, oscuro hacia el fondo. En coordenadas
            del líquido, así el brillo siempre queda arriba del todo. */}
        <linearGradient id={gradId} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="240">
          <stop offset="0%" stopColor="var(--liquid-1)" />
          <stop offset="100%" stopColor="var(--liquid-2)" />
        </linearGradient>

        <clipPath id={vasoClip}>
          <path d={VASO_CERRADO} />
        </clipPath>

        <mask
          id={liquidoMask}
          maskUnits="userSpaceOnUse"
          x="-200"
          y="-100"
          width="600"
          height="1200"
        >
          {liquido('#fff')}
        </mask>
      </defs>

      {/* Vaso vacío: apenas un velo para que se vea contra el fondo oscuro */}
      <path d={VASO_CERRADO} fill="rgba(255,255,255,0.06)" />

      <g clipPath={`url(#${vasoClip})`}>
        {liquido(`url(#${gradId})`)}
        {/* Brillo del vidrio, por encima del líquido */}
        <path
          d="M 41 44 L 63 206"
          fill="none"
          stroke="#fff"
          strokeOpacity="0.16"
          strokeWidth="8"
          strokeLinecap="round"
        />
      </g>

      {/* El borde va después del líquido para tapar el filo del recorte */}
      <path
        d={VASO}
        fill="none"
        stroke="var(--glass)"
        strokeOpacity="0.9"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <text x="100" y="134" textAnchor="middle" dominantBaseline="central" className="vaca-pct vaca-pct-fuera">
        {Math.round(pct)}%
      </text>
      <text
        x="100"
        y="134"
        textAnchor="middle"
        dominantBaseline="central"
        mask={`url(#${liquidoMask})`}
        className="vaca-pct vaca-pct-dentro"
      >
        {Math.round(pct)}%
      </text>

      {/* Se monta solo al llegar al 100%: la animación corre una vez y
          termina invisible. Sin estado ni timers. */}
      {lleno && (
        <g aria-hidden="true">
          {GOTAS.map((g) => (
            <circle
              key={`gota-${g.cx}`}
              className="vaca-gota"
              cx={g.cx}
              cy={g.cy}
              r={g.r}
              fill="var(--liquid-2)"
              style={{ animationDelay: g.delay }}
            />
          ))}
          {CHISPAS.map((c) => (
            <circle
              key={`chispa-${c.cx}`}
              className="vaca-chispa"
              cx={c.cx}
              cy={c.cy}
              r={c.r}
              fill="var(--liquid-1)"
              style={{ animationDelay: c.delay }}
            />
          ))}
        </g>
      )}
    </svg>
  )
}
