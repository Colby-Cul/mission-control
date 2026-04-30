'use client'
/**
 * CronAnalytics — client component for all cost-by-cron charts.
 * Receives raw session rows from the server component; does all
 * aggregation + rendering client-side to keep charts interactive.
 */
import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, Legend, LineChart, Line, CartesianGrid,
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────
export interface SessionRow {
  id: string
  title?: string | null
  agent_name?: string | null
  status?: string | null
  cron_id?: string | null
  trigger_source?: string | null
  input_tokens?: number | null
  output_tokens?: number | null
  cost_usd?: number | null
  tokens?: number | null
  cost?: number | null
  started_at?: string | null
  ended_at?: string | null
  metadata?: Record<string, unknown> | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const CHART_COLORS = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#3b82f6',
  '#ec4899', '#06b6d4', '#84cc16', '#ef4444', '#a78bfa',
]

const TT_STYLE = {
  backgroundColor: '#0d0d1a',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10,
  color: '#f5f5f7',
  fontSize: 12,
  fontFamily: 'IBM Plex Mono, monospace',
}

function fmt$(n: number) { return n < 0.001 ? '<$0.001' : `$${n.toFixed(4)}` }
function fmtK(n: number) { return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n) }

/** Strip common noisy prompt prefixes from a title */
export function cleanTitle(raw: string | null | undefined, cronId?: string | null): string {
  if (!raw) return cronId ?? 'Session'
  const stripped = raw
    .replace(/^YOU MUST EXECUTE EVERY STEP BELOW[\s\S]*?[.!]\s*/i, '')
    .replace(/^IMPORTANT:\s*/i, '')
    .replace(/^NOTE:\s*/i, '')
    .replace(/^CRITICAL:\s*/i, '')
    .replace(/^DO NOT SUMMARIZE[\s\S]*?[.!]\s*/i, '')
    .trim()
  const first60 = stripped.slice(0, 60)
  return first60.length < stripped.length ? first60 + '…' : first60 || (cronId ?? 'Session')
}

function getEffectiveCost(s: SessionRow): number {
  return Number(s.cost_usd ?? s.cost ?? 0)
}
function getInputTokens(s: SessionRow): number { return Number(s.input_tokens ?? 0) }
function getOutputTokens(s: SessionRow): number {
  // if output_tokens missing, estimate 75% of total as output
  if (s.output_tokens) return Number(s.output_tokens)
  const total = Number(s.tokens ?? 0)
  return Math.round(total * 0.75)
}
function getTotalTokens(s: SessionRow): number {
  return getInputTokens(s) + getOutputTokens(s) || Number(s.tokens ?? 0)
}

// ─── Aggregation ──────────────────────────────────────────────────────────────
interface CronStat {
  cronId: string
  runs: number
  totalCost: number
  avgCostPerRun: number
  totalInputTokens: number
  totalOutputTokens: number
  avgTokensPerRun: number
  trend: { date: string; cost: number }[]
  colorIdx: number
}

function aggregateByCron(rows: SessionRow[]): CronStat[] {
  const map = new Map<string, SessionRow[]>()
  rows.forEach(r => {
    const key = r.cron_id ?? r.agent_name ?? 'unknown'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(r)
  })

  const stats: CronStat[] = []
  let colorIdx = 0
  map.forEach((sessions, cronId) => {
    const totalCost = sessions.reduce((s, r) => s + getEffectiveCost(r), 0)
    const totalInput = sessions.reduce((s, r) => s + getInputTokens(r), 0)
    const totalOutput = sessions.reduce((s, r) => s + getOutputTokens(r), 0)

    // daily trend
    const dayMap = new Map<string, number>()
    sessions.forEach(r => {
      const day = (r.started_at ?? '').slice(0, 10)
      if (day) dayMap.set(day, (dayMap.get(day) ?? 0) + getEffectiveCost(r))
    })
    const trend = [...dayMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, cost]) => ({ date, cost }))

    stats.push({
      cronId,
      runs: sessions.length,
      totalCost,
      avgCostPerRun: sessions.length > 0 ? totalCost / sessions.length : 0,
      totalInputTokens: totalInput,
      totalOutputTokens: totalOutput,
      avgTokensPerRun: sessions.length > 0 ? (totalInput + totalOutput) / sessions.length : 0,
      trend,
      colorIdx: colorIdx++,
    })
  })

  return stats.sort((a, b) => b.totalCost - a.totalCost)
}

