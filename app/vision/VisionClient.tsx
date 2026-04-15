'use client'
/**
 * VisionClient — all interactive Vision Board UI.
 * Replaces the broken dangerouslySetInnerHTML pattern:
 *   - Filter tabs (All / Active / Planning / Future)
 *   - Vision cards grid with click-to-edit drawer
 *   - Add Vision modal with URL auto-parse + photo upload
 *   - Add Milestone modal
 * Uses createPortal so modals render above the page.
 */
import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  ChangeEvent,
  DragEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Vision {
  id: string
  name: string
  title?: string | null
  category: string
  status: string
  target_low?: number | null
  target_high?: number | null
  target_amount?: number | null
  target_label?: string | null
  deadline?: string | null
  target_date?: string | null
  priority?: number | null
  note?: string | null
  description?: string | null
  img?: string | null
  image_url?: string | null
  source_url?: string | null
  linked_accounts?: string[] | null
  current_saved?: number | null
  progress_pct?: number | null
}

export interface Milestone {
  id: string
  name: string
  target: number
  current_val?: number | null
  target_date?: string | null
  category: string
  note?: string | null
  status: string
  icon?: string | null
  color?: string | null
  progress_pct?: number | null
}

export interface FinancialAccount {
  id: string
  name: string
  type?: string | null
  mask?: string | null
}

interface Props {
  initialVisions: Vision[]
  initialMilestones: Milestone[]
  accounts: FinancialAccount[]
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = ['Real Estate', 'Vehicle', 'Experience', 'Education', 'Investment', 'Other']
const STATUSES = ['active', 'planning', 'future']
const MS_CATEGORIES = ['financial', 'lifestyle', 'career']

const USD = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

function statusColor(s: string) {
  if (s === 'active') return 'var(--green)'
  if (s === 'planning') return 'var(--amber)'
  if (s === 'future') return 'var(--purple)'
  return 'var(--dim)'
}

function statusBg(s: string) {
  if (s === 'active') return 'rgba(16,185,129,0.12)'
  if (s === 'planning') return 'rgba(245,158,11,0.12)'
  if (s === 'future') return 'rgba(139,92,246,0.12)'
  return 'rgba(255,255,255,0.06)'
}

// ── Progress Ring ─────────────────────────────────────────────────────────────

function ProgressRing({ pct }: { pct: number }) {
  const r = 27
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.min(100, Math.max(0, pct)) / 100) * circ
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" style={{ flexShrink: 0 }}>
      <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
      <defs>
        <linearGradient id="progGradClient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <circle
        cx="32" cy="32" r={r}
        fill="none"
        stroke="url(#progGradClient)"
        strokeWidth="5"
        strokeDasharray={`${circ.toFixed(2)}`}
        strokeDashoffset={`${offset.toFixed(2)}`}
        strokeLinecap="round"
        transform="rotate(-90 32 32)"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text x="32" y="36" textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.7)" fontFamily="'IBM Plex Mono',monospace">
        {Math.round(pct)}%
      </text>
    </svg>
  )
}

// ── Vision Card ───────────────────────────────────────────────────────────────

