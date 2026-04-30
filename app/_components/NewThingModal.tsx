'use client'
/**
 * NewThingModal — context-aware "+ New" modal for the topbar.
 * Switches form by `type`. Also listens for the global 'topbar:new' custom event
 * so pages can trigger it externally via:
 *   window.dispatchEvent(new CustomEvent('topbar:new', { detail: { type: 'task' } }))
 */
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../lib/supabase'

export type NewType =
  | 'project'
  | 'task'
  | 'vision'
  | 'forge'
  | 'entity'
  | 'agent'
  | 'none'

interface Props {
  type: NewType
  onClose: () => void
  onCreated?: (type: NewType) => void
}

// ── Shared field styles ──────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', fontSize: 13,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10, color: 'var(--t1)', outline: 'none', boxSizing: 'border-box',
  fontFamily: "'DM Sans', sans-serif",
}
const labelStyle: React.CSSProperties = {
  fontSize: 11, color: 'var(--t4)', textTransform: 'uppercase',
  letterSpacing: '.06em', display: 'block', marginBottom: 6,
}
const fieldWrap: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 14 }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

// ── Toast ───────────────────────────────────────────────────────────────────

function showToast(msg: string) {
  const el = document.createElement('div')
  el.textContent = msg
  Object.assign(el.style, {
    position: 'fixed', bottom: '28px', right: '28px',
    background: 'rgba(20,18,40,0.95)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px', padding: '12px 18px',
    fontSize: '13px', color: 'var(--t1)',
    zIndex: '9999', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    fontFamily: "'DM Sans', sans-serif",
    transition: 'opacity 0.3s',
  })
  document.body.appendChild(el)
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 350) }, 2800)
}

// ── Sub-forms ────────────────────────────────────────────────────────────────

