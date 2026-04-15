/**
 * Command Deck — real-time operational command center.
 * Hero metric: system health score
 * Animation: radar sweep — rotating scan line over a dark grid of node pings
 * Sources: coming-soon
 */
import Hero from '../_components/Hero'
import ComingSoon from '../_components/ComingSoon'
import HeroCanvas from '../_components/HeroCanvasDefault'

export const dynamic = 'force-dynamic'

export default function CommandPage() {
  return (
    <>
      <Hero
        label="⊕ COMMAND · DECK · OPERATIONS"
        greeting="Command Deck"
        primaryMetric="—"
        metricSubtitle="operational command center"
        kpiCards={[
          { label: 'System Health', value: '—', delta: 'all systems',   deltaPositive: true },
          { label: 'Active Ops',    value: '—', delta: 'in flight',     deltaPositive: true },
          { label: 'Queue Depth',   value: '—', delta: 'agent tasks',   deltaPositive: false },
          { label: 'Incidents',     value: '—', delta: 'open',          deltaPositive: false },
        ]}
        animationSlot={<HeroCanvas />}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        <ComingSoon
          title="Live System Map"
          reason="Real-time topology of all connected services, agents, and infrastructure nodes."
          icon="🗺️"
          dataSource="coming-soon:command.system_map"
          skeleton="chart"
        />
        <ComingSoon
          title="Agent Operations Board"
          reason="Kanban-style view of all active agent runs — queue, running, blocked, done."
          icon="🤖"
          dataSource="coming-soon:command.agent_ops"
          skeleton="table"
        />
        <ComingSoon
          title="Alert Center"
          reason="Unified alert feed from Spike.sh, Grafana, Sentinel, and all monitoring agents."
          icon="🚨"
          dataSource="coming-soon:command.alerts"
          skeleton="table"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 28 }}>
        <ComingSoon
          title="Deployment Pipeline"
          reason="Live CI/CD status across all Vercel projects and GitHub Actions workflows."
          icon="🚀"
          dataSource="coming-soon:command.deployments"
          skeleton="table"
        />
        <ComingSoon
          title="Cost Burn Rate"
          reason="Real-time compute + API spend across all agents, models, and infrastructure."
          icon="💸"
          dataSource="coming-soon:command.cost_burn"
          skeleton="chart"
        />
      </div>
    </>
  )
}