function VisionCard({ vision, onClick }: { vision: Vision; onClick: () => void }) {
  const imgUrl = vision.img ?? vision.image_url ?? 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80'
  const title = vision.title ?? vision.name ?? 'Untitled Vision'
  const pct = Number(vision.progress_pct ?? 0)
  let targetRange = vision.target_label ?? '—'
  if (vision.target_low != null && vision.target_high != null) {
    targetRange = `${USD(Number(vision.target_low))} — ${USD(Number(vision.target_high))}`
  } else if (vision.target_amount != null) {
    targetRange = USD(Number(vision.target_amount))
  }
  const deadline = vision.deadline ?? vision.target_date
  const linkedAccts = Array.isArray(vision.linked_accounts) ? vision.linked_accounts as string[] : []

  return (
    <div
      className="vision-card"
      data-status={vision.status}
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      <div className="card-image-wrap">
        <img src={imgUrl} alt={title} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        <div className="card-image-overlay" />
        <span
          className="status-badge"
          style={{
            background: statusBg(vision.status),
            color: statusColor(vision.status),
            border: `1px solid ${statusColor(vision.status)}`,
          }}
        >
          {vision.status.toUpperCase()}
        </span>
        {vision.category && (
          <span className="vision-cat-chip">{vision.category}</span>
        )}
      </div>
      <div className="card-content">
        <h3 className="card-title">{title}</h3>
        <p className="card-target">{targetRange}</p>
        {vision.current_saved != null && (
          <p className="card-saved">Saved: <strong>{USD(Number(vision.current_saved))}</strong></p>
        )}
        {(vision.note ?? vision.description) && (
          <p className="card-note" style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
            {(vision.note ?? vision.description ?? '').slice(0, 80)}{((vision.note ?? vision.description ?? '').length > 80 ? '…' : '')}
          </p>
        )}
        <div className="card-stats-row" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ProgressRing pct={pct} />
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: '1.6' }}>
            {deadline && <div>Target: {deadline}</div>}
            {vision.priority != null && <div>Priority: {vision.priority}/10</div>}
          </div>
        </div>
        {linkedAccts.length > 0 && (
          <div className="vision-linked-accts" style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {linkedAccts.slice(0, 3).map((a) => (
              <span key={a} className="vision-acct-pill" style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                {a}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Add Card ──────────────────────────────────────────────────────────────────

function AddCard({ onClick }: { onClick: () => void }) {
  return (
    <div className="add-card" onClick={onClick} style={{ cursor: 'pointer' }}>
      <div className="add-card-inner">
        <div className="add-icon">+</div>
        <h3 className="add-title">Add New Vision</h3>
        <p className="add-desc" style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: 4 }}>
          Paste a link to any item, property, or asset<br />and we&apos;ll pull in the image &amp; details automatically
        </p>
      </div>
    </div>
  )
}

// ── Shared Modal Shell ────────────────────────────────────────────────────────

function ModalShell({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
  wide?: boolean
}) {
  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div
      className="modal-overlay open"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#0d0d14',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20,
          width: '100%',
          maxWidth: wide ? 760 : 580,
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 32px 80px rgba(0,0,0,0.8)',
        }}
      >
        <div
          className="modal-header"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 24px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#fff' }}>{title}</h2>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8,
              color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 16, padding: '6px 10px',
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ overflowY: 'auto', padding: '20px 24px 24px', flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// ── Form Helpers ──────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
  color: '#fff', fontSize: 14, padding: '10px 14px', outline: 'none',
  fontFamily: 'inherit', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600,
  letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)',
  marginBottom: 6, textTransform: 'uppercase',
}
const fieldStyle: React.CSSProperties = { marginBottom: 16 }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={fieldStyle}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

function Btn({
  children, onClick, variant = 'primary', disabled = false, style = {},
}: {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'danger' | 'ghost'
  disabled?: boolean
  style?: React.CSSProperties
}) {
  const base: React.CSSProperties = {
    border: 'none', borderRadius: 10, cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 14, fontWeight: 600, padding: '11px 20px', transition: 'opacity 0.15s',
    opacity: disabled ? 0.5 : 1, fontFamily: 'inherit',
  }
  const vars: Record<string, React.CSSProperties> = {
    primary: { background: 'linear-gradient(135deg,#f97316,#8b5cf6)', color: '#fff' },
    danger: { background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' },
    ghost: { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' },
  }
  return (
    <button style={{ ...base, ...vars[variant], ...style }} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

// ── Photo Upload ──────────────────────────────────────────────────────────────

function PhotoUpload({
  value,
  onChange,
}: {
  value: string
  onChange: (url: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [drag, setDrag] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function uploadFile(file: File) {
    if (!file.type.startsWith('image/')) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('vision-photos').upload(path, file, { upsert: true })
      if (error) throw error
      const { data } = supabase.storage.from('vision-photos').getPublicUrl(path)
      onChange(data.publicUrl)
    } catch (e) {
      console.error('Upload failed', e)
    } finally {
      setUploading(false)
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDrag(false)
    const file = e.dataTransfer.files[0]
    if (file) uploadFile(file)
  }

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
  }

  return (
    <Field label="Photo">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${drag ? 'rgba(249,115,22,0.5)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 12, padding: '16px 12px', cursor: 'pointer',
          textAlign: 'center', transition: 'border-color 0.2s',
          background: drag ? 'rgba(249,115,22,0.04)' : 'transparent',
        }}
      >
        {uploading ? (
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Uploading…</p>
        ) : value && value.trim() && value !== 'null' ? (
          <div>
            <img
              src={value}
              alt="Vision preview"
              style={{ maxHeight: 100, borderRadius: 8, maxWidth: '100%', objectFit: 'cover' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; onChange('') }}
            />
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>Click to replace</p>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 32, opacity: 0.3, marginBottom: 6 }}>📸</div>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: 500 }}>
              Drag &amp; drop an image here
            </p>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 4 }}>
              or click to upload · paste from clipboard
            </p>
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
    </Field>
  )
}

