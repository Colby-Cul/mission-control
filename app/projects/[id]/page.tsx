import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Hero from '../../_components/Hero'
import { SpecCard } from '../../_components/SpecCard'
import ComingSoon from '../../_components/ComingSoon'
import HeroCanvasDefault from '../../_components/HeroCanvasDefault'
import {
  getProjectById,
  getProjectTasks,
  getProjectAgents,
  getProjectCosts,
  getProjectMilestones,
} from '../../lib/queries'
import ProjectDetailTabs from './ProjectDetailTabs'

export const dynamic = 'force-dynamic'

function fmt(n: number | null | undefined, prefix = '') {
  if (n == null || isNaN(Number(n))) return '—'
  return prefix + Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 })
}

function fmtDate(s: string | null | undefined) {
  if (!s) return '—'
  try { return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
  catch { return s }
}

function fmtCurrency(n: number | null | undefined) {
  if (n == null || isNaN(Number(n))) return '—'
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function pct(p: any) {
  const n = Math.min(100, Math.max(0, Number(p ?? 0)))
  return `${Math.round(n)}%`
}

const STATUS_COLORS: Record<string, string> = {
  planning: 'var(--purple)',
  active: 'var(--orange)',
  blocked: 'var(--red)',
  review: 'var(--amber)',
  completed: 'var(--green)',
  done: 'var(--green)',
  cancelled: 'rgba(255,255,255,0.3)',
}

function statusColor(s: string) {
  return STATUS_COLORS[(s ?? '').toLowerCase()] ?? 'rgba(255,255,255,0.4)'
}

function priorityLabel(p: any) {
  if (p == null) return '—'
  const n = Number(p)
  if (!isNaN(n)) {
    if (n <= 1) return 'Critical'
    if (n <= 2) return 'High'
    if (n <= 3) return 'Medium'
    return 'Low'
  }
  return String(p)
}

interface MetaRowProps {
  label: string
  value?: React.ReactNode
  dataSource?: string
  missing?: boolean
}

function MetaRow({ label, value, dataSource, missing }: MetaRowProps) {
  if (missing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '.07em', fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }} data-source={dataSource}>— not yet tracked</div>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '.07em', fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 13, color: '#f5f5f7', fontFamily: typeof value === 'string' && /^\$|^\d/.test(value as string) ? 'var(--mo)' : undefined }}>{value ?? '—'}</div>
    </div>
  )
}

