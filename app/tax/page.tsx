/**
 * Tax Center — deadlines, deductions, entity tax status, CPA hub.
 * Hero metric: YTD Est. Tax Liability
 * Animation: calendar/deadline orbits on concentric Q1/Q2/Q3/Q4 rings
 */
import Hero from '../_components/Hero'
import Achievements from '../_components/Achievements'
import { SpecCard } from '../_components/SpecCard'
import ComingSoon from '../_components/ComingSoon'
import HeroCanvas from './HeroCanvas'
import {
  getTaxEntities,
  getTaxMoves,
  getUpcomingTaxDeadlines,
  getTopExpenseCategories,
  getDerivedTaxMoves,
  getComplianceChecklist,
  getAuditReadiness,
  getDeductionsYtd,
  getEntityDocuments,
  getProperties,
} from '../lib/queries'
import {
  currentCompanyKey,
  getQbProfitLoss,
  parseProfitLoss,
  type ParsedPL,
} from '../lib/quickbooks'

export const dynamic = 'force-dynamic'

const USD = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const DEFAULT_ACHIEVEMENTS = [
  { name: 'First Filing',        description: 'Filed your first tax return via Mission Control.',   xp: 100, progress: 100, icon: '📁', earned: true  },
  { name: 'Cost Seg Deployed',   description: 'Cost segregation study completed on a property.',    xp: 500, progress: 60,  icon: '🏗️', earned: false },
  { name: 'S-Corp Elected',      description: 'S-Corp election filed for qualifying entity.',       xp: 300, progress: 100, icon: '🏢', earned: true  },
  { name: 'Quarterly Warrior',   description: 'All 4 quarterly estimated payments made on time.',   xp: 200, progress: 75,  icon: '⚔️', earned: false },
  { name: '$10K Saved',          description: 'Captured $10K+ in tax savings through planning.',    xp: 400, progress: 100, icon: '💰', earned: true  },
  { name: 'All Entities Current', description: 'Every entity has filed current-year returns.',      xp: 250, progress: 40,  icon: '✅', earned: false },
  { name: 'Audit Shield',        description: 'All entity documents organized and audit-ready.',    xp: 350, progress: 25,  icon: '🛡️', earned: false },
  { name: 'Tax Strategist',      description: '5+ tax-saving moves executed this year.',            xp: 600, progress: 20,  icon: '🎯', earned: false },
]