// ── Vision Form (shared by Add + Edit) ───────────────────────────────────────

interface VisionFormData {
  name: string
  category: string
  target_low: string
  target_high: string
  target_label: string
  deadline: string
  status: string
  note: string
  priority: string
  img: string
  source_url: string
  linked_accounts: string[]
}

const emptyVisionForm = (): VisionFormData => ({
  name: '', category: 'Real Estate', target_low: '', target_high: '',
  target_label: '', deadline: '', status: 'planning', note: '',
  priority: '5', img: '', source_url: '', linked_accounts: [],
})

function visionToForm(v: Vision): VisionFormData {
  return {
    name: v.name ?? '',
    category: v.category ?? 'Other',
    target_low: v.target_low != null ? String(v.target_low) : '',
    target_high: v.target_high != null ? String(v.target_high) : '',
    target_label: v.target_label ?? '',
    deadline: v.deadline ?? v.target_date ?? '',
    status: v.status ?? 'planning',
    note: v.note ?? v.description ?? '',
    priority: String(v.priority ?? 5),
    img: v.img ?? v.image_url ?? '',
    source_url: v.source_url ?? '',
    linked_accounts: Array.isArray(v.linked_accounts) ? v.linked_accounts as string[] : [],
  }
}

function VisionForm({
  form,
  setForm,
  accounts,
  editMode = false,
  onDelete,
  onSave,
  saving,
}: {
  form: VisionFormData
  setForm: (f: VisionFormData) => void
  accounts: FinancialAccount[]
  editMode?: boolean
  onDelete?: () => void
  onSave: () => void
  saving: boolean
}) {
  function set(key: keyof VisionFormData, val: string) {
    setForm({ ...form, [key]: val })
  }

  function toggleAccount(name: string) {
    const linked = form.linked_accounts.includes(name)
      ? form.linked_accounts.filter((a) => a !== name)
      : [...form.linked_accounts, name]
    setForm({ ...form, linked_accounts: linked })
  }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Vision Name *">
          <input
            style={inputStyle}
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g., Dream Beach House"
          />
        </Field>
        <Field label="Category">
          <select style={inputStyle} value={form.category} onChange={(e) => set('category', e.target.value)}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Target Low ($)">
          <input style={inputStyle} type="number" value={form.target_low} onChange={(e) => set('target_low', e.target.value)} placeholder="e.g. 2500000" />
        </Field>
        <Field label="Target High ($)">
          <input style={inputStyle} type="number" value={form.target_high} onChange={(e) => set('target_high', e.target.value)} placeholder="e.g. 3500000" />
        </Field>
        <Field label="Target Label">
          <input style={inputStyle} value={form.target_label} onChange={(e) => set('target_label', e.target.value)} placeholder="e.g. 2.5M–3.5M range" />
        </Field>
        <Field label="Deadline">
          <input style={inputStyle} type="date" value={form.deadline} onChange={(e) => set('deadline', e.target.value)} />
        </Field>
        <Field label="Status">
          <select style={inputStyle} value={form.status} onChange={(e) => set('status', e.target.value)}>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Priority (1–10)">
          <input style={inputStyle} type="number" min={1} max={10} value={form.priority} onChange={(e) => set('priority', e.target.value)} />
        </Field>
      </div>

      <Field label="Notes">
        <textarea
          style={{ ...inputStyle, height: 72, resize: 'vertical' }}
          value={form.note}
          onChange={(e) => set('note', e.target.value)}
          placeholder="Any details about this vision…"
        />
      </Field>

      <PhotoUpload value={form.img} onChange={(url) => setForm({ ...form, img: url })} />

      {accounts.length > 0 && (
        <Field label="Linked Accounts">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {accounts.map((a) => {
              const linked = form.linked_accounts.includes(a.name)
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => toggleAccount(a.name)}
                  style={{
                    background: linked ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${linked ? 'rgba(249,115,22,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 6, color: linked ? '#f97316' : 'rgba(255,255,255,0.5)',
                    fontSize: 12, padding: '4px 10px', cursor: 'pointer',
                  }}
                >
                  {a.name}
                </button>
              )
            })}
          </div>
        </Field>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
        {editMode && onDelete && (
          <Btn variant="danger" onClick={onDelete}>Delete</Btn>
        )}
        <Btn onClick={onSave} disabled={saving || !form.name.trim()}>
          {saving ? 'Saving…' : editMode ? 'Save Changes' : 'Add to Vision Board  ✦  +100 XP'}
        </Btn>
      </div>
    </>
  )
}

