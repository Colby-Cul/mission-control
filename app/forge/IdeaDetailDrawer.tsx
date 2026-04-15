'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  X, AlertTriangle, Users, Cog, Bot, DollarSign, Rocket,
  Target, ChevronDown, ChevronRight, Tag, StickyNote,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ForgeIdeaFull {
  id: string
  date_added?: string | null
  status?: string | null
  name?: string | null
  tagline?: string | null
  problem?: string | null
  target_audience?: string | null
  how_it_works?: string | null
  agentic_architecture?: string | null
  revenue_model?: string | null
  path_to_100k?: string | null
  mvp_scope?: string | null
  estimated_build_time?: string | null
  competition_level?: string | null
  competition_notes?: string | null
  monthly_revenue_potential?: string | null
  confidence_score?: number | null
  source_signals?: string[] | null
  notes?: string | null
  converted_project_id?: string | null
  approved_at?: string | null
  approved_by?: string | null
  // allow extra computed fields
  [key: string]: unknown
}

// Stage tab definitions
const STAGE_TABS = [
  { label: 'New',        status: 'sourced'    },
  { label: 'Evaluating', status: 'evaluating' },
  { label: 'Building',   status: 'building'   },
  { label: 'Launched',   status: 'launched'   },
  { label: 'Parked',     status: 'parked'     },
] as const

type StageTabStatus = (typeof STAGE_TABS)[number]['status']

// ─── Helper utilities ─────────────────────────────────────────────────────────

function formatDate(d: string | null | undefined) {
  if (!d) return ''
  try {
    const date = new Date(d)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return d
  }
}

