'use client'
/**
 * EditEntityModal — edit an entity's own legal metadata inline.
 * Persists to entity_ownership table via UPDATE WHERE id = entityId.
 */
import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface Props {
  entityId: string
  onClose: () => void
  onSaved?: () => void
}

const ENTITY_TYPES = ['LLC', 'C-Corp', 'S-Corp', 'Trust', 'Partnership', 'Sole Prop', 'Person']
const TAX_CLASSES  = ['disregarded', 'partnership', 'S-Corp', 'C-Corp', 'Trust', 'Individual']
const PURPOSES     = ['operating', 'holding', 'legal-separation', 'trust', 'management', 'individual']
const US_STATES    = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
]

export default function EditEntityModal({ entityId, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    entity_name: '',
    slug: '',
    entity_type: '',
    state: '',
    tax_classification: '',
    ein: '',
    formation_date: '',
    fiscal_year_end: '',
    purpose: '',
    is_active: true,
    notes: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    async function fetchEntity() {
      const { data, error } = await supabase
        .from('entity_ownership')
        .select('entity_name,entity_type,state,ein,formation_date,notes,status,slug,fiscal_year_end,tax_classification,purpose,is_active')
        .eq('id', entityId)
        .single()

      if (!error && data) {
        setForm({
          entity_name: (data as any).entity_name ?? '',
          slug: (data as any).slug ?? '',
          entity_type: (data as any).entity_type ?? '',
          state: (data as any).state ?? '',
          tax_classification: (data as any).tax_classification ?? '',
          ein: (data as any).ein ?? '',
          formation_date: (data as any).formation_date ?? '',
          fiscal_year_end: (data as any).fiscal_year_end ?? '',
          purpose: (data as any).purpose ?? '',
          is_active: (data as any).is_active !== false,
          notes: (data as any).notes ?? '',
        })
      }
      setLoading(false)
    }
    fetchEntity()
  }, [entityId])

  function set(field: string, value: any) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!form.entity_name.trim()) { setErr('Name is required'); return }
    setSaving(true)
    setErr('')
    const payload: Record<string, any> = {
      entity_name: form.entity_name.trim(),
      entity_type: form.entity_type || null,
      state: form.state || null,
      ein: form.ein || null,
      formation_date: form.formation_date || null,
      notes: form.notes || null,
      is_active: form.is_active,
    }
    if (form.slug) payload.slug = form.slug.trim()
    if (form.tax_classification) payload.tax_classification = form.tax_classification
    if (form.fiscal_year_end) payload.fiscal_year_end = form.fiscal_year_end
    if (form.purpose) payload.purpose = form.purpose

    const { error } = await supabase.from('entity_ownership').update(payload).eq('id', entityId)
    setSaving(false)
    if (error) { setErr(error.message); return }
    onSaved?.()
    onClose()
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: '#0a0a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '28px 32px', width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Entity Metadata</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Edit Entity</div>
          </div>
          <button style={iconBtn} onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Loading…</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Name + Slug */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Entity Name *">
                <input style={inp} value={form.entity_name} onChange={e => set('entity_name', e.target.value)} placeholder="My Company LLC" />
              </Field>
              <Field label="Slug (URL)">
                <input style={inp} value={form.slug} onChange={e => set('slug', e.target.value)} placeholder="my-company-llc" />
              </Field>
            </div>

            {/* Type + State */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Entity Type">
                <select style={inp} value={form.entity_type} onChange={e => set('entity_type', e.target.value)}>
                  <option value="">— type —</option>
                  {ENTITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Formation State">
                <select style={inp} value={form.state} onChange={e => set('state', e.target.value)}>
                  <option value="">— state —</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>

            {/* Tax Class + Purpose */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Tax Classification">
                <select style={inp} value={form.tax_classification} onChange={e => set('tax_classification', e.target.value)}>
                  <option value="">— classification —</option>
                  {TAX_CLASSES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Purpose">
                <select style={inp} value={form.purpose} onChange={e => set('purpose', e.target.value)}>
                  <option value="">— purpose —</option>
                  {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
            </div>

            {/* EIN + Formation Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="EIN">
                <input style={inp} value={form.ein} onChange={e => set('ein', e.target.value)} placeholder="XX-XXXXXXX" />
              </Field>
              <Field label="Formation Date">
                <input style={inp} type="date" value={form.formation_date} onChange={e => set('formation_date', e.target.value)} />
              </Field>
            </div>

            {/* Fiscal Year End */}
            <Field label="Fiscal Year End (MM-DD)">
              <input style={inp} value={form.fiscal_year_end} onChange={e => set('fiscal_year_end', e.target.value)} placeholder="12-31" />
            </Field>

            {/* Is Active toggle */}
            <Field label="Status">
              <div style={{ display: 'flex', gap: 8 }}>
                {[true, false].map(v => (
                  <button
                    key={String(v)}
                    style={{
                      padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans, sans-serif',
                      background: form.is_active === v
                        ? (v ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.12)')
                        : 'rgba(255,255,255,0.04)',
                      color: form.is_active === v
                        ? (v ? '#10b981' : '#ef4444')
                        : 'rgba(255,255,255,0.4)',
                      border: form.is_active === v
                        ? `1px solid ${v ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.25)'}`
                        : '1px solid rgba(255,255,255,0.06)',
                    }}
                    onClick={() => set('is_active', v)}
                  >
                    {v ? 'Active' : 'Inactive'}
                  </button>
                ))}
              </div>
            </Field>

            {/* Notes */}
            <Field label="Notes / Purpose Description">
              <textarea
                style={{ ...inp, height: 72, resize: 'vertical' }}
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Description of purpose, operations, etc."
              />
            </Field>

            {err && <div style={{ fontSize: 12, color: '#ef4444' }}>{err}</div>}

            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <button style={primaryBtn} disabled={saving} onClick={handleSave}>
                {saving ? 'Saving…' : 'Save Entity'}
              </button>
              <button style={cancelBtn} onClick={onClose}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 10, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
      {label}
      {children}
    </label>
  )
}

// ── Shared styles ──────────────────────────────────────────────────
const inp: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, padding: '8px 12px',
  fontSize: 13, color: 'rgba(255,255,255,0.9)',
  fontFamily: 'DM Sans, sans-serif', outline: 'none', width: '100%',
}

const iconBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, padding: '4px 10px',
  fontSize: 13, color: 'rgba(255,255,255,0.5)', cursor: 'pointer', flexShrink: 0,
}

const primaryBtn: React.CSSProperties = {
  background: 'rgba(59,130,246,0.15)',
  border: '1px solid rgba(59,130,246,0.3)',
  borderRadius: 10, padding: '10px 22px',
  fontSize: 13, fontWeight: 700, color: '#3b82f6',
  cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
}

const cancelBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10, padding: '10px 22px',
  fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)',
  cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
}
