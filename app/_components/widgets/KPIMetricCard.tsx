/**
 * KPIMetricCard — the canonical headline-number card for every dashboard.
 *
 * Pattern (per design references shared 2026-04-18):
 *   [label ↗]                         [tiny sparkline]
 *   $ 204,407  ↑ +1.5%
 *   vs Last month: $197,044
 *
 * Server component. Sparkline is SVG, no JS needed.
 */
import { fmtMoney, fmtMoneyExact, fmtPct } from '../../lib/format'

export interface KPIMetricCardProps {
  label: string
  value: number
  /** Points for the sparkline, oldest → newest. Last point is the current. */
  sparkline?: number[]
  /** Manually override the trend color, else auto from deltaPct sign. */
  tone?: 'green' | 'red' | 'amber' | 'purple' | 'cyan' | 'orange'
  /** Prior-period value for the "vs Last X: $Y" line. */
  priorValue?: number
  priorLabel?: string
  /** Override the auto-computed delta %. */
  deltaPct?: number
  /** Currency (default USD) — set to '' for count-style KPIs. */
  currency?: string
  /** Data-source attribute for spec-lint. */
  dataSource?: string
}

export default function KPIMetricCard({
  label,
  value,
  sparkline,
  tone,
  priorValue,
  priorLabel = 'Last month',
  deltaPct,
  currency = 'USD',
  dataSource,
}: KPIMetricCardProps) {
  const computedDelta = deltaPct != null
    ? deltaPct
    : priorValue != null && priorValue !== 0
      ? ((value - priorValue) / Math.abs(priorValue)) * 100
      : null

  const up = (computedDelta ?? 0) >= 0
  const trendColor = tone
    ? `var(--${tone})`
    : up ? 'var(--green)' : 'var(--red)'

  const fmt = (n: number) => currency ? fmtMoney(n) : n.toLocaleString()

  return (
    <div className="mc-card accent" data-source={dataSource} style={{
      padding: '18px 20px',
      display: 'flex', flexDirection: 'column', gap: 8,
      minHeight: 132,
    }}>
      {/* Header row: label + sparkline */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{
          fontSize: 11, color: 'var(--dim)', letterSpacing: '.08em',
          textTransform: 'uppercase', fontWeight: 600, fontFamily: 'var(--mo)',
          display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>
          {label}
          <span style={{ opacity: 0.5 }}>↗</span>
        </div>
        {sparkline && sparkline.length >= 2 && <Spark points={sparkline} color={trendColor} />}
      </div>

      {/* Value row */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <div
          title={currency ? fmtMoneyExact(value) : String(value)}
          style={{
            fontSize: 26,
            fontWeight: 700,
            fontFamily: 'var(--mo)',
            color: 'var(--t1)',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.01em',
          }}
        >
          {fmt(value)}
        </div>
        {computedDelta != null && (
          <span style={{
            fontSize: 11, fontFamily: 'var(--mo)', fontWeight: 700, color: trendColor,
            padding: '2px 6px', borderRadius: 6, background: `${trendColor}18`,
            whiteSpace: 'nowrap',
          }}>
            {up ? '↑' : '↓'} {fmtPct(Math.abs(computedDelta))}
          </span>
        )}
      </div>

      {/* vs prior line */}
      {priorValue != null && (
        <div style={{ fontSize: 11, color: 'var(--dim)', fontFamily: 'var(--mo)' }}>
          vs {priorLabel}: <span style={{ color: 'var(--t3)' }}>{fmt(priorValue)}</span>
        </div>
      )}
    </div>
  )
}

// ─── Sparkline ─────────────────────────────────────────────────────────────

function Spark({ points, color }: { points: number[]; color: string }) {
  const W = 80
  const H = 28
  const max = Math.max(...points)
  const min = Math.min(...points)
  const span = max - min || 1
  const step = points.length > 1 ? W / (points.length - 1) : W
  const path = points
    .map((v, i) => {
      const x = i * step
      const y = H - ((v - min) / span) * (H - 4) - 2
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  const area = `${path} L${(points.length - 1) * step},${H} L0,${H} Z`

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id={`spark-grad-${color.replace(/[^a-z]/gi, '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#spark-grad-${color.replace(/[^a-z]/gi, '')})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
