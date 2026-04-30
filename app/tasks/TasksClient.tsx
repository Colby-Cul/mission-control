'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import {
  Plus, Bot, CheckCircle2, Circle, AlarmClock,
  ChevronDown, RefreshCw, Search, Filter, X,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { invokeAgent, BUILTIN_AGENTS } from '../lib/agents'
import AskAgentModal from '../_components/AskAgentModal'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Task {
  id: string
  title?: string
  name?: string
  status: string
  priority?: string
  due_date?: string
  project_id?: string
  entity_id?: string
  owner?: string
  snooze_until?: string
  created_at?: string
  project?: { id?: string; name?: string } | null
  // Extended data fields (migration: add_projects_tasks_visions_data_fields)
  tags?: string[]
  subtasks_count?: number
  attachments_count?: number
  last_commented_by?: string | null
  time_estimate?: number | null    // minutes
  time_logged?: number             // minutes
  xp_reward?: number
  // Live-data fields from sessions
  agent?: string
  model?: string
  tokens?: number
  total_cost?: number
  duration_minutes?: number
  session_id?: string
  // Latest agent_runs row for this task (populated server-side in page.tsx)
  latest_run?: {
    id: string
    agent_id: string | null
    status: string | null
    started_at: string | null
    ended_at: string | null
    cost: number | null
    tokens: number | null
    error: string | null
    output: Record<string, unknown> | null
  } | null
  run_count?: number
  [key: string]: unknown
}

interface Project { id: string; name: string; status: string }
interface Entity  { id: string; entity_name: string; entity_type: string }

// New P0–P3 taxonomy (matches tasks.priority in the DB) + back-compat with
// legacy critical/high/normal/low values from older rows.
const PRIORITY_COLORS: Record<string, string> = {
  p0:       '#ef4444',
  p1:       '#3b82f6',
  p2:       '#8b5cf6',
  p3:       '#6b7280',
  critical: '#ef4444',
  high:     '#3b82f6',
  normal:   '#8b5cf6',
  medium:   '#8b5cf6',
  low:      '#6b7280',
}
function normalizePriority(p?: string | null): string {
  const v = (p ?? '').toLowerCase().trim()
  if (['p0','critical','0'].includes(v)) return 'p0'
  if (['p1','high','1'].includes(v)) return 'p1'
  if (['p2','medium','normal','2'].includes(v)) return 'p2'
  if (['p3','low','3'].includes(v)) return 'p3'
  return 'p2'
}
function priorityLabel(p?: string | null): string {
  return normalizePriority(p).toUpperCase()
}

// Sprint stages — mirrors tasks.status enum in the DB + back-compat.
const STATUS_DONE = new Set(['done', 'completed', 'complete', 'shipped'])
const STATUS_CANCELLED = new Set(['cancelled', 'canceled', 'killed', 'abandoned'])
function normalizeStatus(s?: string | null): string {
  const v = (s ?? '').toLowerCase().trim()
  if (STATUS_DONE.has(v)) return 'done'
  if (STATUS_CANCELLED.has(v)) return 'cancelled'
  if (['blocked', 'stuck', 'waiting'].includes(v)) return 'blocked'
  if (['in_review', 'review', 'qa', 'testing', 'validation'].includes(v)) return 'in_review'
  if (['in_progress', 'in progress', 'active', 'running', 'working', 'doing', 'wip'].includes(v)) return 'in_progress'
  if (['ready', 'todo', 'to_do', 'scheduled', 'queued', 'planning', 'open'].includes(v)) return 'ready'
  return 'backlog'
}
const STAGE_META: Record<string, { label: string; color: string }> = {
  backlog:     { label: 'Backlog',     color: 'rgba(255,255,255,0.3)' },
  ready:       { label: 'Ready',       color: '#8b5cf6' },
  in_progress: { label: 'In Progress', color: '#3b82f6' },
  in_review:   { label: 'In Review',   color: '#f59e0b' },
  blocked:     { label: 'Blocked',     color: '#ef4444' },
  done:        { label: 'Done',        color: '#10b981' },
  cancelled:   { label: 'Cancelled',   color: 'rgba(255,255,255,0.2)' },
}
const STAGE_ORDER = ['backlog','ready','in_progress','in_review','blocked','done','cancelled']

