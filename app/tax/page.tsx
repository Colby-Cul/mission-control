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
} from '../lib/queries'

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
  const [taxEntities, taxMoves, deadlines, expenseCategories] = await Promise.allSettled([
    getTaxEntities(),
    getTaxMoves(),
    getUpcomingTaxDeadlines(),
    getTopExpenseCategories(6),
  ]).then(results => results.map(r => (r.status === 'fulfilled' ? r.value : [])))

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

      {/* Document Checklist + CPA Contact + Cost Seg + Audit Readiness */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 28 }}>
        <ComingSoon
          title="Document Checklist"
          reason="Entity document checklist populates from entity_documents where category=tax."
          icon="📋"
          dataSource="coming-soon:entity_documents"
          skeleton="table"
        />
        <ComingSoon
          title="Cost Segregation Calculator"
          reason="Property-level cost seg analysis. Requires property_assets + calc endpoint."
          icon="🏗️"
          dataSource="coming-soon:property_assets.cost_seg"
          skeleton="kpi"
        />
        <ComingSoon
          title="CPA Contact Card"
          reason="CPA inbox and document sharing with accountant. Coming with integrations."
          icon="👔"
          dataSource="coming-soon:integrations.cpa"
          skeleton="none"
        />
        <ComingSoon
          title="Audit Readiness Score"
          reason="Derived from tax_entities_meta completeness. Requires table population."
          icon="🛡️"
          dataSource="coming-soon:tax_entities_meta.audit_score"
          skeleton="kpi"
        />
      </div>
    </>
  )
}
