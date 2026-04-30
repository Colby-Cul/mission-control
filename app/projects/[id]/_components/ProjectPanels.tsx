import {
  Target, Users, Cog, Cpu, Package, DollarSign, TrendingUp, Clock, Award,
  Activity, Wallet, Bot,
} from 'lucide-react'

// ─── Shared utilities ──────────────────────────────────────────────────────

const COLORS = {
  ink:   '#f5f5f7',
  dim:   'rgba(255,255,255,0.55)',
  dim2:  'rgba(255,255,255,0.35)',
  line:  'rgba(255,255,255,0.07)',
  card:  'rgba(255,255,255,0.03)',
}

function fmtMoney(n: number | null | undefined) {
  if (n == null || isNaN(Number(n))) return '—'
  const v = Number(n)
  if (v === 0) return '$0.00'
  if (v < 0.01) return '< $0.01'
  if (v < 1) return `$${v.toFixed(3)}`
  return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtTokens(n: number | null | undefined) {
  if (!n) return '—'
  const v = Number(n)
  if (v > 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v > 1_000) return `${(v / 1_000).toFixed(1)}k`
  return String(v)
}

function fmtSecs(s: number | null | undefined) {
  if (!s) return '—'
  const n = Number(s)
  if (n < 60) return `${n.toFixed(1)}s`
  if (n < 3600) return `${(n / 60).toFixed(1)}m`
  return `${(n / 3600).toFixed(1)}h`
}

function relTime(iso: string | null | undefined) {
  if (!iso) return '—'
  const t = new Date(iso).getTime()
  const diff = Date.now() - t
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

// ─── Build Plan ────────────────────────────────────────────────────────────

interface ForgeIdea {
  problem?: string | null
  target_audience?: string | null
  how_it_works?: string | null
  agentic_architecture?: string | null
  mvp_scope?: string | null
  revenue_model?: string | null
  path_to_100k?: string | null
  estimated_build_time?: string | null
  monthly_revenue_potential?: string | null
  confidence_score?: number | null
  competition_level?: string | null
  tagline?: string | null
  [key: string]: unknown
}

function PlanTile({
  icon, label, text, tone = 'default',
}: {
  icon: React.ReactNode
  label: string
  text?: string | null
  tone?: 'default' | 'accent'
}) {
  if (!text || !String(text).trim()) return null
  const accent = tone === 'accent'
  return (
    <div style={{
      background: accent ? 'rgba(59,130,246,0.06)' : COLORS.card,
      border: `1px solid ${accent ? 'rgba(59,130,246,0.25)' : COLORS.line}`,
      borderRadius: 12,
      padding: '14px 16px',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: accent ? 'var(--accent)' : 'var(--purple)', display: 'flex' }}>{icon}</span>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '.08em',
          textTransform: 'uppercase', color: accent ? 'var(--accent)' : COLORS.dim,
          fontFamily: 'var(--mo)',
        }}>{label}</span>
      </div>
      <p style={{ fontSize: 13, color: COLORS.ink, lineHeight: 1.55, margin: 0 }}>{String(text)}</p>
    </div>
  )
}

export function BuildPlanSection({ idea }: { idea: ForgeIdea | null }) {
  if (!idea) return null
  const confidence = typeof idea.confidence_score === 'number' ? idea.confidence_score : null

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '.12em',
          textTransform: 'uppercase', color: 'var(--accent)',
          fontFamily: 'var(--mo)',
        }}>Build Plan</span>
        <span style={{ fontSize: 11, color: COLORS.dim2 }}>from the Forge</span>
        <div style={{ flex: 1, height: 1, background: COLORS.line }} />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {confidence != null && (
            <span style={{
              fontSize: 10, padding: '3px 9px', borderRadius: 20,
              background: 'rgba(16,185,129,0.12)', color: '#10b981',
              border: '1px solid rgba(16,185,129,0.3)',
              fontWeight: 700, fontFamily: 'var(--mo)',
            }}>
              <Award size={11} style={{ verticalAlign: '-2px', marginRight: 4 }} />
              {confidence}/100 confidence
            </span>
          )}
          {idea.estimated_build_time && (
            <span style={{
              fontSize: 10, padding: '3px 9px', borderRadius: 20,
              background: 'rgba(139,92,246,0.12)', color: 'var(--purple)',
              border: '1px solid rgba(139,92,246,0.3)',
              fontWeight: 700, fontFamily: 'var(--mo)',
            }}>
              <Clock size={11} style={{ verticalAlign: '-2px', marginRight: 4 }} />
              {String(idea.estimated_build_time)}
            </span>
          )}
          {idea.monthly_revenue_potential && (
            <span style={{
              fontSize: 10, padding: '3px 9px', borderRadius: 20,
              background: 'rgba(236,72,153,0.12)', color: '#ec4899',
              border: '1px solid rgba(236,72,153,0.3)',
              fontWeight: 700, fontFamily: 'var(--mo)',
            }}>
              <DollarSign size={11} style={{ verticalAlign: '-2px', marginRight: 4 }} />
              {String(idea.monthly_revenue_potential)}/mo potential
            </span>
          )}
        </div>
      </div>

      {idea.tagline && (
        <p style={{
          fontSize: 16, color: COLORS.ink, lineHeight: 1.5, fontWeight: 500,
          margin: '0 0 16px', fontStyle: 'italic',
        }}>
          &ldquo;{String(idea.tagline)}&rdquo;
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
        <PlanTile icon={<Target size={14} />}  label="Problem"        text={idea.problem as string | null | undefined} tone="accent" />
        <PlanTile icon={<Users size={14} />}   label="Target"         text={idea.target_audience as string | null | undefined} />
        <PlanTile icon={<Cog size={14} />}     label="How It Works"   text={idea.how_it_works as string | null | undefined} />
        <PlanTile icon={<Cpu size={14} />}     label="Agent Stack"    text={idea.agentic_architecture as string | null | undefined} />
        <PlanTile icon={<Package size={14} />} label="MVP Scope"      text={idea.mvp_scope as string | null | undefined} />
        <PlanTile icon={<DollarSign size={14} />} label="Revenue Model" text={idea.revenue_model as string | null | undefined} />
        <PlanTile icon={<TrendingUp size={14} />} label="Path to $100k"  text={idea.path_to_100k as string | null | undefined} />
      </div>
    </section>
  )
}

