'use client'

import { useState } from 'react'
import { supabase } from '../../../lib/supabase'

const OPTIONS = [
  { v: 'p0', label: 'P0', full: 'P0 — Critical', color: '#ef4444' },
  { v: 'p1', label: 'P1', full: 'P1 — High',     color: '#f97316' },
  { v: 'p2', label: 'P2', full: 'P2 — Medium',   color: '#8b5cf6' },
  { v: 'p3', label: 'P3', full: 'P3 — Low',      color: '#6b7280' },
]

function normalize(p?: string | null): string {
  const v = (p ?? '').toLowerCase().trim()
  if (['p0','critical','0'].includes(v)) return 'p0'
  if (['p1','high','1'].includes(v)) return 'p1'
  if (['p2','medium','normal','2'].includes(v)) return 'p2'
  if (['p3','low','3'].includes(v)) return 'p3'
  return 'p2'
}

/**
 * Inline P0–P3 editor for projects. Click to open a dropdown; picking a
 * value PATCHes projects.priority immediately. Used on the project-detail
 * hero and on project cards in the list view so you can promote work
 * without digging into a form.
 */
export default function PrioritySelector({
  projectId,
  initial,
  size = 'md',
}: {
  projectId: string
  initial?: string | null
  size?: 'sm' | 'md'
}) {
  const [value, setValue] = useState(normalize(initial))
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const cur = OPTIONS.find((o) => o.v === value) ?? OPTIONS[2]

  const handlePick = async (v: string) => {
    setOpen(false)
    if (v === value) return
    setSaving(true)
    const prev = value
    setValue(v)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('projects') as any)
      .update({ priority: v })
      .eq('id', projectId)
    setSaving(false)
    if (error) setValue(prev)  // revert on failure
  }

  const fontSize = size === 'sm' ? 10 : 11
  const pad = size === 'sm' ? '2px 7px' : '4px 10px'

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        disabled={saving}
        title="Click to change priority"
        style={{
          fontSize, padding: pad, borderRadius: 20,
          background: cur.color + '20',
          color: cur.color,
          border: `1px solid ${cur.color}60`,
          fontWeight: 700, fontFamily: 'var(--mo)',
          cursor: saving ? 'wait' : 'pointer',
          letterSpacing: '.04em',
          display: 'inline-flex', alignItems: 'center', gap: 4,
          opacity: saving ? 0.5 : 1,
          transition: 'all 0.15s',
        }}
      >
        {cur.label}
        <span style={{ fontSize: fontSize - 2, opacity: 0.6 }}>▾</span>
      </button>
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 50 }}
          />
          <div
            style={{
              position: 'absolute', top: '100%', left: 0, marginTop: 4,
              background: '#14102a', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 10, padding: 4, zIndex: 51,
              minWidth: 160, boxShadow: '0 8px 28px rgba(0,0,0,0.4)',
            }}
          >
            {OPTIONS.map((o) => (
              <button
                key={o.v}
                onClick={(e) => { e.stopPropagation(); handlePick(o.v) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '7px 10px', borderRadius: 6,
                  background: value === o.v ? 'rgba(255,255,255,0.06)' : 'transparent',
                  color: o.color, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600, textAlign: 'left',
                  fontFamily: 'var(--mo)',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = value === o.v ? 'rgba(255,255,255,0.06)' : 'transparent' }}
              >
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: o.color, flexShrink: 0 }} />
                {o.full}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
