'use client'

import { useState, useMemo } from 'react'
import { LayoutGrid, Columns, BarChart2, Table2 } from 'lucide-react'
import KanbanBoard, { type KanbanColumn } from '../../_components/KanbanBoard'
import DataTable, { type Column } from '../../_components/DataTable'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Task {
  id: string
  name?: string
  title?: string
  status: string
  priority?: string
  size?: string
  acceptance_criteria?: string
  blocks_reason?: string
  labels?: string[]
  owner?: string
  agent?: string
  tags?: string[]
  due_date?: string
  start_date?: string
  time_estimate?: number
  time_logged?: number
  total_cost?: number
  tokens?: number
  created_at?: string
  sprint_id?: string
  is_milestone?: boolean
  dispatch_count?: number
  last_activity_at?: string
  [key: string]: unknown
}

interface ProjectDetailTabsProps {
  project: any
  tasks: Task[]
  milestones: Task[]
}

type TabKey = 'sprint' | 'kanban' | 'gantt' | 'table'

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'sprint', label: 'Sprint Board', icon: LayoutGrid },
  { key: 'kanban', label: 'Kanban', icon: Columns },
  { key: 'gantt', label: 'Gantt', icon: BarChart2 },
  { key: 'table', label: 'Table', icon: Table2 },
]

// Sprint stages — matches tasks.status enum in the DB and the orchestrator's
// stage → agent mapping. Order reflects left→right flow on the board.
const TASK_STATUSES = ['backlog', 'ready', 'in_progress', 'in_review', 'blocked', 'done', 'cancelled']
const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  ready: 'Ready',
  in_progress: 'In Progress',
  in_review: 'In Review',
  blocked: 'Blocked',
  done: 'Done',
  cancelled: 'Cancelled',
}
const STATUS_COLORS: Record<string, string> = {
  backlog: 'rgba(255,255,255,0.3)',
  ready: 'var(--purple)',
  in_progress: 'var(--accent)',
  in_review: 'var(--amber)',
  blocked: 'var(--red)',
  done: 'var(--green)',
  cancelled: 'rgba(255,255,255,0.2)',
}

// p0=critical, p1=high, p2=medium, p3=low. Back-compat with legacy strings.
const PRIORITY_COLORS: Record<string, string> = {
  p0: 'var(--red)',
  p1: 'var(--accent)',
  p2: 'var(--amber)',
  p3: 'var(--green)',
  critical: 'var(--red)',
  high: 'var(--accent)',
  medium: 'var(--amber)',
  low: 'var(--green)',
  '0': 'var(--red)',
  '1': 'var(--accent)',
  '2': 'var(--amber)',
  '3': 'var(--green)',
}
const PRIORITY_LABELS: Record<string, string> = {
  p0: 'P0', p1: 'P1', p2: 'P2', p3: 'P3',
  critical: 'P0', high: 'P1', medium: 'P2', low: 'P3',
}
function normalizePriority(p?: string): string {
  const v = (p ?? '').toLowerCase().trim()
  if (!v) return ''
  if (['p0','critical','0'].includes(v)) return 'p0'
  if (['p1','high','1'].includes(v)) return 'p1'
  if (['p2','medium','med','2'].includes(v)) return 'p2'
  if (['p3','low','3'].includes(v)) return 'p3'
  return v
}

function normalizeTaskStatus(s: string): string {
  const v = (s ?? '').toLowerCase().trim()
  if (['done', 'completed', 'complete', 'shipped'].includes(v)) return 'done'
  if (['cancelled', 'canceled', 'killed', 'abandoned'].includes(v)) return 'cancelled'
  if (['blocked', 'stuck', 'waiting'].includes(v)) return 'blocked'
  if (['in_review', 'review', 'qa', 'testing', 'validation'].includes(v)) return 'in_review'
  if (['in_progress', 'in progress', 'active', 'running', 'working', 'wip', 'doing'].includes(v)) return 'in_progress'
  if (['ready', 'todo', 'to_do', 'scheduled', 'queued', 'planning'].includes(v)) return 'ready'
  return 'backlog'
}