// ── AI Intake Types ───────────────────────────────────────────────────────────

interface AiIntakeResponse {
  name: string
  category: string
  target_low: number
  target_high: number
  target_label: string
  description: string
  deadline_suggestion?: string
  priority_suggestion?: number
  image_url?: string
  source_url?: string
  used_ai: boolean
  notes?: string
}

// ── AI Intake Step (Step A) ──────────────────────────────────────────────────

function AiIntakeStep({
  onGenerated,
  onSkip,
}: {
  onGenerated: (result: AiIntakeResponse) => void
  onSkip: () => void
}) {
  const [description, setDescription] = useState('')
  const [url, setUrl] = useState('')
  const [image, setImage] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function uploadFile(file: File) {
    if (!file.type.startsWith('image/')) return
    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('vision-photos').upload(path, file, { upsert: true })
      if (error) throw error
      const { data } = supabase.storage.from('vision-photos').getPublicUrl(path)
      setImage(data.publicUrl)
    } catch (e) {
      console.error('Upload failed', e)
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) uploadFile(file)
  }

  // Clipboard paste → upload image
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) uploadFile(file)
        }
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [])

  async function handleGenerate() {
    if (!description.trim() && !url.trim() && !image) {
      setErr('Give me something to work with — a description, a link, or an image.')
      return
    }
    setLoading(true)
    setErr('')
    try {
      const res = await fetch('/api/vision/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: description.trim(), url: url.trim(), image: image || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErr(data.error ?? 'Generation failed — try editing manually instead.')
        setLoading(false)
        return
      }
      onGenerated(data as AiIntakeResponse)
    } catch (e) {
      setErr('Network error — please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 0, marginBottom: 16, lineHeight: '1.6' }}>
          Describe your vision in your own words. Paste a link to anything — Zillow, YachtWorld, a vacation rental, a car, an image on Instagram.
          Drop in a photo, magazine clipping, or screenshot. The AI fills in the rest.
        </p>
      </div>

      <Field label="Describe your vision *">
        <textarea
          style={{ ...inputStyle, height: 120, resize: 'vertical', lineHeight: '1.6' }}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={`e.g. Yacht for cruising the Mediterranean with the family, something around 60 feet, in the $2-5M range. Want to have this in about 4 years.`}
        />
      </Field>

      <Field label="Paste a link (optional)">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://yachtworld.com/... or https://vrbo.com/... or any URL"
          style={inputStyle}
        />
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
          Works with any URL — property listings, cars, yachts, vacation rentals, products, social posts.
        </p>
      </Field>

      <Field label="Or add an image (drag, click, or paste)">
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          style={{
            border: '2px dashed rgba(255,255,255,0.12)',
            borderRadius: 12, padding: '16px 12px', cursor: 'pointer',
            textAlign: 'center', background: 'transparent',
          }}
        >
          {image ? (
            <div>
              <img src={image} alt="Preview" style={{ maxHeight: 120, borderRadius: 8, maxWidth: '100%', objectFit: 'cover' }} />
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>Click to replace</p>
            </div>
          ) : (
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, margin: 0 }}>
              Drag an image here from your computer, browser, or screenshot.
              <br />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>⌘V works too — paste a clipboard image anywhere.</span>
            </p>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) uploadFile(f)
          }}
        />
      </Field>

      {err && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{err}</p>}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
        <button
          onClick={onSkip}
          style={{
            background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)',
            cursor: 'pointer', fontSize: 13, padding: '10px 0', fontFamily: 'inherit',
          }}
        >
          Or add manually →
        </button>
        <Btn onClick={handleGenerate} disabled={loading || (!description.trim() && !url.trim() && !image)}>
          {loading ? 'Thinking…' : 'Generate vision card with AI ✦'}
        </Btn>
      </div>
    </>
  )
}

// ── Add Vision Modal ──────────────────────────────────────────────────────────

