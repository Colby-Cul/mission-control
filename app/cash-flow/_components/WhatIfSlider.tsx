'use client'

import { useState } from 'react'
import { Sliders } from 'lucide-react'
import { fmtMoney } from '../../lib/format'

/**
 * What-If Slider — the CEO's "if I cut X%, how much runway do I buy?"
 * tool. Client-side math, no persistence. Given current cash + monthly
 * outflow, slide to see runway at different expense-cut levels.
 */
export default function WhatIfSlider({
  liquidCash,
  monthlyOutflow,
}: {
  liquidCash: number
  monthlyOutflow: number
}) {
  const [pctCut, setPctCut] = useState(0)

  const effectiveBurn = monthlyOutflow * (1 - pctCut / 100)
  const baselineMonths = monthlyOutflow > 0 ? liquidCash / monthlyOutflow : 99
  const newMonths      = effectiveBurn > 0 ? liquidCash / effectiveBurn : 99
  const delta          = newMonths - baselineMonths
  const monthlyShaved  = monthlyOutflow - effectiveBurn

  return (
    <section style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 14,
      padding: '16px 18px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ color: 'var(--purple)', display: 'flex' }}><Sliders size={13} /></span>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '.12em',
          textTransform: 'uppercase', color: 'var(--purple)',
          fontFamily: 'var(--mo)',
        }}>What-If Scenario</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginLeft: 8 }}>
          drag to model a spending cut
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16, alignItems: 'center' }}>
        <div>
          <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', display: 'block', marginBottom: 8, fontFamily: 'var(--mo)' }}>
            If I cut expenses by <strong style={{ color: '#f97316' }}>{pctCut}%</strong>
          </label>
          <input
            type="range"
            min={0}
            max={50}
            step={5}
            value={pctCut}
            onChange={(e) => setPctCut(Number(e.target.value))}
            style={{
              width: '100%',
              accentColor: '#f97316',
              height: 8,
            }}
            aria-label="Expense-cut percentage"
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--mo)', marginTop: 4 }}>
            <span>0%</span><span>25%</span><span>50%</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <StatLine
            label="New runway"
            value={`${newMonths.toFixed(1)} mo`}
            delta={`${delta >= 0 ? '+' : ''}${delta.toFixed(1)} mo`}
            color={delta > 0 ? '#10b981' : 'rgba(255,255,255,0.5)'}
          />
          <StatLine
            label="Monthly savings"
            value={fmtMoney(monthlyShaved)}
            color={monthlyShaved > 0 ? '#10b981' : 'rgba(255,255,255,0.5)'}
          />
          <StatLine
            label="New burn"
            value={fmtMoney(effectiveBurn)}
            color="#ef4444"
          />
        </div>
      </div>
    </section>
  )
}

function StatLine({ label, value, delta, color }: { label: string; value: string; delta?: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {delta && (
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--mo)' }}>
            {delta}
          </span>
        )}
        <span style={{ fontSize: 14, fontWeight: 700, color, fontFamily: 'var(--mo)' }}>
          {value}
        </span>
      </div>
    </div>
  )
}
