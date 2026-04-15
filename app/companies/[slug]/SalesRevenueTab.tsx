/**
 * SalesRevenueTab — renders the "Sales & Revenue" tab content for a
 * company detail page.
 *
 * Server component. Each widget in this tab calls the multi-tenant
 * `monday-adapter` with `tenant: 'culbertson'` for the C&G slug. Until
 * `MONDAY_CULBERTSON_API_KEY` is set in Vercel env, every widget falls
 * back to <ComingSoon /> with a "Configure C&C Monday → /integrations"
 * CTA so the layout is stable.
 *
 * Widgets:
 *   1. Sales Volume YTD / MTD      (culbertson.sales_volume_ytd)
 *   2. GCI YTD / MTD               (culbertson.gci_ytd)
 *   3. Closed Transactions Count   (culbertson.closed_transactions)
 *   4. Avg Commission Percentage   (culbertson.avg_commission_pct)
 *   5. Top Producers Leaderboard   (culbertson.top_producers)
 *   6. Pipeline Value              (culbertson.pipeline_value)
 *   7. Revenue by Source           (culbertson.revenue_by_source)
 *   8. Monthly Revenue Chart       (culbertson.monthly_revenue)
 *
 * Financial fallback (any entity): if no Monday data but the entity has
 * financial_transactions rows, show the existing Revenue/Expenses 30d
 * summary below the Monday widget set.
 */
import { getMondayData } from '../../lib/monday-adapter'
import ComingSoon from '../../_components/ComingSoon'
import { SpecCard } from '../../_components/SpecCard'

interface Props {
  slug: string
  /** Entity name for display in ComingSoon reason strings */
  entityName: string
  /** Revenue from financial_transactions (last 30d). 0 = no data. */
  revenue30d: number
  /** Expenses from financial_transactions (last 30d). 0 = no data. */
  expenses30d: number
}

/** C&G slug is the only one with the Culbertson tenant wired in today. */
const CG_SLUG = 'culbertson-gray'

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return '$' + (n / 1_000).toFixed(1) + 'K'
  return '$' + n.toFixed(0)
}

function WidgetCard({
  title,
  subtitle,
  children,
  dataSource,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  dataSource?: string
}) {
  return (
    <SpecCard accent dataSource={dataSource} style={{ marginBottom: 20 }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'rgba(255,255,255,0.85)',
          marginBottom: 4,
        }}
      >
        {title}
      </div>
      {subtitle && (
        <div style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 14 }}>
          {subtitle}
        </div>
      )}
      {children}
    </SpecCard>
  )
}

