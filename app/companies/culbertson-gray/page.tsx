/**
 * /companies/culbertson-gray — The Culbertson and Gray Group operations
 * dashboard, wired to live Follow Up Boss (FUB) data.
 *
 * Data source: app/lib/fub.ts  (FUB_API_KEY)
 * Entity row:  entity_ownership.id = 'culbertson-gray'
 *
 * Widget map (all server-rendered, 60s FUB cache, graceful null fallback):
 *   1. Active Lead Pipeline          (FUB /deals grouped by stage)
 *   2. Agent Performance Roster      (FUB /users + aggregates)
 *   3. Today's Activity              (FUB /calls + /appointments + /deals)
 *   4. Upcoming Appointments (7d)    (FUB /appointments range)
 *   5. Smart Lists Snapshot          (FUB /smartLists)
 *   6. Recent Deals / Closings       (FUB /deals, PII redacted to initials)
 *   7. Call Volume (30d)             (FUB /calls, bucketed daily)
 *   8. Response Time KPI             (FUB /people, first-communication delta)
 *
 * When FUB_API_KEY is missing every widget falls back to ComingSoon with a
 * "Configure FUB → /integrations" CTA. Server components never throw.
 */
import Link from 'next/link'
import Hero from '../../_components/Hero'
import { SpecCard } from '../../_components/SpecCard'
import ComingSoon from '../../_components/ComingSoon'
import HeroCanvas from './HeroCanvas'
import {
  getFubIdentity,
  getFubKpis,
  getFubLeadPipeline,
  getFubAgentRoster,
  getFubTodayActivity,
  getFubAppointments,
  getFubSmartListsSnapshot,
  getFubRecentClosed,
  getFubCallVolume30d,
  getFubResponseTime,
  isFubConfigured,
  type PipelineView,
  type AgentRosterRow,
  type TodaysActivity,
  type FubAppointment,
  type SmartListSnapshot,
  type RecentClosedDeal,
  type CallVolumeDaily,
  type ResponseTimeKpi,
  type FubKpis,
  type FubIdentity,
} from '../../lib/fub'

export const dynamic = 'force-dynamic'

// ─── Helpers ────────────────────────────────────────────────────────────

function fmtCurrency(n: number | null | undefined): string {
  const v = Number(n ?? 0)
  if (!Number.isFinite(v) || v === 0) return '$0'
  if (v >= 1_000_000) return '$' + (v / 1_000_000).toFixed(1) + 'M'
  if (v >= 1_000) return '$' + (v / 1_000).toFixed(1) + 'K'
  return '$' + v.toFixed(0)
}

function fmtWhen(iso?: string | null): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

function pct(n: number, total: number): number {
  if (!total) return 0
  return Math.round((n / total) * 100)
}

// ─── Page ───────────────────────────────────────────────────────────────

