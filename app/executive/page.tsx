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
} from '../lib/queries'

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
  const [accounts, entities, tasks, projects, agents] = await Promise.allSettled([
    getAccounts(),
    getEntities(),
    getOpenTasks(),
    getActiveProjects(),
    getAgents().catch(() => []),
  ]).then(results => results.map(r => (r.status === 'fulfilled' ? r.value : [])))

  const netWorth    = (accounts as any[]).reduce((s, a) => s + accountSignedBalance(a), 0)
  const openTasks   = (tasks as any[]).length
  const entityCount = (entities as any[]).length
  const projectCount = (projects as any[]).length
  const agentCount  = (agents as any[]).filter((a: any) => a.status === 'active').length

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

      {/* Revenue, Decision Queue, Strategic KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        <ComingSoon
          title="Revenue Snapshot"
          reason="Real-time revenue roll-up across all business units — STR, Xome, investments."
          icon="💹"
          dataSource="coming-soon:executive.revenue"
          skeleton="kpi"
        />
        <ComingSoon
          title="Decision Queue"
          reason="Pending decisions surfaced by agents requiring CEO input or sign-off."
          icon="⚡"
          dataSource="coming-soon:executive.decisions"
          skeleton="table"
        />
        <ComingSoon
          title="Strategic KPIs"
          reason="North Star metrics vs. targets — visualized against quarterly goals."
          icon="🎯"
          dataSource="coming-soon:executive.kpis"
          skeleton="chart"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 28 }}>
        <ComingSoon
          title="Agent Fleet Status"
          reason="Live agent health, run queue depth, and cost burn rate."
          icon="🤖"
          dataSource="coming-soon:executive.agents"
          skeleton="table"
        />
        <ComingSoon
          title="Risk & Alerts"
          reason="Aggregated risk signals from finance, legal, operations, and security agents."
          icon="🛡️"
          dataSource="coming-soon:executive.risks"
          skeleton="table"
        />
      </div>
    </>
  )
}
