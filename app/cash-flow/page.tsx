/**
 * Cash Flow — inflow vs outflow across all entities; runway projection.
 * Hero metric: Monthly Net Flow (income - expenses last 30d)
 * Animation: flowing money streams — currency symbols in income/expense lanes
 */
import Hero from '../_components/Hero'
import Achievements from '../_components/Achievements'
import { SpecCard } from '../_components/SpecCard'
import ComingSoon from '../_components/ComingSoon'
import HeroCanvas from './HeroCanvas'
import {
  getAccounts,
  accountSignedBalance,
  getCashFlowTxns30d,
  getTopExpenseCategories,
  getNetWorthProjection,
  getRecurringCharges,
  getUserProfile,
} from '../lib/queries'
import WhatIfSlider from './_components/WhatIfSlider'
import { AlertTriangle } from 'lucide-react'

export const dynamic = 'force-dynamic'

const USD = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const DEFAULT_ACHIEVEMENTS = [
  { name: 'First $10K Month',  description: 'Generated $10K+ net cash flow in a single month.',  xp: 200, progress: 100, icon: '💰', earned: true  },
  { name: '3 Months Positive', description: '3 consecutive months of positive cash flow.',          xp: 300, progress: 100, icon: '📈', earned: true  },
  { name: 'Multi-Entity Flow', description: 'Cash flow tracked across 3+ entities.',                xp: 150, progress: 100, icon: '🏛️', earned: true  },
  { name: 'Runway 12mo+',      description: 'Cash runway exceeds 12 months.',                       xp: 400, progress: 60,  icon: '🛫', earned: false },
  { name: 'Expense Cut',       description: 'Reduced monthly expenses by 10%+.',                    xp: 200, progress: 30,  icon: '✂️', earned: false },
  { name: 'Income Doubled',    description: 'Monthly income doubled year-over-year.',               xp: 500, progress: 50,  icon: '⬆️', earned: false },
  { name: 'Zero Burn Month',   description: 'A full month where income >= all expenses.',           xp: 350, progress: 10,  icon: '🔋', earned: false },
  { name: 'Cash Machine',      description: 'Portfolio generates $25K+ monthly income.',            xp: 750, progress: 20,  icon: '🏧', earned: false },
]