// ─── Optimization heuristics ──────────────────────────────────────────────────
function getOptimizationSuggestion(stat: CronStat): string {
  const outputRatio = stat.totalOutputTokens / (stat.totalInputTokens + stat.totalOutputTokens + 1)
  if (stat.avgCostPerRun > 0.08) return 'Consider model downgrade (Haiku) or output capping'
  if (outputRatio > 0.8) return 'Output-heavy — try shorter instructions or result caching'
  if (stat.runs > 50) return 'High-frequency job — consider increasing run interval'
  if (stat.avgTokensPerRun > 8000) return 'Very high token usage — cache static context'
  return 'Monitor for cost creep; consider prompt compression'
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function OptimizationCard({ stats }: { stats: CronStat[] }) {
  const TOTAL_THRESHOLD = 0.5   // $0.50 total
  const PER_RUN_THRESHOLD = 0.04 // $0.04/run

  const candidates = stats
    .filter(s => s.totalCost > TOTAL_THRESHOLD || s.avgCostPerRun > PER_RUN_THRESHOLD)
    .slice(0, 3)

  if (candidates.length === 0) return null

  return (
    <div style={{
      background: 'rgba(245,158,11,0.06)',
      border: '1px solid rgba(245,158,11,0.2)',
      borderRadius: 14,
      padding: '16px 20px',
      marginBottom: 24,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
        Optimization Candidates
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {candidates.map(s => (
          <div key={s.cronId} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{
              flexShrink: 0,
              width: 8, height: 8,
              borderRadius: '50%',
              marginTop: 5,
              background: s.totalCost > 2 ? 'var(--red)' : s.avgCostPerRun > 0.08 ? 'var(--amber)' : 'var(--accent)',
            }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', fontFamily: 'var(--mo)' }}>
                {s.cronId}
                <span style={{ marginLeft: 10, fontSize: 11, color: 'var(--amber)', fontWeight: 400 }}>
                  {fmt$(s.totalCost)} total · {fmt$(s.avgCostPerRun)}/run
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>
                {getOptimizationSuggestion(s)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MiniSparkline({ trend, color }: { trend: { date: string; cost: number }[]; color: string }) {
  if (trend.length < 2) return <span style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'var(--mo)' }}>–</span>

  const pts = trend.map(t => t.cost)
  const min = Math.min(...pts)
  const max = Math.max(...pts)
  const range = max - min || 0.0001
  const W = 80, H = 24, pad = 2

  const coords = pts.map((v, i) => ({
    x: pad + (i / (pts.length - 1)) * (W - pad * 2),
    y: pad + (H - pad * 2) - ((v - min) / range) * (H - pad * 2),
  }))

  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ')
  const up = pts[pts.length - 1] >= pts[0]

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        <path d={line} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r={2} fill={color} />
      </svg>
      <span style={{ fontSize: 10, color: up ? 'var(--red)' : 'var(--green)', fontFamily: 'var(--mo)' }}>
        {up ? '↑' : '↓'}
      </span>
    </div>
  )
}

function CronDetailPanel({ stat, sessions, onClose }: {
  stat: CronStat
  sessions: SessionRow[]
  onClose: () => void
}) {
  const filteredSessions = sessions.filter(s =>
    (s.cron_id ?? s.agent_name ?? 'unknown') === stat.cronId
  ).slice(0, 20)

  const trendData = stat.trend.map(t => ({
    ...t,
    cost: Number(t.cost.toFixed(6)),
  }))

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(6,6,16,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#0d0d20',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 20,
        padding: 28,
        width: '100%',
        maxWidth: 760,
        maxHeight: '80vh',
        overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
              Cron Job Detail
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--mo)', color: 'var(--t1)' }}>
              {stat.cronId}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8,
            color: 'var(--t2)', cursor: 'pointer', padding: '6px 12px', fontSize: 13,
          }}>✕ Close</button>
        </div>

        {/* KPI strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total Cost',    value: fmt$(stat.totalCost) },
            { label: 'Runs',          value: String(stat.runs) },
            { label: 'Avg / Run',     value: fmt$(stat.avgCostPerRun) },
            { label: 'Avg Tokens',    value: fmtK(Math.round(stat.avgTokensPerRun)) },
          ].map(k => (
            <div key={k.label} style={{
              background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 14px',
              border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: 10, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{k.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--t1)', fontFamily: 'var(--mo)', marginTop: 4 }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Cost trend chart */}
        {trendData.length >= 2 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              Cost Per Day
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v.toFixed(3)}`} />
                <Tooltip contentStyle={TT_STYLE} formatter={(v: number) => [`$${v.toFixed(4)}`, 'Cost']} />
                <Line type="monotone" dataKey="cost" stroke={CHART_COLORS[stat.colorIdx % CHART_COLORS.length]} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Session list */}
        <div style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
          Recent Sessions ({filteredSessions.length})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filteredSessions.map(s => (
            <div key={s.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 12px',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: 8,
              border: '1px solid var(--border)',
              fontSize: 12,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {cleanTitle(s.title, s.cron_id)}
                </div>
                <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2, fontFamily: 'var(--mo)' }}>
                  {s.started_at?.slice(0, 16)?.replace('T', ' ') ?? '—'}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                <div style={{ fontFamily: 'var(--mo)', color: 'var(--amber)', fontSize: 12 }}>{fmt$(getEffectiveCost(s))}</div>
                <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 1 }}>{fmtK(getTotalTokens(s))} tok</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function CronAnalytics({
  sessions,
  agents,
  cronIds,
}: {
  sessions: SessionRow[]
  agents: string[]
  cronIds: string[]
}) {
  const [window, setWindow] = useState<'24h' | '7d' | '30d' | '90d'>('7d')
  const [agentFilter, setAgentFilter] = useState('')
  const [cronFilter, setCronFilter]   = useState('')
  const [drillDown, setDrillDown]     = useState<CronStat | null>(null)

  // Filter sessions client-side by the selected window + filters
  const now = Date.now()
  const windowMs: Record<string, number> = { '24h': 86400000, '7d': 604800000, '30d': 2592000000, '90d': 7776000000 }

  const filtered = useMemo(() => {
    return sessions.filter(s => {
      const ts = s.started_at ? new Date(s.started_at).getTime() : 0
      if (now - ts > windowMs[window]) return false
      if (agentFilter && s.agent_name !== agentFilter) return false
      if (cronFilter && s.cron_id !== cronFilter) return false
      return true
    })
  }, [sessions, window, agentFilter, cronFilter, now])

  const cronSessions = useMemo(() => filtered.filter(s => s.trigger_source === 'cron' || s.cron_id), [filtered])
  const cronStats = useMemo(() => aggregateByCron(cronSessions), [cronSessions])

  // For the horizontal bar chart data
  const barData = cronStats.slice(0, 15).map((s, i) => ({
    name: s.cronId,
    inputCost: Number((s.totalInputTokens * 3 / 1_000_000).toFixed(6)),
    outputCost: Number((s.totalOutputTokens * 15 / 1_000_000).toFixed(6)),
    totalCost: Number(s.totalCost.toFixed(6)),
    runs: s.runs,
    avgCostPerRun: Number(s.avgCostPerRun.toFixed(6)),
    fill: CHART_COLORS[i % CHART_COLORS.length],
    isExpensive: s.totalCost > 1 || s.avgCostPerRun > 0.05,
    isCritical: s.totalCost > 5,
  }))

  // All-sessions aggregates for KPI row
  const totalCost = filtered.reduce((s, r) => s + getEffectiveCost(r), 0)
  const totalSessions = filtered.length
  const avgCostPerSession = totalSessions > 0 ? totalCost / totalSessions : 0

  return (
    <div>
      {/* ── Filter Bar ──────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
        marginBottom: 20,
        padding: '12px 16px',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid var(--border)',
        borderRadius: 14,
      }}>
        <div style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginRight: 4 }}>
          Filter:
        </div>
        {(['24h', '7d', '30d', '90d'] as const).map(w => (
          <button key={w} onClick={() => setWindow(w)} style={{
            padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
            cursor: 'pointer', border: 'none',
            background: window === w ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
            color: window === w ? '#fff' : 'var(--t2)',
            transition: 'all 0.15s',
          }}>{w}</button>
        ))}

        <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />

        <select value={agentFilter} onChange={e => setAgentFilter(e.target.value)} style={{
          background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
          borderRadius: 8, color: 'var(--t2)', fontSize: 12, padding: '5px 10px', cursor: 'pointer',
        }}>
          <option value="">All Agents</option>
          {agents.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        <select value={cronFilter} onChange={e => setCronFilter(e.target.value)} style={{
          background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
          borderRadius: 8, color: 'var(--t2)', fontSize: 12, padding: '5px 10px', cursor: 'pointer',
        }}>
          <option value="">All Cron Jobs</option>
          {cronIds.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--dim)', fontFamily: 'var(--mo)' }}>
          {totalSessions} sessions · {fmt$(totalCost)} total
        </div>
      </div>

      {/* ── Optimization Candidates ─────────────────────────────────── */}
      <OptimizationCard stats={cronStats} />

      {/* ── Cost by Cron Job chart ───────────────────────────────────── */}
      <div className="mc-card accent" data-source="sessions" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dim)' }}>
          Cost by Cron Job
        </div>
        <div style={{ fontSize: 11, color: 'var(--t4)', marginBottom: 16 }}>
          Click a bar to drill into sessions for that job. Input vs output tokens stacked — output costs ~5x input.
        </div>

        {barData.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--dim)', padding: '24px 0' }}>
            No cron sessions found in the selected window.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(220, barData.length * 36)}>
            <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 60, top: 0, bottom: 0 }}
              onClick={d => {
                if (d?.activePayload?.[0]) {
                  const cronId = d.activePayload[0].payload.name as string
                  const stat = cronStats.find(s => s.cronId === cronId)
                  if (stat) setDrillDown(stat)
                }
              }}
            >
              <XAxis
                type="number"
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                axisLine={false} tickLine={false}
                tickFormatter={v => `$${v.toFixed(3)}`}
              />
              <YAxis
                type="category" dataKey="name" width={180}
                tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }}
                axisLine={false} tickLine={false}
              />
              <Tooltip
                contentStyle={TT_STYLE}
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                formatter={(value: number, name: string) => {
                  if (name === 'inputCost')  return [`$${value.toFixed(4)}`, 'Input cost']
                  if (name === 'outputCost') return [`$${value.toFixed(4)}`, 'Output cost']
                  return [value, name]
                }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0]?.payload
                  return (
                    <div style={{ ...TT_STYLE, padding: '10px 14px', lineHeight: 1.7 }}>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>{d.name}</div>
                      <div>Total: <b>${d.totalCost.toFixed(4)}</b></div>
                      <div>Runs: <b>{d.runs}</b></div>
                      <div>Avg/run: <b>${d.avgCostPerRun.toFixed(4)}</b></div>
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 6, paddingTop: 6 }}>
                        <span style={{ color: '#60a5fa' }}>Input: ${d.inputCost.toFixed(4)}</span>
                        {'  '}
                        <span style={{ color: '#3b82f6' }}>Output: ${d.outputCost.toFixed(4)}</span>
                      </div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>Click to drill down →</div>
                    </div>
                  )
                }}
              />
              <Bar dataKey="inputCost"  name="Input cost"  stackId="cost" radius={[0, 0, 0, 4]} fill="#3b82f6" />
              <Bar dataKey="outputCost" name="Output cost" stackId="cost" radius={[0, 4, 4, 0]} fill="#3b82f6">
                {barData.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={entry.isCritical ? '#ef4444' : entry.isExpensive ? '#f59e0b' : '#3b82f6'}
                    opacity={0.9}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* Legend */}
        <div style={{ display: 'flex', gap: 20, marginTop: 12, fontSize: 11, color: 'var(--t3)' }}>
          <span><span style={{ color: '#3b82f6' }}>■</span> Input tokens ($3/1M)</span>
          <span><span style={{ color: '#3b82f6' }}>■</span> Output tokens ($15/1M)</span>
          <span><span style={{ color: '#f59e0b' }}>■</span> Expensive (&gt;$1 total)</span>
          <span><span style={{ color: '#ef4444' }}>■</span> Critical (&gt;$5 total)</span>
        </div>
      </div>

      {/* ── Per-cron summary table with sparklines ───────────────────── */}
      <div className="mc-card accent" data-source="sessions" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dim)' }}>
          Cron Cost Summary
        </div>
        {cronStats.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--dim)' }}>No cron sessions in this window.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Cron Job', 'Runs', 'Total Cost', 'Avg/Run', 'Input Tok', 'Output Tok', 'Trend', ''].map(h => (
                    <th key={h} style={{
                      padding: '6px 10px', textAlign: h === 'Cron Job' ? 'left' : 'right',
                      fontSize: 10, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cronStats.map(stat => {
                  const color = CHART_COLORS[stat.colorIdx % CHART_COLORS.length]
                  const isCritical  = stat.totalCost > 5
                  const isExpensive = stat.totalCost > 1 || stat.avgCostPerRun > 0.05
                  return (
                    <tr key={stat.cronId} style={{
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                      background: isCritical ? 'rgba(239,68,68,0.04)' : isExpensive ? 'rgba(245,158,11,0.04)' : 'transparent',
                      transition: 'background 0.15s',
                    }}>
                      <td style={{ padding: '10px 10px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                          <span style={{ fontFamily: 'var(--mo)', fontWeight: 600, color: 'var(--t1)' }}>{stat.cronId}</span>
                          {isCritical  && <span style={{ fontSize: 9, background: 'rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>CRITICAL</span>}
                          {!isCritical && isExpensive && <span style={{ fontSize: 9, background: 'rgba(245,158,11,0.2)', color: '#f59e0b', borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>EXPENSIVE</span>}
                        </div>
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', color: 'var(--t2)', fontFamily: 'var(--mo)' }}>{stat.runs}</td>
                      <td style={{ padding: '10px', textAlign: 'right', fontFamily: 'var(--mo)', fontWeight: 700, color: isCritical ? 'var(--red)' : isExpensive ? 'var(--amber)' : 'var(--t1)' }}>
                        {fmt$(stat.totalCost)}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', fontFamily: 'var(--mo)', color: 'var(--t2)' }}>{fmt$(stat.avgCostPerRun)}</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#3b82f6', fontFamily: 'var(--mo)' }}>{fmtK(stat.totalInputTokens)}</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#3b82f6', fontFamily: 'var(--mo)' }}>{fmtK(stat.totalOutputTokens)}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>
                        <MiniSparkline trend={stat.trend} color={color} />
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>
                        <button onClick={() => setDrillDown(stat)} style={{
                          fontSize: 10, padding: '4px 10px', borderRadius: 6,
                          background: 'rgba(255,255,255,0.06)', border: 'none',
                          color: 'var(--t2)', cursor: 'pointer',
                        }}>Detail →</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Session List (cleaned titles) ───────────────────────────── */}
      <div className="mc-card accent" data-source="sessions">
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dim)' }}>
          Session History ({filtered.length})
        </div>
        {filtered.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--dim)' }}>No sessions in this window.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filtered.slice(0, 30).map(s => {
              const cost = getEffectiveCost(s)
              const isExpensive = cost > 0.05
              return (
                <div key={s.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '9px 12px',
                  background: 'rgba(255,255,255,0.015)',
                  borderRadius: 10,
                  border: `1px solid ${isExpensive ? 'rgba(245,158,11,0.15)' : 'var(--border)'}`,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {s.cron_id && (
                        <span style={{ fontSize: 10, fontFamily: 'var(--mo)', color: 'var(--accent)', fontWeight: 600, flexShrink: 0 }}>
                          {s.cron_id}
                        </span>
                      )}
                      {s.agent_name && (
                        <span style={{ fontSize: 10, color: 'var(--dim)', flexShrink: 0 }}>
                          {s.agent_name}
                        </span>
                      )}
                      <span style={{ fontSize: 13, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cleanTitle(s.title, s.cron_id)}
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 2, fontFamily: 'var(--mo)' }}>
                      {s.started_at?.slice(0, 16)?.replace('T', ' ') ?? '—'}
                      {s.status && <span style={{ marginLeft: 10 }}>{s.status}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                    <div style={{ fontFamily: 'var(--mo)', fontSize: 12, fontWeight: 700, color: isExpensive ? 'var(--amber)' : 'var(--t2)' }}>
                      {fmt$(cost)}
                    </div>
                    {getTotalTokens(s) > 0 && (
                      <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 1 }}>
                        {fmtK(getTotalTokens(s))} tok
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Drill-down modal ─────────────────────────────────────────── */}
      {drillDown && (
        <CronDetailPanel
          stat={drillDown}
          sessions={cronSessions}
          onClose={() => setDrillDown(null)}
        />
      )}
    </div>
  )
}
