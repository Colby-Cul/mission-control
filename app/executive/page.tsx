/**
 * Executive Overview — aggregated CEO dashboard.
 * Ported from live ExecutiveOverview.jsx: Founder Profile Card, Mission Statement,
 * Standing Priorities, Command Layers (10), Key Metrics.
 * Hero metric: TBD — command-center view of all critical metrics
 */
import Hero from '../_components/Hero'
import ComingSoon from '../_components/ComingSoon'
import { SpecCard } from '../_components/SpecCard'
import HeroCanvas from '../_components/HeroCanvasDefault'
import {
  getAccounts,
  accountSignedBalance,
  getEntities,
  getOpenTasks,
  getActiveProjects,
  getAgents,
  getEntityFinancialRollup,
  getAgentCostBudgets,
  getServiceStatusGrid,
  getUpcomingTaxDeadlines,
  getCompanyKpis,
} from '../lib/queries'
import { supabase } from '../lib/supabase'

export const dynamic = 'force-dynamic'

const USD = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const MISSION = 'Our mission is to create an autonomous wealth-building organization that grows revenue, cuts inefficiency, manages capital intelligently, and compounds value across every company and investment — transforming complexity into control, execution into scale, and scale into generational wealth.'

const STANDING_PRIORITIES = [
  { rank: 1, name: 'Revenue Growth',             desc: 'Grow top-line across all entities relentlessly' },
  { rank: 2, name: 'Expense Reduction',           desc: 'Cut waste, renegotiate, automate cost centers' },
  { rank: 3, name: 'Margin / Cash Flow',          desc: 'Improve margins and free cash flow every quarter' },
  { rank: 4, name: 'Autonomous Operations',       desc: 'Remove human bottlenecks, build self-running systems' },
  { rank: 5, name: 'Intelligent Capital Allocation', desc: 'Deploy capital where risk-adjusted returns are highest' },
  { rank: 6, name: 'Entity / Asset Coordination', desc: 'Orchestrate entities, trusts, and assets as one portfolio' },
  { rank: 7, name: 'Financial Integration',       desc: 'Unify personal and business finances into a single view' },
]

const COMMAND_LAYERS = [
  { id: 'CMD-1',  name: 'Executive Overview',    status: 'Active',       desc: 'Founder profile, mission, standing priorities' },
  { id: 'CMD-2',  name: 'Entity Map',             status: 'Not Started',  desc: 'All companies, trusts, and ownership structure' },
  { id: 'CMD-3',  name: 'Revenue Engine',         status: 'Not Started',  desc: 'Revenue tracking across C&C, Xome, and all entities' },
  { id: 'CMD-4',  name: 'Expense Control',        status: 'Not Started',  desc: 'Expense monitoring, reduction targets, automation' },
  { id: 'CMD-5',  name: 'Cash Flow Command',      status: 'Not Started',  desc: 'Cash flow forecasting and optimization' },
  { id: 'CMD-6',  name: 'Investment HQ',          status: 'Not Started',  desc: 'Portfolio management, real estate, crypto, equities' },
  { id: 'CMD-7',  name: 'Operations Center',      status: 'Not Started',  desc: 'Autonomous ops, agent orchestration, workflows' },
  { id: 'CMD-8',  name: 'Strategic Planning',     status: 'Not Started',  desc: 'Long-term goals, milestones, scenario planning' },
  { id: 'CMD-9',  name: 'Risk & Compliance',      status: 'Not Started',  desc: 'Risk register, insurance, legal, tax compliance' },
  { id: 'CMD-10', name: 'Memory & Knowledge',     status: 'Not Started',  desc: 'Institutional memory, decision logs, knowledge base' },
]

function statusColor(status: string): string {
  if (status === 'Active')      return 'var(--green)'
  if (status === 'In Progress') return 'var(--amber)'
  return 'var(--dim)'
}