function isWithinDays(d: string | null | undefined, days: number) {
  if (!d) return false
  try {
    const then = new Date(d).getTime()
    const now = Date.now()
    return now - then < days * 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

function getIdeaName(idea: ForgeIdeaFull): string {
  return String((idea as any).name ?? (idea as any).title ?? 'Untitled')
}

/** Split an arch text into individual agent sentences */
function parseAgentLines(text: string): string[] {
  // Split on newlines first, then on sentences that start with an agent keyword
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length > 1) return lines
  // fallback: split on periods
  return text
    .split(/\.\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10)
}

/** Check if a string looks like a math / formula line */
function hasMathExpression(text: string): boolean {
  return /[\d,]+\s*[×x\*]\s*\$[\d,]+/.test(text) || /=\s*\$[\d,]+K?\s*(MRR|ARR)?/.test(text)
}

// ─── Inline editable text block ───────────────────────────────────────────────

function EditableField({
  value,
  placeholder,
  multiline = true,
  mono = false,
  onSave,
}: {
  value: string | null | undefined
  placeholder: string
  multiline?: boolean
  mono?: boolean
  onSave: (val: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement>(null)

  useEffect(() => { setDraft(value ?? '') }, [value])

  const startEdit = () => {
    setDraft(value ?? '')
    setEditing(true)
    setTimeout(() => ref.current?.focus(), 50)
  }

  const cancel = () => {
    setDraft(value ?? '')
    setEditing(false)
  }

  const save = async () => {
    setSaving(true)
    try {
      await onSave(draft)
    } finally {
      setSaving(false)
      setEditing(false)
    }
  }

  const baseTextStyle: React.CSSProperties = {
    fontSize: 13,
    lineHeight: 1.65,
    color: value ? 'var(--t1)' : 'var(--t4)',
    fontFamily: mono ? 'var(--mo)' : 'DM Sans, sans-serif',
    cursor: 'text',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    padding: 0,
    width: '100%',
    resize: 'vertical',
  }

  if (editing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {multiline ? (
          <textarea
            ref={ref as React.RefObject<HTMLTextAreaElement>}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            style={{
              ...baseTextStyle,
              padding: '8px 10px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 8,
              color: 'var(--t1)',
            }}
          />
        ) : (
          <input
            ref={ref as React.RefObject<HTMLInputElement>}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            style={{
              ...baseTextStyle,
              padding: '8px 10px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 8,
              color: 'var(--t1)',
            }}
          />
        )}
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={save}
            disabled={saving}
            style={{
              padding: '5px 14px', fontSize: 11, fontWeight: 600,
              background: 'var(--green)', border: 'none', borderRadius: 6,
              color: '#fff', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={cancel}
            style={{
              padding: '5px 12px', fontSize: 11,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6, color: 'var(--t3)', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={startEdit}
      title="Click to edit"
      style={{
        fontSize: 13,
        lineHeight: 1.65,
        color: value ? 'var(--t1)' : 'var(--t4)',
        fontFamily: mono ? 'var(--mo)' : 'DM Sans, sans-serif',
        cursor: 'text',
        borderRadius: 6,
        padding: '4px 0',
        whiteSpace: 'pre-wrap',
      }}
    >
      {value || placeholder}
    </div>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  icon,
  label,
  children,
  accent,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
  accent?: string
}) {
  return (
    <div style={{
      borderTop: '1px solid rgba(255,255,255,0.06)',
      paddingTop: 16,
      marginTop: 4,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        marginBottom: 8,
      }}>
        <span style={{ color: accent ?? 'var(--t4)', display: 'flex', alignItems: 'center' }}>
          {icon}
        </span>
        <span style={{
          fontSize: 10,
          letterSpacing: '0.09em',
          textTransform: 'uppercase',
          color: accent ?? 'var(--dim)',
          fontFamily: 'var(--mo)',
          fontWeight: 600,
        }}>
          {label}
        </span>
      </div>
      {children}
    </div>
  )
}

// ─── Collapsible section ──────────────────────────────────────────────────────

function CollapsibleSection({
  icon,
  label,
  children,
  accent,
  defaultOpen = false,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
  accent?: string
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div style={{
      borderTop: '1px solid rgba(255,255,255,0.06)',
      paddingTop: 12,
      marginTop: 4,
    }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, width: '100%',
          background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0',
        }}
      >
        <span style={{ color: accent ?? 'var(--t4)', display: 'flex' }}>{icon}</span>
        <span style={{
          fontSize: 10,
          letterSpacing: '0.09em',
          textTransform: 'uppercase',
          color: accent ?? 'var(--dim)',
          fontFamily: 'var(--mo)',
          fontWeight: 600,
        }}>
          {label}
        </span>
        <span style={{ marginLeft: 'auto', color: 'var(--t4)' }}>
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </span>
      </button>
      {open && <div style={{ marginTop: 8 }}>{children}</div>}
    </div>
  )
}

// ─── Quick stats strip ────────────────────────────────────────────────────────

function QuickStats({ idea }: { idea: ForgeIdeaFull }) {
  const stats = [
    {
      value: idea.confidence_score != null ? `${idea.confidence_score}/10` : '—',
      label: 'Confidence',
      color: 'var(--orange)',
    },
    {
      value: idea.monthly_revenue_potential || '—',
      label: 'Revenue Potential',
      color: 'var(--green)',
    },
    {
      value: idea.estimated_build_time || '—',
      label: 'Build Time',
      color: 'var(--amber)',
    },
  ]

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 0,
      padding: '12px 16px',
      background: 'rgba(255,255,255,0.03)',
      borderRadius: 10,
      border: '1px solid rgba(255,255,255,0.07)',
      marginBottom: 20,
    }}>
      {stats.map((s, i) => (
        <div key={s.label} style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
          {/* Separator */}
          {i > 0 && (
            <div style={{
              position: 'absolute', left: 0, top: '10%', bottom: '10%',
              width: 1, background: 'rgba(255,255,255,0.08)',
            }} />
          )}
          <div style={{
            fontSize: 18,
            fontWeight: 700,
            color: s.color,
            fontFamily: 'var(--mo)',
            lineHeight: 1.2,
          }}>
            {s.value}
          </div>
          <div style={{
            fontSize: 10,
            color: 'var(--t4)',
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            marginTop: 3,
          }}>
            {s.label}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Stage tabs ───────────────────────────────────────────────────────────────

function StageTabs({
  idea,
  allIdeas,
  onStageChange,
}: {
  idea: ForgeIdeaFull
  allIdeas?: ForgeIdeaFull[]
  onStageChange: (status: string) => void
}) {
  const currentStatus = String(idea.status ?? 'sourced')

  // Map current status to a tab — 'building'/'approved' both map to Building tab
  const activeTab = STAGE_TABS.find((t) => {
    if (t.status === 'building') return currentStatus === 'building' || currentStatus === 'approved'
    return t.status === currentStatus
  }) ?? STAGE_TABS[0]

  return (
    <div style={{
      borderTop: '1px solid rgba(255,255,255,0.08)',
      paddingTop: 16,
      marginTop: 8,
    }}>
      <div style={{
        display: 'flex',
        gap: 0,
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 10,
        padding: '3px',
        border: '1px solid rgba(255,255,255,0.07)',
      }}>
        {STAGE_TABS.map((tab) => {
          const isActive = tab.status === activeTab.status
          const count = allIdeas?.filter((i) => {
            const s = String(i.status ?? 'sourced')
            if (tab.status === 'building') return s === 'building' || s === 'approved'
            return s === tab.status
          }).length ?? 0

          return (
            <button
              key={tab.label}
              onClick={() => onStageChange(tab.status)}
              style={{
                flex: 1,
                padding: '7px 4px',
                fontSize: 11,
                fontWeight: isActive ? 700 : 400,
                background: isActive ? 'rgba(249,115,22,0.15)' : 'transparent',
                border: 'none',
                borderRadius: 7,
                color: isActive ? 'var(--orange)' : 'var(--t4)',
                cursor: 'pointer',
                borderBottom: isActive ? '2px solid var(--orange)' : '2px solid transparent',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1,
                transition: 'all 0.12s',
              }}
            >
              <span>{tab.label}</span>
              {count > 0 && (
                <span style={{
                  fontSize: 9,
                  color: isActive ? 'var(--orange)' : 'var(--t4)',
                  fontFamily: 'var(--mo)',
                }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Drawer Component ────────────────────────────────────────────────────

export interface IdeaDetailDrawerProps {
  ideaId: string | null
  allIdeas?: ForgeIdeaFull[]
  onClose: () => void
  onIdeaUpdated?: (idea: ForgeIdeaFull) => void
  onAskAgent?: (idea: ForgeIdeaFull) => void
}

export default function IdeaDetailDrawer({
  ideaId,
  allIdeas,
  onClose,
  onIdeaUpdated,
  onAskAgent,
}: IdeaDetailDrawerProps) {
  const [idea, setIdea] = useState<ForgeIdeaFull | null>(null)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [converting, setConverting] = useState(false)
  const [convertMsg, setConvertMsg] = useState<string | null>(null)
  const [stageChanging, setStageChanging] = useState(false)

  // SSR guard
  useEffect(() => { setMounted(true) }, [])

  // Load idea when ideaId changes
  useEffect(() => {
    if (!ideaId) {
      setIdea(null)
      return
    }
    setLoading(true)
    supabase
      .from('forge_ideas')
      .select('*')
      .eq('id', ideaId)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error('IdeaDetailDrawer: fetch error', error)
          setIdea(null)
        } else {
          setIdea(data as ForgeIdeaFull)
        }
        setLoading(false)
      })
  }, [ideaId])

  // Escape key handler
  useEffect(() => {
    if (!ideaId) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [ideaId, onClose])

  // Body scroll lock
  useEffect(() => {
    if (!ideaId) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [ideaId])

  const updateField = useCallback(async (field: string, value: unknown) => {
    if (!idea) return
    const { error } = await supabase
      .from('forge_ideas')
      .update({ [field]: value } as never)
      .eq('id', idea.id)
    if (!error) {
      const updated = { ...idea, [field]: value } as ForgeIdeaFull
      setIdea(updated)
      onIdeaUpdated?.(updated)
    }
  }, [idea, onIdeaUpdated])

  const handleStageChange = useCallback(async (newStatus: string) => {
    if (!idea) return
    setStageChanging(true)
    const { error } = await supabase
      .from('forge_ideas')
      .update({ status: newStatus } as never)
      .eq('id', idea.id)
    if (!error) {
      const updated = { ...idea, status: newStatus } as ForgeIdeaFull
      setIdea(updated)
      onIdeaUpdated?.(updated)
    }
    setStageChanging(false)
  }, [idea, onIdeaUpdated])

  const handleConvertToProject = useCallback(async () => {
    if (!idea || idea.converted_project_id) return
    setConverting(true)
    setConvertMsg(null)
    try {
      const { data: project, error: pe } = await supabase
        .from('projects')
        .insert({
          name: getIdeaName(idea),
          description: idea.tagline ?? idea.problem ?? null,
          status: 'active',
          source_forge_idea_id: idea.id,
        })
        .select()
        .single()
      if (pe || !project) throw pe ?? new Error('No data')
      const { error: ue } = await supabase
        .from('forge_ideas')
        .update({ converted_project_id: (project as any).id } as never)
        .eq('id', idea.id)
      if (!ue) {
        const updated = { ...idea, converted_project_id: (project as any).id } as ForgeIdeaFull
        setIdea(updated)
        onIdeaUpdated?.(updated)
        setConvertMsg(`Project "${getIdeaName(idea)}" created!`)
      }
    } catch (e) {
      setConvertMsg(`Failed: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setConverting(false)
    }
  }, [idea, onIdeaUpdated])

  if (!mounted || !ideaId) return null

  const drawerContent = (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 9100,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Drawer panel */}
      <div
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 9101,
          width: '42%', minWidth: 360, maxWidth: 660,
          background: 'rgba(15,15,30,0.97)',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px 0 0 16px',
          overflowY: 'auto',
          boxShadow: '-24px 0 80px rgba(0,0,0,0.7)',
          display: 'flex', flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, padding: 40 }}>
            <div style={{ fontSize: 13, color: 'var(--t4)' }}>Loading…</div>
          </div>
        ) : !idea ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, padding: 40 }}>
            <div style={{ fontSize: 13, color: 'var(--t4)' }}>Idea not found.</div>
          </div>
        ) : (
          <DrawerBody
            idea={idea}
            allIdeas={allIdeas}
            onClose={onClose}
            onUpdateField={updateField}
            onStageChange={handleStageChange}
            onConvertToProject={handleConvertToProject}
            onAskAgent={onAskAgent}
            stageChanging={stageChanging}
            converting={converting}
            convertMsg={convertMsg}
          />
        )}
      </div>
    </>
  )

  return createPortal(drawerContent, document.body)
}

// ─── Drawer body (split out to keep hooks clean) ──────────────────────────────

function DrawerBody({
  idea,
  allIdeas,
  onClose,
  onUpdateField,
  onStageChange,
  onConvertToProject,
  onAskAgent,
  stageChanging,
  converting,
  convertMsg,
}: {
  idea: ForgeIdeaFull
  allIdeas?: ForgeIdeaFull[]
  onClose: () => void
  onUpdateField: (field: string, value: unknown) => Promise<void>
  onStageChange: (status: string) => void
  onConvertToProject: () => void
  onAskAgent?: (idea: ForgeIdeaFull) => void
  stageChanging: boolean
  converting: boolean
  convertMsg: string | null
}) {
  const isNew = idea.status === 'sourced' || isWithinDays(idea.date_added, 7)
  const statusLabel = String(idea.status ?? 'sourced')

  const statusColors: Record<string, string> = {
    sourced:    'var(--green)',
    evaluating: 'var(--amber)',
    approved:   'var(--purple)',
    building:   '#60a5fa',
    testing:    'var(--orange)',
    launched:   'var(--green)',
    parked:     'var(--t4)',
    killed:     'var(--red)',
  }
  const badgeColor = statusColors[statusLabel] ?? 'var(--t4)'

  return (
    <div style={{ padding: '24px', paddingBottom: 32, display: 'flex', flexDirection: 'column', gap: 0, minHeight: '100%' }}>
      {/* ── Header row ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Status/NEW badge */}
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
            background: (isNew ? 'var(--green)' : badgeColor) + '20',
            color: isNew ? 'var(--green)' : badgeColor,
            textTransform: 'uppercase', letterSpacing: '0.07em', border: `1px solid ${isNew ? 'var(--green)' : badgeColor}30`,
          }}>
            {isNew && idea.status === 'sourced' ? 'NEW' : statusLabel}
          </span>
          {idea.date_added && (
            <span style={{
              fontSize: 11, color: 'var(--t4)',
              fontFamily: 'var(--mo)',
            }}>
              Added {formatDate(idea.date_added)}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, color: 'var(--t3)', cursor: 'pointer',
            width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* ── Sticky title + tagline ── */}
      <div style={{
        position: 'sticky', top: 0, background: 'rgba(15,15,30,0.97)',
        zIndex: 10, paddingBottom: 12, marginBottom: 4,
      }}>
        <h2 style={{
          fontSize: 24, fontWeight: 700, color: 'var(--t1)',
          lineHeight: 1.25, marginBottom: 6,
        }}>
          {getIdeaName(idea)}
        </h2>
        {/* Editable tagline */}
        <div style={{ fontSize: 13, color: 'var(--t3)' }}>
          <EditableField
            value={idea.tagline}
            placeholder="Add a tagline — click to edit"
            multiline={false}
            onSave={(v) => onUpdateField('tagline', v)}
          />
        </div>
      </div>

      {/* ── Quick stats ── */}
      <QuickStats idea={idea} />

      {/* ── PROBLEM ── */}
      <Section
        icon={<AlertTriangle size={13} />}
        label="Problem"
        accent="var(--amber)"
      >
        <EditableField
          value={idea.problem}
          placeholder="Problem not set yet — click to add"
          onSave={(v) => onUpdateField('problem', v)}
        />
      </Section>

      {/* ── TARGET AUDIENCE ── */}
      <Section
        icon={<Users size={13} />}
        label="Target Audience"
        accent="var(--blue)"
      >
        <EditableField
          value={idea.target_audience}
          placeholder="Target audience not set yet — click to add"
          onSave={(v) => onUpdateField('target_audience', v)}
        />
      </Section>

      {/* ── HOW IT WORKS ── */}
      <Section
        icon={<Cog size={13} />}
        label="How It Works"
      >
        {idea.how_it_works ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {idea.how_it_works.split(/\n+/).filter(Boolean).map((para, i) => (
              <p key={i} style={{ margin: 0, fontSize: 13, color: 'var(--t1)', lineHeight: 1.65 }}>
                {para}
              </p>
            ))}
            <div style={{ marginTop: 4 }}>
              <EditableField
                value={idea.how_it_works}
                placeholder=""
                onSave={(v) => onUpdateField('how_it_works', v)}
              />
            </div>
          </div>
        ) : (
          <EditableField
            value={null}
            placeholder="How it works not set yet — click to add"
            onSave={(v) => onUpdateField('how_it_works', v)}
          />
        )}
      </Section>

      {/* ── AGENTIC ARCHITECTURE ── */}
      <Section
        icon={<Bot size={13} />}
        label="Agentic Architecture"
        accent="var(--purple)"
      >
        {idea.agentic_architecture ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {parseAgentLines(idea.agentic_architecture).map((line, i) => (
              <div key={i} style={{
                padding: '8px 12px',
                background: 'rgba(139,92,246,0.08)',
                border: '1px solid rgba(139,92,246,0.2)',
                borderRadius: 8,
                fontSize: 12.5,
                color: 'var(--t1)',
                lineHeight: 1.55,
              }}>
                {line}
              </div>
            ))}
            <div style={{ marginTop: 4 }}>
              <EditableField
                value={idea.agentic_architecture}
                placeholder=""
                onSave={(v) => onUpdateField('agentic_architecture', v)}
              />
            </div>
          </div>
        ) : (
          <EditableField
            value={null}
            placeholder="Agentic architecture not set yet — click to add"
            onSave={(v) => onUpdateField('agentic_architecture', v)}
          />
        )}
      </Section>

      {/* ── REVENUE MODEL ── */}
      <Section
        icon={<DollarSign size={13} />}
        label="Revenue Model"
        accent="var(--green)"
      >
        <EditableField
          value={idea.revenue_model}
          placeholder="Revenue model not set yet — click to add"
          onSave={(v) => onUpdateField('revenue_model', v)}
        />
      </Section>

      {/* ── PATH TO $100K MRR ── */}
      <Section
        icon={<Rocket size={13} />}
        label="Path to $100K MRR"
        accent="var(--orange)"
      >
        {idea.path_to_100k ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {idea.path_to_100k.split(/\n+/).filter(Boolean).map((line, i) => {
              const isMath = hasMathExpression(line)
              return isMath ? (
                <pre key={i} style={{
                  margin: 0,
                  padding: '8px 12px',
                  background: 'rgba(249,115,22,0.08)',
                  border: '1px solid rgba(249,115,22,0.2)',
                  borderRadius: 8,
                  fontSize: 12,
                  fontFamily: 'var(--mo)',
                  color: 'var(--orange)',
                  whiteSpace: 'pre-wrap',
                  overflowX: 'auto',
                }}>
                  {line}
                </pre>
              ) : (
                <p key={i} style={{ margin: 0, fontSize: 13, color: 'var(--t1)', lineHeight: 1.65 }}>
                  {line}
                </p>
              )
            })}
            <div style={{ marginTop: 4 }}>
              <EditableField
                value={idea.path_to_100k}
                placeholder=""
                onSave={(v) => onUpdateField('path_to_100k', v)}
              />
            </div>
          </div>
        ) : (
          <EditableField
            value={null}
            placeholder="Path to $100K MRR not set yet — click to add"
            onSave={(v) => onUpdateField('path_to_100k', v)}
          />
        )}
      </Section>

      {/* ── MVP SCOPE (collapsible) ── */}
      <CollapsibleSection
        icon={<Target size={13} />}
        label="MVP Scope"
        accent="var(--cyan)"
      >
        <EditableField
          value={idea.mvp_scope}
          placeholder="MVP scope not set yet — click to add"
          onSave={(v) => onUpdateField('mvp_scope', v)}
        />
      </CollapsibleSection>

      {/* ── COMPETITION ── */}
      <CollapsibleSection
        icon={<AlertTriangle size={13} />}
        label="Competition"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {idea.competition_level && (() => {
            const lvl = String(idea.competition_level).toUpperCase()
            const lvlColor = lvl === 'LOW' ? 'var(--green)' : lvl === 'MEDIUM' ? 'var(--amber)' : 'var(--red)'
            return (
              <span style={{
                display: 'inline-flex', width: 'fit-content',
                fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
                background: lvlColor + '20', color: lvlColor,
                textTransform: 'uppercase', letterSpacing: '0.07em',
                border: `1px solid ${lvlColor}30`,
                marginBottom: 4,
              }}>
                {lvl} competition
              </span>
            )
          })()}
          <EditableField
            value={idea.competition_notes}
            placeholder="Competition notes not set yet — click to add"
            onSave={(v) => onUpdateField('competition_notes', v)}
          />
        </div>
      </CollapsibleSection>

      {/* ── SOURCE SIGNALS ── */}
      {Array.isArray(idea.source_signals) && idea.source_signals.length > 0 && (
        <CollapsibleSection
          icon={<Tag size={13} />}
          label="Source Signals"
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(idea.source_signals as string[]).map((sig) => (
              <span key={sig} style={{
                fontSize: 11, padding: '3px 9px', borderRadius: 20,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--t2)',
              }}>
                {sig}
              </span>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* ── NOTES ── */}
      <CollapsibleSection
        icon={<StickyNote size={13} />}
        label="Notes"
        defaultOpen={Boolean(idea.notes)}
      >
        <EditableField
          value={idea.notes}
          placeholder="Notes not set yet — click to add"
          onSave={(v) => onUpdateField('notes', v)}
        />
      </CollapsibleSection>

      {/* ── Stage tabs ── */}
      <StageTabs
        idea={idea}
        allIdeas={allIdeas}
        onStageChange={onStageChange}
      />
      {stageChanging && (
        <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 6, fontFamily: 'var(--mo)' }}>
          Saving stage…
        </div>
      )}

      {/* ── Convert / Ask Agent / Delete ── */}
      <div style={{
        marginTop: 20,
        display: 'flex', flexDirection: 'column', gap: 8,
        borderTop: '1px solid rgba(255,255,255,0.07)',
        paddingTop: 16,
      }}>
        {convertMsg && (
          <div style={{
            padding: '8px 12px', borderRadius: 8, fontSize: 12,
            background: convertMsg.startsWith('Failed') ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
            border: `1px solid ${convertMsg.startsWith('Failed') ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
            color: convertMsg.startsWith('Failed') ? 'var(--red)' : 'var(--green)',
            fontFamily: 'var(--mo)',
          }}>
            {convertMsg}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          {/* Ask Agent */}
          {onAskAgent && (
            <button
              onClick={() => onAskAgent(idea)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '10px', fontSize: 12, fontWeight: 600,
                background: 'rgba(139,92,246,0.12)',
                border: '1px solid rgba(139,92,246,0.3)',
                borderRadius: 10, color: '#a78bfa', cursor: 'pointer',
              }}
            >
              <Bot size={13} /> Ask Agent
            </button>
          )}

          {/* Convert to project */}
          {!idea.converted_project_id ? (
            <button
              onClick={onConvertToProject}
              disabled={converting}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '10px', fontSize: 12, fontWeight: 600,
                background: 'rgba(16,185,129,0.12)',
                border: '1px solid rgba(16,185,129,0.3)',
                borderRadius: 10, color: 'var(--green)',
                cursor: converting ? 'wait' : 'pointer',
                opacity: converting ? 0.7 : 1,
              }}
            >
              <Rocket size={13} /> {converting ? 'Creating…' : 'Convert to Project'}
            </button>
          ) : (
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '10px', fontSize: 12,
              background: 'rgba(16,185,129,0.06)',
              border: '1px solid rgba(16,185,129,0.15)',
              borderRadius: 10, color: 'var(--t4)',
            }}>
              <Rocket size={13} /> Project linked
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