type ViewTab = 'board' | 'today' | 'week' | 'all' | 'by_project' | 'by_entity'
const VIEW_TABS: { key: ViewTab; label: string }[] = [
  { key: 'board',      label: 'Board'      },
  { key: 'today',      label: 'Today'      },
  { key: 'week',       label: 'This Week'  },
  { key: 'all',        label: 'All'        },
  { key: 'by_project', label: 'By Project' },
  { key: 'by_entity',  label: 'By Entity'  },
]

function getTaskTitle(t: Task): string {
  return String(t.title ?? t.name ?? 'Untitled task')
}

// ─── Priority Badge ───────────────────────────────────────────────────────────

function PriorityPill({ priority }: { priority?: string }) {
  const p = normalizePriority(priority)
  const color = PRIORITY_COLORS[p] ?? PRIORITY_COLORS.p2
  return (
    <span style={{
      fontSize: 10, padding: '2px 7px', borderRadius: 12,
      background: color + '18', color, fontWeight: 700, whiteSpace: 'nowrap',
      fontFamily: 'var(--mo)', letterSpacing: '.03em',
    }}>
      {priorityLabel(priority)}
    </span>
  )
}

function StagePill({ status }: { status?: string }) {
  const norm = normalizeStatus(status)
  const meta = STAGE_META[norm] ?? STAGE_META.backlog
  return (
    <span style={{
      fontSize: 10, padding: '2px 7px', borderRadius: 12,
      background: meta.color + '20', color: meta.color, fontWeight: 600,
      border: `1px solid ${meta.color}40`,
      fontFamily: 'var(--mo)', whiteSpace: 'nowrap',
    }}>
      {meta.label}
    </span>
  )
}

// ─── Board (Kanban) View ─────────────────────────────────────────────────────

function BoardCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const pri = normalizePriority(task.priority)
  const priColor = PRIORITY_COLORS[pri] ?? PRIORITY_COLORS.p2
  const size = String((task as { size?: string }).size ?? '').toUpperCase()
  const ac = String((task as { acceptance_criteria?: string }).acceptance_criteria ?? '').trim()
  const acPreview = ac ? (ac.length > 110 ? ac.slice(0, 107) + '…' : ac) : null
  const blocksReason = String((task as { blocks_reason?: string }).blocks_reason ?? '').trim()
  const isBlocked = normalizeStatus(task.status) === 'blocked'
  const dispatches = Number((task as { dispatch_count?: number }).dispatch_count ?? 0)

  return (
    <div onClick={onClick} style={{
      background: 'rgba(255,255,255,0.04)',
      border: isBlocked ? '1px solid rgba(239,68,68,0.35)' : '1px solid rgba(255,255,255,0.08)',
      borderRadius: 10,
      padding: '10px 12px',
      display: 'flex', flexDirection: 'column', gap: 6,
      cursor: 'pointer',
      transition: 'background .1s, transform .1s',
    }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <span title={`Priority ${priorityLabel(pri)}`} style={{
          fontSize: 10, fontWeight: 700, fontFamily: 'var(--mo)',
          padding: '2px 6px', borderRadius: 4,
          background: 'rgba(0,0,0,0.3)', border: `1px solid ${priColor}`, color: priColor,
          flexShrink: 0, lineHeight: 1.2,
        }}>{priorityLabel(pri)}</span>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--t1)', lineHeight: 1.35, flex: 1 }}>{getTaskTitle(task)}</span>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {task.project?.name && <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600 }}>{task.project.name}</span>}
        {task.agent && (
          <span style={{
            fontSize: 9, fontFamily: 'var(--mo)', padding: '2px 6px', borderRadius: 4,
            background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)',
            color: 'var(--purple)', textTransform: 'uppercase', letterSpacing: '.05em',
          }}>🤖 {task.agent}</span>
        )}
        {size && (
          <span title={`Size ${size}`} style={{
            fontSize: 10, fontWeight: 600, fontFamily: 'var(--mo)', padding: '2px 6px',
            borderRadius: 10, background: 'rgba(255,255,255,0.06)', color: 'var(--t3)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>{size}</span>
        )}
        {task.due_date && <span style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'var(--mo)' }}>{String(task.due_date)}</span>}
        {dispatches > 0 && <span title="Dispatches" style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'var(--mo)' }}>↻{dispatches}</span>}
      </div>
      {acPreview && (
        <div style={{
          fontSize: 11, color: 'var(--t3)', lineHeight: 1.35,
          paddingTop: 4, borderTop: '1px dashed rgba(255,255,255,0.06)',
        }}>
          <span style={{ color: 'var(--t4)', fontWeight: 600, marginRight: 4 }}>AC:</span>{acPreview}
        </div>
      )}
      {isBlocked && blocksReason && (
        <div style={{
          fontSize: 11, color: '#ef4444', lineHeight: 1.35,
          padding: '4px 6px', background: 'rgba(239,68,68,0.07)',
          border: '1px solid rgba(239,68,68,0.18)', borderRadius: 6,
        }}>
          <span style={{ fontWeight: 600, marginRight: 4 }}>Blocked:</span>
          {blocksReason.length > 90 ? blocksReason.slice(0, 87) + '…' : blocksReason}
        </div>
      )}
    </div>
  )
}

