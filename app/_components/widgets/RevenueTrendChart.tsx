/**
 * RevenueTrendChart — area-under-line chart for time-series money data.
 * Matches the CEO-dashboard reference: big headline value + gradient-filled
 * area chart spanning the period with subtle x-axis labels underneath.
 *
 * Server component, SVG-only.
 */
import { fmtMoney, fmtMoneyExact } from '../../lib/format'

interface Point { label: string; value: number }

export interface RevenueTrendChartProps {
  title: string
  points: Point[]
  priorTotal?: number
  priorLabel?: string
  tone?: 'green' | 'orange' | 'purple' | 'cyan' | 'pink'
  height?: number
  dataSource?: string
}

const PAINT: Record<string, { stroke: string; fillStart: string }> = {
  green:  { stroke: 'var(--green)',  fillStart: 'rgba(16,185,129,0.40)' },
  orange: { stroke: 'var(--orange)', fillStart: 'rgba(249,115,22,0.40)' },
  purple: { stroke: 'var(--purple)', fillStart: 'rgba(139,92,246,0.40)' },
  cyan:   { stroke: 'var(--cyan)',   fillStart: 'rgba(6,182,212,0.40)' },
  pink:   { stroke: 'var(--pink)',   fillStart: 'rgba(236,72,153,0.40)' },
}

export default function RevenueTrendChart({
  title,
  points,
  priorTotal,
  priorLabel,
  tone = 'green',
  height = 220,
  dataSource,
}: RevenueTrendChartProps) {
  const total = points.reduce((s, p) => s + p.value, 0)
  const avg = points.length > 0 ? total / points.length : 0
  const paint = PAINT[tone]
  const deltaPct = priorTotal != null && priorTotal !== 0
    ? ((total - priorTotal) / Math.abs(priorTotal)) * 100
    : null

  if (points.length === 0) {
    return (
      <div className="mc-card accent" data-source={dataSource} style={{ padding: '18px 22px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', marginBottom: 4 }}>{title}</div>
        <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--dim)', fontSize: 12 }}>
          No data in selected range.
        </div>
      </div>
    )
  }

  // SVG layout
  const W = 100
  const H = 100
  const max = Math.max(...points.map(p => p.value), 1)
  const min = Math.min(0, ...points.map(p => p.value))
  const span = max - min || 1
  const step = points.length > 1 ? W / (points.length - 1) : W
  const coords = points.map((p, i) => ({
    x: i * step,
    y: H - ((p.value - min) / span) * (H - 8) - 4,
    ...p,
  }))
  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(' ')
  const area = `${path} L${W.toFixed(2)},${H} L0,${H} Z`

  return (
    <div className="mc-card accent" data-source={dataSource} style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Title + headline total */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14 }}>
        <div>
          <div style={{
            fontSize: 11, color: 'var(--dim)', letterSpacing: '.08em',
            textTransform: 'uppercase', fontWeight: 600, fontFamily: 'var(--mo)', marginBottom: 4,
          }}>
            {title}
          </div>
          <div
            title={fmtMoneyExact(total)}
            style={{
              fontSize: 28, fontWeight: 700, fontFamily: 'var(--mo)', color: 'var(--t1)',
              fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em',
            }}
          >
            {fmtMoney(total)}
          </div>
          {priorTotal != null && (
            <div style={{ fontSize: 11, color: 'var(--dim)', fontFamily: 'var(--mo)', marginTop: 2 }}>
              vs {priorLabel ?? 'prior'}: <span style={{ color: 'var(--t3)' }}>{fmtMoney(priorTotal)}</span>
            </div>
          )}
        </div>
        {deltaPct != null && (
          <span style={{
            fontSize: 12, fontFamily: 'var(--mo)', fontWeight: 700,
            color: deltaPct >= 0 ? 'var(--green)' : 'var(--red)',
            padding: '4px 8px', borderRadius: 6,
            background: deltaPct >= 0 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
          }}>
            {deltaPct >= 0 ? '↑' : '↓'} {Math.abs(deltaPct).toFixed(1)}%
          </span>
        )}
      </div>

      {/* Chart area */}
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" width="100%" height={height}>
        <defs>
          <linearGradient id={`trend-grad-${tone}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor={paint.stroke} stopOpacity="0.42" />
            <stop offset="100%" stopColor={paint.stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* horizontal gridlines every 25% */}
        {[0.25, 0.5, 0.75].map(p => (
          <line key={p} x1="0" x2={W} y1={H * p} y2={H * p}
            stroke="rgba(255,255,255,0.06)" strokeWidth="0.25" strokeDasharray="1 2" />
        ))}
        <path d={area} fill={`url(#trend-grad-${tone})`} />
        <path d={path} fill="none" stroke={paint.stroke} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
          vectorEffect="non-scaling-stroke" />
        {/* small avg line */}
        {avg > 0 && (
          <line
            x1="0" x2={W}
            y1={H - ((avg - min) / span) * (H - 8) - 4}
            y2={H - ((avg - min) / span) * (H - 8) - 4}
            stroke="rgba(255,255,255,0.15)" strokeWidth="0.3" strokeDasharray="1 1.5"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>

      {/* Labels row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--mo)' }}>
        {points.map((p, i) => (
          <span key={i} title={fmtMoneyExact(p.value)} style={{ flex: 1, textAlign: 'center' }}>
            {p.label}
          </span>
        ))}
      </div>
    </div>
  )
}
