'use client'

import { Repeat } from 'lucide-react'
import { fmtMoney, fmtMoneyExact } from '../../../lib/format'

const C = {
  ink: '#f5f5f7',
  dim: 'rgba(255,255,255,0.55)',
  dim2: 'rgba(255,255,255,0.35)',
  card: 'rgba(255,255,255,0.03)',
  line: 'rgba(255,255,255,0.07)',
}

// ─── Personal Net Worth Radial ─────────────────────────────────────────────

export function PersonalRadial({ netWorth, liquidCash, brokerage, debt }: {
  netWorth: number
  liquidCash: number
  brokerage: number
  debt: number
}) {
  const totalAssets = liquidCash + brokerage
  const cashPct = totalAssets > 0 ? liquidCash / totalAssets : 0.5
  const radius = 80
  const stroke = 14
  const circumference = 2 * Math.PI * radius
  const cashArc = cashPct * circumference
  const brokerageArc = (1 - cashPct) * circumference

  return (
    <div style={{
      background: C.card, border: `1px solid ${C.line}`, borderRadius: 14,
      padding: '20px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
    }}>
      <svg width={200} height={200} viewBox="-100 -100 200 200" style={{ transform: 'rotate(-90deg)' }}>
        {/* Debt ring (outer, red if non-zero) */}
        {debt > 0 && (
          <circle cx={0} cy={0} r={radius + 10} fill="none"
            stroke="rgba(239,68,68,0.35)" strokeWidth={3}
            strokeDasharray={`${(2*Math.PI*(radius+10))}`} />
        )}
        {/* Brokerage slice */}
        {brokerage > 0 && (
          <circle cx={0} cy={0} r={radius} fill="none"
            stroke="#8b5cf6" strokeWidth={stroke}
            strokeDasharray={`${brokerageArc} ${circumference - brokerageArc}`}
            strokeDashoffset={-cashArc} />
        )}
        {/* Cash slice */}
        {liquidCash > 0 && (
          <circle cx={0} cy={0} r={radius} fill="none"
            stroke="#06b6d4" strokeWidth={stroke}
            strokeDasharray={`${cashArc} ${circumference - cashArc}`} />
        )}
      </svg>
      <div style={{ marginTop: -140, textAlign: 'center' }}>
        <div style={{ fontSize: 10, color: C.dim2, fontFamily: 'var(--mo)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
          Personal Net Worth
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, color: C.ink, fontFamily: 'var(--mo)', marginTop: 4 }}
             title={fmtMoneyExact(netWorth)}>
          {fmtMoney(netWorth)}
        </div>
      </div>
      <div style={{ height: 140 }} />
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
        <LegendDot color="#06b6d4" label="Cash"      value={fmtMoney(liquidCash)} />
        <LegendDot color="#8b5cf6" label="Brokerage" value={fmtMoney(brokerage)} />
        {debt > 0 && <LegendDot color="#ef4444" label="Debt" value={fmtMoney(debt)} />}
      </div>
    </div>
  )
}

function LegendDot({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
      <span style={{ fontSize: 11, color: C.dim, fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 11, fontFamily: 'var(--mo)', color: C.ink }}>{value}</span>
    </div>
  )
}

// ─── Recurring Charges (Subscription Audit) ──────────────────────────────

interface Charge { merchant: string; occurrences: number; avgAmount: number; totalAmount: number }

export function RecurringChargesList({ charges }: { charges: Charge[] }) {
  if (charges.length === 0) {
    return (
      <section style={{
        background: C.card, border: `1px solid ${C.line}`, borderRadius: 14,
        padding: '16px 18px',
      }}>
        <Header label="Subscription Audit" color="var(--amber)" icon={<Repeat size={13} />} />
        <div style={{
          padding: '24px 12px', textAlign: 'center', fontSize: 12, color: C.dim2,
        }}>
          No recurring charges detected in the last 120 days. Link a personal
          card to populate this.
        </div>
      </section>
    )
  }
  const total = charges.reduce((s, c) => s + c.totalAmount, 0)
  return (
    <section style={{
      background: C.card, border: `1px solid ${C.line}`, borderRadius: 14,
      padding: '16px 18px',
    }}>
      <Header label={`Subscription Audit · ${charges.length} recurring`} color="var(--amber)" icon={<Repeat size={13} />} />
      <div style={{ marginBottom: 10, fontSize: 12, color: C.dim }}>
        Total spend on likely-recurring merchants (120d): <strong style={{ color: C.ink, fontFamily: 'var(--mo)' }}>{fmtMoney(total)}</strong>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
        {charges.map((c) => (
          <div key={c.merchant} style={{
            display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, alignItems: 'center',
            padding: '8px 12px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: 8,
          }}>
            <span style={{
              fontSize: 12, color: C.ink, fontWeight: 500,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }} title={c.merchant}>{c.merchant}</span>
            <span title={fmtMoneyExact(c.avgAmount)}
                  style={{ fontSize: 11, color: C.ink, fontFamily: 'var(--mo)', fontWeight: 600 }}>
              {fmtMoney(c.avgAmount)}
            </span>
            <span style={{ fontSize: 10, color: C.dim2, fontFamily: 'var(--mo)' }}>×{c.occurrences}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function Header({ label, color, icon }: { label: string; color: string; icon: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <span style={{ color, display: 'flex' }}>{icon}</span>
      <span style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '.12em',
        textTransform: 'uppercase', color,
        fontFamily: 'var(--mo)',
      }}>{label}</span>
    </div>
  )
}