function BoardView({ tasks, onTaskClick }: {
  tasks: Task[]
  onTaskClick: (t: Task) => void
  priorityFilter: string
}) {
  const byStage = useMemo(() => {
    const buckets: Record<string, Task[]> = Object.fromEntries(STAGE_ORDER.map((s) => [s, []]))
    tasks.forEach((t) => {
      const s = normalizeStatus(t.status)
      if (buckets[s]) buckets[s].push(t)
    })
    return buckets
  }, [tasks])

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${STAGE_ORDER.length}, minmax(240px, 1fr))`,
      gap: 12,
      overflowX: 'auto',
      paddingBottom: 8,
    }}>
      {STAGE_ORDER.map((stage) => {
        const meta = STAGE_META[stage]
        const list = byStage[stage]
        return (
          <div key={stage} className="mc-card" style={{
            padding: '12px 10px',
            background: 'rgba(255,255,255,0.02)',
            borderTop: `3px solid ${meta.color}`,
            display: 'flex', flexDirection: 'column', gap: 8,
            minHeight: 120,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0 4px 6px', borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}>
              <span style={{
                fontSize: 11, fontWeight: 700, color: meta.color,
                textTransform: 'uppercase', letterSpacing: '.08em', fontFamily: 'var(--mo)',
              }}>{meta.label}</span>
              <span style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'var(--mo)' }}>{list.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {list.map((t) => <BoardCard key={t.id} task={t} onClick={() => onTaskClick(t)} />)}
              {list.length === 0 && (
                <div style={{
                  minHeight: 60, borderRadius: 8, border: '1px dashed rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, color: 'rgba(255,255,255,0.2)',
                }}>empty</div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Quick-Add Row ────────────────────────────────────────────────────────────

function QuickAdd({
  projects, entities, onAdded,
}: {
  projects: Project[]; entities: Entity[]
  onAdded: (t: Task) => void
}) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState('p2')
  const [stage, setStage] = useState('ready')  // default "ready" so it auto-dispatches via orchestrator
  const [projectId, setProjectId] = useState('')
  const [entityId, setEntityId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleAdd = async () => {
    if (!title.trim()) return
    setSaving(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: { data: Task | null; error: unknown } = await (supabase.from('tasks') as any)
      .insert({
        id: `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        name: title.trim(),
        status: stage,
        priority,
        project_id: projectId || null,
        entity_id: entityId || null,
        due_date: dueDate || null,
      })
      .select('*, project:projects(id,name)')
      .single()
    const { data, error } = res
    setSaving(false)
    if (!error && data) {
      onAdded(data as Task)
      setTitle(''); setProjectId(''); setEntityId(''); setDueDate('')
      inputRef.current?.focus()
    }
  }

  return (
    <div className="mc-card accent" style={{ padding: '12px 16px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Plus size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        <input ref={inputRef} value={title} onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
          placeholder="Quick add task… (Enter to save)"
          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 14, color: 'var(--t1)', fontFamily: 'inherit' }}
        />
        <button onClick={() => setOpen(!open)} style={{ background: 'none', border: 'none', color: 'var(--t4)', cursor: 'pointer' }}>
          <ChevronDown size={15} style={{ transform: open ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }} />
        </button>
        <button onClick={handleAdd} disabled={!title.trim() || saving}
          style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, background: 'linear-gradient(135deg,var(--accent),var(--pink))', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', opacity: title.trim() ? 1 : 0.4 }}>
          {saving ? '…' : 'Add'}
        </button>
      </div>
      {open && (
        <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
          <select value={priority} onChange={(e) => setPriority(e.target.value)}
            style={{ padding: '6px 10px', fontSize: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'var(--t2)', outline: 'none' }}>
            {['p0','p1','p2','p3'].map((p) => (
              <option key={p} value={p} style={{ background: '#0d0a20' }}>
                {p.toUpperCase()} — {p==='p0'?'Critical':p==='p1'?'High':p==='p2'?'Medium':'Low'}
              </option>
            ))}
          </select>
          <select value={stage} onChange={(e) => setStage(e.target.value)}
            style={{ padding: '6px 10px', fontSize: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'var(--t2)', outline: 'none' }}
            title="Starting stage. `ready` auto-dispatches to the assigned agent on next orchestrator tick.">
            <option value="backlog" style={{ background: '#0d0a20' }}>Backlog</option>
            <option value="ready" style={{ background: '#0d0a20' }}>Ready (auto-dispatch)</option>
            <option value="in_progress" style={{ background: '#0d0a20' }}>In Progress</option>
            <option value="blocked" style={{ background: '#0d0a20' }}>Blocked</option>
          </select>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
            style={{ padding: '6px 10px', fontSize: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'var(--t2)', outline: 'none', flex: 1 }}>
            <option value="" style={{ background: '#0d0a20' }}>No project</option>
            {projects.map((p) => <option key={p.id} value={p.id} style={{ background: '#0d0a20' }}>{p.name}</option>)}
          </select>
          <select value={entityId} onChange={(e) => setEntityId(e.target.value)}
            style={{ padding: '6px 10px', fontSize: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'var(--t2)', outline: 'none', flex: 1 }}>
            <option value="" style={{ background: '#0d0a20' }}>No entity</option>
            {entities.map((e) => <option key={e.id} value={e.id} style={{ background: '#0d0a20' }}>{e.entity_name}</option>)}
          </select>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
            style={{ padding: '6px 10px', fontSize: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'var(--t2)', outline: 'none' }} />
        </div>
      )}
    </div>
  )
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

