/**
 * SalesRevenueTab — renders the "Sales & Revenue" tab content for a
 * company detail page. Server component, 60s monday-adapter cache,
 * ComingSoon fallback whenever the C&C Monday key is missing.
 *
 * Widgets (all wired to live C&G Monday data for the culbertson-gray slug):
 *   1. Sales Volume YTD / MTD         (culbertson.sales_volume_ytd)
 *   2. GCI YTD / MTD (est)            (culbertson.gci_ytd)
 *   3. Closed Transactions Count      (culbertson.closed_transactions)
 *   4. Avg Commission Percentage      (culbertson.avg_commission_pct)
 *   5. Pipeline Value                 (culbertson.pipeline_value)
 *   6. Top Producers Leaderboard      (culbertson.top_producers)
 *   7. Revenue by Source              (culbertson.revenue_by_source)
 *   8. Monthly Revenue — 12m trend    (culbertson.monthly_revenue)
 *
 * Financial fallback: if no Monday data but the entity has
 * financial_transactions rows, show Revenue / Expenses 30d summary.
 */
import { getMondayData } from '../../lib/monday-adapter'
import ComingSoon from '../../_components/ComingSoon'
import { SpecCard } from '../../_components/SpecCard'
import type {
  VolumeKPI,
  GciKPI,
  ClosedTxKPI,
  AvgCommissionKPI,
  TopProducerRow,
  RevenueBySourceView,
  MonthlyRevenueView,
  CulbertsonPipelineView,
} from '../../lib/monday-adapter'

interface Props {
  slug: string
  entityName: string
  revenue30d: number
  expenses30d: number
}

const CG_SLUG = 'culbertson-gray'

// ─── Formatters ─────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  const v = Math.abs(n)
  if (v >= 1_000_000_000) return (n < 0 ? '-' : '') + '$' + (v / 1_000_000_000).toFixed(2) + 'B'
  if (v >= 1_000_000) return (n < 0 ? '-' : '') + '$' + (v / 1_000_000).toFixed(1) + 'M'
  if (v >= 1_000) return (n < 0 ? '-' : '') + '$' + (v / 1_000).toFixed(1) + 'K'
  return (n < 0 ? '-' : '') + '$' + v.toFixed(0)
}

function fmtCompact(n: number): string {
  if (!Number.isFinite(n)) return '0'
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(Math.round(n))
}

