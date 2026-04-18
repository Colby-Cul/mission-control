import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { Flame, ListTodo, CheckCircle2, Zap, Bot } from 'lucide-react'
import Hero from '../../_components/Hero'
import HeroCanvasDefault from '../../_components/HeroCanvasDefault'
import {
  getProjectById,
  getProjectTasks,
  getProjectAgents,
  getProjectCosts,
  getProjectMilestones,
  getProjectCostBreakdown,
  getProjectRecentRuns,
  getForgeIdeaForProject,
} from '../../lib/queries'
import ProjectDetailTabs from './ProjectDetailTabs'
import PrioritySelector from './_components/PrioritySelector'
import { BuildPlanSection, CostBreakdownSection, ActivityFeed } from './_components/ProjectPanels'

export const dynamic = 'force-dynamic'

function fmtDate(s: string | null | undefined) {
  if (!s) return '—'
  try { return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
  catch { return s }
}
function fmtCurrency(n: number | null | undefined) {
  if (n == null || isNaN(Number(n))) return '—'
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const STATUS_COLORS: Record<string, string> = {
  planning: '#8b5cf6', active: '#f97316', in_progress: '#f97316',
  review: '#f59e0b', blocked: '#ef4444',
  completed: '#10b981', done: '#10b981', cancelled: 'rgba(255,255,255,0.3)',
}
function statusColor(s: string | null | undefined) {
  return STATUS_COLORS[(s ?? '').toLowerCase()] ?? 'rgba(255,255,255,0.4)'
}

function normalizeTaskStatus(s: string | null | undefined): string {
  const v = (s ?? '').toLowerCase().trim()
  if (['done','completed','complete','shipped'].includes(v)) return 'done'
  if (['cancelled','canceled','killed','abandoned'].includes(v)) return 'cancelled'
  if (['blocked','stuck','waiting'].includes(v)) return 'blocked'
  if (['in_review','review','qa','testing','validation'].includes(v)) return 'in_review'
  if (['in_progress','in progress','active','running','working','doing','wip'].includes(v)) return 'in_progress'
  if (['ready','todo','to_do','scheduled','queued','planning','open'].includes(v)) return 'ready'
  return 'backlog'
}

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const [project, tasks, agents, costs, milestones, costBreakdown, recentRuns, forgeIdea] = await Promise.all([
    getProjectById(params.id),
    getProjectTasks(params.id),
    getProjectAgents(params.id),
    getProjectCosts(params.id),
    getProjectMilestones(params.id),
    getProjectCostBreakdown(params.id),
    getProjectRecentRuns(params.id, 12),
    getForgeIdeaForProject(params.id),
  ])
  if (!project) notFound()

  // Task roll-ups (normalized across the 7-stage schema)
  const byStage = {
    backlog: 0, ready: 0, in_progress: 0, in_review: 0, blocked: 0, done: 0, cancelled: 0,
  } as Record<string, number>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tasks.forEach((t: any) => { byStage[normalizeTaskStatus(t.status)]++ })
  const activeCount = byStage.ready + byStage.in_progress + byStage.in_review
  const completePct = tasks.length > 0 ? Math.round((byStage.done / tasks.length) * 100) : 0
  const taskNameMap = new Map<string, string>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tasks.forEach((t: any) => { taskNameMap.set(String(t.id), String(t.name ?? t.title ?? t.id)) })

  return (
    <div style={{ padding: '0 0 80px' }}>
      {/* ── Hero ───────────────────────────────────────────────────── */}
      <Hero
        label="Project"
        greeting={project.name}
        primaryMetric={`${completePct}%`}
        metricSubtitle="complete"
        kpiCards={[
          { label: 'Status',   value: (project.status ?? '—').toUpperCase() },
          { label: 'Tasks',    value: `${byStage.done}/${tasks.length}` },
          { label: 'Active',   value: String(activeCount) },
          { label: 'Blocked',  value: String(byStage.blocked) },
          { label: 'Spent',    value: costBreakdown.total.cost > 0 ? fmtCurrency(costBreakdown.total.cost) : '—' },
        ]}
        animationSlot={<HeroCanvasDefault />}
      />

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* ── Control strip: priority, status, agents, due date ─────── */}
        <div style={{
          display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
          padding: '12px 16px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--mo)', fontWeight: 700, letterSpacing: '.08em' }}>PRIORITY</span>
            <PrioritySelector projectId={String(project.id)} initial={project.priority} />
          </div>
          <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--mo)', fontWeight: 700, letterSpacing: '.08em' }}>STATUS</span>
            <span style={{
              fontSize: 11, padding: '4px 10px', borderRadius: 20, fontWeight: 700,
              background: statusColor(project.status) + '20', color: statusColor(project.status),
              border: `1px solid ${statusColor(project.status)}60`, fontFamily: 'var(--mo)',
              letterSpacing: '.04em', textTransform: 'uppercase',
            }}>{project.status ?? '—'}</span>
          </div>
          {project.target_date && (
            <>
              <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.1)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--mo)', fontWeight: 700, letterSpacing: '.08em' }}>DUE</span>
                <span style={{ fontSize: 12, color: '#f5f5f7', fontFamily: 'var(--mo)' }}>{fmtDate(project.target_date)}</span>
              </div>
            </>
          )}
          <div style={{ flex: 1 }} />
          {agents.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Bot size={14} style={{ color: 'var(--purple)' }} />
              {agents.map((a) => (
                <span key={a} style={{
                  fontSize: 10, padding: '3px 8px', borderRadius: 12,
                  background: 'rgba(139,92,246,0.12)', color: 'var(--purple)',
                  fontWeight: 700, fontFamily: 'var(--mo)',
                  textTransform: 'uppercase', letterSpacing: '.04em',
                }}>{a}</span>
              ))}
            </div>
          )}
        </div>

        {/* ── At-a-glance stage tiles (replaces the dense meta card) ─ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
          <StageTile label="Backlog"     count={byStage.backlog}     color="rgba(255,255,255,0.3)" icon={<ListTodo size={14} />} />
          <StageTile label="Ready"       count={byStage.ready}       color="#8b5cf6" icon={<Zap size={14} />} />
          <StageTile label="In Progress" count={byStage.in_progress} color="#f97316" icon={<Flame size={14} />} />
          <StageTile label="Review"      count={byStage.in_review}   color="#f59e0b" />
          <StageTile label="Blocked"     count={byStage.blocked}     color="#ef4444" />
          <StageTile label="Done"        count={byStage.done}        color="#10b981" icon={<CheckCircle2 size={14} />} />
        </div>

        {/* ── Build Plan (from forge idea) ──────────────────────────── */}
        <BuildPlanSection idea={forgeIdea} />

        {/* ── Task Board (Sprint / Kanban / Gantt / Table) ──────────── */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '.12em',
              textTransform: 'uppercase', color: 'var(--pink)',
              fontFamily: 'var(--mo)',
            }}>Task Board</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{tasks.length} task{tasks.length === 1 ? '' : 's'}</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
          </div>
          <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Loading views…</div>}>
            <ProjectDetailTabs
              project={project}
              tasks={tasks}
              milestones={milestones}
            />
          </Suspense>
        </section>

        {/* ── Cost Breakdown + Activity Feed (side by side on wide) ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 24, alignItems: 'start' }}>
          <CostBreakdownSection
            agents={costBreakdown.agents}
            total={costBreakdown.total}
            estimatedTotal={costs.estimatedTotal}
            budgetTotal={null}
            budgetUsed={null}
          />
          <ActivityFeed runs={recentRuns} taskNameMap={taskNameMap} />
        </div>

        {/* ── Tiny details footer (collapsible-feeling, low-emphasis) ─ */}
        <details style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 12,
          padding: '10px 14px',
        }}>
          <summary style={{
            cursor: 'pointer', fontSize: 11, fontWeight: 700, letterSpacing: '.08em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)',
            fontFamily: 'var(--mo)',
          }}>
            Project metadata
          </summary>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '12px 24px', marginTop: 14, fontSize: 12,
          }}>
            <MetaMini label="Created"       value={fmtDate(project.created_at)} />
            <MetaMini label="Updated"       value={fmtDate(project.updated_at)} />
            <MetaMini label="Target Date"   value={fmtDate(project.target_done_date ?? project.target_date)} />
            <MetaMini label="Owner"         value={project.owner_agent_id ?? project.owner} />
            <MetaMini label="Linked Forge"  value={project.source_forge_idea_id} />
            <MetaMini label="Project ID"    value={project.id} mono />
            <MetaMini label="Dependency"    value={project.dependency} />
            <MetaMini label="Project Type"  value={project.project_type} />
          </div>
          {Array.isArray(project.tags) && project.tags.length > 0 && (
            <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {(project.tags as string[]).map((t) => (
                <span key={t} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 12, background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontFamily: 'var(--mo)' }}>{t}</span>
              ))}
            </div>
          )}
          {project.description && (
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 14, lineHeight: 1.6 }}>{project.description}</p>
          )}
        </details>
      </div>
    </div>
  )
}

function StageTile({ label, count, color, icon }: { label: string; count: number; color: string; icon?: React.ReactNode }) {
  const faint = count === 0
  return (
    <div style={{
      padding: '12px 14px',
      background: faint ? 'rgba(255,255,255,0.02)' : `${color}10`,
      border: `1px solid ${faint ? 'rgba(255,255,255,0.06)' : color + '40'}`,
      borderRadius: 12,
      display: 'flex', flexDirection: 'column', gap: 4,
      opacity: faint ? 0.6 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color }}>
        {icon}
        <span style={{ fontSize: 10, fontFamily: 'var(--mo)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: faint ? 'rgba(255,255,255,0.35)' : '#f5f5f7', fontFamily: 'var(--mo)' }}>
        {count}
      </div>
    </div>
  )
}

function MetaMini({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</div>
      <div style={{ fontSize: 12, color: '#f5f5f7', fontFamily: mono ? 'var(--mo)' : undefined }}>{value}</div>
    </div>
  )
}