export default async function SalesRevenueTab({
  slug,
  entityName,
  revenue30d,
  expenses30d,
}: Props) {
  const isCG = slug === CG_SLUG

  // Only fetch Monday C&C data for the Culbertson slug. Other entities
  // just show the financial_transactions fallback.
  const [
    salesVolR,
    gciR,
    closedTxR,
    avgCommR,
    topProducersR,
    pipelineValR,
    revBySourceR,
    monthlyRevR,
  ] = isCG
    ? await Promise.all([
        getMondayData('culbertson.sales_volume_ytd'),
        getMondayData('culbertson.gci_ytd'),
        getMondayData('culbertson.closed_transactions'),
        getMondayData('culbertson.avg_commission_pct'),
        getMondayData('culbertson.top_producers'),
        getMondayData('culbertson.pipeline_value'),
        getMondayData('culbertson.revenue_by_source'),
        getMondayData('culbertson.monthly_revenue'),
      ])
    : ([
        { data: null, error: null },
        { data: null, error: null },
        { data: null, error: null },
        { data: null, error: null },
        { data: null, error: null },
        { data: null, error: null },
        { data: null, error: null },
        { data: null, error: null },
      ] as const)

  const hasRevenue = revenue30d > 0 || expenses30d > 0

  return (
    <div style={{ marginBottom: 40 }}>
      {isCG ? (
        <>
          {/* ── C&C Monday widget grid (all ComingSoon until key lands) ── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
              marginBottom: 24,
            }}
          >
            {/* 1. Sales Volume YTD / MTD */}
            {salesVolR.data ? (
              <WidgetCard
                title="Sales Volume"
                subtitle="YTD / MTD — closed transactions × sale price"
                dataSource="monday:culbertson/sales_volume_ytd"
              >
                <pre>{JSON.stringify(salesVolR.data, null, 2)}</pre>
              </WidgetCard>
            ) : (
              <ComingSoon
                title="Sales Volume YTD / MTD"
                reason={
                  salesVolR.error ||
                  `Closed-transaction sale-price totals from the C&C Monday sales_volume board for ${entityName}. Configure the C&C Monday key in /integrations.`
                }
                icon="🏠"
                connect="monday-culbertson"
                dataSource="monday:culbertson/sales_volume_ytd"
                skeleton="kpi"
              />
            )}

            {/* 2. GCI YTD / MTD */}
            {gciR.data ? (
              <WidgetCard
                title="GCI — Gross Commission"
                subtitle="YTD / MTD gross commission income"
                dataSource="monday:culbertson/gci_ytd"
              >
                <pre>{JSON.stringify(gciR.data, null, 2)}</pre>
              </WidgetCard>
            ) : (
              <ComingSoon
                title="GCI YTD / MTD"
                reason={
                  gciR.error ||
                  'Gross commission income — sum of commission $ from C&C Monday sales_volume board.'
                }
                icon="💵"
                connect="monday-culbertson"
                dataSource="monday:culbertson/gci_ytd"
                skeleton="kpi"
              />
            )}

            {/* 3. Closed Transactions Count */}
            {closedTxR.data ? (
              <WidgetCard
                title="Closed Transactions"
                subtitle="Count by period (YTD / MTD)"
                dataSource="monday:culbertson/closed_transactions"
              >
                <pre>{JSON.stringify(closedTxR.data, null, 2)}</pre>
              </WidgetCard>
            ) : (
              <ComingSoon
                title="Closed Transactions Count"
                reason={
                  closedTxR.error ||
                  'Deals closed YTD / MTD, counted from the C&C Monday sales_volume board.'
                }
                icon="✅"
                connect="monday-culbertson"
                dataSource="monday:culbertson/closed_transactions"
                skeleton="kpi"
              />
            )}

            {/* 4. Avg Commission Percentage */}
            {avgCommR.data ? (
              <WidgetCard
                title="Avg Commission %"
                subtitle="Weighted average across closed deals"
                dataSource="monday:culbertson/avg_commission_pct"
              >
                <pre>{JSON.stringify(avgCommR.data, null, 2)}</pre>
              </WidgetCard>
            ) : (
              <ComingSoon
                title="Average Commission Percentage"
                reason={
                  avgCommR.error ||
                  'Volume-weighted average commission % across closed transactions.'
                }
                icon="📊"
                connect="monday-culbertson"
                dataSource="monday:culbertson/avg_commission_pct"
                skeleton="kpi"
              />
            )}

            {/* 6. Pipeline Value */}
            {pipelineValR.data ? (
              <WidgetCard
                title="Pipeline Value"
                subtitle="Total $ in active deals"
                dataSource="monday:culbertson/pipeline_value"
              >
                <pre>{JSON.stringify(pipelineValR.data, null, 2)}</pre>
              </WidgetCard>
            ) : (
              <ComingSoon
                title="Pipeline Value"
                reason={
                  pipelineValR.error ||
                  'Sum of sale-price across active (non-closed / non-dead) deals on C&C Monday.'
                }
                icon="🏁"
                connect="monday-culbertson"
                dataSource="monday:culbertson/pipeline_value"
                skeleton="kpi"
              />
            )}
          </div>

          {/* 5. Top Producers Leaderboard — full-width */}
          {topProducersR.data ? (
            <WidgetCard
              title="Top Producers Leaderboard"
              subtitle="Agents ranked by YTD closed volume"
              dataSource="monday:culbertson/top_producers"
            >
              <pre>{JSON.stringify(topProducersR.data, null, 2)}</pre>
            </WidgetCard>
          ) : (
            <ComingSoon
              title="Top Producers Leaderboard"
              reason={
                topProducersR.error ||
                'Agents ranked by YTD closed volume (aggregated from the C&C Monday sales_volume board by person column).'
              }
              icon="🏆"
              connect="monday"
              dataSource="monday:culbertson/top_producers"
              skeleton="table"
            />
          )}

          {/* 7. Revenue by Source */}
          {revBySourceR.data ? (
            <WidgetCard
              title="Revenue by Source"
              subtitle="Self-gen vs team-gen vs referral"
              dataSource="monday:culbertson/revenue_by_source"
            >
              <pre>{JSON.stringify(revBySourceR.data, null, 2)}</pre>
            </WidgetCard>
          ) : (
            <ComingSoon
              title="Revenue by Source"
              reason={
                revBySourceR.error ||
                'Split GCI into self-gen / team-gen / referral using the lead-source column on C&C Monday.'
              }
              icon="🔀"
              connect="monday"
              dataSource="monday:culbertson/revenue_by_source"
              skeleton="chart"
            />
          )}

          {/* 8. Monthly Revenue Chart */}
          {monthlyRevR.data ? (
            <WidgetCard
              title="Monthly Revenue — 12-month Trend"
              subtitle="GCI per calendar month"
              dataSource="monday:culbertson/monthly_revenue"
            >
              <pre>{JSON.stringify(monthlyRevR.data, null, 2)}</pre>
            </WidgetCard>
          ) : (
            <ComingSoon
              title="Monthly Revenue Chart"
              reason={
                monthlyRevR.error ||
                'Twelve-month GCI trend, bucketed by close_date from C&C Monday.'
              }
              icon="📈"
              connect="monday"
              dataSource="monday:culbertson/monthly_revenue"
              skeleton="chart"
            />
          )}
        </>
      ) : null}

      {/* ── Revenue & Expenses from financial_transactions ───────────────
          Shown in Sales & Revenue for C&G (pairs with the Monday widgets
          above) and for generic slugs where Financials doesn't already
          render the same card. Xome has its own loan KPI set above so we
          skip this fallback for it to avoid duplicating the Financials tab. */}
      {isCG && hasRevenue ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 16,
            marginTop: 16,
          }}
        >
          <SpecCard accent dataSource={`financial_transactions:revenue:${slug}`}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'rgba(255,255,255,0.85)',
                marginBottom: 14,
              }}
            >
              Revenue — last 30 days
            </div>
            <div
              style={{
                fontSize: 36,
                fontWeight: 700,
                fontFamily: 'IBM Plex Mono, monospace',
                color: 'var(--green)',
                marginBottom: 8,
              }}
            >
              {fmtCurrency(revenue30d)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--dim)' }}>
              From financial_transactions tagged to this entity
            </div>
          </SpecCard>
          <SpecCard accent dataSource={`financial_transactions:expenses:${slug}`}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'rgba(255,255,255,0.85)',
                marginBottom: 14,
              }}
            >
              Expenses — last 30 days
            </div>
            <div
              style={{
                fontSize: 36,
                fontWeight: 700,
                fontFamily: 'IBM Plex Mono, monospace',
                color: 'var(--orange)',
                marginBottom: 8,
              }}
            >
              {fmtCurrency(expenses30d)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--dim)' }}>
              Net{' '}
              <span
                style={{
                  color:
                    revenue30d - expenses30d >= 0
                      ? 'var(--green)'
                      : 'var(--red)',
                }}
              >
                {fmtCurrency(Math.abs(revenue30d - expenses30d))}{' '}
                {revenue30d - expenses30d >= 0 ? 'surplus' : 'deficit'}
              </span>
            </div>
          </SpecCard>
        </div>
      ) : null}
    </div>
  )
}