function ProjectForm({ onClose, onCreated }: Pick<Props, 'onClose' | 'onCreated'>) {
  const [name, setName] = useState('')
  const [status, setStatus] = useState('planning')
  const [owner, setOwner] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [desc, setDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const save = async () => {
    if (!name.trim()) { setErr('Name required'); return }
    setSaving(true); setErr('')
    const { error } = await supabase.from('projects').insert({
      name: name.trim(), status, owner: owner || null,
      description: desc || null, target_date: dueDate || null,
    })
    setSaving(false)
    if (error) { setErr(error.message); return }
    showToast(`Project "${name.trim()}" created`)
    onCreated?.('project')
    onClose()
  }

  return (
    <div style={fieldWrap}>
      <Field label="Project Name *">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Enter project name" style={inputStyle} autoFocus />
      </Field>
      <Field label="Status">
        <select value={status} onChange={e => setStatus(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
          {['planning','active','review','blocked','completed'].map(s => (
            <option key={s} value={s} style={{ background: '#0d0a20' }}>{s}</option>
          ))}
        </select>
      </Field>
      <Field label="Owner">
        <input value={owner} onChange={e => setOwner(e.target.value)} placeholder="Owner name" style={inputStyle} />
      </Field>
      <Field label="Due Date">
        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={inputStyle} />
      </Field>
      <Field label="Description">
        <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional description"
          style={{ ...inputStyle, resize: 'vertical', minHeight: 70 }} />
      </Field>
      {err && <div style={{ fontSize: 12, color: 'var(--red)' }}>{err}</div>}
      <SaveButton saving={saving} onSave={save} onClose={onClose} />
    </div>
  )
}

function TaskForm({ onClose, onCreated }: Pick<Props, 'onClose' | 'onCreated'>) {
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState('normal')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const save = async () => {
    if (!title.trim()) { setErr('Title required'); return }
    setSaving(true); setErr('')
    const { error } = await supabase.from('tasks').insert({
      title: title.trim(), status: 'open', priority,
      due_date: dueDate || null,
    })
    setSaving(false)
    if (error) { setErr(error.message); return }
    showToast(`Task "${title.trim()}" created`)
    onCreated?.('task')
    onClose()
  }

  return (
    <div style={fieldWrap}>
      <Field label="Task Title *">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter task title" style={inputStyle} autoFocus />
      </Field>
      <Field label="Priority">
        <select value={priority} onChange={e => setPriority(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
          {['low','normal','high','urgent'].map(p => (
            <option key={p} value={p} style={{ background: '#0d0a20' }}>{p}</option>
          ))}
        </select>
      </Field>
      <Field label="Due Date">
        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={inputStyle} />
      </Field>
      {err && <div style={{ fontSize: 12, color: 'var(--red)' }}>{err}</div>}
      <SaveButton saving={saving} onSave={save} onClose={onClose} />
    </div>
  )
}

function VisionForm({ onClose, onCreated }: Pick<Props, 'onClose' | 'onCreated'>) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const save = async () => {
    if (!title.trim()) { setErr('Title required'); return }
    setSaving(true); setErr('')
    const { error } = await supabase.from('visions').insert({
      title: title.trim(), category: category || null,
      target_date: targetDate || null, status: 'active',
    })
    setSaving(false)
    if (error) { setErr(error.message); return }
    showToast(`Vision "${title.trim()}" added`)
    onCreated?.('vision')
    onClose()
  }

  return (
    <div style={fieldWrap}>
      <Field label="Vision Title *">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. $10M net worth" style={inputStyle} autoFocus />
      </Field>
      <Field label="Category">
        <input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. financial, lifestyle, business" style={inputStyle} />
      </Field>
      <Field label="Target Date">
        <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} style={inputStyle} />
      </Field>
      {err && <div style={{ fontSize: 12, color: 'var(--red)' }}>{err}</div>}
      <SaveButton saving={saving} onSave={save} onClose={onClose} />
    </div>
  )
}

function ForgeForm({ onClose, onCreated }: Pick<Props, 'onClose' | 'onCreated'>) {
  const [name, setName] = useState('')
  const [tagline, setTagline] = useState('')
  const [problem, setProblem] = useState('')
  const [audience, setAudience] = useState('')
  const [confidence, setConfidence] = useState('50')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const save = async () => {
    if (!name.trim()) { setErr('Name required'); return }
    setSaving(true); setErr('')
    const { error } = await supabase.from('forge_ideas').insert({
      name: name.trim(), tagline: tagline || null, problem: problem || null,
      target_audience: audience || null,
      confidence_score: Number(confidence) || 50,
      status: 'new',
    })
    setSaving(false)
    if (error) { setErr(error.message); return }
    showToast(`Idea "${name.trim()}" added to The Forge`)
    onCreated?.('forge')
    onClose()
  }

  return (
    <div style={fieldWrap}>
      <Field label="Idea Name *">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Enter idea name" style={inputStyle} autoFocus />
      </Field>
      <Field label="Tagline">
        <input value={tagline} onChange={e => setTagline(e.target.value)} placeholder="One-line pitch" style={inputStyle} />
      </Field>
      <Field label="Problem">
        <textarea value={problem} onChange={e => setProblem(e.target.value)} placeholder="What problem does this solve?"
          style={{ ...inputStyle, resize: 'vertical', minHeight: 64 }} />
      </Field>
      <Field label="Target Audience">
        <input value={audience} onChange={e => setAudience(e.target.value)} placeholder="Who is this for?" style={inputStyle} />
      </Field>
      <Field label="Confidence Score (0–100)">
        <input type="number" min="0" max="100" value={confidence} onChange={e => setConfidence(e.target.value)} style={inputStyle} />
      </Field>
      {err && <div style={{ fontSize: 12, color: 'var(--red)' }}>{err}</div>}
      <SaveButton saving={saving} onSave={save} onClose={onClose} />
    </div>
  )
}

function EntityForm({ onClose, onCreated }: Pick<Props, 'onClose' | 'onCreated'>) {
  const [name, setName] = useState('')
  const [entityType, setEntityType] = useState('LLC')
  const [state, setState] = useState('')
  const [purpose, setPurpose] = useState('operating')
  const [taxClass, setTaxClass] = useState('disregarded')
  const [ein, setEin] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const save = async () => {
    if (!name.trim()) { setErr('Name required'); return }
    setSaving(true); setErr('')
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const { error } = await supabase.from('entity_ownership').insert({
      entity_name: name.trim(), entity_type: entityType,
      state: state || null, purpose: purpose || null,
      tax_classification: taxClass || null, ein: ein || null,
      slug, status: 'active', ownership_pct: 100,
    })
    setSaving(false)
    if (error) { setErr(error.message); return }
    showToast(`Entity "${name.trim()}" created`)
    onCreated?.('entity')
    onClose()
  }

  return (
    <div style={fieldWrap}>
      <Field label="Entity Name *">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. My Holdings LLC" style={inputStyle} autoFocus />
      </Field>
      <Field label="Entity Type">
        <select value={entityType} onChange={e => setEntityType(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
          {['LLC','C-Corp','S-Corp','Trust','Partnership','Sole Prop'].map(t => (
            <option key={t} value={t} style={{ background: '#0d0a20' }}>{t}</option>
          ))}
        </select>
      </Field>
      <Field label="Formation State">
        <input value={state} onChange={e => setState(e.target.value)} placeholder="e.g. DE, TX, WY" style={inputStyle} />
      </Field>
      <Field label="Purpose">
        <select value={purpose} onChange={e => setPurpose(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
          {['operating','holding','legal-separation','trust','management'].map(p => (
            <option key={p} value={p} style={{ background: '#0d0a20' }}>{p}</option>
          ))}
        </select>
      </Field>
      <Field label="Tax Classification">
        <select value={taxClass} onChange={e => setTaxClass(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
          {['disregarded','partnership','S-Corp','C-Corp','Trust','Individual'].map(c => (
            <option key={c} value={c} style={{ background: '#0d0a20' }}>{c}</option>
          ))}
        </select>
      </Field>
      <Field label="EIN (optional)">
        <input value={ein} onChange={e => setEin(e.target.value)} placeholder="XX-XXXXXXX" style={inputStyle} />
      </Field>
      {err && <div style={{ fontSize: 12, color: 'var(--red)' }}>{err}</div>}
      <SaveButton saving={saving} onSave={save} onClose={onClose} />
    </div>
  )
}

function AgentDeployForm({ onClose }: Pick<Props, 'onClose'>) {
  const [agentName, setAgentName] = useState('')
  const [task, setTask] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const save = async () => {
    if (!agentName.trim()) { setErr('Agent name required'); return }
    setSaving(true); setErr('')
    const { error } = await supabase.from('agent_runs').insert({
      task: task || agentName.trim(), status: 'queued',
      started_at: new Date().toISOString(),
    })
    setSaving(false)
    if (error) { setErr(error.message); return }
    showToast(`Agent run queued: ${agentName.trim()}`)
    onClose()
  }

  return (
    <div style={fieldWrap}>
      <Field label="Agent Name *">
        <input value={agentName} onChange={e => setAgentName(e.target.value)} placeholder="e.g. Research Agent" style={inputStyle} autoFocus />
      </Field>
      <Field label="Task / Prompt">
        <textarea value={task} onChange={e => setTask(e.target.value)} placeholder="What should the agent do?"
          style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }} />
      </Field>
      {err && <div style={{ fontSize: 12, color: 'var(--red)' }}>{err}</div>}
      <SaveButton saving={saving} onSave={save} onClose={onClose} label="Queue Run" />
    </div>
  )
}

function SaveButton({
  saving, onSave, onClose, label = 'Save',
}: { saving: boolean; onSave: () => void; onClose: () => void; label?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
      <button
        onClick={onClose}
        style={{
          padding: '9px 18px', fontSize: 13, background: 'none',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
          color: 'var(--t3)', cursor: 'pointer',
        }}
      >
        Cancel
      </button>
      <button
        onClick={onSave}
        disabled={saving}
        style={{
          padding: '9px 18px', fontSize: 13, fontWeight: 600,
          background: 'linear-gradient(135deg,var(--accent),var(--pink))',
          border: 'none', borderRadius: 10, color: '#fff',
          cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? 'Saving…' : label}
      </button>
    </div>
  )
}

// ── Titles ───────────────────────────────────────────────────────────────────

const TITLES: Record<NewType, string> = {
  project: 'New Project',
  task:    'New Task',
  vision:  'Add Vision',
  forge:   'Add Idea — The Forge',
  entity:  'New Entity',
  agent:   'Deploy Agent Run',
  none:    'Create',
}

// ── Main export ──────────────────────────────────────────────────────────────

export default function NewThingModal({ type, onClose, onCreated }: Props) {
  if (type === 'none') return null

  const renderForm = () => {
    switch (type) {
      case 'project': return <ProjectForm onClose={onClose} onCreated={onCreated} />
      case 'task':    return <TaskForm    onClose={onClose} onCreated={onCreated} />
      case 'vision':  return <VisionForm  onClose={onClose} onCreated={onCreated} />
      case 'forge':   return <ForgeForm   onClose={onClose} onCreated={onCreated} />
      case 'entity':  return <EntityForm  onClose={onClose} onCreated={onCreated} />
      case 'agent':   return <AgentDeployForm onClose={onClose} />
    }
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 900 }}
      />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: '100%', maxWidth: 480,
        background: '#0d0a20',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 20, padding: 28, zIndex: 901,
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 22 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--t1)' }}>
            {TITLES[type]}
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--t4)', cursor: 'pointer', padding: 2 }}
          >
            <X size={18} />
          </button>
        </div>
        {renderForm()}
      </div>
    </>
  )
}