function TaskRow({
  task, selected, onToggleSelect, onComplete, onSnooze, onAskAgent, entities,
}: {
  task: Task; selected: boolean
  onToggleSelect: (id: string) => void
  onComplete: (id: string) => void
  onSnooze: (id: string) => void
  onAskAgent: (t: Task) => void
  entities: Entity[]
}) {
  const isDone = STATUS_DONE.has((task.status ?? '').toLowerCase())
  const entity = entities.find((e) => e.id === task.entity_id)

  // Derived helpers
  const tags = Array.isArray(task.tags) ? task.tags as string[] : []
  const subtaskCount = Number(task.subtasks_count ?? 0)
  const attachCount  = Number(task.attachments_count ?? 0)
  const timeEst      = task.time_estimate != null ? Number(task.time_estimate) : null
  const timeLogged   = Number(task.time_logged ?? 0)
  const xpReward     = Number(task.xp_reward ?? 0)
  const totalCost    = task.total_cost != null ? Number(task.total_cost) : null
  const fmtMin       = (m: number) => m >= 60 ? `${Math.floor(m/60)}h${m%60>0?` ${m%60}m`:''}` : `${m}m`

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '20px 20px 1fr auto',
      gap: 12, alignItems: 'center', padding: '11px 18px',
      borderBottom: '1px solid rgba(255,255,255,0.04)', opacity: isDone ? 0.5 : 1, transition: 'background 0.1s',
    }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.02)' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = '' }}>
      <input type="checkbox" checked={selected} onChange={() => onToggleSelect(task.id)}
        style={{ accentColor: 'var(--accent)', cursor: 'pointer' }} />
      <button onClick={() => onComplete(task.id)} style={{ background: 'none', border: 'none', color: isDone ? 'var(--green)' : 'rgba(255,255,255,0.2)', cursor: 'pointer', padding: 0 }}>
        {isDone ? <CheckCircle2 size={16} /> : <Circle size={16} />}
      </button>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--t1)', textDecoration: isDone ? 'line-through' : 'none', lineHeight: 1.3 }}>
          {getTaskTitle(task)}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
          {task.project?.name && <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>{task.project.name}</span>}
          {entity && <span style={{ fontSize: 11, color: 'var(--purple)', fontWeight: 600 }}>{entity.entity_name}</span>}
          {task.due_date && <span style={{ fontSize: 11, color: 'var(--t4)', fontFamily: 'var(--mo)' }}>{String(task.due_date)}</span>}
          <PriorityPill priority={task.priority} />
          <StagePill status={task.status} />
          {task.owner && <span style={{ fontSize: 11, color: 'var(--t3)' }}>{String(task.owner)}</span>}
          {task.agent && <span style={{ fontSize: 10, color: 'var(--purple)', fontFamily: 'var(--mo)' }}>{String(task.agent)}</span>}
          {task.model && <span style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--mo)' }}>{String(task.model)}</span>}
          {/* Latest agent_runs activity — the real feedback loop */}
          {task.latest_run && (() => {
            const r = task.latest_run!
            const badgeColor =
              r.status === 'completed' ? 'var(--green)' :
              r.status === 'running'   ? 'var(--cyan)'  :
              r.status === 'blocked'   ? 'var(--yellow)':
              r.status === 'false_report' ? 'var(--yellow)' :
              r.status === 'error' || r.status === 'failed' ? 'var(--red)' : 'var(--t4)'
            const durMs = r.ended_at && r.started_at ? (new Date(r.ended_at).getTime() - new Date(r.started_at).getTime()) : null
            return (
              <span
                style={{ fontSize: 10, color: badgeColor, fontFamily: 'var(--mo)', border: `1px solid ${badgeColor}`, borderRadius: 3, padding: '1px 5px' }}
                title={r.error ? `${r.agent_id}: ${r.error}` : `${r.agent_id} — ${r.status}`}
              >
                ▸ {r.agent_id ?? 'agent'} {r.status ?? '—'}{durMs ? ` · ${(durMs/1000).toFixed(1)}s` : ''}
                {task.run_count && task.run_count > 1 ? ` (${task.run_count} runs)` : ''}
              </span>
            )
          })()}
        </div>
        {/* ── Sub-row: tags + time + cost + xp + attachments ── */}
        <div style={{ display: 'flex', gap: 8, marginTop: 5, flexWrap: 'wrap', alignItems: 'center' }}>
          {tags.slice(0, 3).map((tag: string) => (
            <span key={tag} style={{
              fontSize: 9, padding: '1px 5px', borderRadius: 3, fontFamily: 'var(--mo)',
              background: 'rgba(255,255,255,0.05)', color: 'var(--dim)',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>{tag}</span>
          ))}
          {timeEst != null && (
            <span style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'var(--mo)' }}>
              ⏱ {timeLogged > 0 ? `${fmtMin(timeLogged)}/` : ''}{fmtMin(timeEst)}
            </span>
          )}
          {totalCost != null && totalCost > 0 && (
            <span style={{ fontSize: 10, color: 'var(--amber)', fontFamily: 'var(--mo)' }}>
              ${totalCost.toFixed(2)}
            </span>
          )}
          {xpReward > 0 && (
            <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600 }}>+{xpReward} XP</span>
          )}
          {subtaskCount > 0 && (
            <span style={{ fontSize: 10, color: 'var(--t4)' }}>{subtaskCount} subtasks</span>
          )}
          {attachCount > 0 && (
            <span style={{ fontSize: 10, color: 'var(--t4)' }}>{attachCount} files</span>
          )}
          {task.last_commented_by && (
            <span style={{ fontSize: 10, color: 'var(--dim)' }}>💬 {String(task.last_commented_by)}</span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
        <button onClick={() => onSnooze(task.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', padding: 4 }} title="Snooze 24h">
          <AlarmClock size={14} />
        </button>
        <button onClick={() => onAskAgent(task)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', fontSize: 11, fontWeight: 600, background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 6, color: 'var(--purple)', cursor: 'pointer' }}>
          <Bot size={11} /> Run
        </button>
      </div>
    </div>
  )
}

// ─── Bulk Action Bar ──────────────────────────────────────────────────────────

function BulkBar({ count, entities, onComplete, onAssignEntity, onAskAgent, onClear }: {
  count: number; entities: Entity[]
  onComplete: () => void
  onAssignEntity: (entityId: string) => void
  onAskAgent: () => void
  onClear: () => void
}) {
  const [entityPicker, setEntityPicker] = useState(false)
  if (!count) return null
  return (
    <div style={{
      position: 'sticky', bottom: 16, zIndex: 50,
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 20px', borderRadius: 16,
      background: 'linear-gradient(135deg, rgba(20,15,50,0.98), rgba(15,10,40,0.98))',
      border: '1px solid rgba(139,92,246,0.4)',
      boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
      maxWidth: 700, margin: '16px auto 0',
    }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>{count} selected</span>
      <div style={{ flex: 1 }} />
      <button onClick={onComplete} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 12, fontWeight: 600, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, color: 'var(--green)', cursor: 'pointer' }}>
        <CheckCircle2 size={13} /> Mark Done
      </button>
      <div style={{ position: 'relative' }}>
        <button onClick={() => setEntityPicker(!entityPicker)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 12, fontWeight: 600, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, color: 'var(--accent)', cursor: 'pointer' }}>
          <Filter size={13} /> Set Entity
        </button>
        {entityPicker && (
          <div style={{ position: 'absolute', bottom: '110%', right: 0, background: '#0f0a28', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 8, minWidth: 180, zIndex: 60, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
            {entities.map((e) => (
              <button key={e.id} onClick={() => { onAssignEntity(e.id); setEntityPicker(false) }}
                style={{ display: 'block', width: '100%', padding: '7px 10px', fontSize: 12, background: 'none', border: 'none', color: 'var(--t2)', cursor: 'pointer', textAlign: 'left', borderRadius: 6 }}>
                {e.entity_name}
              </button>
            ))}
          </div>
        )}
      </div>
      <button onClick={onAskAgent} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 12, fontWeight: 600, background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 8, color: 'var(--purple)', cursor: 'pointer' }}>
        <Bot size={13} /> Ask Agent
      </button>
      <button onClick={onClear} style={{ background: 'none', border: 'none', color: 'var(--t4)', cursor: 'pointer', padding: 4 }}>
        <X size={15} />
      </button>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TasksClient({
  initialTasks, projects, entities,
}: {
  initialTasks: Task[]; projects: Project[]; entities: Entity[]
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [activeTab, setActiveTab] = useState<ViewTab>('all')
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [agentModal, setAgentModal] = useState<{ open: boolean; task: Task | null; isBulk?: boolean }>({ open: false, task: null })
  const [refreshing, setRefreshing] = useState(false)

  const today = new Date().toISOString().slice(0, 10)
  const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      const isDone = STATUS_DONE.has((t.status ?? '').toLowerCase())
      if (activeTab === 'today') {
        if (isDone) return false
        return !t.due_date || t.due_date <= today
      }
      if (activeTab === 'week') {
        if (isDone) return false
        if (!t.due_date) return false
        return t.due_date >= today && t.due_date <= weekEnd
      }
      if (priorityFilter !== 'all' && normalizePriority(t.priority) !== priorityFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        if (!getTaskTitle(t).toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [tasks, activeTab, search, priorityFilter, today, weekEnd])

  const groupedByProject = useMemo(() => {
    if (activeTab !== 'by_project') return null
    const map: Record<string, Task[]> = {}
    filtered.forEach((t) => {
      const key = t.project?.name ?? t.project_id ?? 'No Project'
      if (!map[key]) map[key] = []
      map[key].push(t)
    })
    return map
  }, [filtered, activeTab])

  const groupedByEntity = useMemo(() => {
    if (activeTab !== 'by_entity') return null
    const map: Record<string, Task[]> = {}
    filtered.forEach((t) => {
      const entity = entities.find((e) => e.id === t.entity_id)
      const key = entity?.entity_name ?? 'No Entity'
      if (!map[key]) map[key] = []
      map[key].push(t)
    })
    return map
  }, [filtered, activeTab, entities])

  const open = tasks.filter((t) => !STATUS_DONE.has((t.status ?? '').toLowerCase()))
  const dueToday = tasks.filter((t) => t.due_date && t.due_date <= today && !STATUS_DONE.has((t.status ?? '').toLowerCase()))
  const overdue  = tasks.filter((t) => t.due_date && t.due_date < today && !STATUS_DONE.has((t.status ?? '').toLowerCase()))

  const handleRefresh = async () => {
    setRefreshing(true)
    const { data } = await supabase.from('tasks').select('*, project:projects(id,name)').order('created_at', { ascending: false })
    if (data) setTasks(data as Task[])
    setRefreshing(false)
  }

  const handleComplete = useCallback(async (id: string) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: 'done' } : t))
    await supabase.from('tasks').update({ status: 'done' }).eq('id', id)
  }, [])

  const handleSnooze = useCallback(async (id: string) => {
    const until = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, snooze_until: until } : t))
    await supabase.from('tasks').update({ snooze_until: until }).eq('id', id)
  }, [])

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }, [])

  const handleBulkComplete = async () => {
    const ids = [...selectedIds]
    setTasks((prev) => prev.map((t) => ids.includes(t.id) ? { ...t, status: 'done' } : t))
    await supabase.from('tasks').update({ status: 'done' }).in('id', ids)
    setSelectedIds(new Set())
  }

  const handleBulkAssignEntity = async (entityId: string) => {
    const ids = [...selectedIds]
    setTasks((prev) => prev.map((t) => ids.includes(t.id) ? { ...t, entity_id: entityId } : t))
    await supabase.from('tasks').update({ entity_id: entityId }).in('id', ids)
    setSelectedIds(new Set())
  }

  function renderTaskList(taskList: Task[]) {
    const openList = taskList.filter((t) => !STATUS_DONE.has((t.status ?? '').toLowerCase()))
    const doneList = taskList.filter((t) => STATUS_DONE.has((t.status ?? '').toLowerCase()))
    return (
      <>
        {openList.map((t) => (
          <TaskRow key={t.id} task={t} selected={selectedIds.has(t.id)} onToggleSelect={handleToggleSelect}
            onComplete={handleComplete} onSnooze={handleSnooze}
            onAskAgent={(task) => setAgentModal({ open: true, task })} entities={entities} />
        ))}
        {openList.length === 0 && (
          <div style={{ padding: '24px', textAlign: 'center', fontSize: 13, color: 'var(--t4)' }}>No open tasks in this view.</div>
        )}
        {doneList.length > 0 && (
          <>
            <div style={{ padding: '8px 14px', fontSize: 11, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.06em', borderTop: '1px solid rgba(255,255,255,0.04)', marginTop: 8, fontFamily: 'var(--mo)' }}>
              Completed ({doneList.length})
            </div>
            {doneList.slice(0, 10).map((t) => (
              <TaskRow key={t.id} task={t} selected={selectedIds.has(t.id)} onToggleSelect={handleToggleSelect}
                onComplete={handleComplete} onSnooze={handleSnooze}
                onAskAgent={(task) => setAgentModal({ open: true, task })} entities={entities} />
            ))}
          </>
        )}
      </>
    )
  }

  return (
    <div style={{ padding: 24 }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.12em', fontFamily: 'var(--mo)', marginBottom: 6 }}>≈ TASKS · WORKSPACE</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--t1)', margin: 0, background: 'linear-gradient(135deg,var(--accent),var(--pink))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Tasks</h1>
          <div style={{ fontSize: 13, color: 'var(--t3)', marginTop: 4 }}>
            {open.length} open · {dueToday.length} due today
            {overdue.length > 0 && <span style={{ color: 'var(--red)', marginLeft: 6 }}>· {overdue.length} overdue</span>}
          </div>
        </div>
        <button onClick={handleRefresh} disabled={refreshing}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', fontSize: 13, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'var(--t3)', cursor: 'pointer' }}>
          <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* ── Stats strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Open',      value: open.length,      color: 'var(--accent)' },
          { label: 'Due Today', value: dueToday.length,  color: 'var(--amber)'  },
          { label: 'Overdue',   value: overdue.length,   color: 'var(--red)'    },
          { label: 'Total',     value: tasks.length,     color: 'var(--purple)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="mc-card accent" style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 11, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── Quick Add ── */}
      <QuickAdd projects={projects} entities={entities} onAdded={(t) => setTasks((prev) => [t, ...prev])} />

      {/* ── Tab Switcher + Filters ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4, flexWrap: 'wrap' }}>
        {VIEW_TABS.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600, borderRadius: 8, background: activeTab === tab.key ? 'rgba(59,130,246,0.2)' : 'transparent', border: `1px solid ${activeTab === tab.key ? 'rgba(59,130,246,0.4)' : 'transparent'}`, color: activeTab === tab.key ? 'var(--accent)' : 'var(--t4)', cursor: 'pointer' }}>
            {tab.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}
          style={{ padding: '7px 10px', fontSize: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'var(--t2)', outline: 'none' }}>
          <option value="all" style={{ background: '#0d0a20' }}>All priorities</option>
          <option value="p0" style={{ background: '#0d0a20' }}>P0 — Critical</option>
          <option value="p1" style={{ background: '#0d0a20' }}>P1 — High</option>
          <option value="p2" style={{ background: '#0d0a20' }}>P2 — Medium</option>
          <option value="p3" style={{ background: '#0d0a20' }}>P3 — Low</option>
        </select>
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--t4)' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks…"
            style={{ padding: '7px 12px 7px 28px', fontSize: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'var(--t1)', outline: 'none', width: 160 }} />
        </div>
      </div>

      {/* ── Task List ── */}
      {activeTab === 'board' ? (
        <BoardView
          tasks={filtered}
          onTaskClick={(task) => setAgentModal({ open: true, task })}
          priorityFilter={priorityFilter}
        />
      ) : (
        <div className="mc-card accent" style={{ padding: 0, overflow: 'hidden' }}>
          {activeTab === 'by_project' && groupedByProject ? (
            Object.entries(groupedByProject).map(([projectName, projectTasks]) => (
              <div key={projectName}>
                <div style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, color: 'var(--accent)', background: 'rgba(59,130,246,0.06)', borderBottom: '1px solid rgba(255,255,255,0.04)', letterSpacing: '.04em' }}>
                  {projectName} <span style={{ fontSize: 11, color: 'var(--t4)', fontWeight: 400, marginLeft: 6 }}>({projectTasks.length})</span>
                </div>
                {renderTaskList(projectTasks)}
              </div>
            ))
          ) : activeTab === 'by_entity' && groupedByEntity ? (
            Object.entries(groupedByEntity).map(([entityName, entityTasks]) => (
              <div key={entityName}>
                <div style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, color: 'var(--purple)', background: 'rgba(139,92,246,0.06)', borderBottom: '1px solid rgba(255,255,255,0.04)', letterSpacing: '.04em' }}>
                  {entityName} <span style={{ fontSize: 11, color: 'var(--t4)', fontWeight: 400, marginLeft: 6 }}>({entityTasks.length})</span>
                </div>
                {renderTaskList(entityTasks)}
              </div>
            ))
          ) : (
            renderTaskList(filtered)
          )}
        </div>
      )}

      {/* ── Bulk Action Bar ── */}
      <BulkBar
        count={selectedIds.size}
        entities={entities}
        onComplete={handleBulkComplete}
        onAssignEntity={handleBulkAssignEntity}
        onAskAgent={() => setAgentModal({ open: true, task: null, isBulk: true })}
        onClear={() => setSelectedIds(new Set())}
      />

      {/* ── Agent Modal ── */}
      <AskAgentModal
        open={agentModal.open}
        onClose={() => setAgentModal({ open: false, task: null })}
        contextType={agentModal.isBulk ? 'tasks_bulk' : 'task'}
        contextId={agentModal.task?.id}
        contextLabel={agentModal.isBulk ? `${selectedIds.size} selected tasks` : agentModal.task ? getTaskTitle(agentModal.task) : undefined}
      />

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