export default async function TaxPage() {
  const [taxEntities, taxMovesBase, deadlines, expenseCategories, derivedMoves, auditReadiness, deductions, taxDocs, properties] = await Promise.allSettled([
    getTaxEntities(),
    getTaxMoves(),
    getUpcomingTaxDeadlines(),
    getTopExpenseCategories(6),
    getDerivedTaxMoves().catch(() => []),
    getAuditReadiness().catch(() => ({ pct: 0, rows: [], summary: '—' })),
    getDeductionsYtd().catch(() => ({ rows: [], total: 0, source: 'none' })),
    getEntityDocuments(['tax', 'ein', 'annual_report', 'filing', 'operating_agreement', 'formation']).catch(() => []),
    getProperties().catch(() => []),
  ]).then(results => results.map(r => (r.status === 'fulfilled' ? r.value : [])))

  // QuickBooks P&L (YTD) — null when not connected or QB not configured.
  let qbPL: ParsedPL | null = null
  try {
    const raw = await getQbProfitLoss(currentCompanyKey())
    qbPL = parseProfitLoss(raw)
  } catch {
    qbPL = null
  }

  // Prefer derivedMoves (falls back to static suggestions when tax_moves empty)
  const taxMoves = (taxMovesBase as any[]).length > 0 ? taxMovesBase : derivedMoves

  const xpEarned = DEFAULT_ACHIEVEMENTS.filter(a => a.earned).reduce((s, a) => s + a.xp, 0)

  // Compute next deadline
  const nextDeadline = (deadlines as any[]).length > 0
    ? (deadlines as any[])[0]
    : null
  const nextDeadlineDays = nextDeadline?.deadline_date
    ? Math.ceil((new Date(nextDeadline.deadline_date).getTime() - Date.now()) / 86400000)
    : null

  // Estimated YTD liability from tax moves
  const estimatedLiability = (taxMoves as any[]).reduce((s: number, m: any) => s + Math.abs(Number(m.amount_due ?? m.savings_estimate ?? 0)), 0)

  return (
    <>
      <Hero
        label="⬡ TAX CENTER · PLANNING & COMPLIANCE"
        greeting="Stay ahead of every deadline."
        primaryMetric={estimatedLiability > 0 ? USD(estimatedLiability) : 'On Track'}
        metricSubtitle={estimatedLiability > 0 ? 'YTD Est. Tax Liability' : 'Tax liability — wire tax tables to activate'}
        kpiCards={[
          { label: 'Tax Deductions',  value: USD(0),                                                    delta: 'wire tax_deductions table' },
          { label: 'Est. Quarterly',  value: (taxMoves as any[]).length > 0 ? USD(estimatedLiability / 4) : '—', delta: 'Q2 2026' },
          { label: 'Docs Uploaded',   value: '0',                                                        delta: 'connect docs table' },
          { label: 'Next Deadline',   value: nextDeadlineDays !== null ? `${nextDeadlineDays}d` : 'None', delta: nextDeadline?.kind ?? 'all clear', deltaPositive: nextDeadlineDays === null || nextDeadlineDays > 30 },
        ]}
        playerCard={{
          name: 'Colby Culbertson',
          role: 'CEO · Tax Strategy',
          level: 12,
          xpCurrent: xpEarned,
          xpNext: xpEarned + 500,
          stats: [
            { key: 'Entities',   value: String((taxEntities as any[]).length || '7') },
            { key: 'Deadlines',  value: String((deadlines as any[]).length) },
            { key: 'Moves',      value: String((taxMoves as any[]).length) },
            { key: 'Next Due',   value: nextDeadlineDays !== null ? `${nextDeadlineDays}d` : 'None' },
          ],
        }}
        animationSlot={<HeroCanvas />}
      />

      <Achievements items={DEFAULT_ACHIEVEMENTS} xpEarned={xpEarned} />

      {/* Tax KPI Strip — matches live TaxCenter 5-up */}
      {(taxEntities as any[]).length > 0 && (() => {
        const totalOwed      = (taxEntities as any[]).reduce((s: number, e: any) => s + Number(e.est_owed   ?? 0), 0)
        const totalPaid      = (taxEntities as any[]).reduce((s: number, e: any) => s + Number(e.ytd_paid   ?? 0), 0)
        const totalIncome    = (taxEntities as any[]).reduce((s: number, e: any) => s + Number(e.ytd_income ?? 0), 0)
        const totalDeductions= (taxEntities as any[]).reduce((s: number, e: any) => s + Number(e.ytd_deductions ?? 0), 0)
        const potentialSavings = (taxMoves as any[]).reduce((s: number, m: any) => s + Number(m.savings_estimate ?? 0), 0)
        return (
          <section style={{ marginBottom: 28 }}>
            <div className="section-header">
              <div className="section-header-left">
                <h2 className="section-title">Tax Summary</h2>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }} data-source="tax_entities_meta">
              {([
                ['Next Quarter Due',  USD(totalOwed),       'var(--red)',    'due Jun 15, 2026'],
                ['YTD Taxes Paid',    USD(totalPaid),       'var(--green)',  'across all entities'],
                ['YTD Income',        USD(totalIncome),     'inherit',       'all sources'],
                ['YTD Deductions',    USD(totalDeductions), 'var(--purple)', 'claimed so far'],
                ['Potential Savings', USD(potentialSavings) + '+', 'var(--orange)', 'from open tax moves'],
              ] as [string, string, string, string][]).map(([label, val, color, sub]) => (
                <SpecCard key={label} accent dataSource="tax_entities_meta">
                  <div style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--mo)', color }}>{val}</div>
                  <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 6 }}>{sub}</div>
                </SpecCard>
              ))}
            </div>
          </section>
        )
      })()}

      {/* Next Deadline Countdown */}
      <section style={{ marginBottom: 28 }}>
        <div className="section-header">
          <div className="section-header-left">
            <h2 className="section-title">Upcoming Deadlines</h2>
            <span className="achieve-count">{(deadlines as any[]).length} upcoming</span>
          </div>
        </div>
        {(deadlines as any[]).length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }} data-source="tax_deadlines">
            {(deadlines as any[]).map((d: any) => {
              const days = d.deadline_date
                ? Math.ceil((new Date(d.deadline_date).getTime() - Date.now()) / 86400000)
                : null
              const urgency = days !== null && days < 7 ? 'var(--red)' : days !== null && days < 30 ? 'var(--amber)' : 'var(--green)'
              return (
                <SpecCard key={d.id} accent dataSource="tax_deadlines">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{d.kind ?? 'Filing'}</div>
                    {days !== null && (
                      <div style={{ fontSize: 20, fontFamily: 'var(--mo)', fontWeight: 700, color: urgency }}>{days}d</div>
                    )}
                  </div>
                  {d.deadline_date && (
                    <div style={{ fontSize: 11, color: 'var(--dim)', fontFamily: 'var(--mo)' }}>
                      {new Date(d.deadline_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  )}
                  {d.amount_due && <div style={{ fontSize: 12, color: urgency, marginTop: 8, fontFamily: 'var(--mo)' }}>{USD(Number(d.amount_due))} due</div>}
                  <div style={{ marginTop: 10, height: 3, background: 'rgba(255,255,255,0.04)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: days !== null ? `${Math.max(0, Math.min(100, 100 - (days / 90) * 100))}%` : '0%', background: urgency, borderRadius: 2 }} />
                  </div>
                </SpecCard>
              )
            })}
          </div>
        ) : (
          <SpecCard dataSource="tax_deadlines" style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 14, color: 'var(--dim)' }}>No tax deadlines in the database.</div>
            <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 8 }}>Add rows to <code>tax_deadlines</code> table to populate this section.</div>
          </SpecCard>
        )}
      </section>

      {/* Entity Tax Grid + Tax Moves */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
        {/* Entity Tax Status — Quarterly Estimates Table */}
        {(taxEntities as any[]).length > 0 ? (
          <SpecCard accent dataSource="tax_entities_meta">
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Quarterly Estimates by Entity</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr>
                    {(['Entity', 'State', 'Type', 'Q Est.', 'YTD Paid', 'Next Due'] as string[]).map(h => (
                      <th key={h} style={{ fontSize: 10, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 8px', textAlign: 'left', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(taxEntities as any[]).map((e: any, i: number) => {
                    const state = e.entity?.state ?? e.state ?? 'US'
                    const stateColor = state === 'CA' ? '#fb923c' : state === 'AL' ? '#34d399' : state === 'NV' ? '#818cf8' : '#fbbf24'
                    const stateBg   = state === 'CA' ? 'rgba(249,115,22,.08)' : state === 'AL' ? 'rgba(52,211,153,.08)' : state === 'NV' ? 'rgba(129,140,248,.08)' : 'rgba(251,191,36,.08)'
                    return (
                      <tr key={e.id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                        <td style={{ padding: '8px 8px', fontWeight: 600 }}>{e.entity?.entity_name ?? e.entity_id ?? 'Entity'}</td>
                        <td style={{ padding: '8px 8px' }}>
                          <span style={{ fontFamily: 'var(--mo)', fontSize: 10, background: stateBg, color: stateColor, padding: '2px 5px', borderRadius: 3 }}>{state}</span>
                        </td>
                        <td style={{ padding: '8px 8px', color: 'var(--dim)' }}>{e.entity?.entity_type ?? '—'}</td>
                        <td style={{ padding: '8px 8px', fontFamily: 'var(--mo)', color: Number(e.est_owed ?? 0) > 0 ? 'var(--red)' : 'var(--dim)' }}>
                          {Number(e.est_owed ?? 0) > 0 ? USD(Number(e.est_owed)) : '—'}
                        </td>
                        <td style={{ padding: '8px 8px', fontFamily: 'var(--mo)', color: 'var(--green)' }}>
                          {Number(e.ytd_paid ?? 0) > 0 ? USD(Number(e.ytd_paid)) : '—'}
                        </td>
                        <td style={{ padding: '8px 8px', color: 'var(--dim)' }}>
                          {e.next_due ? new Date(e.next_due).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </SpecCard>
        ) : (
          <ComingSoon
            title="Entity Tax Grid"
            reason="Wire tax_entities_meta table to see per-entity next due date, YTD paid, and est. owed."
            icon="🏛️"
            dataSource="coming-soon:tax_entities_meta"
            skeleton="table"
          />
        )}

        {/* Tax Strategy Moves — priority-colored cards matching live */}
        {(taxMoves as any[]).length > 0 ? (
          <SpecCard accent dataSource="tax_moves">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Tax Strategy Moves</div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: 'rgba(249,115,22,0.1)', color: 'var(--orange)' }}>
                {(taxMoves as any[]).filter((m: any) => m.status === 'open' || m.status === 'upcoming').length} actionable
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 480, overflowY: 'auto' }}>
              {(taxMoves as any[]).map((m: any) => {
                const priorityColor = m.priority === 'critical' ? '#f43f5e' : m.priority === 'high' ? 'var(--orange)' : 'var(--purple)'
                const statusBg    = m.status === 'open'     ? 'rgba(52,211,153,.1)'   :
                                    m.status === 'upcoming' ? 'rgba(251,191,36,.1)'   :
                                    m.status === 'evaluate' ? 'rgba(129,140,248,.1)'  :
                                    m.status === 'active'   ? 'rgba(249,115,22,.1)'   :
                                                              'rgba(100,116,139,.06)'
                const statusColor = m.status === 'open'     ? '#34d399'  :
                                    m.status === 'upcoming' ? '#fbbf24'  :
                                    m.status === 'evaluate' ? '#818cf8'  :
                                    m.status === 'active'   ? '#f97316'  : 'var(--dim)'
                return (
                  <div key={m.id} style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border)',
                    borderLeft: `3px solid ${priorityColor}`,
                    borderRadius: 10,
                    padding: '12px 14px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, flex: 1, marginRight: 8 }}>{m.action ?? m.title ?? 'Tax Move'}</div>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: statusBg, color: statusColor, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.status}</span>
                    </div>
                    {m.savings_estimate && (
                      <div style={{ marginBottom: 6 }}>
                        <span style={{ fontSize: 12, fontFamily: 'var(--mo)', background: 'rgba(249,115,22,0.08)', color: 'var(--orange)', padding: '2px 6px', borderRadius: 4 }}>
                          Saves {USD(Number(m.savings_estimate))}+
                        </span>
                      </div>
                    )}
                    {m.detail && <div style={{ fontSize: 11, color: 'var(--dim)', lineHeight: 1.5, marginBottom: 4 }}>{m.detail}</div>}
                    {m.deadline && <div style={{ fontSize: 10, color: 'var(--dim)' }}>Deadline: {m.deadline}</div>}
                  </div>
                )
              })}
            </div>
          </SpecCard>
        ) : (
          <ComingSoon
            title="Tax Moves (Gamified)"
            reason="Actionable tax strategies with XP rewards. Wire tax_moves table to activate."
            icon="🎯"
            dataSource="coming-soon:tax_moves"
            skeleton="table"
          />
        )}
      </div>

      {/* QuickBooks P&L (YTD) */}
      <section style={{ marginBottom: 28 }}>
        <div className="section-header">
          <div className="section-header-left">
            <h2 className="section-title">QuickBooks P&amp;L (YTD)</h2>
            {qbPL && (
              <span className="achieve-count">live · {qbPL.periodLabel}</span>
            )}
          </div>
        </div>
        {qbPL ? (
          <SpecCard accent dataSource="quickbooks:ProfitAndLoss">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {([
                ['Total Income',    USD(qbPL.totalIncome),   'var(--green)',  'YTD'],
                ['Total Expenses',  USD(qbPL.totalExpenses), 'var(--red)',    'YTD'],
                ['Net Income',      USD(qbPL.netIncome),     qbPL.netIncome >= 0 ? 'var(--green)' : 'var(--red)', 'bottom line'],
              ] as [string, string, string, string][]).map(([label, val, color, sub]) => (
                <div key={label} style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--mo)', color }}>{val}</div>
                  <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 4 }}>{sub}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 12, lineHeight: 1.5 }}>
              Pulled live from QuickBooks Online · {qbPL.currency} · cached 60s
            </div>
          </SpecCard>
        ) : (
          <ComingSoon
            title="QuickBooks P&L (YTD)"
            reason="Connect QuickBooks on the Integrations page to pull live Income, Expenses, and Net Income straight from QBO."
            icon="📊"
            connect="qb"
            dataSource="coming-soon:quickbooks_profit_loss"
            skeleton="kpi"
          />
        )}
      </section>

      {/* Deductions by Category */}
      <section style={{ marginBottom: 28 }}>
        <div className="section-header">
          <div className="section-header-left">
            <h2 className="section-title">Deductions YTD</h2>
          </div>
        </div>
        <SpecCard accent dataSource="financial_transactions.personal_finance_category" style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 16 }}>
            Expense categories from Plaid — review with CPA for deductibility
          </div>
          {(expenseCategories as any[]).length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {(expenseCategories as any[]).map((cat: any) => (
                <div key={cat.category} style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{cat.category.replace(/_/g, ' ')}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--mo)', color: 'var(--amber)' }}>{USD(cat.total)}</div>
                  <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 4 }}>Potentially deductible</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--dim)', textAlign: 'center', padding: '20px 0' }}>No expense data. Connect Plaid to see categories.</div>
          )}
        </SpecCard>
      </section>

      {/* Document Checklist + Cost Seg + CPA Card + Audit Readiness */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 28 }}>
        {/* Document Checklist — derived from entity_documents */}
        <SpecCard accent dataSource="entity_documents">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Document Checklist</div>
            <span style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--mo)' }}>{(taxDocs as any[]).length} docs</span>
          </div>
          {(() => {
            const required = ['EIN', 'Operating Agreement', 'Annual Report', 'Formation', 'Last Year Return']
            const haveMap: Record<string, boolean> = {}
            for (const d of (taxDocs as any[])) {
              const dt = String(d.document_type ?? '').toLowerCase()
              if (dt.includes('ein')) haveMap['EIN'] = true
              if (dt.includes('operating')) haveMap['Operating Agreement'] = true
              if (dt.includes('annual')) haveMap['Annual Report'] = true
              if (dt.includes('formation') || dt.includes('filing')) haveMap['Formation'] = true
              if (dt.includes('tax')) haveMap['Last Year Return'] = true
            }
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {required.map(r => {
                  const has = !!haveMap[r]
                  return (
                    <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ color: has ? 'var(--green)' : 'var(--dim)', fontFamily: 'var(--mo)', fontSize: 14 }}>{has ? '✓' : '○'}</span>
                      <span style={{ flex: 1, fontSize: 12, color: has ? 'inherit' : 'var(--dim)' }}>{r}</span>
                      <span style={{ fontSize: 10, color: has ? 'var(--green)' : 'var(--amber)', fontFamily: 'var(--mo)' }}>{has ? 'on file' : 'missing'}</span>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </SpecCard>

        {/* Cost Seg Calculator — derived from property_assets */}
        <SpecCard accent dataSource="property_assets">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Cost Segregation Opportunities</div>
          {(properties as any[]).length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--dim)' }}>No properties on file.</div>
          ) : (() => {
            // Simple estimate: ~20% of purchase price reclassifiable as 5/15-yr property
            const candidates = (properties as any[])
              .filter((p: any) => Number(p.purchase_price ?? p.current_value ?? 0) > 300_000 && !p.cost_seg_done)
              .map((p: any) => ({
                id: p.id,
                name: p.address ?? p.city,
                basis: Number(p.purchase_price ?? p.current_value ?? 0),
                estShortTermReclass: Number(p.purchase_price ?? p.current_value ?? 0) * 0.20,
                firstYearBonus: Number(p.purchase_price ?? p.current_value ?? 0) * 0.20 * 0.60, // 60% bonus depreciation for 2026
              }))
              .slice(0, 3)
            const total = candidates.reduce((s, c) => s + c.firstYearBonus, 0)
            return (
              <>
                <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--mo)', color: 'var(--orange)', marginBottom: 4 }}>{USD(Math.round(total))}</div>
                <div style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 14 }}>Estimated Y1 bonus depreciation · {candidates.length} candidate{candidates.length === 1 ? '' : 's'}</div>
                {candidates.map((c: any) => (
                  <div key={c.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 11, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{c.name}</span>
                    <span style={{ fontFamily: 'var(--mo)', color: 'var(--orange)' }}>{USD(Math.round(c.firstYearBonus))}</span>
                  </div>
                ))}
                <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 10, lineHeight: 1.5 }}>
                  Rule-of-thumb: 20% of basis × 60% (2026 bonus dep.). Actual study yields vary.
                </div>
              </>
            )
          })()}
        </SpecCard>

        {/* CPA Contact Card */}
        <SpecCard accent dataSource="static:cpa_contact">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>CPA Contact</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--amber), var(--orange))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 16, color: '#fff', flexShrink: 0,
            }}>CPA</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Primary CPA</div>
              <div style={{ fontSize: 11, color: 'var(--dim)' }}>Add via Team Members to see contact here.</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--dim)', lineHeight: 1.6 }}>
            <div><strong style={{ color: 'var(--t2)' }}>Send Q2 estimates</strong> — due Jun 15, 2026</div>
            <div><strong style={{ color: 'var(--t2)' }}>Share YTD deductions</strong> — {USD(Number((deductions as any).total ?? 0))} so far</div>
            <div><strong style={{ color: 'var(--t2)' }}>Review S-Corp election</strong> — potential savings identified</div>
          </div>
        </SpecCard>

        {/* Audit Readiness Score — derived */}
        <SpecCard accent dataSource="entity_ownership,entity_documents,financial_accounts">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Audit Readiness Score</div>
          {(() => {
            const ar = auditReadiness as any
            const pct = ar?.pct ?? 0
            const scoreColor = pct >= 80 ? 'var(--green)' : pct >= 60 ? 'var(--amber)' : 'var(--red)'
            return (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 10 }}>
                  <div style={{ position: 'relative', width: 80, height: 80, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width={80} height={80} style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
                      <circle cx={40} cy={40} r={34} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
                      <circle cx={40} cy={40} r={34} fill="none" stroke={scoreColor} strokeWidth={6}
                        strokeDasharray={2 * Math.PI * 34}
                        strokeDashoffset={2 * Math.PI * 34 * (1 - pct / 100)}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--mo)', position: 'relative', zIndex: 1, color: scoreColor }}>{pct}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 4 }}>{ar.summary ?? '—'}</div>
                    <div style={{ fontSize: 10, color: 'var(--dim)', lineHeight: 1.5 }}>
                      Combines EIN presence, formation, docs, tax class + bank linkage.
                    </div>
                  </div>
                </div>
                {(ar.rows ?? []).slice(0, 4).map((r: any) => (
                  <div key={r.entityId} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 11 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}>{r.entityName}</span>
                    <span style={{ fontFamily: 'var(--mo)', color: r.score >= 80 ? 'var(--green)' : r.score >= 50 ? 'var(--amber)' : 'var(--red)' }}>{r.score}/100</span>
                  </div>
                ))}
              </>
            )
          })()}
        </SpecCard>
      </div>
    </>
  )
}