export default async function CashFlowPage() {
  const [accounts, txns30d, topExpenses, projection, recurring, profile] = await Promise.allSettled([
    getAccounts(),
    getCashFlowTxns30d(),  // already excludes transfers + CC autopay receipts
    getTopExpenseCategories(5),
    getNetWorthProjection().catch(() => ({ past: [], forecast: [] })),
    getRecurringCharges().catch(() => []),
    getUserProfile().catch(() => null),
  ]).then(results => results.map(r => (r.status === 'fulfilled' ? r.value : null)))

  // Plaid sign convention: negative = money IN, positive = money OUT.
  // getCashFlowTxns30d already strips:
  //   - TRANSFER_IN / TRANSFER_OUT (inter-account + intercompany wires)
  //   - Credit-account transactions with amount < 0 (receiving side of
  //     a checking→CC autopay — otherwise the $20k Amex payment appears
  //     as $20k outflow on checking AND $20k inflow on the card).
  const realTxns = (Array.isArray(txns30d) ? txns30d : []) as Array<Record<string, unknown>>
  const inflow30 = realTxns
    .filter(t => Number(t.amount) < 0)
    .reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
  const outflow30 = realTxns
    .filter(t => Number(t.amount) > 0)
    .reduce((s, t) => s + Number(t.amount), 0)
  const netFlow = inflow30 - outflow30

  const totalLiquid = (accounts as any[])
    .filter((a: any) => ['depository'].includes(String(a.type ?? '').toLowerCase()))
    .reduce((s: number, a: any) => s + accountSignedBalance(a), 0)

  const runwayMonths = outflow30 > 0 ? Math.round(totalLiquid / outflow30) : 99
  const savingsRate = inflow30 > 0 ? Math.round(((inflow30 - outflow30) / inflow30) * 100) : 0

  const xpEarned = DEFAULT_ACHIEVEMENTS.filter(a => a.earned).reduce((s, a) => s + a.xp, 0)

  // Group txns by entity for per-entity view — same transfer filter applies.
  const entityMap: Record<string, { inflow: number; outflow: number }> = {}
  realTxns.forEach((t: any) => {
    const eid = t.entity_id ?? 'personal'
    if (!entityMap[eid]) entityMap[eid] = { inflow: 0, outflow: 0 }
    const amt = Number(t.amount)
    if (amt < 0) entityMap[eid].inflow += Math.abs(amt)
    else entityMap[eid].outflow += amt
  })

  const categoryColors: Record<string, string> = {
    INCOME: 'var(--green)',
    TRANSFER_IN: 'var(--cyan)',
    FOOD_AND_DRINK: 'var(--orange)',
    GENERAL_MERCHANDISE: 'var(--purple)',
    TRANSPORTATION: 'var(--amber)',
    BANK_FEES: 'var(--red)',
    ENTERTAINMENT: 'var(--pink)',
    OTHER: 'var(--dim)',
  }

  return (
    <>
      <Hero
        label="≈ CASH FLOW · MONEY IN · MONEY OUT"
        greeting="30-day cash position."
        primaryMetric={`${netFlow >= 0 ? '+' : ''}${USD(netFlow)}`}
        metricSubtitle="Net Flow · last 30 days"
        kpiCards={[
          { label: 'Inflow 30d',     value: USD(inflow30),          delta: 'income + deposits',  deltaPositive: true  },
          { label: 'Burn Rate',      value: USD(outflow30),         delta: 'expenses 30d',       deltaPositive: false },
          { label: 'Runway',         value: `${runwayMonths}mo`,    delta: 'at current burn',    deltaPositive: runwayMonths > 6 },
          { label: 'Savings Rate',   value: `${savingsRate}%`,      delta: 'of income kept',     deltaPositive: savingsRate > 20 },
        ]}
        playerCard={{
          name: (profile as { full_name?: string } | null)?.full_name ?? 'Colby Culbertson',
          role: 'CEO · Cash Flow',
          // Single source of truth: users_profile.level; fall back to 1 (no drift)
          level: (profile as { level?: number } | null)?.level ?? 1,
          xpCurrent: (profile as { xp?: number } | null)?.xp ?? xpEarned,
          xpNext: (profile as { xp_next?: number } | null)?.xp_next ?? xpEarned + 500,
          stats: [
            { key: 'Inflow',   value: USD(inflow30) },
            { key: 'Outflow',  value: USD(outflow30) },
            { key: 'Net',      value: USD(netFlow) },
            { key: 'Runway',   value: `${runwayMonths}mo` },
          ],
        }}
        animationSlot={<HeroCanvas />}
      />

      {/* Red-alert banner — auto-fires when liquidity is tight. Review flag:
          savings rate < 5% OR runway < 2 months should scream visually, not
          sit in neutral grey. */}
      {(runwayMonths < 2 || savingsRate < 5) && (
        <div style={{
          margin: '0 0 20px',
          padding: '12px 16px',
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.32)',
          borderRadius: 12,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <AlertTriangle size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#ef4444', lineHeight: 1.45 }}>
            {runwayMonths < 2 && `Runway is ${runwayMonths} month${runwayMonths === 1 ? '' : 's'}. Aim for 6+.`}
            {runwayMonths < 2 && savingsRate < 5 && ' '}
            {savingsRate < 5 && `Savings rate ${savingsRate}% is below the 5% danger line.`}
          </span>
        </div>
      )}

      {/* What-If slider — model expense cuts against current burn. */}
      <div style={{ marginBottom: 20 }}>
        <WhatIfSlider liquidCash={totalLiquid} monthlyOutflow={outflow30} />
      </div>

      <Achievements items={DEFAULT_ACHIEVEMENTS} xpEarned={xpEarned} />

      {/* Inflow vs Outflow Summary */}
      <section style={{ marginBottom: 28 }}>
        <div className="section-header">
          <div className="section-header-left">
            <h2 className="section-title">Inflow vs Outflow</h2>
            <span className="achieve-count">{(txns30d as any[]).length} transactions</span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }} data-source="financial_transactions">
          <SpecCard accent dataSource="financial_transactions.amount">
            <div style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Total Inflow (30d)</div>
            <div style={{ fontSize: 32, fontWeight: 700, fontFamily: 'var(--mo)', color: 'var(--green)' }}>{USD(inflow30)}</div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, margin: '12px 0', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: inflow30 > 0 ? '100%' : '0%', background: 'var(--green)', borderRadius: 2 }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--dim)' }}>Income + deposits + transfers in</div>
          </SpecCard>

          <SpecCard accent dataSource="financial_transactions.amount">
            <div style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Total Outflow (30d)</div>
            <div style={{ fontSize: 32, fontWeight: 700, fontFamily: 'var(--mo)', color: 'var(--red)' }}>{USD(outflow30)}</div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, margin: '12px 0', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: outflow30 > 0 ? `${Math.min(100, (outflow30 / (inflow30 || 1)) * 100)}%` : '0%', background: 'var(--red)', borderRadius: 2 }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--dim)' }}>All expenses + payments</div>
          </SpecCard>

          <SpecCard accent dataSource="financial_accounts.balance_current">
            <div style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Liquid Cash</div>
            <div style={{ fontSize: 32, fontWeight: 700, fontFamily: 'var(--mo)', color: 'var(--amber)' }}>{USD(totalLiquid)}</div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, margin: '12px 0', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '70%', background: 'var(--amber)', borderRadius: 2 }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--dim)' }}>Depository accounts · {runwayMonths}mo runway</div>
          </SpecCard>
        </div>
      </section>

      {/* Top Expense Categories + Per-Entity Cash Flow */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
        {/* Top Expense Categories */}
        <SpecCard accent dataSource="financial_transactions.personal_finance_category">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Top Expense Categories</div>
          {(topExpenses as any[]).length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(topExpenses as any[]).map((cat: any, i: number) => {
                const maxAmt = (topExpenses as any[])[0]?.total ?? 1
                const barPct = Math.round((cat.total / maxAmt) * 100)
                const color = categoryColors[cat.category] ?? 'var(--dim)'
                return (
                  <div key={cat.category}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 500 }}>{cat.category.replace(/_/g, ' ')}</span>
                      <span style={{ fontSize: 12, fontFamily: 'var(--mo)', color }}>{USD(cat.total)}</span>
                    </div>
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${barPct}%`, background: color, borderRadius: 2 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--dim)', padding: '20px 0', textAlign: 'center' }}>No transactions in last 30 days.</div>
          )}
        </SpecCard>

        {/* Per-Entity Cash Flow */}
        <SpecCard accent dataSource="financial_transactions.entity_id">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Per-Entity Cash Flow</div>
          {Object.keys(entityMap).length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Object.entries(entityMap).slice(0, 6).map(([eid, cf]) => (
                <div key={eid} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{eid}</span>
                    <span style={{ fontSize: 12, fontFamily: 'var(--mo)', color: cf.inflow >= cf.outflow ? 'var(--green)' : 'var(--red)' }}>
                      {cf.inflow >= cf.outflow ? '+' : ''}{USD(cf.inflow - cf.outflow)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 10, color: 'var(--dim)' }}>
                    <span style={{ color: 'var(--green)' }}>↑ {USD(cf.inflow)}</span>
                    <span style={{ color: 'var(--red)' }}>↓ {USD(cf.outflow)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--dim)', padding: '20px 0', textAlign: 'center' }}>No entity-tagged transactions found.</div>
          )}
        </SpecCard>
      </div>

      {/* 12-Month Projection + Recurring Subscriptions + Upcoming Bills */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        {/* 12-Month Projection — derived from kpi_snapshots trend */}
        <SpecCard accent dataSource="kpi_snapshots.net_worth">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>12-Month Projection</div>
          {(() => {
            const p = projection as any
            const past = p?.past ?? []
            const forecast = p?.forecast ?? []
            if (past.length < 2) {
              return <div style={{ fontSize: 12, color: 'var(--dim)' }}>Need at least 2 kpi_snapshots to project. Current: {past.length}.</div>
            }
            const all = [...past, ...forecast]
            const maxV = Math.max(...all.map((r: any) => Number(r.value)))
            const minV = Math.min(...all.map((r: any) => Number(r.value)))
            const range = maxV - minV || 1
            const finalVal = Number(forecast[forecast.length - 1]?.value ?? 0)
            const currentVal = Number(past[past.length - 1]?.value ?? 0)
            const growth = finalVal - currentVal
            return (
              <>
                <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--mo)', color: 'var(--green)', marginBottom: 4 }}>
                  {USD(finalVal)}
                </div>
                <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 14 }}>
                  Projected in 12 months · {growth >= 0 ? '+' : ''}{USD(growth)}
                </div>
                <svg width="100%" height="60" viewBox="0 0 200 60" preserveAspectRatio="none">
                  {all.map((r: any, i: number) => {
                    if (i === 0) return null
                    const x1 = ((i - 1) / (all.length - 1)) * 200
                    const x2 = (i / (all.length - 1)) * 200
                    const y1 = 55 - ((Number(all[i - 1].value) - minV) / range) * 50
                    const y2 = 55 - ((Number(r.value) - minV) / range) * 50
                    const isForecast = i >= past.length
                    return (
                      <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                        stroke={isForecast ? 'var(--amber)' : 'var(--green)'}
                        strokeWidth={1.5}
                        strokeDasharray={isForecast ? '3 2' : ''}
                      />
                    )
                  })}
                </svg>
                <div style={{ fontSize: 9, color: 'var(--dim)', marginTop: 6, display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mo)' }}>
                  <span>solid=actual</span>
                  <span>dashed=projected</span>
                </div>
              </>
            )
          })()}
        </SpecCard>

        {/* Recurring Subscriptions — detected from transactions */}
        <SpecCard accent dataSource="financial_transactions.recurring">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Recurring Charges</div>
            <span style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--mo)' }}>{((recurring as any[]) ?? []).length} detected · includes mortgage/loan</span>
          </div>
          {((recurring as any[]) ?? []).length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--dim)', padding: '20px 0', textAlign: 'center' }}>
              No recurring charges detected. Plaid transactions needed to identify.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {((recurring as any[]) ?? []).slice(0, 6).map((r: any) => (
                <div key={r.merchant} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, minWidth: 0, overflow: 'hidden' }}>
                    <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.merchant}</div>
                    <div style={{ fontSize: 9, color: 'var(--dim)', fontFamily: 'var(--mo)' }}>
                      every ~{r.cadenceDays}d · {r.occurrences}× seen
                    </div>
                  </div>
                  <div style={{ fontSize: 12, fontFamily: 'var(--mo)', color: 'var(--orange)', alignSelf: 'center' }}>{USD(r.amount)}</div>
                </div>
              ))}
            </div>
          )}
        </SpecCard>

        {/* Upcoming Bills — same recurring detection, sorted by predicted next date */}
        <SpecCard accent dataSource="derived:upcoming_bills">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Upcoming Bills</div>
            <span style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--mo)' }}>next 30d</span>
          </div>
          {((recurring as any[]) ?? []).length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--dim)', padding: '20px 0', textAlign: 'center' }}>
              No recurring bills detected yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {((recurring as any[]) ?? [])
                .map((r: any) => {
                  // Roll the predicted next-charge date forward past today.
                  // A stale lastDate (say 60 days ago) shouldn't read as
                  // "60d overdue" — the next cycle is next month, not
                  // yesterday. Only mark as overdue if the most recent
                  // predicted date is >7 days ago (signal: actually late).
                  let next = new Date(new Date(r.lastDate).getTime() + r.cadenceDays * 86400000)
                  while (next.getTime() < Date.now() - 7 * 86400000) {
                    next = new Date(next.getTime() + r.cadenceDays * 86400000)
                  }
                  return { ...r, nextDate: next }
                })
                .filter((r: any) => {
                  // Hide subscriptions whose last-seen is >90 days ago;
                  // likely canceled, just noise in the pipeline.
                  const ageDays = (Date.now() - new Date(r.lastDate).getTime()) / 86400000
                  return ageDays <= 90
                })
                .sort((a: any, b: any) => a.nextDate.getTime() - b.nextDate.getTime())
                .slice(0, 6)
                .map((r: any) => {
                  const days = Math.ceil((r.nextDate.getTime() - Date.now()) / 86400000)
                  return (
                    <div key={r.merchant} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 11, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.merchant}</div>
                        <div style={{ fontSize: 9, color: days < 3 ? 'var(--red)' : days < 7 ? 'var(--amber)' : 'var(--dim)', fontFamily: 'var(--mo)' }}>
                          {days >= 0 ? `in ${days}d` : `${Math.abs(days)}d late`}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, fontFamily: 'var(--mo)', color: 'var(--amber)' }}>{USD(r.amount)}</div>
                    </div>
                  )
                })}
            </div>
          )}
        </SpecCard>
      </div>

      {/* Cash Flow by Category — waterfall bar chart (SVG) */}
      <SpecCard accent dataSource="financial_transactions.personal_finance_category" style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Cash Flow by Category (30d)</div>
        {(txns30d as any[]).length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', minWidth: 400, height: 100 }}>
              {(topExpenses as any[]).map((cat: any) => {
                const maxAmt = (topExpenses as any[])[0]?.total ?? 1
                const barH = Math.max(8, Math.round((cat.total / maxAmt) * 80))
                const color = categoryColors[cat.category] ?? 'var(--dim)'
                return (
                  <div key={cat.category} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
                    <div style={{ fontSize: 9, fontFamily: 'var(--mo)', color }}>{USD(cat.total)}</div>
                    <div style={{ width: '100%', height: barH, background: color, borderRadius: '4px 4px 0 0', opacity: 0.8 }} />
                    <div style={{ fontSize: 8, color: 'var(--dim)', textAlign: 'center', lineHeight: 1.2 }}>{cat.category.replace(/_/g, ' ').replace('AND', '&')}</div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--dim)', textAlign: 'center', padding: '20px 0' }}>No transaction data for chart.</div>
        )}
      </SpecCard>
    </>
  )
}