const SIZE_LABELS: Record<string, string> = {
  xs: 'XS', s: 'S', m: 'M', l: 'L', xl: 'XL', xxl: 'XXL',
}

function taskLabel(t: Task) {
  return (t.title || t.name || 'Untitled')
}

function fmtDate(s: string | null | undefined) {
  if (!s) return null
  try { return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
  catch { return s }
}

function fmtCurrency(n: number | null | undefined) {
  if (n == null || isNaN(Number(n)) || Number(n) === 0) return null
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ─── Task Chip (Sprint Board) ─────────────────────────────────────────────────

function TaskChip({ task }: { task: Task }) {
  const pri = normalizePriority(task.priority)
  const priColor = PRIORITY_COLORS[pri] ?? 'rgba(255,255,255,0.2)'
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 8,
      padding: '8px 10px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      fontSize: 12,
      cursor: 'default',
      transition: 'background 0.1s',
    }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: priColor, flexShrink: 0 }} />
        <span style={{ color: '#f5f5f7', fontWeight: 500, lineHeight: 1.3, flex: 1 }}>{taskLabel(task)}</span>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {task.owner && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{task.owner}</span>}
        {task.agent && (
          <span style={{
            fontSize: 9,
            fontFamily: 'var(--mo)',
            padding: '2px 6px',
            borderRadius: 4,
            background: 'rgba(139,92,246,0.12)',
            border: '1px solid rgba(139,92,246,0.25)',
            color: 'var(--purple)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>🤖 {task.agent}</span>
        )}
        {task.due_date && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--mo)' }}>{fmtDate(task.due_date)}</span>}
      </div>
    </div>
  )
}

// ─── Sprint Board ─────────────────────────────────────────────────────────────

function deriveSprints(tasks: Task[]): { label: string; tasks: Task[] }[] {
  // Group tasks that have sprint_id; fallback to 2-week bucket from created_at
  const withSprint = tasks.filter((t) => t.sprint_id)
  const withoutSprint = tasks.filter((t) => !t.sprint_id)

  const sprintMap: Record<string, Task[]> = {}
  withSprint.forEach((t) => {
    const key = t.sprint_id!
    sprintMap[key] = sprintMap[key] || []
    sprintMap[key].push(t)
  })

  if (withoutSprint.length > 0) {
    // bucket into 2-week windows
    const sorted = [...withoutSprint].sort((a, b) =>
      new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime()
    )
    if (sorted.length > 0) {
      const epoch = new Date(sorted[0].created_at ?? Date.now()).getTime()
      sorted.forEach((t) => {
        const ms = new Date(t.created_at ?? Date.now()).getTime() - epoch
        const bucket = Math.floor(ms / (14 * 24 * 60 * 60 * 1000))
        const key = `auto-${bucket}`
        sprintMap[key] = sprintMap[key] || []
        sprintMap[key].push(t)
      })
    }
  }

  // Sort sprint keys: named sprints first, then auto buckets
  const keys = Object.keys(sprintMap).sort((a, b) => {
    const isAutoA = a.startsWith('auto-')
    const isAutoB = b.startsWith('auto-')
    if (isAutoA && isAutoB) return parseInt(a.split('-')[1]) - parseInt(b.split('-')[1])
    if (isAutoA) return 1
    if (isAutoB) return -1
    return a.localeCompare(b)
  })

  let autoIdx = 1
  return keys.map((key) => ({
    label: key.startsWith('auto-') ? `Sprint ${autoIdx++}` : key,
    tasks: sprintMap[key],
  }))
}

