/**
 * Accounts — financial accounts aggregation via Plaid.
 * Hero metric: net worth / total balances
 * Animation: flowing streams — account balance rivers merging into net worth pool
 * Sources: financial_accounts (Plaid), coming-soon
 */
import Hero from '../_components/Hero'
import ComingSoon from '../_components/ComingSoon'
import HeroCanvas from '../_components/HeroCanvasDefault'

export const dynamic = 'force-dynamic'

export default function AccountsPage() {
  return (
    <>
      <Hero
        label="◈ ACCOUNTS · FINANCIAL ACCOUNTS"
        greeting="Financial Accounts"
        primaryMetric="—"
        metricSubtitle="net balance across all accounts"
        kpiCards={[
          { label: 'Banking',      value: '—', delta: 'checking + savings', deltaPositive: true },
          { label: 'Investments',  value: '—', delta: 'portfolio value',     deltaPositive: true },
          { label: 'Credit',       value: '—', delta: 'total credit',        deltaPositive: false },
          { label: 'Institutions', value: '—', delta: 'linked banks',        deltaPositive: true },
        ]}
        animationSlot={<HeroCanvas />}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        <ComingSoon
          title="Banking Accounts"
          reason="Checking and savings balances from all linked institutions via Plaid."
          icon="🏦"
          connect="plaid"
          dataSource="coming-soon:accounts.banking"
          skeleton="table"
        />
        <ComingSoon
          title="Investment Portfolio"
          reason="Brokerage and retirement account holdings, performance, and allocation."
          icon="📈"
          connect="plaid"
          dataSource="coming-soon:accounts.investments"
          skeleton="chart"
        />
        <ComingSoon
          title="Credit Accounts"
          reason="Credit cards, lines of credit, utilization rates, and payment due dates."
          icon="💳"
          connect="plaid"
          dataSource="coming-soon:accounts.credit"
          skeleton="table"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 28 }}>
        <ComingSoon
          title="Transaction Feed"
          reason="Recent transactions across all accounts — categorized and searchable."
          icon="🔄"
          connect="plaid"
          dataSource="coming-soon:accounts.transactions"
          skeleton="table"
        />
        <ComingSoon
          title="Net Worth Trend"
          reason="Historical net worth chart across all asset classes and account types."
          icon="💰"
          dataSource="coming-soon:accounts.net_worth"
          skeleton="chart"
        />
      </div>
    </>
  )
}