function fmtPct(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`
}

// ─── Shared header style for KPI cards ──────────────────────────────────

const cardTitleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'rgba(255,255,255,0.85)',
  marginBottom: 4,
}
const cardSubtitleStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--dim)',
  marginBottom: 14,
}

function KpiCard({
  title,
  subtitle,
  primary,
  primaryColor = 'var(--green)',
  secondary,
  tertiary,
  dataSource,
}: {
  title: string
  subtitle?: string
  primary: string
  primaryColor?: string
  secondary?: React.ReactNode
  tertiary?: React.ReactNode
  dataSource?: string
}) {
  return (
    <SpecCard accent dataSource={dataSource} style={{ marginBottom: 0 }}>
      <div style={cardTitleStyle}>{title}</div>
      {subtitle && <div style={cardSubtitleStyle}>{subtitle}</div>}
      <div
        style={{
          fontSize: 32,
          fontWeight: 700,
          fontFamily: 'IBM Plex Mono, monospace',
          color: primaryColor,
          lineHeight: 1,
          marginBottom: 8,
        }}
      >
        {primary}
      </div>
      {secondary && (
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 4 }}>
          {secondary}
        </div>
      )}
      {tertiary && (
        <div style={{ fontSize: 11, color: 'var(--dim)' }}>{tertiary}</div>
      )}
    </SpecCard>
  )
}

// ─── Bar chart for Monthly Revenue ──────────────────────────────────────

function MonthlyRevenueChart({ view }: { view: MonthlyRevenueView }) {
  const maxVol = Math.max(1, ...view.points.map(p => p.volume))
  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${view.points.length}, 1fr)`,
          gap: 6,
          alignItems: 'end',
          height: 160,
          marginBottom: 10,
        }}
      >
        {view.points.map(p => {
          const pctH = (p.volume / maxVol) * 100
          const isCurrent = p.month_key === view.current_month?.month_key
          return (
            <div
              key={p.month_key}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-end',
                height: '100%',
                position: 'relative',
              }}
              title={`${p.label}: ${fmtCurrency(p.volume)} volume, ${p.deal_count} deals, ${fmtCurrency(p.est_gci)} est GCI`}
            >
              <div
                style={{
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.75)',
                  fontFamily: 'var(--mo)',
                  marginBottom: 2,
                  whiteSpace: 'nowrap',
                }}
              >
                {p.volume > 0 ? fmtCompact(p.volume) : ''}
              </div>
              <div
                style={{
                  width: '100%',
                  height: `${pctH}%`,
                  background: isCurrent
                    ? 'linear-gradient(180deg, #ff9f4d, #ff6a3d)'
                    : 'linear-gradient(180deg, rgba(80,200,120,0.85), rgba(80,200,120,0.4))',
                  borderRadius: 3,
                  minHeight: 1,
                  transition: 'opacity 0.2s',
                }}
              />
            </div>
          )
        })}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${view.points.length}, 1fr)`,
          gap: 6,
          fontSize: 10,
          color: 'var(--dim)',
          fontFamily: 'var(--mo)',
          textAlign: 'center',
        }}
      >
        {view.points.map(p => (
          <div key={p.month_key}>{p.label.split(' ')[0]}</div>
        ))}
      </div>
    </div>
  )
}

// ─── Widget ─────────────────────────────────────────────────────────────

export default async function SalesRevenueTab({
  slug,
  entityName,
  revenue30d,
  expenses30d,
}: Props) {
  const isCG = slug === CG_SLUG

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

  // ── Derived views (cast to our typed shapes) ────────────────────────
  const vol = salesVolR.data as VolumeKPI | null
  const gci = gciR.data as GciKPI | null
  const closedTx = closedTxR.data as ClosedTxKPI | null
  const avgComm = avgCommR.data as AvgCommissionKPI | null
  const topProd = topProducersR.data as TopProducerRow[] | null
  const pipeline = pipelineValR.data as CulbertsonPipelineView | null
  const revSrc = revBySourceR.data as RevenueBySourceView | null
  const monthly = monthlyRevR.data as MonthlyRevenueView | null

  return (
    <div style={{ marginBottom: 40 }}>
      {isCG ? (
        <>
          {/* ── KPI strip (5 cards) ────────────────────────────────── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 16,
              marginBottom: 24,
            }}
          >
            {vol ? (
              <KpiCard
                title="Sales Volume"
                subtitle="YTD closed-deal sale price"
                primary={fmtCurrency(vol.ytd)}
                primaryColor="var(--green)"
                secondary={
                  <>
                    MTD <b style={{ color: 'rgba(255,255,255,0.9)' }}>{fmtCurrency(vol.mtd)}</b>
                    {' · '}Prev mo {fmtCurrency(vol.prev_month)}
                  </>
                }
                tertiary={`${vol.count_ytd} deals YTD · avg ${fmtCurrency(vol.avg_price_ytd)}`}
                dataSource="monday:culbertson/sales_volume_ytd"
              />
            ) : (
              <ComingSoon
                title="Sales Volume YTD / MTD"
                reason={salesVolR.error || `Closed-transaction sale-price totals from the C&G Monday Closed Sales board for ${entityName}.`}
                icon="🏠"
                connect="monday-culbertson"
                dataSource="monday:culbertson/sales_volume_ytd"
                skeleton="kpi"
              />
            )}

            {gci ? (
              <KpiCard
                title="GCI — Gross Commission"
                subtitle={`Estimated at ${fmtPct(gci.rate * 100, 1)} of volume`}
                primary={fmtCurrency(gci.gci_ytd)}
                primaryColor="#ffd27a"
                secondary={
                  <>
                    MTD <b style={{ color: 'rgba(255,255,255,0.9)' }}>{fmtCurrency(gci.gci_mtd)}</b>
                    {' · '}Prev mo {fmtCurrency(gci.gci_prev_month)}
                  </>
                }
                tertiary={`Trailing 12m: ${fmtCurrency(gci.gci_last_12m)}`}
                dataSource="monday:culbertson/gci_ytd"
              />
            ) : (
              <ComingSoon
                title="GCI YTD / MTD"
                reason={gciR.error || 'Estimated gross commission income (2.5% industry rate on closed sale volume).'}
                icon="💵"
                connect="monday-culbertson"
                dataSource="monday:culbertson/gci_ytd"
                skeleton="kpi"
              />
            )}

            {closedTx ? (
              <KpiCard
                title="Closed Transactions"
                subtitle="Deal count YTD / MTD"
                primary={String(closedTx.ytd)}
                primaryColor="var(--purple)"
                secondary={
                  <>
                    MTD <b style={{ color: 'rgba(255,255,255,0.9)' }}>{closedTx.mtd}</b>
                    {' · '}Prev mo {closedTx.prev_month}
                  </>
                }
                tertiary={`Trailing 12m: ${closedTx.last_12m} · all-time: ${closedTx.all_time}`}
                dataSource="monday:culbertson/closed_transactions"
              />
            ) : (
              <ComingSoon
                title="Closed Transactions Count"
                reason={closedTxR.error || 'Deals closed YTD / MTD.'}
                icon="✅"
                connect="monday-culbertson"
                dataSource="monday:culbertson/closed_transactions"
                skeleton="kpi"
              />
            )}

            {avgComm ? (
              <KpiCard
                title="Avg Commission Split"
                subtitle="Company side of agent-split text"
                primary={fmtPct(avgComm.median_company_split_pct, 0)}
                primaryColor="#9bd6ff"
                secondary={
                  <>
                    Mean {fmtPct(avgComm.avg_company_split_pct, 1)} · n={avgComm.n}
                  </>
                }
                tertiary={`Implied rate ${fmtPct(avgComm.implied_company_rate_pct, 2)} (rev÷price)`}
                dataSource="monday:culbertson/avg_commission_pct"
              />
            ) : (
              <ComingSoon
                title="Average Commission Percentage"
                reason={avgCommR.error || 'Company side of commission split parsed from Transactions in Process.'}
                icon="📊"
                connect="monday-culbertson"
                dataSource="monday:culbertson/avg_commission_pct"
                skeleton="kpi"
              />
            )}

            {pipeline ? (
              <KpiCard
                title="Pipeline Value"
                subtitle={`${pipeline.active_count} active deals`}
                primary={fmtCurrency(pipeline.active_volume)}
                primaryColor="#ff9f4d"
                secondary={
                  <>
                    Pending <b style={{ color: 'rgba(255,255,255,0.9)' }}>{pipeline.pending_count}</b>
                    {' · '}
                    {fmtCurrency(pipeline.pending_volume)}
                  </>
                }
                tertiary={`Co-revenue booked on active: ${fmtCurrency(pipeline.active_company_revenue)}`}
                dataSource="monday:culbertson/pipeline_value"
              />
            ) : (
              <ComingSoon
                title="Pipeline Value"
                reason={pipelineValR.error || 'Sum of sale-price across active pipeline on Transactions in Process.'}
                icon="🏁"
                connect="monday-culbertson"
                dataSource="monday:culbertson/pipeline_value"
                skeleton="kpi"
              />
            )}
          </div>

          {/* ── Monthly Revenue (12-month bar chart) ────────────────── */}
          {monthly ? (
            <SpecCard accent dataSource="monday:culbertson/monthly_revenue" style={{ marginBottom: 24 }}>
              <div style={cardTitleStyle}>Monthly Revenue — 12-month trend</div>
              <div style={cardSubtitleStyle}>
                Volume per calendar month. Current month highlighted.{' '}
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>
                  Total {fmtCurrency(monthly.total_volume)}
                  {' · '}Est GCI {fmtCurrency(monthly.total_est_gci)}
                  {monthly.peak_month ? ` · Peak ${monthly.peak_month.label} ${fmtCurrency(monthly.peak_month.volume)}` : ''}
                </span>
              </div>
              <MonthlyRevenueChart view={monthly} />
            </SpecCard>
          ) : (
            <ComingSoon
              title="Monthly Revenue Chart"
              reason={monthlyRevR.error || 'Twelve-month volume trend, bucketed by month from Closed Sales.'}
              icon="📈"
              connect="monday"
              dataSource="monday:culbertson/monthly_revenue"
              skeleton="chart"
            />
          )}

          {/* ── Top Producers + Revenue by Source (2-col) ──────────── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(300px, 1.3fr) minmax(260px, 1fr)',
              gap: 16,
              marginBottom: 24,
            }}
          >
            {topProd ? (
              <SpecCard accent dataSource="monday:culbertson/top_producers">
                <div style={cardTitleStyle}>Top Producers — YTD</div>
                <div style={cardSubtitleStyle}>
                  Agents ranked by closed volume this year. Top {Math.min(10, topProd.length)} of {topProd.length}.
                </div>
                <div style={{ overflow: 'auto' }}>
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: 13,
                      fontFamily: 'var(--mo)',
                    }}
                  >
                    <thead>
                      <tr style={{ color: 'var(--dim)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 500 }}>#</th>
                        <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 500 }}>Agent</th>
                        <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 500 }}>Deals</th>
                        <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 500 }}>Volume YTD</th>
                        <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 500 }}>Est GCI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topProd.slice(0, 10).map((a, i) => (
                        <tr
                          key={a.agent}
                          style={{
                            borderTop: '1px solid rgba(255,255,255,0.06)',
                            color: 'rgba(255,255,255,0.92)',
                          }}
                        >
                          <td style={{ padding: '8px', color: 'var(--dim)' }}>{i + 1}</td>
                          <td style={{ padding: '8px', fontWeight: 600 }}>{a.agent}</td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>{a.count_ytd}</td>
                          <td style={{ padding: '8px', textAlign: 'right', color: 'var(--green)' }}>
                            {fmtCurrency(a.volume_ytd)}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', color: '#ffd27a' }}>
                            {fmtCurrency(a.est_gci_ytd)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SpecCard>
            ) : (
              <ComingSoon
                title="Top Producers Leaderboard"
                reason={topProducersR.error || 'Agents ranked by YTD closed volume aggregated from Closed Sales.'}
                icon="🏆"
                connect="monday"
                dataSource="monday:culbertson/top_producers"
                skeleton="table"
              />
            )}

            {revSrc ? (
              <SpecCard accent dataSource="monday:culbertson/revenue_by_source">
                <div style={cardTitleStyle}>Revenue by Source — YTD</div>
                <div style={cardSubtitleStyle}>
                  {fmtCurrency(revSrc.total_ytd)} total ·{' '}
                  {fmtCurrency(revSrc.est_total_gci_ytd)} est GCI
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {revSrc.sources.slice(0, 8).map(s => (
                    <div key={s.source}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: 'rgba(255,255,255,0.9)' }}>{s.source}</span>
                        <span style={{ color: 'var(--dim)', fontFamily: 'var(--mo)' }}>
                          {fmtCurrency(s.volume_ytd)} · {s.count_ytd}
                        </span>
                      </div>
                      <div
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          height: 6,
                          borderRadius: 3,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.min(100, s.pct_of_ytd)}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #ff9f4d, #ff6a3d)',
                          }}
                        />
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2, fontFamily: 'var(--mo)' }}>
                        {fmtPct(s.pct_of_ytd, 1)} of YTD
                      </div>
                    </div>
                  ))}
                </div>
              </SpecCard>
            ) : (
              <ComingSoon
                title="Revenue by Source"
                reason={revBySourceR.error || 'GCI split by lead source.'}
                icon="🔀"
                connect="monday"
                dataSource="monday:culbertson/revenue_by_source"
                skeleton="chart"
              />
            )}
          </div>

          {/* ── Pipeline Stage breakdown ────────────────────────────── */}
          {pipeline ? (
            <SpecCard accent dataSource="monday:culbertson/pipeline_value" style={{ marginBottom: 24 }}>
              <div style={cardTitleStyle}>Pipeline by Stage</div>
              <div style={cardSubtitleStyle}>
                Transactions in Process — {pipeline.total_items} items total
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${pipeline.stages.length}, 1fr)`,
                  gap: 10,
                }}
              >
                {pipeline.stages.map(s => {
                  const isActive = ['new_group68267', 'duplicate_of_active_listings__1', 'new_group7848', 'topics'].includes(
                    s.group_id
                  )
                  return (
                    <div
                      key={s.group_id}
                      style={{
                        padding: '10px 12px',
                        background: isActive ? 'rgba(80,200,120,0.08)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${isActive ? 'rgba(80,200,120,0.25)' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: 6,
                      }}
                    >
                      <div style={{ fontSize: 10, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {s.group_name}
                      </div>
                      <div
                        style={{
                          fontSize: 22,
                          fontWeight: 700,
                          fontFamily: 'var(--mo)',
                          color: isActive ? 'var(--green)' : 'rgba(255,255,255,0.85)',
                          marginTop: 2,
                        }}
                      >
                        {s.count}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 2 }}>
                        {fmtCurrency(s.volume)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </SpecCard>
          ) : null}
        </>
      ) : null}

      {/* ── Revenue & Expenses fallback (financial_transactions) ─────── */}
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
            <div style={cardTitleStyle}>Revenue — last 30 days</div>
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
            <div style={cardTitleStyle}>Expenses — last 30 days</div>
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
                    revenue30d - expenses30d >= 0 ? 'var(--green)' : 'var(--red)',
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
