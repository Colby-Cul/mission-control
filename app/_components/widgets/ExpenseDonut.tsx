/**
 * ExpenseDonut — headline total + donut + categorized legend list.
 * Used on /companies/[slug] and /finance for expense breakdown. Matches
 * the reference layout: total $ top-left, donut center, color-coded
 * legend list right side with per-category dollar amounts.
 *
 * Server component.
 */
import { fmtMoney, fmtMoneyExact, fmtPct } from '../../lib/format'

export interface ExpenseSlice { label: string; value: number }

const PALETTE = [
  'var(--green)',
  'var(--amber)',
  'var(--accent)',
  'var(--red)',
  'var(--pink)',
  'var(--purple)',
  'var(--cyan)',
  'var(--blue)',
]

export default function ExpenseDonut({
  title = 'Expenses',
  slices,
  priorTotal,
  priorLabel,
  dataSource,
}: {
  title?: string
  slices: ExpenseSlice[]
  priorTotal?: number
  priorLabel?: string
  dataSource?: string
}) {
  const total = slices.reduce((s, x) => s + x.value, 0)
  if (total === 0) {
    return (
      <div className="mc-card accent" data-source={dataSource} style={{ padding: '18px 22px' }}>
        <div style={{ fontSize: 11, color: 'var(--dim)', letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 600, fontFamily: 'var(--mo)', marginBottom: 8 }}>{title}</div>
        <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--dim)', fontSize: 12 }}>
          No expenses in selected range.
        </div>
      </div>
    )
  }

  const R = 58
  const STROKE = 22
  const CIRC = 2 * Math.PI * R
  let offset = 0
  const segments = slices.map((s, i) => {
    const pct = s.value / total
    const len = pct * CIRC
    const seg = { ...s, pct, len, start: offset, color: PALETTE[i % PALETTE.length] }
    offset += len
    return seg
  })

  const deltaPct = priorTotal != null && priorTotal !== 0
    ? ((total - priorTotal) / Math.abs(priorTotal)) * 100
    : null

  return (
    <div className="mc-card accent" data-source={dataSource} style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--dim)', letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 600, fontFamily: 'var(--mo)' }}>{title}</div>
          <div
            title={fmtMoneyExact(total)}
            style={{ fontSize: 26, fontWeight: 700, fontFamily: 'var(--mo)', color: 'var(--t1)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em', marginTop: 4 }}
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
            fontSize: 11, fontFamily: 'var(--mo)', fontWeight: 700,
            color: deltaPct >= 0 ? 'var(--red)' : 'var(--green)',
            padding: '3px 7px', borderRadius: 6,
            background: deltaPct >= 0 ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
            alignSelf: 'flex-start',
          }}>
            {deltaPct >= 0 ? '↑' : '↓'} {Math.abs(deltaPct).toFixed(1)}%
          </span>
        )}
      </div>

      {/* Donut + Legend */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 22, alignItems: 'center' }}>
        <svg width={150} height={150} viewBox="-75 -75 150 150" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={0} cy={0} r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={STROKE} />
          {segments.map((s) => (
            <circle
              key={s.label}
              cx={0} cy={0} r={R}
              fill="none"
              stroke={s.color}
              strokeWidth={STROKE}
              strokeDasharray={`${s.len} ${CIRC - s.len}`}
              strokeDashoffset={-s.start}
            />
          ))}
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          {segments.slice(0, 6).map((s) => (
            <div key={s.label} style={{ display: 'grid', gridTemplateColumns: '10px 1fr auto auto', gap: 8, alignItems: 'center', fontSize: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
              <span style={{
                color: 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }} title={s.label}>
                {s.label}
              </span>
              <span style={{ color: 'var(--dim)', fontFamily: 'var(--mo)', fontSize: 11 }}>
                {fmtPct(s.pct * 100)}
              </span>
              <span
                title={fmtMoneyExact(s.value)}
                style={{ color: 'var(--t1)', fontFamily: 'var(--mo)', fontWeight: 600, minWidth: 60, textAlign: 'right' }}
              >
                {fmtMoney(s.value)}
              </span>
            </div>
          ))}
          {segments.length > 6 && (
            <div style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--mo)', marginTop: 4 }}>
              + {segments.length - 6} more categories
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