// ─── Cost Breakdown ────────────────────────────────────────────────────────

interface AgentCost {
  agent: string
  runs: number
  cost: number
  tokens: number
  seconds: number
}

const AGENT_COLORS = [
  '#3b82f6', '#8b5cf6', '#10b981', '#ec4899', '#06b6d4',
  '#eab308', '#ef4444', '#14b8a6', '#f59e0b', '#a855f7',
]

export function CostBreakdownSection({
  agents, total, estimatedTotal, budgetTotal, budgetUsed,
}: {
  agents: AgentCost[]
  total: { runs: number; cost: number; tokens: number; seconds: number }
  estimatedTotal: number | null
  budgetTotal: number | null
  budgetUsed: number | null
}) {
  const maxCost = agents.length > 0 ? Math.max(...agents.map(a => a.cost)) : 1
  const budgetPct = budgetTotal && budgetTotal > 0 ? Math.min(100, Math.round((Number(budgetUsed ?? 0) / budgetTotal) * 100)) : null
  const budgetColor = budgetPct == null ? COLORS.dim : budgetPct > 90 ? '#ef4444' : budgetPct > 70 ? '#f59e0b' : '#10b981'

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '.12em',
          textTransform: 'uppercase', color: 'var(--green)',
          fontFamily: 'var(--mo)',
        }}>
          <Wallet size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />
          Cost Breakdown
        </span>
        <div style={{ flex: 1, height: 1, background: COLORS.line }} />
        <span style={{ fontSize: 11, color: COLORS.dim2, fontFamily: 'var(--mo)' }}>
          {total.runs} runs · {fmtTokens(total.tokens)} tokens · {fmtSecs(total.seconds)}
        </span>
      </div>

      {/* Top-line tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 14 }}>
        <CostTile label="Spent to date" value={fmtMoney(total.cost)} color="var(--green)" mono />
        <CostTile label="Est. total cost" value={estimatedTotal != null ? fmtMoney(estimatedTotal) : '—'} color="var(--accent)" mono />
        <CostTile label="Budget" value={budgetTotal ? fmtMoney(budgetTotal) : '— not set'} color="var(--purple)" mono={!!budgetTotal} />
        <CostTile label="Tokens burned" value={fmtTokens(total.tokens)} color="var(--amber)" mono />
      </div>

      {/* Budget bar */}
      {budgetPct != null && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'var(--mo)', marginBottom: 6 }}>
            <span style={{ color: budgetColor, fontWeight: 700 }}>{fmtMoney(budgetUsed)} used</span>
            <span style={{ color: COLORS.dim2 }}>{budgetPct}% of {fmtMoney(budgetTotal)}</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${budgetPct}%`, background: budgetColor, borderRadius: 4, transition: 'width .4s' }} />
          </div>
        </div>
      )}

      {/* By agent bars */}
      <div style={{
        background: COLORS.card, border: `1px solid ${COLORS.line}`,
        borderRadius: 12, padding: '14px 16px',
      }}>
        <div style={{ fontSize: 11, color: COLORS.dim, fontFamily: 'var(--mo)', fontWeight: 700, letterSpacing: '.08em', marginBottom: 10 }}>
          BY AGENT
        </div>
        {agents.length === 0 ? (
          <div style={{ fontSize: 12, color: COLORS.dim2, fontStyle: 'italic', padding: '12px 0' }}>
            No agent runs recorded yet — costs show here once the orchestrator dispatches a task.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {agents.map((a, i) => {
              const barPct = (a.cost / maxCost) * 100
              const color = AGENT_COLORS[i % AGENT_COLORS.length]
              return (
                <div key={a.agent} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 100px 80px', gap: 12, alignItems: 'center' }}>
                  <span style={{
                    fontSize: 11, fontFamily: 'var(--mo)', color,
                    fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{a.agent}</span>
                  <div style={{ height: 14, borderRadius: 3, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.max(2, barPct)}%`, background: color, borderRadius: 3 }} />
                  </div>
                  <span style={{ fontSize: 12, fontFamily: 'var(--mo)', color: COLORS.ink, textAlign: 'right', fontWeight: 600 }}>
                    {fmtMoney(a.cost)}
                  </span>
                  <span style={{ fontSize: 10, fontFamily: 'var(--mo)', color: COLORS.dim2, textAlign: 'right' }}>
                    {a.runs} run{a.runs === 1 ? '' : 's'}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

