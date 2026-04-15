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
  [key: string]: unknown
}

interface Project { id: string; name: string; status: string }
interface Entity  { id: string; entity_name: string; entity_type: string }

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high:     '#f97316',
  normal:   '#8b5cf6',
  low:      '#6b7280',
}

const STATUS_DONE = new Set(['done', 'completed', 'complete'])

type ViewTab = 'today' | 'week' | 'all' | 'by_project' | 'by_entity'
const VIEW_TABS: { key: ViewTab; label: string }[] = [
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
  const p = (priority ?? 'normal').toLowerCase()
  const color = PRIORITY_COLORS[p] ?? PRIORITY_COLORS.normal
  return (
    <span style={{
      fontSize: 10, padding: '2px 7px', borderRadius: 12,
      background: color + '18', color, fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      {p}
    </span>
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
  const [priority, setPriority] = useState('normal')
  const [projectId, setProjectId] = useState('')
  const [entityId, setEntityId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleAdd = async () => {
    if (!title.trim()) return
    setSaving(true)
    const { data, error } = await supabase
      .from('tasks')
      .insert({ title: title.trim(), status: 'open', priority, project_id: projectId || null, entity_id: entityId || null, due_date: dueDate || null })
      .select('*, project:projects(id,name)')
      .single()
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
        <Plus size={16} style={{ color: 'var(--orange)', flexShrink: 0 }} />
        <input ref={inputRef} value={title} onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
          placeholder="Quick add task… (Enter to save)"
          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 14, color: 'var(--t1)', fontFamily: 'inherit' }}
        />
        <button onClick={() => setOpen(!open)} style={{ background: 'none', border: 'none', color: 'var(--t4)', cursor: 'pointer' }}>
          <ChevronDown size={15} style={{ transform: open ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }} />
        </button>
        <button onClick={handleAdd} disabled={!title.trim() || saving}
          style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, background: 'linear-gradient(135deg,var(--orange),var(--pink))', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', opacity: title.trim() ? 1 : 0.4 }}>
          {saving ? '…' : 'Add'}
        </button>
      </div>
      {open && (
        <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
          <select value={priority} onChange={(e) => setPriority(e.target.value)}
            style={{ padding: '6px 10px', fontSize: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'var(--t2)', outline: 'none' }}>
            {Object.keys(PRIORITY_COLORS).map((p) => <option key={p} value={p} style={{ background: '#0d0a20' }}>{p}</option>)}
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
        style={{ accentColor: 'var(--orange)', cursor: 'pointer' }} />
      <button onClick={() => onComplete(task.id)} style={{ background: 'none', border: 'none', color: isDone ? 'var(--green)' : 'rgba(255,255,255,0.2)', cursor: 'pointer', padding: 0 }}>
        {isDone ? <CheckCircle2 size={16} /> : <Circle size={16} />}
      </button>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--t1)', textDecoration: isDone ? 'line-through' : 'none', lineHeight: 1.3 }}>
          {getTaskTitle(task)}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
          {task.project?.name && <span style={{ fontSize: 11, color: 'var(--orange)', fontWeight: 600 }}>{task.project.name}</span>}
          {entity && <span style={{ fontSize: 11, color: 'var(--purple)', fontWeight: 600 }}>{entity.entity_name}</span>}
          {task.due_date && <span style={{ fontSize: 11, color: 'var(--t4)', fontFamily: 'var(--mo)' }}>{String(task.due_date)}</span>}
          <PriorityPill priority={task.priority} />
          {task.owner && <span style={{ fontSize: 11, color: 'var(--t3)' }}>{String(task.owner)}</span>}
          {task.agent && <span style={{ fontSize: 10, color: 'var(--purple)', fontFamily: 'var(--mo)' }}>{String(task.agent)}</span>}
          {task.model && <span style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--mo)' }}>{String(task.model)}</span>}
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
            <span style={{ fontSize: 10, color: 'var(--orange)', fontWeight: 600 }}>+{xpReward} XP</span>
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
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 12, fontWeight: 600, background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 8, color: 'var(--orange)', cursor: 'pointer' }}>
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
      if (priorityFilter !== 'all' && (t.priority ?? 'normal') !== priorityFilter) return false
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
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--t1)', margin: 0, background: 'linear-gradient(135deg,var(--orange),var(--pink))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Tasks</h1>
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
          { label: 'Open',      value: open.length,      color: 'var(--orange)' },
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
            style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600, borderRadius: 8, background: activeTab === tab.key ? 'rgba(249,115,22,0.2)' : 'transparent', border: `1px solid ${activeTab === tab.key ? 'rgba(249,115,22,0.4)' : 'transparent'}`, color: activeTab === tab.key ? 'var(--orange)' : 'var(--t4)', cursor: 'pointer' }}>
            {tab.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}
          style={{ padding: '7px 10px', fontSize: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'var(--t2)', outline: 'none' }}>
          <option value="all" style={{ background: '#0d0a20' }}>All priorities</option>
          {Object.keys(PRIORITY_COLORS).map((p) => <option key={p} value={p} style={{ background: '#0d0a20' }}>{p}</option>)}
        </select>
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--t4)' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks…"
            style={{ padding: '7px 12px 7px 28px', fontSize: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'var(--t1)', outline: 'none', width: 160 }} />
        </div>
      </div>

      {/* ── Task List ── */}
      <div className="mc-card accent" style={{ padding: 0, overflow: 'hidden' }}>
        {activeTab === 'by_project' && groupedByProject ? (
          Object.entries(groupedByProject).map(([projectName, projectTasks]) => (
            <div key={projectName}>
              <div style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, color: 'var(--orange)', background: 'rgba(249,115,22,0.06)', borderBottom: '1px solid rgba(255,255,255,0.04)', letterSpacing: '.04em' }}>
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
