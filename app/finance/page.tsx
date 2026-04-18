/**
 * Empire View — the 10,000-ft macro financial dashboard.
 * Sprint 1.B (2026-04-18). Replaces the prior 4374-line accounts-focused
 * finance page (archived at _legacy-page.tsx.bak); the accounts grid now
 * lives at /settings/connected-accounts.
 */
import Hero from '../_components/Hero'
import HeroCanvas from './HeroCanvas'
import {
  getPortfolioAllocation,
  getMonthlyCashFlow,
  getEntityHeatMap,
  getTopRevenueEntities,
  getNetWorthTrend,
} from '../lib/queries'
import {
  PortfolioDonut,
  CashFlowStrip,
  EntityHeatMap,
  TopRevenueEntities,
  RiskFlags,
} from './_components/EmpireWidgets'
import { fmtMoney, fmtMoneyExact } from '../lib/format'

export const dynamic = 'force-dynamic'

// Thin safeguard so one bad query doesn't 500 the whole page.
async function safe<T>(p: Promise<T>, fallback: T, label = 'query'): Promise<T> {
  try { return await p } catch (e) {
    console.error(`[EmpireView] ${label} failed:`, (e as Error).message)
    return fallback
  }
}

export default async function EmpireView() {
  const [portfolio, cashFlow, heatMap, topRevenue, nwTrend] = await Promise.all([
    safe(getPortfolioAllocation(), { buckets: [], totalAssets: 0, totalDebt: 0, netWorth: 0 }, 'portfolio'),
    safe(getMonthlyCashFlow(12), [] as Awaited<ReturnType<typeof getMonthlyCashFlow>>, 'cashFlow'),
    safe(getEntityHeatMap(), [] as Awaited<ReturnType<typeof getEntityHeatMap>>, 'heatMap'),
    safe(getTopRevenueEntities(5, 90), [] as Awaited<ReturnType<typeof getTopRevenueEntities>>, 'topRev'),
    safe(getNetWorthTrend(12), [] as Awaited<ReturnType<typeof getNetWorthTrend>>, 'nwTrend'),
  ])

  // KPIs
  const last3 = cashFlow.slice(-3)
  const avgMonthlyOut = last3.length > 0
    ? last3.reduce((s, m) => s + m.outflow, 0) / last3.length
    : 0
  const ltmInflow  = cashFlow.reduce((s, m) => s + m.inflow, 0)
  const ltmOutflow = cashFlow.reduce((s, m) => s + m.outflow, 0)
  const fcfLtm     = ltmInflow - ltmOutflow
  const cash       = portfolio.buckets.find(b => b.key === 'cash')?.value ?? 0
  const runwayDays = avgMonthlyOut > 0 ? Math.round((cash / avgMonthlyOut) * 30) : null
  const annualizedRevenue = ltmInflow

  return (
    <div style={{ padding: '0 0 80px' }}>
      <Hero
        label="◆ EMPIRE VIEW · THE 10K-FT DASHBOARD"
        greeting="Empire at a glance"
        primaryMetric={fmtMoney(portfolio.netWorth)}
        metricSubtitle={`Empire Net Worth · ${fmtMoneyExact(portfolio.netWorth)} exact`}
        kpiCards={[
          { label: 'Ann. Revenue', value: fmtMoney(annualizedRevenue),
            delta: 'LTM inflows', deltaPositive: annualizedRevenue > 0 },
          { label: 'FCF (LTM)',    value: fmtMoney(fcfLtm),
            delta: 'inflow − outflow', deltaPositive: fcfLtm >= 0 },
          { label: 'Cash',         value: fmtMoney(cash),
            delta: 'liquid', deltaPositive: cash > 0 },
          { label: 'Runway',       value: runwayDays != null ? `${runwayDays}d` : '—',
            delta: 'at current burn', deltaPositive: (runwayDays ?? 0) > 90 },
          { label: 'Monthly Burn', value: fmtMoney(avgMonthlyOut),
            delta: 'last 3 mo avg' },
        ]}
        animationSlot={<HeroCanvas />}
      />

      <div style={{
        maxWidth: 1400, margin: '0 auto',
        padding: '28px 24px',
        display: 'flex', flexDirection: 'column', gap: 20,
      }}>
        <CashFlowStrip months={cashFlow} />

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 380px) minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
          <PortfolioDonut
            buckets={portfolio.buckets}
            totalAssets={portfolio.totalAssets}
            totalDebt={portfolio.totalDebt}
            netWorth={portfolio.netWorth}
          />
          <EntityHeatMap entities={heatMap} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
          <TopRevenueEntities entities={topRevenue} />
          <RiskFlags entities={heatMap} />
        </div>

        <p style={{
          fontSize: 11, color: 'rgba(255,255,255,0.3)',
          fontFamily: 'var(--mo)', textAlign: 'center',
          padding: '14px 0 0', letterSpacing: '.04em',
        }}>
          Data sources: financial_accounts · financial_transactions · entity_ownership · property_assets.
          {nwTrend.length === 0 && ' Net-worth history populates once kpi_snapshots is running.'}
        </p>
      </div>
    </div>
  )
}