function BudgetBar({ used, total }: { used: number | null | undefined; total: number | null | undefined }) {
  if (total == null || Number(total) === 0) return <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>— not set</span>
  const pctNum = Math.min(100, Math.round((Number(used ?? 0) / Number(total)) * 100))
  const color = pctNum > 90 ? 'var(--red)' : pctNum > 70 ? 'var(--amber)' : 'var(--green)'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontFamily: 'var(--mo)' }}>
        <span style={{ color }}>{fmtCurrency(used as number)} used</span>
        <span style={{ color: 'rgba(255,255,255,0.4)' }}>{fmtCurrency(total as number)} total</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pctNum}%`, background: color, borderRadius: 3, transition: 'width 0.4s' }} />
      </div>
    </div>
  )
}

function TagList({ tags }: { tags: string[] | null | undefined }) {
  if (!tags || tags.length === 0) return <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>—</span>
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {tags.map((t) => (
        <span key={t} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{t}</span>
      ))}
    </div>
  )
}

function AgentList({ agents }: { agents: string[] }) {
  if (!agents || agents.length === 0) return <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>—</span>
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {agents.map((a) => (
        <span key={a} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: 'rgba(255,165,0,0.12)', color: 'var(--orange)', fontWeight: 600 }}>{a}</span>
      ))}
    </div>
  )
}

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const [project, tasks, agents, costs, milestones] = await Promise.all([
    getProjectById(params.id),
    getProjectTasks(params.id),
    getProjectAgents(params.id),
    getProjectCosts(params.id),
    getProjectMilestones(params.id),
  ])

  if (!project) notFound()

  const completePct = Math.round(Math.min(100, Math.max(0, Number(project.percent_complete ?? 0))))

  const heroPlayerCard = project.owner
    ? {
        name: project.owner,
        role: project.linked_agent ? `Agent: ${project.linked_agent}` : 'Owner',
        level: 1,
        xpCurrent: completePct * 10,
        xpNext: 1000,
        stats: [
          { key: 'Tasks', value: String(tasks.length) },
          { key: 'Done', value: String(tasks.filter((t: any) => ['done', 'completed'].includes((t.status ?? '').toLowerCase())).length) },
          { key: 'Agents', value: String(agents.length) },
          { key: 'Cost', value: costs.totalCost > 0 ? fmtCurrency(costs.totalCost) : '—' },
        ],
      }
    : undefined

  return (
    <div style={{ padding: '0 0 80px' }}>
      {/* ── Hero ───────────────────────────────────────────────────── */}
      <Hero
        label="Project Detail"
        greeting={project.name}
        primaryMetric={`${completePct}%`}
        metricSubtitle="complete"
        kpiCards={[
          { label: 'Status', value: (project.status ?? '—').toUpperCase() },
          { label: 'Due', value: fmtDate(project.target_date ?? project.due_date) },
          { label: 'Total Cost', value: costs.totalCost > 0 ? fmtCurrency(costs.totalCost) : '—' },
          { label: 'Time Logged', value: costs.totalTimeLogged > 0 ? `${costs.totalTimeLogged}h` : '—' },
        ]}
        playerCard={heroPlayerCard}
        animationSlot={<HeroCanvasDefault />}
      />

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* ── Project Meta Card ───────────────────────────────────── */}
        <SpecCard accent dataSource="projects.*">
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 700, marginBottom: 6 }}>Project Details</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#f5f5f7' }}>{project.name}</span>
              <span style={{
                fontSize: 11, padding: '3px 9px', borderRadius: 20, fontWeight: 600,
                background: statusColor(project.status) + '20', color: statusColor(project.status),
              }}>
                {project.status}
              </span>
              {project.priority && (
                <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                  Priority: {priorityLabel(project.priority)}
                </span>
              )}
            </div>
            {project.description && (
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 10, lineHeight: 1.6, maxWidth: 900 }}>{project.description}</p>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px 32px' }}>
            {/* Core identity */}
            <MetaRow label="Owner" value={project.owner} />
            <MetaRow label="Entity" value={project.entity_id} />
            <MetaRow label="Linked Agent" value={project.linked_agent} />
            <MetaRow label="Linked Entity" value={project.linked_entity} />
            <MetaRow label="Linked Forge Idea" value={project.linked_forge_idea ?? undefined} dataSource="projects.linked_forge_idea" />

            {/* Dates */}
            <MetaRow label="Start Date" value={fmtDate(project.start_date)} />
            <MetaRow label="Target Date" value={fmtDate(project.target_date ?? project.due_date)} />
            <MetaRow label="Est. Completion" value={fmtDate(project.estimated_completion_date)} dataSource="projects.estimated_completion_date" />
            <MetaRow label="Last Update" value={fmtDate(project.last_update_ts)} />
            <MetaRow label="Created" value={fmtDate(project.created_at)} />

            {/* Progress */}
            <MetaRow label="% Complete" value={pct(project.percent_complete)} />
            <MetaRow label="Health Score" value={project.health_score != null ? `${Number(project.health_score).toFixed(0)}/100` : undefined} />
            <MetaRow label="Tasks" value={String(tasks.length)} />
            <MetaRow label="Done" value={String(tasks.filter((t: any) => ['done', 'completed'].includes((t.status ?? '').toLowerCase())).length)} />
            <MetaRow label="Milestones" value={String(project.milestone_count ?? milestones.length)} />

            {/* Costs */}
            <MetaRow label="Total Cost (Actual)" value={fmtCurrency(costs.totalCost || project.total_cost)} />
            <MetaRow label="Est. Agentic Cost" value={project.estimated_agentic_cost != null ? fmtCurrency(project.estimated_agentic_cost) : undefined} dataSource="projects.estimated_agentic_cost" />
            <MetaRow label="Total Tokens" value={costs.totalTokens > 0 ? fmt(costs.totalTokens) : undefined} />
            <MetaRow label="Time Logged" value={costs.totalTimeLogged > 0 ? `${costs.totalTimeLogged}h` : undefined} />
          </div>

          {/* Budget Bar — full width row */}
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '.07em', fontWeight: 700, marginBottom: 8 }}>Budget</div>
            <BudgetBar used={project.budget_used} total={project.budget_total} />
          </div>

          {/* Tags, Agents, Models — full width rows */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px 32px', marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '.07em', fontWeight: 700, marginBottom: 8 }}>Tags</div>
              <TagList tags={project.tags} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '.07em', fontWeight: 700, marginBottom: 8 }}>Agents Working</div>
              <AgentList agents={agents} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '.07em', fontWeight: 700, marginBottom: 8 }}>Models Used</div>
              <TagList tags={project.models_used} />
            </div>
            {Array.isArray(project.blockers) && project.blockers.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '.07em', fontWeight: 700, marginBottom: 8 }}>Blockers</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {(project.blockers as string[]).map((b, i) => (
                    <span key={i} style={{ fontSize: 12, color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--red)', flexShrink: 0, display: 'inline-block' }} />
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SpecCard>

        {/* ── View Tabs ───────────────────────────────────────────── */}
        <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Loading views…</div>}>
          <ProjectDetailTabs
            project={project}
            tasks={tasks}
            milestones={milestones}
          />
        </Suspense>

      </div>
    </div>
  )
}