function AddVisionModal({
  accounts,
  onClose,
  onSaved,
}: {
  accounts: FinancialAccount[]
  onClose: () => void
  onSaved: () => void
}) {
  const [step, setStep] = useState<'intake' | 'review'>('intake')
  const [form, setForm] = useState<VisionFormData>(emptyVisionForm())
  const [saving, setSaving] = useState(false)
  const [aiNote, setAiNote] = useState('')

  function handleAiGenerated(result: AiIntakeResponse) {
    const deadline = result.deadline_suggestion
      ? result.deadline_suggestion.slice(0, 10)
      : ''
    setForm((f) => ({
      ...f,
      name: result.name,
      category: result.category ?? f.category,
      target_low: result.target_low ? String(Math.round(result.target_low)) : '',
      target_high: result.target_high ? String(Math.round(result.target_high)) : '',
      target_label: result.target_label ?? '',
      note: result.description ?? '',
      img: result.image_url ?? f.img,
      source_url: result.source_url ?? '',
      deadline,
      priority: result.priority_suggestion ? String(result.priority_suggestion) : f.priority,
    }))
    if (result.notes) setAiNote(result.notes)
    setStep('review')
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        title: form.name.trim(),
        category: form.category,
        status: form.status,
        note: form.note || null,
        deadline: form.deadline || null,
        target_date: form.deadline || null,
        priority: form.priority ? Number(form.priority) : 5,
        img: form.img || null,
        source_url: form.source_url || null,
        linked_accounts: form.linked_accounts,
      }
      if (form.target_low) payload.target_low = Number(form.target_low)
      if (form.target_high) payload.target_high = Number(form.target_high)
      if (form.target_label) payload.target_label = form.target_label

      const { error } = await supabase.from('visions').insert(payload)
      if (error) throw error
      onSaved()
      onClose()
    } catch (e) {
      console.error('Save vision error', e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell title={step === 'intake' ? 'Tell me about your vision' : 'Review & save'} onClose={onClose} wide>
      {step === 'intake' ? (
        <AiIntakeStep onGenerated={handleAiGenerated} onSkip={() => setStep('review')} />
      ) : (
        <>
          {aiNote && (
            <div style={{
              background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)',
              borderRadius: 10, padding: '10px 14px', marginBottom: 16,
              fontSize: 12, color: 'rgba(249,115,22,0.9)', lineHeight: '1.5',
            }}>
              ✦ {aiNote}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Review & edit any field</label>
            <button
              onClick={() => { setStep('intake'); setAiNote('') }}
              style={{
                background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)',
                cursor: 'pointer', fontSize: 12, padding: '4px 8px', fontFamily: 'inherit',
              }}
            >
              ← Back to AI intake
            </button>
          </div>
          <VisionForm form={form} setForm={setForm} accounts={accounts} onSave={handleSave} saving={saving} />
        </>
      )}
    </ModalShell>
  )
}

// ── Financial Plan Tab ────────────────────────────────────────────────────────

interface PlanRecommendation {
  title: string
  detail: string
  impact: string
  category: 'savings' | 'expenses' | 'revenue' | 'tax' | 'other'
}

interface PlanData {
  headline: string
  time_to_target_months: number | null
  pct_of_net_worth: number | null
  pct_of_liquid: number | null
  target_midpoint: number
  monthly_savings: number
  recommendations: PlanRecommendation[]
  used_ai: boolean
  notes?: string
}

const REC_COLORS: Record<PlanRecommendation['category'], string> = {
  savings: 'var(--green)',
  expenses: 'var(--amber)',
  revenue: 'var(--orange, #f97316)',
  tax: 'var(--purple)',
  other: 'var(--pink)',
}