export default async function CulbertsonGrayPage() {
  const configured = isFubConfigured()

  // Fetch everything in parallel. Each returns { data, error } — no throw.
  const [
    idR,
    kpisR,
    pipelineR,
    rosterR,
    todayR,
    apptsR,
    smartR,
    closedR,
    volumeR,
    rtR,
  ] = configured
    ? await Promise.all([
        getFubIdentity(),
        getFubKpis(),
        getFubLeadPipeline(),
        getFubAgentRoster(),
        getFubTodayActivity(),
        getFubAppointments('week'),
        getFubSmartListsSnapshot(),
        getFubRecentClosed(10),
        getFubCallVolume30d(),
        getFubResponseTime(),
      ])
    : ([
        { data: null, error: 'Not configured' },
        { data: null, error: 'Not configured' },
        { data: null, error: 'Not configured' },
        { data: null, error: 'Not configured' },
        { data: null, error: 'Not configured' },
        { data: null, error: 'Not configured' },
        { data: null, error: 'Not configured' },
        { data: null, error: 'Not configured' },
        { data: null, error: 'Not configured' },
        { data: null, error: 'Not configured' },
      ] as const)

  const identity: FubIdentity | null = idR.data
  const kpis: FubKpis | null = kpisR.data
  const pipeline: PipelineView | null = pipelineR.data
  const roster: AgentRosterRow[] | null = rosterR.data
  const today: TodaysActivity | null = todayR.data
  const appts: FubAppointment[] | null = apptsR.data
  const smart: SmartListSnapshot | null = smartR.data
  const closed: RecentClosedDeal[] | null = closedR.data
  const volume: CallVolumeDaily[] | null = volumeR.data
  const rt: ResponseTimeKpi | null = rtR.data

  // Hero primary metric — Active pipeline $ value
  const heroValue = kpis ? fmtCurrency(kpis.activePipelineValue) : configured ? '—' : 'Not Configured'
  const heroSubtitle = kpis
    ? `Active pipeline · ${kpis.activeDeals} deals · ${kpis.totalAgents} agents`
    : configured
    ? 'Loading FUB data…'
    : 'Connect FUB to activate this dashboard'

  const accountName =
    (identity as any)?.account?.name || 'The Culbertson and Gray Group'

  const kpiCards = kpis
    ? [
        { label: 'Calls MTD', value: kpis.callsMtd.toLocaleString() },
        { label: 'Appts (7d)', value: String(kpis.appointmentsWeek) },
        { label: 'Closed YTD', value: fmtCurrency(kpis.closedYtdValue) },
        { label: 'Avg Deal', value: fmtCurrency(kpis.avgDealSize) },
      ]
    : [
        { label: 'Calls MTD', value: '—' },
        { label: 'Appts (7d)', value: '—' },
        { label: 'Closed YTD', value: '—' },
        { label: 'Avg Deal', value: '—' },
      ]

  const playerCard = {
    name: 'Colby Culbertson',
    role: 'Broker · Admin · Owner',
    level: 7,
    xpCurrent: kpis?.closedYtdDeals ?? 0,
    xpNext: Math.max(10, (kpis?.closedYtdDeals ?? 0) + 10),
    since: '2025-01',
    stats: [
      { key: 'Pipeline', value: kpis ? fmtCurrency(kpis.activePipelineValue) : '—' },
      { key: 'Agents', value: String(kpis?.totalAgents ?? '—') },
      { key: 'People', value: kpis?.totalPeople ? `${(kpis.totalPeople / 1000).toFixed(0)}K` : '—' },
      { key: 'Closed YTD', value: String(kpis?.closedYtdDeals ?? '—') },
    ],
    initials: 'CG',
  }

  // Stage color palette for pipeline bars
  const STAGE_COLORS: Record<string, string> = {
    'Lead': 'var(--purple)',
    'Attempted Contact': 'var(--pink)',
    'Spoke with customer': 'var(--orange)',
    'Appointment set': 'var(--amber)',
    'Met with customer': 'var(--lime)',
    'Showing Homes': 'var(--green)',
    'Listing agreement': 'var(--green)',
    'Active listing': 'var(--green)',
    'Submitting offers': 'var(--amber)',
  }

  // Find the max stage total for pipeline bar scaling
  const maxStageValue = pipeline ? Math.max(1, ...pipeline.stages.map(s => s.totalValue)) : 1
  const maxSparkY = today ? Math.max(1, ...today.spark7d.map(s => s.count)) : 1
  const maxVolumeY = volume ? Math.max(1, ...volume.map(v => v.count)) : 1

  return (
    <>
      <Hero
        label="≈ COMPANIES · CULBERTSON & GRAY GROUP"
        greeting={accountName}
        primaryMetric={heroValue}
        metricSubtitle={heroSubtitle}
        kpiCards={kpiCards}
        playerCard={playerCard}
        animationSlot={<HeroCanvas />}
      />

      {/* Back link */}
      <div style={{ margin: '16px 0 24px' }}>
        <Link
          href="/companies"
          style={{
            fontSize: 11,
            color: 'var(--dim)',
            textDecoration: 'none',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            fontWeight: 600,
          }}
        >
          ← All Companies
        </Link>
      </div>

      {/* ─── KPI strip ──────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 28,
        }}
      >
        {[
          { label: 'Active Deals', value: String(kpis?.activeDeals ?? '—'), accent: 'var(--orange)' },
          { label: 'Active Pipeline', value: fmtCurrency(kpis?.activePipelineValue ?? 0), accent: 'var(--green)' },
          { label: 'Closed YTD', value: String(kpis?.closedYtdDeals ?? '—'), accent: 'var(--lime)' },
          { label: 'Agents Active', value: String(kpis?.totalAgents ?? '—'), accent: 'var(--purple)' },
        ].map(k => (
          <SpecCard key={k.label} accent dataSource="fub:getFubKpis">
            <div
              style={{
                fontSize: 10,
                color: 'var(--dim)',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                marginBottom: 8,
                fontWeight: 600,
              }}
            >
              {k.label}
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                fontFamily: 'var(--mo, "IBM Plex Mono", monospace)',
                color: k.accent,
              }}
            >
              {k.value}
            </div>
          </SpecCard>
        ))}
      </div>

      {/* ─── Widget 1 · Active Lead Pipeline ─────────────────────── */}
      {pipeline ? (
        <SpecCard accent dataSource="fub:getFubLeadPipeline" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'rgba(255,255,255,0.85)',
                }}
              >
                Active Lead Pipeline
              </div>
              <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 2 }}>
                {pipeline.totalDeals} active deals · {fmtCurrency(pipeline.totalValue)} total value
              </div>
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--dim)',
                fontFamily: 'var(--mo, monospace)',
              }}
            >
              FUB · {pipeline.stages.length} stages
            </div>
          </div>

          {pipeline.stages.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--dim)' }}>No active deals. All deals are closed or lost.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pipeline.stages.map(s => {
                const barPct = Math.max(2, Math.round((s.totalValue / maxStageValue) * 100))
                const color = STAGE_COLORS[s.stageName] ?? 'var(--purple)'
                return (
                  <div key={s.stageId}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>
                        {s.stageName}{' '}
                        <span style={{ color: 'var(--dim)', fontWeight: 400, fontSize: 11 }}>
                          · {s.count} deals
                        </span>
                      </div>
                      <div style={{ fontSize: 12, fontFamily: 'var(--mo, monospace)', color }}>
                        {fmtCurrency(s.totalValue)}
                      </div>
                    </div>
                    <div
                      style={{
                        position: 'relative',
                        height: 8,
                        borderRadius: 4,
                        background: 'rgba(255,255,255,0.04)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: `${barPct}%`,
                          background: color,
                          opacity: 0.65,
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </SpecCard>
      ) : (
        <ComingSoon
          title="Active Lead Pipeline"
          reason={pipelineR.error || 'Connect Follow Up Boss to see stage-by-stage pipeline.'}
          icon="🏁"
          connect="fub"
          dataSource="fub:getFubLeadPipeline"
          skeleton="chart"
        />
      )}

      {/* ─── Widget 2 · Agent Performance Roster ─────────────────── */}
      {roster ? (
        <SpecCard accent dataSource="fub:getFubAgentRoster" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'rgba(255,255,255,0.85)',
              }}
            >
              Agent Performance Roster
            </div>
            <div style={{ fontSize: 11, color: 'var(--dim)', fontFamily: 'var(--mo, monospace)' }}>
              {roster.length} active agents
            </div>
          </div>

          {roster.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--dim)' }}>No active agents in FUB.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--dim)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    <th style={{ padding: '8px 6px' }}>#</th>
                    <th style={{ padding: '8px 6px' }}>Agent</th>
                    <th style={{ padding: '8px 6px' }}>Role</th>
                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>Calls MTD</th>
                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>Appts MTD</th>
                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>Active</th>
                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>Closed YTD</th>
                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>Pipeline $</th>
                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>Closed $ YTD</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.slice(0, 25).map((r, idx) => {
                    const isTop = idx === 0
                    return (
                      <tr
                        key={r.userId}
                        style={{
                          borderTop: '1px solid rgba(255,255,255,0.04)',
                          background: isTop ? 'rgba(16,185,129,0.05)' : undefined,
                        }}
                      >
                        <td
                          style={{
                            padding: '8px 6px',
                            fontFamily: 'var(--mo, monospace)',
                            color: isTop ? 'var(--green)' : 'var(--dim)',
                            fontWeight: isTop ? 700 : 400,
                          }}
                        >
                          {idx + 1}
                        </td>
                        <td style={{ padding: '8px 6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {r.pictureUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={r.pictureUrl}
                                alt=""
                                style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0 }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: '50%',
                                  background: 'rgba(139,92,246,0.2)',
                                  color: 'var(--purple)',
                                  fontSize: 10,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 700,
                                }}
                              >
                                {r.userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <span style={{ fontWeight: isTop ? 600 : 500 }}>{r.userName}</span>
                            {isTop && (
                              <span
                                style={{
                                  fontSize: 9,
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  background: 'rgba(16,185,129,0.15)',
                                  color: 'var(--green)',
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.08em',
                                }}
                              >
                                Top
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '8px 6px', color: 'var(--dim)', fontSize: 11 }}>{r.role}</td>
                        <td style={{ padding: '8px 6px', textAlign: 'right', fontFamily: 'var(--mo, monospace)' }}>{r.callsMtd}</td>
                        <td style={{ padding: '8px 6px', textAlign: 'right', fontFamily: 'var(--mo, monospace)' }}>{r.appointmentsMtd}</td>
                        <td style={{ padding: '8px 6px', textAlign: 'right', fontFamily: 'var(--mo, monospace)' }}>{r.dealsActive}</td>
                        <td style={{ padding: '8px 6px', textAlign: 'right', fontFamily: 'var(--mo, monospace)' }}>{r.dealsClosedYtd}</td>
                        <td style={{ padding: '8px 6px', textAlign: 'right', fontFamily: 'var(--mo, monospace)', color: 'var(--orange)' }}>
                          {fmtCurrency(r.pipelineValue)}
                        </td>
                        <td style={{ padding: '8px 6px', textAlign: 'right', fontFamily: 'var(--mo, monospace)', color: 'var(--green)' }}>
                          {fmtCurrency(r.closedValueYtd)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {roster.length > 25 && (
                <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 8 }}>
                  Showing top 25 of {roster.length} agents.
                </div>
              )}
            </div>
          )}
        </SpecCard>
      ) : (
        <ComingSoon
          title="Agent Performance Roster"
          reason={rosterR.error || 'Connect Follow Up Boss to see agent MTD / YTD performance.'}
          icon="🏅"
          connect="fub"
          dataSource="fub:getFubAgentRoster"
          skeleton="table"
        />
      )}

      {/* ─── Widget 3+4 two-column: Today & Upcoming Appointments ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {today ? (
          <SpecCard accent dataSource="fub:getFubTodayActivity">
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 14,
                color: 'rgba(255,255,255,0.85)',
              }}
            >
              Today&apos;s Activity
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 14 }}>
              {[
                { label: 'Calls', value: today.callsToday, color: 'var(--orange)' },
                { label: 'Appts', value: today.appointmentsToday, color: 'var(--amber)' },
                { label: 'New Deals', value: today.dealsCreatedToday, color: 'var(--green)' },
              ].map(s => (
                <div
                  key={s.label}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.04)',
                    borderRadius: 12,
                    padding: 14,
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 700,
                      color: s.color,
                      fontFamily: 'var(--mo, monospace)',
                    }}
                  >
                    {s.value}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: 'var(--dim)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      marginTop: 4,
                      fontWeight: 600,
                    }}
                  >
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            {/* 7-day sparkline */}
            <div style={{ fontSize: 10, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, fontWeight: 600 }}>
              Calls — last 7 days
            </div>
            <svg viewBox="0 0 200 40" preserveAspectRatio="none" style={{ width: '100%', height: 40 }}>
              <polyline
                fill="none"
                stroke="var(--orange)"
                strokeWidth="1.5"
                points={today.spark7d
                  .map((s, i) => {
                    const x = (i / (today.spark7d.length - 1 || 1)) * 200
                    const y = 38 - (s.count / maxSparkY) * 34
                    return `${x},${y}`
                  })
                  .join(' ')}
              />
              {today.spark7d.map((s, i) => {
                const x = (i / (today.spark7d.length - 1 || 1)) * 200
                const y = 38 - (s.count / maxSparkY) * 34
                return <circle key={s.date} cx={x} cy={y} r="1.5" fill="var(--orange)" />
              })}
            </svg>
          </SpecCard>
        ) : (
          <ComingSoon
            title="Today's Activity"
            reason={todayR.error || 'Connect FUB for live call/appointment/deal counts.'}
            icon="📊"
            connect="fub"
            dataSource="fub:getFubTodayActivity"
            skeleton="kpi"
          />
        )}

        {appts ? (
          <SpecCard accent dataSource="fub:getFubAppointments">
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 14,
                color: 'rgba(255,255,255,0.85)',
              }}
            >
              Upcoming Appointments · 7 days
            </div>
            {appts.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--dim)' }}>No upcoming appointments this week.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
                {appts.slice(0, 12).map(a => (
                  <div
                    key={a.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.04)',
                      gap: 12,
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {a.title || 'Appointment'}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: 'var(--dim)',
                          marginTop: 2,
                          fontFamily: 'var(--mo, monospace)',
                        }}
                      >
                        {a.type || 'Appt'}{a.location ? ` · ${a.location}` : ''}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: 'var(--amber)',
                        fontFamily: 'var(--mo, monospace)',
                        textAlign: 'right',
                        flexShrink: 0,
                        alignSelf: 'center',
                      }}
                    >
                      {fmtWhen(a.start)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SpecCard>
        ) : (
          <ComingSoon
            title="Upcoming Appointments"
            reason={apptsR.error || 'Connect FUB for the 7-day appointment roll-up.'}
            icon="📅"
            connect="fub"
            dataSource="fub:getFubAppointments"
            skeleton="table"
          />
        )}
      </div>

      {/* ─── Widget 7 · Call Volume 30d ───────────────────────────── */}
      {volume ? (
        <SpecCard accent dataSource="fub:getFubCallVolume30d" style={{ marginBottom: 24 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 14,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'rgba(255,255,255,0.85)',
              }}
            >
              Call Volume — 30 days
            </div>
            <div style={{ fontSize: 11, color: 'var(--dim)', fontFamily: 'var(--mo, monospace)' }}>
              {volume.reduce((s, v) => s + v.count, 0)} calls
            </div>
          </div>

          <svg viewBox="0 0 600 140" preserveAspectRatio="none" style={{ width: '100%', height: 140 }}>
            {/* grid */}
            {[0, 0.25, 0.5, 0.75, 1].map(y => (
              <line
                key={y}
                x1="0"
                x2="600"
                y1={10 + y * 120}
                y2={10 + y * 120}
                stroke="rgba(255,255,255,0.04)"
                strokeWidth="1"
              />
            ))}
            {/* bars */}
            {volume.map((v, i) => {
              const barW = 600 / volume.length - 2
              const x = (i / volume.length) * 600 + 1
              const h = (v.count / maxVolumeY) * 120
              const y = 130 - h
              const isLast = i === volume.length - 1
              return (
                <g key={v.date}>
                  <rect x={x} y={y} width={barW} height={h} fill={isLast ? 'var(--orange)' : 'var(--purple)'} opacity={isLast ? 0.9 : 0.6} rx="1" />
                </g>
              )
            })}
            {/* trend line */}
            <polyline
              fill="none"
              stroke="var(--green)"
              strokeWidth="1.5"
              points={volume
                .map((v, i) => {
                  const x = (i / (volume.length - 1 || 1)) * 600
                  const y = 130 - (v.count / maxVolumeY) * 120
                  return `${x},${y}`
                })
                .join(' ')}
              opacity="0.7"
            />
          </svg>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 10,
              color: 'var(--dim)',
              fontFamily: 'var(--mo, monospace)',
              marginTop: 4,
            }}
          >
            <span>{volume[0]?.date.slice(5) ?? '—'}</span>
            <span>
              Avg{' '}
              {Math.round(volume.reduce((s, v) => s + v.count, 0) / (volume.length || 1))} /day
            </span>
            <span>{volume[volume.length - 1]?.date.slice(5) ?? '—'}</span>
          </div>
        </SpecCard>
      ) : (
        <ComingSoon
          title="Call Volume (30d)"
          reason={volumeR.error || 'Connect FUB to chart daily call volume.'}
          icon="📞"
          connect="fub"
          dataSource="fub:getFubCallVolume30d"
          skeleton="chart"
        />
      )}

      {/* ─── Two-column: Smart Lists + Response Time ──────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {smart ? (
          <SpecCard accent dataSource="fub:getFubSmartListsSnapshot">
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 14,
                color: 'rgba(255,255,255,0.85)',
              }}
            >
              Smart Lists
            </div>
            <div style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 12 }}>
              {smart.lists.length} lists · {smart.total.toLocaleString()} people total
            </div>
            {smart.lists.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--dim)' }}>No smart lists configured in FUB.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 320, overflowY: 'auto' }}>
                {smart.lists.slice(0, 15).map(l => (
                  <div
                    key={l.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '6px 8px',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }}>
                      {l.name}
                    </span>
                    <span style={{ fontFamily: 'var(--mo, monospace)', color: 'var(--lime)', fontWeight: 600 }}>
                      {l.count.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </SpecCard>
        ) : (
          <ComingSoon
            title="Smart Lists"
            reason={smartR.error || 'Connect FUB to see smart-list counts.'}
            icon="🎯"
            connect="fub"
            dataSource="fub:getFubSmartListsSnapshot"
            skeleton="table"
          />
        )}

        {rt ? (
          <SpecCard accent dataSource="fub:getFubResponseTime">
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 14,
                color: 'rgba(255,255,255,0.85)',
              }}
            >
              Response Time — new leads
            </div>
            <div style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 14 }}>
              Sample: {rt.sampleSize} most recent leads with first contact
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--mo, monospace)', color: 'var(--amber)' }}>
                  {rt.averageMinutes != null ? `${rt.averageMinutes}m` : '—'}
                </div>
                <div style={{ fontSize: 10, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4, fontWeight: 600 }}>
                  Average
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--mo, monospace)', color: 'var(--green)' }}>
                  {rt.medianMinutes != null ? `${rt.medianMinutes}m` : '—'}
                </div>
                <div style={{ fontSize: 10, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4, fontWeight: 600 }}>
                  Median
                </div>
              </div>
            </div>

            {/* Distribution bars */}
            {[
              { label: 'Under 5 min', count: rt.under5min, color: 'var(--green)' },
              { label: 'Under 15 min', count: rt.under15min, color: 'var(--lime)' },
              { label: 'Under 1 hr', count: rt.under1hour, color: 'var(--amber)' },
            ].map(b => {
              const percent = pct(b.count, rt.sampleSize || 1)
              return (
                <div key={b.label} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                    <span>{b.label}</span>
                    <span style={{ fontFamily: 'var(--mo, monospace)', color: b.color, fontWeight: 600 }}>
                      {b.count} · {percent}%
                    </span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${percent}%`, height: '100%', background: b.color, opacity: 0.65 }} />
                  </div>
                </div>
              )
            })}
          </SpecCard>
        ) : (
          <ComingSoon
            title="Response Time"
            reason={rtR.error || 'Connect FUB to compute lead → first-contact response times.'}
            icon="⏱"
            connect="fub"
            dataSource="fub:getFubResponseTime"
            skeleton="kpi"
          />
        )}
      </div>

      {/* ─── Widget 6 · Recent Closings ───────────────────────────── */}
      {closed ? (
        <SpecCard accent dataSource="fub:getFubRecentClosed" style={{ marginBottom: 24 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 14,
              color: 'rgba(255,255,255,0.85)',
            }}
          >
            Recent Closings · last 10
          </div>
          {closed.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--dim)' }}>No closed deals recorded in FUB yet.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--dim)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  <th style={{ padding: '8px 6px' }}>Borrower</th>
                  <th style={{ padding: '8px 6px' }}>Pipeline</th>
                  <th style={{ padding: '8px 6px' }}>Stage</th>
                  <th style={{ padding: '8px 6px', textAlign: 'right' }}>Price</th>
                  <th style={{ padding: '8px 6px', textAlign: 'right' }}>Commission</th>
                  <th style={{ padding: '8px 6px' }}>Closed</th>
                </tr>
              </thead>
              <tbody>
                {closed.map(d => (
                  <tr key={d.id} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '8px 6px', fontFamily: 'var(--mo, monospace)', fontWeight: 600 }}>
                      {d.borrower}
                    </td>
                    <td style={{ padding: '8px 6px' }}>{d.pipelineName}</td>
                    <td style={{ padding: '8px 6px', color: 'var(--dim)', fontSize: 11 }}>{d.stageName}</td>
                    <td style={{ padding: '8px 6px', textAlign: 'right', fontFamily: 'var(--mo, monospace)', color: 'var(--green)' }}>
                      {fmtCurrency(d.amount)}
                    </td>
                    <td style={{ padding: '8px 6px', textAlign: 'right', fontFamily: 'var(--mo, monospace)', color: 'var(--lime)' }}>
                      {fmtCurrency(d.commissionValue)}
                    </td>
                    <td style={{ padding: '8px 6px', fontSize: 11, color: 'var(--dim)' }}>
                      {d.closedAt ? fmtWhen(d.closedAt) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SpecCard>
      ) : (
        <ComingSoon
          title="Recent Closings"
          reason={closedR.error || 'Connect FUB to surface the last 10 closed deals.'}
          icon="🏆"
          connect="fub"
          dataSource="fub:getFubRecentClosed"
          skeleton="table"
        />
      )}

      {/* ─── Footer meta ─────────────────────────────────────────── */}
      <div
        style={{
          fontSize: 10,
          color: 'var(--dim)',
          fontFamily: 'var(--mo, monospace)',
          padding: '16px 0',
          borderTop: '1px solid rgba(255,255,255,0.04)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        Source: Follow Up Boss · cached 60s · last refreshed {new Date().toUTCString()}
      </div>
    </>
  )
}