function SprintBoardView({ tasks }: { tasks: Task[] }) {
  const sprints = useMemo(() => deriveSprints(tasks), [tasks])

  if (tasks.length === 0) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
        No tasks yet. Add tasks to this project to see the sprint board.
      </div>
    )
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0', minWidth: 900 }}>
        <thead>
          <tr>
            <th style={{
              padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '.08em', color: 'rgba(255,255,255,0.3)',
              borderBottom: '1px solid rgba(255,255,255,0.06)', minWidth: 100,
              position: 'sticky', left: 0, background: 'var(--bg)',
            }}>Sprint</th>
            {TASK_STATUSES.map((s) => (
              <th key={s} style={{
                padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '.08em',
                color: STATUS_COLORS[s] ?? 'rgba(255,255,255,0.4)',
                borderBottom: '1px solid rgba(255,255,255,0.06)', minWidth: 180,
                borderTop: `3px solid ${STATUS_COLORS[s] ?? 'rgba(255,255,255,0.1)'}`,
              }}>
                {STATUS_LABELS[s]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sprints.map((sprint, si) => {
            const byStatus = TASK_STATUSES.reduce<Record<string, Task[]>>((acc, s) => {
              acc[s] = sprint.tasks.filter((t) => normalizeTaskStatus(t.status) === s)
              return acc
            }, {})
            return (
              <tr key={si} style={{ verticalAlign: 'top' }}>
                <td style={{
                  padding: '14px 16px', fontSize: 12, fontWeight: 700,
                  color: 'rgba(255,255,255,0.5)', borderBottom: '1px solid rgba(255,255,255,0.04)',
                  whiteSpace: 'nowrap', position: 'sticky', left: 0, background: 'var(--bg)',
                }}>
                  {sprint.label}
                  <div style={{ fontSize: 10, fontWeight: 400, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>{sprint.tasks.length} tasks</div>
                </td>
                {TASK_STATUSES.map((s) => (
                  <td key={s} style={{
                    padding: '10px 12px', verticalAlign: 'top',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    background: 'rgba(255,255,255,0.01)',
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {byStatus[s].map((t) => <TaskChip key={t.id} task={t} />)}
                      {byStatus[s].length === 0 && (
                        <div style={{ height: 32, borderRadius: 6, border: '1px dashed rgba(255,255,255,0.06)' }} />
                      )}
                    </div>
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Kanban View ──────────────────────────────────────────────────────────────

const KANBAN_COLS: KanbanColumn<Task>[] = TASK_STATUSES.map((key) => ({
  key,
  label: STATUS_LABELS[key],
  color: STATUS_COLORS[key],
}))

function KanbanTaskCard({ task }: { task: Task }) {
  const pri = normalizePriority(task.priority)
  const priColor = PRIORITY_COLORS[pri] ?? 'rgba(255,255,255,0.2)'
  const priLabel = PRIORITY_LABELS[pri] ?? (pri ? pri.toUpperCase() : null)
  const size = (task.size ?? '').toLowerCase()
  const sizeLabel = SIZE_LABELS[size]
  const ac = (task.acceptance_criteria ?? '').trim()
  const acPreview = ac ? (ac.length > 120 ? ac.slice(0, 117) + '…' : ac) : null
  const isBlocked = normalizeTaskStatus(task.status) === 'blocked'
  const blockReason = (task.blocks_reason ?? '').trim()
  const labels = Array.isArray(task.labels) ? task.labels : Array.isArray(task.tags) ? task.tags : []
  const cost = fmtCurrency(task.total_cost)

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: isBlocked ? '1px solid rgba(255,80,80,0.35)' : '1px solid rgba(255,255,255,0.08)',
      borderRadius: 10,
      padding: '10px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    }}>
      {/* Title row: priority badge + name */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        {priLabel && (
          <span title={`Priority ${priLabel}`} style={{
            fontSize: 10,
            fontWeight: 700,
            fontFamily: 'var(--mo)',
            padding: '2px 6px',
            borderRadius: 4,
            background: 'rgba(0,0,0,0.35)',
            border: `1px solid ${priColor}`,
            color: priColor,
            flexShrink: 0,
            lineHeight: 1.2,
          }}>{priLabel}</span>
        )}
        <span style={{ fontSize: 13, fontWeight: 500, color: '#f5f5f7', lineHeight: 1.4, flex: 1 }}>{taskLabel(task)}</span>
      </div>

      {/* Meta row: agent, size, due, cost */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {task.agent && (
          <span style={{
            fontSize: 9,
            fontFamily: 'var(--mo)',
            padding: '2px 6px',
            borderRadius: 4,
            background: 'rgba(139,92,246,0.12)',
            border: '1px solid rgba(139,92,246,0.25)',
            color: 'var(--purple)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>🤖 {task.agent}</span>
        )}
        {sizeLabel && (
          <span title={`Size ${sizeLabel}`} style={{
            fontSize: 10,
            fontWeight: 600,
            fontFamily: 'var(--mo)',
            padding: '2px 6px',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.6)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>{sizeLabel}</span>
        )}
        {task.owner && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{task.owner}</span>}
        {task.due_date && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--mo)' }}>{fmtDate(task.due_date)}</span>}
        {cost && <span style={{ fontSize: 11, color: 'var(--lime)', fontFamily: 'var(--mo)' }}>{cost}</span>}
        {typeof task.dispatch_count === 'number' && task.dispatch_count > 0 && (
          <span title="Times dispatched to agent" style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--mo)' }}>↻{task.dispatch_count}</span>
        )}
      </div>

      {/* Acceptance criteria preview */}
      {acPreview && (
        <div style={{
          fontSize: 11,
          color: 'rgba(255,255,255,0.55)',
          lineHeight: 1.35,
          paddingTop: 4,
          borderTop: '1px dashed rgba(255,255,255,0.06)',
        }}>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 600, marginRight: 4 }}>AC:</span>
          {acPreview}
        </div>
      )}

      {/* Blocker reason */}
      {isBlocked && blockReason && (
        <div style={{
          fontSize: 11,
          color: 'var(--red)',
          lineHeight: 1.35,
          padding: '4px 6px',
          background: 'rgba(255,80,80,0.07)',
          border: '1px solid rgba(255,80,80,0.18)',
          borderRadius: 6,
        }}>
          <span style={{ fontWeight: 600, marginRight: 4 }}>Blocked:</span>
          {blockReason.length > 100 ? blockReason.slice(0, 97) + '…' : blockReason}
        </div>
      )}

      {/* Labels */}
      {labels.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {labels.map((tag) => (
            <span key={tag} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)' }}>{tag}</span>
          ))}
        </div>
      )}
    </div>
  )
}

function KanbanView({ tasks }: { tasks: Task[] }) {
  return (
    <KanbanBoard<Task>
      columns={KANBAN_COLS}
      items={tasks}
      getColumnKey={(t) => normalizeTaskStatus(t.status)}
      renderCard={(t) => <KanbanTaskCard task={t} />}
    />
  )
}

// ─── Gantt View ───────────────────────────────────────────────────────────────

function GanttView({ tasks, project }: { tasks: Task[]; project: any }) {
  const tasksWithDates = tasks.filter((t) => t.due_date || t.start_date || t.created_at)

  const projectStart = project.start_date
    ? new Date(project.start_date)
    : tasksWithDates.length > 0
      ? new Date(Math.min(...tasksWithDates.map((t) => new Date(t.start_date ?? t.created_at ?? Date.now()).getTime())))
      : new Date()

  const projectEnd = project.target_date ?? project.due_date
    ? new Date(project.target_date ?? project.due_date)
    : tasksWithDates.length > 0
      ? new Date(Math.max(...tasksWithDates.map((t) => new Date(t.due_date ?? t.created_at ?? Date.now()).getTime())))
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  const totalMs = Math.max(1, projectEnd.getTime() - projectStart.getTime())
  const today = new Date()
  const todayPct = Math.max(0, Math.min(100, ((today.getTime() - projectStart.getTime()) / totalMs) * 100))

  const tasksToShow = tasks.filter((t) => t.start_date || t.due_date)
  const skipped = tasks.length - tasksToShow.length

  return (
    <div>
      {skipped > 0 && (
        <div style={{
          fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 16,
          padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          {skipped} task{skipped !== 1 ? 's' : ''} hidden — add start/due dates to show them on the timeline.
        </div>
      )}

      {tasksToShow.length === 0 ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
          Add start/due dates on tasks to see timeline.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          {/* Header dates */}
          <div style={{ position: 'relative', marginBottom: 8, marginLeft: 220 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--mo)' }}>
              <span>{projectStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              <span>{new Date((projectStart.getTime() + projectEnd.getTime()) / 2).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              <span>{projectEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            </div>
          </div>

          {/* Tasks */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {tasksToShow.map((t) => {
              const start = t.start_date
                ? new Date(t.start_date)
                : new Date(t.created_at ?? projectStart)
              const end = t.due_date ? new Date(t.due_date) : new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)
              const leftPct = Math.max(0, ((start.getTime() - projectStart.getTime()) / totalMs) * 100)
              const widthPct = Math.max(0.5, ((end.getTime() - start.getTime()) / totalMs) * 100)
              const status = normalizeTaskStatus(t.status)
              const barColor = STATUS_COLORS[status] ?? 'var(--purple)'
              const isDone = status === 'done'

              return (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 700 }}>
                  {/* Task label + agent badge */}
                  <div style={{
                    width: 210, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 3,
                  }}>
                    <div style={{
                      fontSize: 12, color: isDone ? 'rgba(255,255,255,0.3)' : '#f5f5f7',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      textDecoration: isDone ? 'line-through' : 'none',
                    }}>
                      {taskLabel(t)}
                    </div>
                    {t.agent && (
                      <span style={{
                        fontSize: 9,
                        fontFamily: 'var(--mo)',
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: 'rgba(139,92,246,0.12)',
                        border: '1px solid rgba(139,92,246,0.25)',
                        color: 'var(--purple)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        display: 'inline-block',
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>🤖 {t.agent}</span>
                    )}
                  </div>

                  {/* Bar track */}
                  <div style={{ flex: 1, height: 28, position: 'relative', background: 'rgba(255,255,255,0.03)', borderRadius: 6, overflow: 'hidden' }}>
                    {/* Today line */}
                    {todayPct >= 0 && todayPct <= 100 && (
                      <div style={{
                        position: 'absolute', top: 0, bottom: 0, width: 1.5,
                        left: `${todayPct}%`, background: 'var(--red)', opacity: 0.7, zIndex: 2,
                      }} />
                    )}
                    {/* Bar */}
                    <div style={{
                      position: 'absolute', top: 4, bottom: 4,
                      left: `${leftPct}%`,
                      width: `${Math.min(widthPct, 100 - leftPct)}%`,
                      background: barColor,
                      borderRadius: 4,
                      opacity: isDone ? 0.4 : 0.85,
                      display: 'flex', alignItems: 'center', padding: '0 6px',
                      overflow: 'hidden',
                      boxShadow: `0 0 6px ${barColor}40`,
                      minWidth: 4,
                    }}>
                      {widthPct > 5 && (
                        <span style={{ fontSize: 10, color: '#fff', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {taskLabel(t)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* End date */}
                  <div style={{ width: 70, flexShrink: 0, fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--mo)', textAlign: 'right' }}>
                    {fmtDate(t.due_date)}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginTop: 20, flexWrap: 'wrap' }}>
            {TASK_STATUSES.map((s) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 12, height: 12, borderRadius: 2, background: STATUS_COLORS[s], display: 'inline-block' }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{STATUS_LABELS[s]}</span>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 2, background: 'var(--red)', display: 'inline-block', opacity: 0.7 }} />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Today</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Table View ───────────────────────────────────────────────────────────────

const TABLE_COLUMNS: Column<Task>[] = [
  {
    key: 'name', label: 'Title', sortable: true, width: '20%',
    render: (_, row) => (
      <span style={{ fontWeight: 500, color: '#f5f5f7' }}>{taskLabel(row)}</span>
    ),
  },
  {
    key: 'status', label: 'Status', sortable: true,
    render: (v) => {
      const s = String(v ?? '').toLowerCase()
      const color = STATUS_COLORS[normalizeTaskStatus(s)] ?? 'rgba(255,255,255,0.4)'
      return (
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: color + '1a', color, fontWeight: 600 }}>
          {s}
        </span>
      )
    },
  },
  { key: 'owner', label: 'Owner', sortable: true },
  {
    key: 'priority', label: 'Priority', sortable: true,
    render: (v) => {
      const p = String(v ?? '').toLowerCase()
      const color = PRIORITY_COLORS[p] ?? 'rgba(255,255,255,0.4)'
      return <span style={{ color, fontWeight: 600, fontSize: 12 }}>{p || '—'}</span>
    },
  },
  {
    key: 'agent', label: 'Agent', sortable: true,
    render: (v) => v
      ? <span style={{
          fontSize: 9,
          fontFamily: 'var(--mo)',
          padding: '2px 6px',
          borderRadius: 4,
          background: 'rgba(139,92,246,0.12)',
          border: '1px solid rgba(139,92,246,0.25)',
          color: 'var(--purple)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>🤖 {String(v)}</span>
      : <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>
  },
  {
    key: 'tags', label: 'Tags',
    render: (v) => {
      const tags = Array.isArray(v) ? v as string[] : []
      if (!tags.length) return <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {tags.slice(0, 3).map((t) => (
            <span key={t} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>{t}</span>
          ))}
          {tags.length > 3 && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>+{tags.length - 3}</span>}
        </div>
      )
    },
  },
  {
    key: 'time_estimate', label: 'Time Est', sortable: true,
    render: (v) => v != null ? <span style={{ fontFamily: 'var(--mo)', fontSize: 12 }}>{String(v)}h</span> : <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>,
  },
  {
    key: 'time_logged', label: 'Time Logged', sortable: true,
    render: (v) => v != null ? <span style={{ fontFamily: 'var(--mo)', fontSize: 12 }}>{String(v)}h</span> : <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>,
  },
  {
    key: 'total_cost', label: 'Cost', sortable: true,
    render: (v) => {
      const n = Number(v ?? 0)
      return n > 0
        ? <span style={{ fontFamily: 'var(--mo)', fontSize: 12, color: 'var(--lime)' }}>${n.toFixed(4)}</span>
        : <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>
    },
  },
  {
    key: 'tokens', label: 'Tokens', sortable: true,
    render: (v) => v != null && Number(v) > 0
      ? <span style={{ fontFamily: 'var(--mo)', fontSize: 12 }}>{Number(v).toLocaleString()}</span>
      : <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>,
  },
  {
    key: 'due_date', label: 'Due Date', sortable: true,
    render: (v) => v ? <span style={{ fontFamily: 'var(--mo)', fontSize: 12 }}>{String(v)}</span> : <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>,
  },
]

function TableView({ tasks }: { tasks: Task[] }) {
  const [filter, setFilter] = useState('')
  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <input
          type="text"
          placeholder="Filter tasks…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#f5f5f7',
            outline: 'none', width: 280,
          }}
        />
      </div>
      <DataTable<Task>
        columns={TABLE_COLUMNS}
        data={tasks}
        filterValue={filter}
        filterKeys={['name', 'title', 'status', 'owner', 'agent', 'priority']}
        emptyMessage="No tasks found"
      />
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProjectDetailTabs({ project, tasks, milestones }: ProjectDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('sprint')

  return (
    <div>
      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: 0 }}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '10px 18px',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              background: 'none', border: 'none',
              color: activeTab === key ? '#f5f5f7' : 'rgba(255,255,255,0.35)',
              borderBottom: activeTab === key ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1,
              transition: 'color 0.15s',
            }}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', padding: '8px 16px', fontSize: 12, color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--mo)', display: 'flex', alignItems: 'center' }}>
          {tasks.length} tasks
        </div>
      </div>

      {/* Tab Content */}
      <div style={{
        background: 'rgba(255,255,255,0.015)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 14,
        padding: '20px 20px',
      }}>
        {activeTab === 'sprint' && <SprintBoardView tasks={tasks} />}
        {activeTab === 'kanban' && <KanbanView tasks={tasks} />}
        {activeTab === 'gantt'  && <GanttView tasks={tasks} project={project} />}
        {activeTab === 'table'  && <TableView tasks={tasks} />}
      </div>
    </div>
  )
}