function PlanTab({ vision }: { vision: Vision }) {
  const [plan, setPlan] = useState<PlanData | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [spawning, setSpawning] = useState<number | null>(null)
  const [spawnedIdx, setSpawnedIdx] = useState<Set<number>>(new Set())

  useEffect(() => {
    let aborted = false
    async function load() {
      setLoading(true)
      setErr('')
      try {
        const res = await fetch('/api/vision/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visionId: vision.id }),
        })
        const data = await res.json()
        if (aborted) return
        if (!res.ok) {
          setErr(data.error ?? 'Could not load plan.')
        } else {
          setPlan(data as PlanData)
        }
      } catch {
        if (!aborted) setErr('Network error — please retry.')
      } finally {
        if (!aborted) setLoading(false)
      }
    }
    load()
    return () => { aborted = true }
  }, [vision.id])

  async function handleCreateAction(rec: PlanRecommendation, idx: number) {
    setSpawning(idx)
    try {
      const { error } = await supabase.from('tasks').insert({
        name: `${rec.title} (vision: ${vision.name})`,
        description: `${rec.detail}\n\nImpact: ${rec.impact}\nFrom Vision Board plan for "${vision.name}".`,
        status: 'pending',
        priority: 'medium',
      })
      if (error) throw error
      setSpawnedIdx((prev) => new Set(prev).add(idx))
    } catch (e) {
      console.error('Create task error', e)
    } finally {
      setSpawning(null)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
        ✦ Building your financial plan…
      </div>
    )
  }
  if (err) {
    return <p style={{ color: '#ef4444', fontSize: 13 }}>{err}</p>
  }
  if (!plan) return null

  const midpointPct =
    plan.target_midpoint > 0 && plan.monthly_savings > 0 && plan.time_to_target_months
      ? Math.min(100, ((plan.monthly_savings * 3) / plan.target_midpoint) * 100)
      : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Headline */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(249,115,22,0.10), rgba(139,92,246,0.10))',
          border: '1px solid rgba(249,115,22,0.25)', borderRadius: 14, padding: '16px 18px',
        }}
      >
        <p style={{ margin: 0, fontSize: 14, color: '#fff', lineHeight: '1.55', fontWeight: 500 }}>
          {plan.headline}
        </p>
        {plan.notes && (
          <p style={{ margin: '10px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: '1.5' }}>
            {plan.notes}
          </p>
        )}
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        <KpiTile
          label="Time to target"
          value={
            plan.time_to_target_months != null
              ? `${plan.time_to_target_months} mo`
              : '—'
          }
          color="var(--amber)"
        />
        <KpiTile
          label="Monthly savings"
          value={plan.monthly_savings > 0 ? USD(plan.monthly_savings) : '—'}
          color="var(--green)"
        />
        <KpiTile
          label="% of net worth"
          value={plan.pct_of_net_worth != null ? `${plan.pct_of_net_worth.toFixed(1)}%` : '—'}
          color="var(--purple)"
        />
        <KpiTile
          label="% of liquid"
          value={plan.pct_of_liquid != null ? `${plan.pct_of_liquid.toFixed(1)}%` : '—'}
          color="var(--pink)"
        />
      </div>

      {/* Progress bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 600 }}>
            Quarterly pace vs target
          </span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: "'IBM Plex Mono', monospace" }}>
            {midpointPct.toFixed(1)}%
          </span>
        </div>
        <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
          <div
            style={{
              width: `${midpointPct}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #f97316, #8b5cf6)',
              transition: 'width 0.6s ease',
            }}
          />
        </div>
      </div>

      {/* Recommendations */}
      <div>
        <h3 style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>
          {plan.used_ai ? 'AI-generated recommendations' : 'Baseline recommendations'}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {plan.recommendations.map((rec, idx) => {
            const spawned = spawnedIdx.has(idx)
            return (
              <div
                key={idx}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${REC_COLORS[rec.category]}33`,
                  borderRadius: 10, padding: '12px 14px',
                  borderLeft: `3px solid ${REC_COLORS[rec.category]}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 4 }}>
                  <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#fff', lineHeight: '1.4' }}>{rec.title}</h4>
                  <span
                    style={{
                      fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600,
                      color: REC_COLORS[rec.category], whiteSpace: 'nowrap',
                    }}
                  >
                    {rec.impact}
                  </span>
                </div>
                <p style={{ margin: '0 0 8px', fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: '1.5' }}>
                  {rec.detail}
                </p>
                <button
                  onClick={() => !spawned && handleCreateAction(rec, idx)}
                  disabled={spawned || spawning === idx}
                  style={{
                    background: spawned ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${spawned ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 600,
                    color: spawned ? 'var(--green)' : 'rgba(255,255,255,0.55)',
                    cursor: spawned ? 'default' : 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {spawning === idx ? 'Creating…' : spawned ? '✓ Task created' : '+ Create action'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function KpiTile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 10, padding: '10px 12px',
      }}
    >
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontFamily: "'IBM Plex Mono', monospace", color, fontWeight: 600 }}>
        {value}
      </div>
    </div>
  )
}

// ── Edit Drawer ───────────────────────────────────────────────────────────────

function EditDrawer({
  vision,
  accounts,
  onClose,
  onSaved,
}: {
  vision: Vision
  accounts: FinancialAccount[]
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<VisionFormData>(visionToForm(vision))
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'details' | 'plan'>('details')

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        title: form.name.trim(),
        category: form.category,
        status: form.status,
        note: form.note || null,
        deadline: form.deadline || null,
        target_date: form.deadline || null,
        priority: form.priority ? Number(form.priority) : 5,
        img: form.img || null,
        source_url: form.source_url || null,
        linked_accounts: form.linked_accounts,
      }
      if (form.target_low) payload.target_low = Number(form.target_low)
      if (form.target_high) payload.target_high = Number(form.target_high)
      if (form.target_label) payload.target_label = form.target_label
      payload.updated_at = new Date().toISOString()

      const { error } = await supabase.from('visions').update(payload).eq('id', vision.id)
      if (error) throw error
      onSaved()
      onClose()
    } catch (e) {
      console.error('Update vision error', e)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${vision.name}"? This cannot be undone.`)) return
    setSaving(true)
    try {
      const { error } = await supabase.from('visions').delete().eq('id', vision.id)
      if (error) throw error
      onSaved()
      onClose()
    } catch (e) {
      console.error('Delete vision error', e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        }}
      />
      {/* Drawer panel */}
      <div
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 9999,
          width: '42%', minWidth: 340, maxWidth: 600,
          background: '#0d0d14', borderLeft: '1px solid rgba(255,255,255,0.08)',
          overflowY: 'auto', padding: '24px',
          boxShadow: '-24px 0 80px rgba(0,0,0,0.7)',
          display: 'flex', flexDirection: 'column', gap: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#fff' }}>{vision.name}</h2>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 16, padding: '6px 10px' }}>
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 18, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {[
            { id: 'details' as const, label: 'Details' },
            { id: 'plan' as const, label: 'Financial Plan ✦' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                background: 'transparent', border: 'none',
                borderBottom: `2px solid ${tab === t.id ? '#f97316' : 'transparent'}`,
                color: tab === t.id ? '#fff' : 'rgba(255,255,255,0.45)',
                fontSize: 13, fontWeight: 600, padding: '8px 14px', cursor: 'pointer',
                fontFamily: 'inherit', marginBottom: -1,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'details' ? (
          <VisionForm
            form={form}
            setForm={setForm}
            accounts={accounts}
            editMode
            onDelete={handleDelete}
            onSave={handleSave}
            saving={saving}
          />
        ) : (
          <PlanTab vision={vision} />
        )}
      </div>
    </>
  )
}

// ── Add Milestone Modal ───────────────────────────────────────────────────────

interface MilestoneFormData {
  name: string
  target: string
  current_val: string
  target_date: string
  category: string
  note: string
  icon: string
}

const emptyMsForm = (): MilestoneFormData => ({
  name: '', target: '', current_val: '', target_date: '',
  category: 'financial', note: '', icon: '💎',
})

function AddMilestoneModal({
  onClose,
  onSaved,
}: {
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<MilestoneFormData>(emptyMsForm())
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  function set(key: keyof MilestoneFormData, val: string) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  async function handleSave() {
    if (!form.name.trim() || !form.target) {
      setErr('Name and Target are required.')
      return
    }
    setSaving(true)
    setErr('')
    try {
      const payload = {
        name: form.name.trim(),
        target: Number(form.target),
        current_val: form.current_val ? Number(form.current_val) : 0,
        target_date: form.target_date || null,
        category: form.category,
        note: form.note || null,
        icon: form.icon || '💎',
        color: form.category === 'financial' ? 'amber' : form.category === 'career' ? 'purple' : 'green',
      }
      const { error } = await supabase.from('financial_milestones').insert(payload)
      if (error) throw error
      onSaved()
      onClose()
    } catch (e) {
      console.error('Save milestone error', e)
      setErr('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell title="Add Financial Milestone" onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Milestone Name *">
          <input style={inputStyle} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g., First $100K Saved" />
        </Field>
        <Field label="Icon">
          <input style={inputStyle} value={form.icon} onChange={(e) => set('icon', e.target.value)} placeholder="💎" maxLength={2} />
        </Field>
        <Field label="Target Amount ($) *">
          <input style={inputStyle} type="number" value={form.target} onChange={(e) => set('target', e.target.value)} placeholder="100000" />
        </Field>
        <Field label="Current ($)">
          <input style={inputStyle} type="number" value={form.current_val} onChange={(e) => set('current_val', e.target.value)} placeholder="0" />
        </Field>
        <Field label="Target Date">
          <input style={inputStyle} type="date" value={form.target_date} onChange={(e) => set('target_date', e.target.value)} />
        </Field>
        <Field label="Category">
          <select style={inputStyle} value={form.category} onChange={(e) => set('category', e.target.value)}>
            {MS_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Note">
        <textarea style={{ ...inputStyle, height: 64, resize: 'vertical' }} value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="Any notes about this milestone…" />
      </Field>
      {err && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{err}</p>}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Btn onClick={handleSave} disabled={saving || !form.name.trim() || !form.target}>
          {saving ? 'Saving…' : 'Add Milestone'}
        </Btn>
      </div>
    </ModalShell>
  )
}

// ── Main VisionClient ─────────────────────────────────────────────────────────

export default function VisionClient({ initialVisions, initialMilestones, accounts }: Props) {
  const router = useRouter()
  const [visions, setVisions] = useState<Vision[]>(initialVisions)
  const [filter, setFilter] = useState<'all' | 'active' | 'planning' | 'future'>('all')
  const [addVisionOpen, setAddVisionOpen] = useState(false)
  const [addMilestoneOpen, setAddMilestoneOpen] = useState(false)
  const [editVision, setEditVision] = useState<Vision | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const refresh = useCallback(() => {
    router.refresh()
    // Also refetch locally to avoid stale state before RSC rerender
    supabase.from('visions').select('*').order('priority', { ascending: true }).then(({ data }) => {
      if (data) setVisions(data as Vision[])
    })
  }, [router])

  const filtered = filter === 'all' ? visions : visions.filter((v) => v.status === filter)

  const filterTabs: { label: string; value: typeof filter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Planning', value: 'planning' },
    { label: 'Future', value: 'future' },
  ]

  return (
    <>
      {/* ── Assets & Purchases section ── */}
      <section className="section" style={{ marginTop: 0 }}>
        <div className="section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 className="section-title" style={{ margin: 0 }}>Assets &amp; Purchases</h2>
          <div className="filter-row" style={{ display: 'flex', gap: 6 }}>
            {filterTabs.map((tab) => (
              <button
                key={tab.value}
                className={`filter-pill${filter === tab.value ? ' active' : ''}`}
                onClick={() => setFilter(tab.value)}
                style={{
                  background: filter === tab.value ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${filter === tab.value ? 'rgba(249,115,22,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  color: filter === tab.value ? '#f97316' : 'rgba(255,255,255,0.5)',
                  borderRadius: 8, fontSize: 13, fontWeight: filter === tab.value ? 600 : 400,
                  padding: '6px 14px', cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="vision-grid" id="visionGrid">
          {filtered.map((v) => (
            <VisionCard key={v.id} vision={v} onClick={() => setEditVision(v)} />
          ))}
          <AddCard onClick={() => setAddVisionOpen(true)} />
        </div>
      </section>

      {/* ── Financial Milestones section header button (wires Add Milestone) ── */}
      {/* We inject a global listener so the static HTML's "Add Milestone" button also works */}
      {mounted && (
        <MilestoneButtonWirer onOpen={() => setAddMilestoneOpen(true)} />
      )}

      {/* ── Portals ── */}
      {mounted && addVisionOpen &&
        createPortal(
          <AddVisionModal
            accounts={accounts}
            onClose={() => setAddVisionOpen(false)}
            onSaved={refresh}
          />,
          document.body
        )
      }

      {mounted && addMilestoneOpen &&
        createPortal(
          <AddMilestoneModal
            onClose={() => setAddMilestoneOpen(false)}
            onSaved={refresh}
          />,
          document.body
        )
      }

      {mounted && editVision &&
        createPortal(
          <EditDrawer
            vision={editVision}
            accounts={accounts}
            onClose={() => setEditVision(null)}
            onSaved={refresh}
          />,
          document.body
        )
      }
    </>
  )
}

// ── MilestoneButtonWirer ──────────────────────────────────────────────────────
// Patches the static HTML's add-milestone-btn onclick into React state.

function MilestoneButtonWirer({ onOpen }: { onOpen: () => void }) {
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (target.closest('.add-milestone-btn')) {
        e.preventDefault()
        e.stopPropagation()
        onOpen()
      }
    }
    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [onOpen])
  return null
}