function CostTile({ label, value, color, mono }: { label: string; value: string; color: string; mono?: boolean }) {
  return (
    <div style={{
      background: COLORS.card, border: `1px solid ${COLORS.line}`,
      borderRadius: 12, padding: '12px 14px',
    }}>
      <div style={{ fontSize: 10, color: COLORS.dim2, fontFamily: 'var(--mo)', fontWeight: 700, letterSpacing: '.08em', marginBottom: 4 }}>
        {label.toUpperCase()}
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color, fontFamily: mono ? 'var(--mo)' : undefined }}>{value}</div>
    </div>
  )
}

// ─── Activity Feed ─────────────────────────────────────────────────────────

interface Run {
  id: string
  agent_id: string | null
  task_id: string | null
  status: string | null
  started_at: string | null
  ended_at: string | null
  cost: number | null
  tokens: number | null
  error: string | null
}

export function ActivityFeed({ runs, taskNameMap }: { runs: Run[]; taskNameMap: Map<string, string> }) {
  if (runs.length === 0) {
    return (
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '.12em',
            textTransform: 'uppercase', color: 'var(--cyan)', fontFamily: 'var(--mo)',
          }}>
            <Activity size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />
            Live Activity
          </span>
          <div style={{ flex: 1, height: 1, background: COLORS.line }} />
        </div>
        <div style={{
          background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 12,
          padding: 24, textAlign: 'center', fontSize: 13, color: COLORS.dim2,
        }}>
          No agent runs yet. Tasks dispatched to agents will appear here in real time.
        </div>
      </section>
    )
  }

  const statusColor: Record<string, string> = {
    completed: '#10b981',
    running: '#06b6d4',
    blocked: '#f59e0b',
    false_report: '#f59e0b',
    error: '#ef4444',
    failed: '#ef4444',
  }

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '.12em',
          textTransform: 'uppercase', color: 'var(--cyan)', fontFamily: 'var(--mo)',
        }}>
          <Activity size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />
          Live Activity
        </span>
        <span style={{ fontSize: 11, color: COLORS.dim2 }}>latest {runs.length} agent runs</span>
        <div style={{ flex: 1, height: 1, background: COLORS.line }} />
      </div>

      <div style={{
        background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 12,
        overflow: 'hidden',
      }}>
        {runs.map((r, i) => {
          const sc = statusColor[r.status || ''] || COLORS.dim
          const dur = r.started_at && r.ended_at
            ? (new Date(r.ended_at).getTime() - new Date(r.started_at).getTime()) / 1000
            : null
          const taskName = r.task_id ? (taskNameMap.get(r.task_id) || r.task_id) : null
          return (
            <div key={r.id} style={{
              display: 'grid',
              gridTemplateColumns: '20px 110px 1fr 80px 60px 70px',
              gap: 10, alignItems: 'center',
              padding: '10px 14px',
              borderTop: i === 0 ? 'none' : `1px solid ${COLORS.line}`,
              fontSize: 12,
            }}>
              <Bot size={13} style={{ color: sc }} />
              <span style={{
                fontFamily: 'var(--mo)', fontWeight: 700, color: 'var(--purple)',
                textTransform: 'uppercase', letterSpacing: '.04em', fontSize: 11,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{r.agent_id || 'agent'}</span>
              <span style={{
                color: COLORS.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }} title={taskName || ''}>
                {taskName || <span style={{ color: COLORS.dim2 }}>—</span>}
              </span>
              <span style={{
                fontSize: 10, fontFamily: 'var(--mo)', color: sc, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '.04em',
              }}>{r.status || '—'}</span>
              <span style={{
                fontSize: 11, fontFamily: 'var(--mo)', color: COLORS.dim, textAlign: 'right',
              }}>{fmtMoney(r.cost)}</span>
              <span style={{
                fontSize: 10, fontFamily: 'var(--mo)', color: COLORS.dim2, textAlign: 'right',
              }} title={r.started_at || ''}>{dur != null ? `${dur.toFixed(1)}s` : relTime(r.started_at)}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
