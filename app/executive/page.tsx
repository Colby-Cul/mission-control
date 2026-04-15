/**
 * Executive Overview — aggregated CEO dashboard.
 * Hero metric: TBD — command-center view of all critical metrics
 * Animation: orbital — rings of data orbiting a central command node
 * Sources: coming-soon
 */
import Hero from '../_components/Hero'
import ComingSoon from '../_components/ComingSoon'
import { SpecCard } from '../_components/SpecCard'
import HeroCanvas from '../_components/HeroCanvasDefault'

export const dynamic = 'force-dynamic'

export default function ExecutivePage() {
  return (
    <>
      <Hero
        label="⬡ EXECUTIVE · COMMAND OVERVIEW"
        greeting="Executive Overview"
        primaryMetric="—"
        metricSubtitle="command center · all systems"
        kpiCards={[
          { label: 'Revenue',     value: '—', delta: 'MTD',        deltaPositive: true },
          { label: 'Cash Flow',   value: '—', delta: 'this month',  deltaPositive: true },
          { label: 'Open Tasks',  value: '—', delta: 'in progress', deltaPositive: false },
          { label: 'Active Agents', value: '—', delta: 'fleet status', deltaPositive: true },
        ]}
        animationSlot={<HeroCanvas />}
      />

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