export default async function ExecutivePage() {
  const [accounts, entities, tasks, projects, agents, entityRollup, agentBudgets, services, upcomingDeadlines] = await Promise.allSettled([
    getAccounts(),
    getEntities(),
    getOpenTasks(),
    getActiveProjects(),
    getAgents().catch(() => []),
    getEntityFinancialRollup().catch(() => []),
    getAgentCostBudgets().catch(() => []),
    getServiceStatusGrid().catch(() => []),
    getUpcomingTaxDeadlines().catch(() => []),
  ]).then(results => results.map(r => (r.status === 'fulfilled' ? r.value : [])))

  const netWorth    = (accounts as any[]).reduce((s, a) => s + accountSignedBalance(a), 0)
  const openTasks   = (tasks as any[]).length
  const entityCount = (entities as any[]).length
  const projectCount = (projects as any[]).length
  const agentCount  = (agents as any[]).filter((a: any) => a.status === 'active').length

  // Derived strategic KPIs pulled from company_kpis across all entities
  const kpisByKeyAgg: Record<string, { value: number; target: number; count: number }> = {}
  const { data: allKpiRows } = await supabase.from('company_kpis').select('kpi_key, value, target').limit(500)
  for (const k of (allKpiRows ?? []) as any[]) {
    if (!kpisByKeyAgg[k.kpi_key]) kpisByKeyAgg[k.kpi_key] = { value: 0, target: 0, count: 0 }
    kpisByKeyAgg[k.kpi_key].value += Number(k.value ?? 0)
    kpisByKeyAgg[k.kpi_key].target += Number(k.target ?? 0)
    kpisByKeyAgg[k.kpi_key].count += 1
  }
  const revenueTotal = kpisByKeyAgg['revenue_mtd']?.value ?? 0
  const cashFlowTotal = kpisByKeyAgg['cash_flow_mtd']?.value ?? 0
  const runwayAvg = kpisByKeyAgg['runway_months']?.count ? Math.round((kpisByKeyAgg['runway_months'].value / kpisByKeyAgg['runway_months'].count)) : 0
  const topRevenueEntities = (entityRollup as any[]).filter(e => e.revenueMtd > 0).sort((a, b) => b.revenueMtd - a.revenueMtd).slice(0, 5)

  // Decision queue — high-priority open tasks that mention decision/sign-off keywords + upcoming deadlines
  const decisionTasks = (tasks as any[]).filter((t: any) => (t.priority === 'high' || t.priority === 'critical')).slice(0, 5)
  const agentFleet = (services as any[]).slice(0, 10)
  const atRiskAgents = (agentFleet as any[]).filter((a: any) => a.health === 'degraded' || a.health === 'down')
  const costOverBudget = (agentBudgets as any[]).filter((b: any) => b.pctUsed !== null && b.pctUsed > 80)
  const riskItems = [
    ...atRiskAgents.map((a: any) => ({ kind: 'agent', label: `${a.name}: ${a.health}`, severity: a.health === 'down' ? 'critical' : 'warning' })),
    ...costOverBudget.map((b: any) => ({ kind: 'cost', label: `${b.name}: ${Math.round(b.pctUsed)}% of monthly budget`, severity: 'warning' })),
    ...((upcomingDeadlines as any[]).slice(0, 3).map((d: any) => ({ kind: 'tax', label: `${d.kind} due ${d.deadline_date}`, severity: 'info' }))),
  ].slice(0, 8)

  const USDS = (n: number) => n >= 1_000_000 ? `$${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `$${(n/1_000).toFixed(1)}K` : `$${Math.round(n)}`

  return (
    <>
      <Hero
        label="⬡ EXECUTIVE · COMMAND OVERVIEW"
        greeting="Executive Overview"
        primaryMetric={USD(netWorth)}
        metricSubtitle="Total Net Worth · command center"
        kpiCards={[
          { label: 'Entities',    value: String(entityCount || 7), delta: 'active LLCs & LPs', deltaPositive: true },
          { label: 'Open Tasks',  value: String(openTasks),         delta: 'in progress',       deltaPositive: false },
          { label: 'Projects',    value: String(projectCount),      delta: 'active',             deltaPositive: true },
          { label: 'Agents',      value: String(agentCount),        delta: 'running',            deltaPositive: true },
        ]}
        animationSlot={<HeroCanvas />}
      />

      {/* Founder Profile Card */}
      <section style={{ marginBottom: 28 }}>
        <SpecCard accent dataSource="users_profile">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14, flexShrink: 0,
              background: 'linear-gradient(135deg, var(--orange), var(--purple))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 800, color: '#fff',
            }}>CC</div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 2 }}>Colby Culbertson</div>
              <div style={{ fontSize: 13, color: 'var(--orange)', fontWeight: 600 }}>
                Entrepreneur / Founder / Operator / Investor
              </div>
            </div>
            <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 5, background: 'rgba(16,185,129,0.12)', color: 'var(--green)', border: '1px solid var(--green)', letterSpacing: '0.06em' }}>
              CMD-1 ACTIVE
            </span>
          </div>

          {/* Mission */}
          <div style={{ padding: '14px 18px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Mission Statement</div>
            <div style={{ fontSize: 13, color: 'inherit', lineHeight: 1.65, fontStyle: 'italic' }}>&ldquo;{MISSION}&rdquo;</div>
          </div>

          {/* Objective */}
          <div style={{ padding: '10px 18px', borderRadius: 10, background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>Objective</span>
            <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>Multi-billion-dollar family net worth by age 50</span>
            <span style={{ fontSize: 11, color: 'var(--dim)', whiteSpace: 'nowrap' }}>Family: Kristi · Cash (2013) · Chanel (2015)</span>
          </div>
        </SpecCard>
      </section>

      {/* Standing Priorities + Command Layers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
        {/* Standing Priorities */}
        <SpecCard accent dataSource="executive_priorities">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Standing Priorities</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {STANDING_PRIORITIES.map(p => (
              <div key={p.rank} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8,
                background: p.rank <= 3 ? 'rgba(249,115,22,0.06)' : 'transparent',
                borderBottom: '1px solid rgba(255,255,255,0.03)',
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  background: p.rank <= 3 ? 'var(--orange)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${p.rank <= 3 ? 'var(--orange)' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 800, color: p.rank <= 3 ? '#fff' : 'var(--dim)',
                }}>{p.rank}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 1 }}>{p.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </SpecCard>

        {/* Command View — 10 Layers */}
        <SpecCard accent dataSource="executive_command_layers">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Command View</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {COMMAND_LAYERS.map(layer => (
              <div key={layer.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: statusColor(layer.status),
                  boxShadow: layer.status === 'Active' ? `0 0 8px ${statusColor(layer.status)}` : 'none',
                }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--dim)', width: 50, flexShrink: 0, fontFamily: 'var(--mo)' }}>{layer.id}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{layer.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 1 }}>{layer.desc}</div>
                </div>
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  background: layer.status === 'Active' ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)',
                  color: statusColor(layer.status), border: `1px solid ${statusColor(layer.status)}`,
                }}>{layer.status}</span>
              </div>
            ))}
          </div>
        </SpecCard>
      </div>

      {/* Revenue, Decision Queue, Strategic KPIs — all derived from real data */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        {/* Revenue Snapshot */}
        <SpecCard accent dataSource="company_kpis">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Revenue Snapshot</div>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--mo)', color: 'var(--green)', marginBottom: 4 }}>{USDS(revenueTotal)}</div>
          <div style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 14 }}>MTD across entities · {topRevenueEntities.length} earners</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {topRevenueEntities.length === 0 ? (
              <div style={{ fontSize: 11, color: 'var(--dim)' }}>No MTD revenue in company_kpis yet.</div>
            ) : topRevenueEntities.slice(0, 4).map((e: any) => (
              <div key={e.entityId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>{e.entityName}</span>
                <span style={{ fontFamily: 'var(--mo)', color: 'var(--green)' }}>{USDS(e.revenueMtd)}</span>
              </div>
            ))}
          </div>
        </SpecCard>

        {/* Decision Queue (derived from high-priority open tasks) */}
        <SpecCard accent dataSource="tasks">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Decision Queue</div>
            <span style={{ fontSize: 10, color: 'var(--orange)', fontFamily: 'var(--mo)' }}>{decisionTasks.length} needing sign-off</span>
          </div>
          {decisionTasks.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--dim)', textAlign: 'center', padding: '20px 0' }}>No high-priority decisions pending.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {decisionTasks.map((t: any) => (
                <div key={t.id} style={{ padding: '8px 10px', background: 'rgba(239,68,68,0.04)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.12)' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title ?? t.name ?? 'Task'}</div>
                  <div style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--mo)', marginTop: 2 }}>{t.priority} · {t.status}</div>
                </div>
              ))}
            </div>
          )}
        </SpecCard>

        {/* Strategic KPIs (derived from company_kpis aggregate) */}
        <SpecCard accent dataSource="company_kpis">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Strategic KPIs</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Total MTD Revenue', val: USDS(revenueTotal), color: 'var(--green)' },
              { label: 'Total MTD Cash Flow', val: USDS(cashFlowTotal), color: cashFlowTotal >= 0 ? 'var(--green)' : 'var(--red)' },
              { label: 'Avg Runway', val: runwayAvg ? `${runwayAvg}mo` : '—', color: 'var(--amber)' },
              { label: 'Active Entities', val: String(entityCount), color: 'var(--orange)' },
              { label: 'Agent Fleet', val: `${agentCount}/${(agents as any[]).length}`, color: 'var(--purple)' },
            ].map(k => (
              <div key={k.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--dim)' }}>{k.label}</span>
                <span style={{ fontFamily: 'var(--mo)', color: k.color, fontWeight: 600 }}>{k.val}</span>
              </div>
            ))}
          </div>
        </SpecCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 28 }}>
        {/* Agent Fleet Status (derived from sessions + agents) */}
        <SpecCard accent dataSource="agents,sessions">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Agent Fleet Status</div>
            <span style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--mo)' }}>{agentFleet.length} agents · {atRiskAgents.length} at risk</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 240, overflowY: 'auto' }}>
            {agentFleet.map((a: any) => {
              const col = a.health === 'healthy' ? 'var(--green)' : a.health === 'degraded' ? 'var(--amber)' : a.health === 'down' ? 'var(--red)' : 'var(--dim)'
              return (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: col, flexShrink: 0, boxShadow: a.health === 'healthy' ? `0 0 6px ${col}` : 'none' }} />
                  <div style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>{a.name}</div>
                  <div style={{ fontSize: 10, color: col, fontFamily: 'var(--mo)', textTransform: 'uppercase' }}>{a.health}</div>
                  <div style={{ fontSize: 9, color: 'var(--dim)', fontFamily: 'var(--mo)', minWidth: 70, textAlign: 'right' }}>
                    {a.lastBeat ? new Date(a.lastBeat).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'never'}
                  </div>
                </div>
              )
            })}
          </div>
        </SpecCard>

        {/* Risk & Alerts (derived) */}
        <SpecCard accent dataSource="derived:risk_signals">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Risk & Alerts</div>
            <span style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--mo)' }}>{riskItems.length} signals</span>
          </div>
          {riskItems.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--green)', padding: '20px 0', textAlign: 'center' }}>All clear — no active risks detected.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {riskItems.map((r: any, i: number) => {
                const col = r.severity === 'critical' ? 'var(--red)' : r.severity === 'warning' ? 'var(--amber)' : 'var(--dim)'
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: col, flexShrink: 0 }} />
                    <span style={{ fontSize: 9, fontFamily: 'var(--mo)', textTransform: 'uppercase', color: col, width: 50 }}>{r.kind}</span>
                    <span style={{ flex: 1, fontSize: 12 }}>{r.label}</span>
                  </div>
                )
              })}
            </div>
          )}
        </SpecCard>
      </div>
    </>
  )
}
