'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  Plus, RefreshCw, LayoutGrid, List, BarChart2, Search, Filter,
  ChevronDown, Bot, CheckCircle2, Clock, AlertTriangle, X, Edit2, Zap
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { invokeAgent, BUILTIN_AGENTS } from '../lib/agents'
import KanbanBoard, { type KanbanColumn } from '../_components/KanbanBoard'
import DataTable, { type Column } from '../_components/DataTable'
import AskAgentModal from '../_components/AskAgentModal'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Project {
  id: string
  name: string
  title?: string
  status: string
  priority?: number | string
  description?: string
  owner?: string
  entity_id?: string
  percent_complete?: number
  start_date?: string
  target_date?: string
  due_date?: string
  assigned_agent?: string
  created_at?: string
  // Extended data fields (migration: add_projects_tasks_visions_data_fields)
  health_score?: number | null
  budget_used?: number
  budget_total?: number
  milestone_count?: number
  blockers?: string[]
  linked_agent?: string
  linked_entity?: string
  last_update_ts?: string | null
  task_count?: number
  done_count?: number
  total_cost?: number
  agents?: string[]
  models_used?: string[]
  [key: string]: unknown
}

interface Entity {
  id: string
  entity_name: string
  entity_type: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const KANBAN_COLUMNS: KanbanColumn<Project>[] = [
  { key: 'planning',    label: 'Planning',    color: 'var(--purple)' },
  { key: 'active',      label: 'Active',      color: 'var(--orange)' },
  { key: 'blocked',     label: 'Blocked',     color: 'var(--red)'    },
  { key: 'review',      label: 'Review',      color: 'var(--amber)'  },
  { key: 'completed',   label: 'Completed',   color: 'var(--green)'  },
]

const STATUS_COLORS: Record<string, string> = {
  planning:  'var(--purple)',
  active:    'var(--orange)',
  blocked:   'var(--red)',
  review:    'var(--amber)',
  completed: 'var(--green)',
  done:      'var(--green)',
}

function normalizeStatus(s: string): string {
  const v = (s ?? '').toLowerCase()
  if (['done', 'completed', 'complete'].includes(v)) return 'completed'
  if (v === 'blocked') return 'blocked'
  if (v === 'review') return 'review'
  if (['active', 'in_progress', 'in progress', 'running'].includes(v)) return 'active'
  return 'planning'
}

function getPct(p: Project): number {
  const raw = p.percent_complete ?? 0
  return Math.min(100, Math.max(0, Number(raw)))
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const norm = normalizeStatus(status)
  const color = STATUS_COLORS[norm] ?? 'rgba(255,255,255,0.4)'
  return (
    <span style={{
      fontSize: 11, padding: '3px 9px', borderRadius: 20,
      background: color + '18', color, fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      {norm}
    </span>
  )
}

function ProgressBar({ pct, color = 'var(--orange)' }: { pct: number; color?: string }) {
  return (
    <div style={{ height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.3s' }} />
    </div>
  )
}

function ProjectCard({
  project,
  entities,
  onAskAgent,
  onEdit,
}: {
  project: Project
  entities: Entity[]
  onAskAgent: (p: Project) => void
  onEdit: (p: Project) => void
}) {
  const pct = getPct(project)
  const entity = entities.find((e) => e.id === project.entity_id)
  const norm = normalizeStatus(project.status)
  const color = STATUS_COLORS[norm] ?? 'rgba(255,255,255,0.4)'

  // Derived fields
  const taskCount    = Number(project.task_count ?? 0)
  const doneCount    = Number(project.done_count ?? 0)
  const budgetUsed   = Number(project.budget_used ?? project.total_cost ?? 0)
  const budgetTotal  = Number(project.budget_total ?? 0)
  const budgetPct    = budgetTotal > 0 ? Math.min(100, Math.round((budgetUsed / budgetTotal) * 100)) : null
  const budgetOver   = budgetTotal > 0 && budgetUsed > budgetTotal
  const agentsList   = Array.isArray(project.agents) ? project.agents as string[] : []
  const modelsArr    = Array.isArray(project.models_used) ? project.models_used as string[] : []
  const healthScore  = project.health_score != null ? Number(project.health_score) : null
  const healthColor  = healthScore == null ? 'var(--dim)' : healthScore >= 80 ? 'var(--green)' : healthScore >= 50 ? 'var(--amber)' : 'var(--red)'
  const blockers     = Array.isArray(project.blockers) ? project.blockers as string[] : []
  const milestoneCount = Number(project.milestone_count ?? 0)

  const fmtCost = (v: number) => v >= 1000 ? `$${(v/1000).toFixed(1)}k` : v > 0 ? `$${v.toFixed(0)}` : '$0'

  return (
    <div className="mc-card" style={{
      borderLeft: `3px solid ${color}`,
      borderRadius: 14,
      padding: 16,
      cursor: 'default',
      position: 'relative',
    }}>
      {/* Clickable overlay — excludes buttons */}
      <Link
        href={`/projects/${project.id}`}
        style={{
          position: 'absolute', inset: 0, borderRadius: 14, zIndex: 0,
        }}
        aria-label={`Open ${project.name ?? 'project'} detail`}
      />
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, position: 'relative', zIndex: 1 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--t1)', marginBottom: 4, lineHeight: 1.3 }}>
            {project.name ?? project.title ?? 'Untitled'}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {entity && (
              <div style={{ fontSize: 11, color: 'var(--purple)', fontWeight: 600 }}>
                {entity.entity_name}
              </div>
            )}
            {(project.linked_entity ?? project.entity_id) && !entity && (
              <div style={{ fontSize: 11, color: 'var(--purple)', fontWeight: 600 }}>
                {String(project.linked_entity ?? project.entity_id)}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <StatusBadge status={project.status} />
          {healthScore != null && (
            <span style={{ fontSize: 9, fontFamily: 'var(--mo)', color: healthColor }}>
              health {healthScore}%
            </span>
          )}
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
      {project.description && (
        <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 10, lineHeight: 1.5 }}>
          {String(project.description).slice(0, 100)}{String(project.description).length > 100 ? '…' : ''}
        </div>
      )}

      {/* ── Progress ── */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--t3)' }}>
            Progress
            {taskCount > 0 && <span style={{ color: 'var(--t4)', marginLeft: 6 }}>{doneCount}/{taskCount} tasks</span>}
          </span>
          <span style={{ fontSize: 11, color: 'var(--t2)', fontFamily: 'var(--mo)' }}>{pct}%</span>
        </div>
        <ProgressBar pct={pct} color={color} />
      </div>

      {/* ── Budget bar ── */}
      {budgetTotal > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--t3)' }}>Budget</span>
            <span style={{ fontSize: 11, fontFamily: 'var(--mo)', color: budgetOver ? 'var(--red)' : 'var(--t2)' }}>
              {fmtCost(budgetUsed)} / {fmtCost(budgetTotal)}
            </span>
          </div>
          <ProgressBar pct={budgetPct ?? 0} color={budgetOver ? 'var(--red)' : 'var(--amber)'} />
        </div>
      )}

      {/* ── Metadata grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10, fontSize: 11 }}>
        {project.owner && (
          <div>
            <div style={{ color: 'var(--t4)', marginBottom: 2, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Owner</div>
            <div style={{ color: 'var(--t2)', fontWeight: 500 }}>{String(project.owner)}</div>
          </div>
        )}
        {(project.target_date ?? project.due_date) && (
          <div>
            <div style={{ color: 'var(--t4)', marginBottom: 2, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Due</div>
            <div style={{ color: 'var(--t2)', fontFamily: 'var(--mo)' }}>
              {String(project.target_date ?? project.due_date)}
            </div>
          </div>
        )}
        {(project.assigned_agent ?? project.linked_agent) && (
          <div>
            <div style={{ color: 'var(--t4)', marginBottom: 2, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Agent</div>
            <div style={{ color: 'var(--purple)', fontWeight: 500 }}>{String(project.assigned_agent ?? project.linked_agent)}</div>
          </div>
        )}
        {milestoneCount > 0 && (
          <div>
            <div style={{ color: 'var(--t4)', marginBottom: 2, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Milestones</div>
            <div style={{ color: 'var(--t2)', fontFamily: 'var(--mo)' }}>{milestoneCount}</div>
          </div>
        )}
        {taskCount > 0 && (
          <div>
            <div style={{ color: 'var(--t4)', marginBottom: 2, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tasks</div>
            <div style={{ color: 'var(--t2)', fontFamily: 'var(--mo)' }}>{doneCount}/{taskCount} done</div>
          </div>
        )}
        {budgetUsed > 0 && budgetTotal === 0 && (
          <div>
            <div style={{ color: 'var(--t4)', marginBottom: 2, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cost</div>
            <div style={{ color: 'var(--amber)', fontFamily: 'var(--mo)' }}>{fmtCost(budgetUsed)}</div>
          </div>
        )}
        {project.last_update_ts && (
          <div>
            <div style={{ color: 'var(--t4)', marginBottom: 2, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Updated</div>
            <div style={{ color: 'var(--t3)', fontFamily: 'var(--mo)', fontSize: 10 }}>
              {new Date(String(project.last_update_ts)).toLocaleDateString()}
            </div>
          </div>
        )}
      </div>

      {/* ── Blockers ── */}
      {blockers.length > 0 && (
        <div style={{
          marginBottom: 10, padding: '6px 8px',
          background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 6,
        }}>
          <div style={{ fontSize: 9, fontFamily: 'var(--mo)', color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
            {blockers.length} Blocker{blockers.length > 1 ? 's' : ''}
          </div>
          {blockers.slice(0, 2).map((b: string, i: number) => (
            <div key={i} style={{ fontSize: 11, color: 'var(--red)', lineHeight: 1.4 }}>· {b}</div>
          ))}
        </div>
      )}

      {/* ── Agents + models pills ── */}
      {(agentsList.length > 0 || modelsArr.length > 0) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
          {agentsList.slice(0, 3).map((a: string) => (
            <span key={a} style={{
              fontSize: 9, padding: '2px 6px', borderRadius: 4, fontFamily: 'var(--mo)',
              background: 'rgba(139,92,246,0.1)', color: 'var(--purple)',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>{a}</span>
          ))}
          {modelsArr.slice(0, 2).map((m: string) => (
            <span key={m} style={{
              fontSize: 9, padding: '2px 6px', borderRadius: 4, fontFamily: 'var(--mo)',
              background: 'rgba(249,115,22,0.08)', color: 'var(--orange)',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>{String(m).split('/').pop()}</span>
          ))}
        </div>
      )}

      {/* ── Actions ── */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={() => onAskAgent(project)}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            padding: '7px 0', fontSize: 12, fontWeight: 600,
            background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)',
            borderRadius: 8, color: 'var(--purple)', cursor: 'pointer',
          }}
        >
          <Bot size={12} /> Ask Agent
        </button>
        <button
          onClick={() => onEdit(project)}
          style={{
            padding: '7px 12px', fontSize: 12,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, color: 'var(--t3)', cursor: 'pointer',
          }}
        >
          <Edit2 size={12} />
        </button>
      </div>
      </div>{/* end body zIndex wrapper */}
    </div>
  )
}

// ─── Edit / Create Modal ──────────────────────────────────────────────────────

function ProjectFormModal({
  open,
  project,
  entities,
  onClose,
  onSaved,
}: {
  open: boolean
  project: Project | null
  entities: Entity[]
  onClose: () => void
  onSaved: (p: Project) => void
}) {
  const isNew = !project?.id
  const [name, setName] = useState(project?.name ?? '')
  const [status, setStatus] = useState(project?.status ?? 'planning')
  const [entityId, setEntityId] = useState(project?.entity_id ?? '')
  const [owner, setOwner] = useState(String(project?.owner ?? ''))
  const [desc, setDesc] = useState(String(project?.description ?? ''))
  const [dueDate, setDueDate] = useState(String(project?.target_date ?? project?.due_date ?? ''))
  const [agent, setAgent] = useState(String(project?.assigned_agent ?? ''))
  const [pct, setPct] = useState(String(project?.percent_complete ?? '0'))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required'); return }
    setSaving(true); setError('')
    const payload: Record<string, unknown> = {
      name: name.trim(), status, owner: owner || null,
      description: desc || null, target_date: dueDate || null,
      entity_id: entityId || null, assigned_agent: agent || null,
      percent_complete: Number(pct) || 0,
    }
    try {
      if (isNew) {
        const { data, error: err } = await supabase.from('projects').insert(payload).select().single()
        if (err) throw err
        onSaved(data as Project)
      } else {
        const { data, error: err } = await supabase.from('projects').update(payload).eq('id', project!.id).select().single()
        if (err) throw err
        onSaved(data as Project)
      }
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 900 }} onClick={onClose} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: '100%', maxWidth: 480, background: '#0d0a20', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 20, padding: 28, zIndex: 901, maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--t1)' }}>
            {isNew ? 'New Project' : 'Edit Project'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--t4)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { label: 'Project Name *', value: name, setter: setName, placeholder: 'Enter project name' },
            { label: 'Owner', value: owner, setter: setOwner, placeholder: 'Owner name' },
            { label: 'Due Date', value: dueDate, setter: setDueDate, placeholder: 'YYYY-MM-DD' },
          ].map(({ label, value, setter, placeholder }) => (
            <div key={label}>
              <label style={{ fontSize: 11, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>{label}</label>
              <input value={value} onChange={(e) => setter(e.target.value)} placeholder={placeholder}
                style={{ width: '100%', padding: '10px 12px', fontSize: 13, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'var(--t1)', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          ))}

          <div>
            <label style={{ fontSize: 11, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', fontSize: 13, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'var(--t1)', outline: 'none' }}>
              {KANBAN_COLUMNS.map((c) => <option key={c.key} value={c.key} style={{ background: '#0d0a20' }}>{c.label}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>Entity</label>
            <select value={entityId} onChange={(e) => setEntityId(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', fontSize: 13, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'var(--t1)', outline: 'none' }}>
              <option value="" style={{ background: '#0d0a20' }}>No entity</option>
              {entities.map((e) => <option key={e.id} value={e.id} style={{ background: '#0d0a20' }}>{e.entity_name}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>Assign Agent</label>
            <select value={agent} onChange={(e) => setAgent(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', fontSize: 13, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'var(--t1)', outline: 'none' }}>
              <option value="" style={{ background: '#0d0a20' }}>No agent</option>
              {BUILTIN_AGENTS.map((a) => <option key={a.id} value={a.id} style={{ background: '#0d0a20' }}>{a.name}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>% Complete ({pct}%)</label>
            <input type="range" min={0} max={100} value={pct} onChange={(e) => setPct(e.target.value)}
              style={{ width: '100%', accentColor: 'var(--orange)' }} />
          </div>

          <div>
            <label style={{ fontSize: 11, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>Description</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3}
              style={{ width: '100%', padding: '10px 12px', fontSize: 13, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'var(--t1)', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {error && <div style={{ marginTop: 12, fontSize: 12, color: 'var(--red)' }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: '10px 18px', fontSize: 13, background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'var(--t3)', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: '10px 22px', fontSize: 13, fontWeight: 600, background: 'linear-gradient(135deg,var(--orange),var(--pink))', border: 'none', borderRadius: 10, color: '#fff', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : isNew ? 'Create Project' : 'Save Changes'}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Table columns ────────────────────────────────────────────────────────────

function buildTableColumns(entities: Entity[], onAskAgent: (p: Project) => void): Column<Project>[] {
  return [
    {
      key: 'name', label: 'Project', sortable: true,
      render: (v, row) => (
        <span style={{ fontWeight: 600, color: 'var(--t1)' }}>{String(row.name ?? row.title ?? '—')}</span>
      ),
    },
    {
      key: 'entity_id', label: 'Entity', sortable: true,
      render: (v) => {
        const e = entities.find((x) => x.id === String(v ?? ''))
        return e ? <span style={{ color: 'var(--purple)', fontSize: 12, fontWeight: 600 }}>{e.entity_name}</span> : <span style={{ color: 'var(--t4)' }}>—</span>
      },
    },
    {
      key: 'status', label: 'Status', sortable: true,
      render: (v) => <StatusBadge status={String(v ?? '')} />,
    },
    {
      key: 'percent_complete', label: '% Done', sortable: true,
      render: (v) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 100 }}>
          <ProgressBar pct={Number(v ?? 0)} />
          <span style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--mo)', flexShrink: 0 }}>{Number(v ?? 0)}%</span>
        </div>
      ),
    },
    {
      key: 'owner', label: 'Owner', sortable: true,
      render: (v) => <span style={{ color: 'var(--t2)' }}>{String(v ?? '—')}</span>,
    },
    {
      key: 'target_date', label: 'Due', sortable: true,
      render: (v, row) => (
        <span style={{ fontSize: 12, fontFamily: 'var(--mo)', color: 'var(--t3)' }}>
          {String(v ?? row.due_date ?? '—')}
        </span>
      ),
    },
    {
      key: 'id', label: 'Agent', width: 120,
      render: (_, row) => (
        <button onClick={(e) => { e.stopPropagation(); onAskAgent(row) }}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', fontSize: 11, fontWeight: 600, background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 6, color: 'var(--purple)', cursor: 'pointer' }}>
          <Bot size={11} /> Ask
        </button>
      ),
    },
  ]
}

// ─── Saved Views ──────────────────────────────────────────────────────────────

type SavedView = { key: string; label: string; statusFilter: string; entityFilter: string }
const DEFAULT_VIEWS: SavedView[] = [
  { key: 'all',       label: 'All Projects',  statusFilter: 'all',       entityFilter: 'all' },
  { key: 'active',    label: 'Active',        statusFilter: 'active',    entityFilter: 'all' },
  { key: 'blocked',   label: 'Blocked',       statusFilter: 'blocked',   entityFilter: 'all' },
  { key: 'completed', label: 'Completed',     statusFilter: 'completed', entityFilter: 'all' },
]

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProjectsClient({
  initialProjects,
  entities,
}: {
  initialProjects: Project[]
  entities: Entity[]
}) {
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [view, setView] = useState<'kanban' | 'table' | 'gantt'>('kanban')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [entityFilter, setEntityFilter] = useState('all')
  const [savedView, setSavedView] = useState('all')
  const [agentModal, setAgentModal] = useState<Project | null>(null)
  const [formModal, setFormModal] = useState<{ open: boolean; project: Project | null }>({ open: false, project: null })
  const [refreshing, setRefreshing] = useState(false)

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const norm = normalizeStatus(p.status)
      if (statusFilter !== 'all' && norm !== statusFilter) return false
      if (entityFilter !== 'all' && p.entity_id !== entityFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        const name = String(p.name ?? p.title ?? '').toLowerCase()
        const desc = String(p.description ?? '').toLowerCase()
        if (!name.includes(q) && !desc.includes(q)) return false
      }
      return true
    })
  }, [projects, statusFilter, entityFilter, search])

  const handleRefresh = async () => {
    setRefreshing(true)
    const { data } = await supabase.from('projects').select('*, tasks:tasks(count)').order('priority')
    if (data) setProjects(data as Project[])
    setRefreshing(false)
  }

  const handleMove = useCallback(async (itemId: string, _from: string, toColumn: string) => {
    setProjects((prev) => prev.map((p) => p.id === itemId ? { ...p, status: toColumn } : p))
    await supabase.from('projects').update({ status: toColumn }).eq('id', itemId)
  }, [])

  const handleSavedView = (v: SavedView) => {
    setSavedView(v.key)
    setStatusFilter(v.statusFilter)
    setEntityFilter(v.entityFilter)
  }

  const handleSaved = (p: Project) => {
    setProjects((prev) => {
      const idx = prev.findIndex((x) => x.id === p.id)
      return idx >= 0 ? prev.map((x) => x.id === p.id ? p : x) : [p, ...prev]
    })
  }

  const tableColumns = buildTableColumns(entities, setAgentModal)

  // Stats
  const stats = useMemo(() => ({
    total: projects.length,
    active: projects.filter((p) => normalizeStatus(p.status) === 'active').length,
    blocked: projects.filter((p) => normalizeStatus(p.status) === 'blocked').length,
    completed: projects.filter((p) => normalizeStatus(p.status) === 'completed').length,
    avgPct: projects.length ? Math.round(projects.reduce((s, p) => s + getPct(p), 0) / projects.length) : 0,
  }), [projects])

  return (
    <div style={{ padding: 24, maxWidth: '100%' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.12em', fontFamily: 'var(--mo)', marginBottom: 6 }}>
            ≈ PROJECTS · WORKSPACE
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--t1)', margin: 0, background: 'linear-gradient(135deg,var(--orange),var(--pink))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Projects
          </h1>
          <div style={{ fontSize: 13, color: 'var(--t3)', marginTop: 4 }}>
            {stats.total} projects · {stats.active} active · {stats.avgPct}% avg complete
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setFormModal({ open: true, project: null })}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px', fontSize: 13, fontWeight: 700, background: 'linear-gradient(135deg,var(--orange),var(--pink))', border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer' }}>
            <Plus size={15} /> New Project
          </button>
          <button onClick={handleRefresh} disabled={refreshing}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', fontSize: 13, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'var(--t3)', cursor: 'pointer' }}>
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {/* ── Stats Strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total', value: stats.total, color: 'var(--orange)' },
          { label: 'Active', value: stats.active, color: 'var(--orange)', icon: <Clock size={14} /> },
          { label: 'Blocked', value: stats.blocked, color: 'var(--red)', icon: <AlertTriangle size={14} /> },
          { label: 'Completed', value: stats.completed, color: 'var(--green)', icon: <CheckCircle2 size={14} /> },
          { label: 'Avg Progress', value: `${stats.avgPct}%`, color: 'var(--purple)' },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className="mc-card accent" style={{ padding: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              {icon}{label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── Saved Views + Controls ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {DEFAULT_VIEWS.map((v) => (
          <button key={v.key} onClick={() => handleSavedView(v)}
            style={{
              padding: '6px 14px', fontSize: 12, fontWeight: 600, borderRadius: 20,
              background: savedView === v.key ? 'rgba(249,115,22,0.2)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${savedView === v.key ? 'rgba(249,115,22,0.5)' : 'rgba(255,255,255,0.08)'}`,
              color: savedView === v.key ? 'var(--orange)' : 'var(--t3)',
              cursor: 'pointer',
            }}>
            {v.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />

        {/* Entity filter */}
        <select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)}
          style={{ padding: '7px 12px', fontSize: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'var(--t2)', outline: 'none' }}>
          <option value="all" style={{ background: '#0d0a20' }}>All Entities</option>
          {entities.map((e) => <option key={e.id} value={e.id} style={{ background: '#0d0a20' }}>{e.entity_name}</option>)}
        </select>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--t4)' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search projects…"
            style={{ padding: '7px 12px 7px 30px', fontSize: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'var(--t1)', outline: 'none', width: 180 }}
          />
        </div>

        {/* View switcher */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, overflow: 'hidden' }}>
          {([['kanban', <LayoutGrid size={14} />], ['table', <List size={14} />], ['gantt', <BarChart2 size={14} />]] as [string, React.ReactNode][]).map(([v, icon]) => (
            <button key={v} onClick={() => setView(v as typeof view)}
              style={{
                padding: '7px 11px', border: 'none',
                background: view === v ? 'rgba(249,115,22,0.2)' : 'transparent',
                color: view === v ? 'var(--orange)' : 'var(--t4)',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
              }}>
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* ── View Content ── */}
      {view === 'kanban' && (
        <KanbanBoard
          columns={KANBAN_COLUMNS}
          items={filtered}
          getColumnKey={(p) => normalizeStatus(p.status)}
          onMove={handleMove}
          renderCard={(p) => (
            <ProjectCard
              project={p}
              entities={entities}
              onAskAgent={setAgentModal}
              onEdit={(proj) => setFormModal({ open: true, project: proj })}
            />
          )}
        />
      )}

      {view === 'table' && (
        <div className="mc-card accent">
          <DataTable
            columns={tableColumns}
            data={filtered as unknown as Record<string, unknown>[]}
            filterValue={search}
            filterKeys={['name', 'title', 'description', 'owner']}
            onRowClick={(row) => {
              const p = row as unknown as Project
              window.location.href = `/projects/${p.id}`
            }}
            emptyMessage="No projects match your filters"
          />
        </div>
      )}

      {view === 'gantt' && (
        <GanttView projects={filtered} />
      )}

      {/* ── Modals ── */}
      <AskAgentModal
        open={!!agentModal}
        onClose={() => setAgentModal(null)}
        contextType="project"
        contextId={agentModal?.id}
        contextLabel={agentModal?.name ?? agentModal?.title ?? undefined}
      />

      <ProjectFormModal
        open={formModal.open}
        project={formModal.project}
        entities={entities}
        onClose={() => setFormModal({ open: false, project: null })}
        onSaved={handleSaved}
      />

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

// ─── Gantt View (lightweight) ─────────────────────────────────────────────────

function GanttView({ projects }: { projects: Project[] }) {
  const dated = projects
    .map((p) => {
      const start = new Date(String(p.start_date ?? p.created_at ?? '')).getTime()
      const end = new Date(String(p.target_date ?? p.due_date ?? '')).getTime()
      return { ...p, startMs: isNaN(start) ? null : start, endMs: isNaN(end) ? null : end }
    })
    .filter((p) => p.startMs && p.endMs)

  if (!dated.length) {
    return (
      <div className="mc-card accent" style={{ textAlign: 'center', padding: 40, color: 'var(--t3)', fontSize: 13 }}>
        No projects have both start_date and target_date set. Set those fields to see the Gantt chart.
      </div>
    )
  }

  const minMs = Math.min(...dated.map((p) => p.startMs!))
  const maxMs = Math.max(...dated.map((p) => p.endMs!))
  const span = Math.max(maxMs - minMs, 86400000)

  return (
    <div className="mc-card accent">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {dated.map((p) => {
          const offset = ((p.startMs! - minMs) / span) * 100
          const width = Math.max(((p.endMs! - p.startMs!) / span) * 100, 2)
          const color = STATUS_COLORS[normalizeStatus(p.status)] ?? 'var(--orange)'
          return (
            <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16, alignItems: 'center' }}>
              <div style={{ fontSize: 13, color: 'var(--t1)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.name ?? p.title}
              </div>
              <div style={{ position: 'relative', height: 28, borderRadius: 999, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{
                  position: 'absolute', left: `${offset}%`, width: `${width}%`,
                  top: 4, bottom: 4, minWidth: 6, borderRadius: 999,
                  background: color, opacity: 0.8,
                }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
