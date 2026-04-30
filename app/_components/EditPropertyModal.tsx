'use client'
/**
 * EditPropertyModal — edit a property's own legal metadata inline.
 * Persists to property_assets table via UPDATE WHERE id = propertyId.
 */
import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface Props {
  propertyId: string
  onClose: () => void
  onSaved?: () => void
}

const PROPERTY_TYPES = ['Single Family', 'Multi Family', 'Condo', 'Townhouse', 'Land', 'Commercial', 'Mixed Use', 'Vacation Rental']
const PROPERTY_PURPOSES = ['primary-residence', 'rental', 'vacation', 'investment', 'commercial', 'land']
const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
]

export default function EditPropertyModal({ propertyId, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    name: '',
    slug: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    property_type: '',
    purpose: '',
    current_value: '',
    mortgage_balance: '',
    mortgage_rate: '',
    equity: '',
    is_rental: false,
    monthly_rent: '',
    notes: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    async function fetchProperty() {
      const { data, error } = await supabase
        .from('property_assets')
        .select('name,slug,address,city,state,zip,property_type,purpose,current_value,mortgage_balance,mortgage_rate,equity,is_rental,monthly_rent,notes')
        .eq('id', propertyId)
        .single()

      if (!error && data) {
        const d = data as any
        setForm({
          name: d.name ?? '',
          slug: d.slug ?? '',
          address: d.address ?? '',
          city: d.city ?? '',
          state: d.state ?? '',
          zip: d.zip ?? '',
          property_type: d.property_type ?? '',
          purpose: d.purpose ?? '',
          current_value: d.current_value != null ? String(d.current_value) : '',
          mortgage_balance: d.mortgage_balance != null ? String(d.mortgage_balance) : '',
          mortgage_rate: d.mortgage_rate != null ? String(d.mortgage_rate) : '',
          equity: d.equity != null ? String(d.equity) : '',
          is_rental: d.is_rental ?? false,
          monthly_rent: d.monthly_rent != null ? String(d.monthly_rent) : '',
          notes: d.notes ?? '',
        })
      }
      setLoading(false)
    }
    fetchProperty()
  }, [propertyId])

  function set(field: string, value: any) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!form.address.trim()) { setErr('Address is required'); return }
    setSaving(true)
    setErr('')
    const payload: Record<string, any> = {
      address: form.address.trim(),
      city: form.city || null,
      state: form.state || null,
      zip: form.zip || null,
      property_type: form.property_type || null,
      purpose: form.purpose || null,
      is_rental: form.is_rental,
      notes: form.notes || null,
    }
    if (form.name) payload.name = form.name.trim()
    if (form.slug) payload.slug = form.slug.trim()
    if (form.current_value) payload.current_value = parseFloat(form.current_value)
    if (form.mortgage_balance) payload.mortgage_balance = parseFloat(form.mortgage_balance)
    if (form.mortgage_rate) payload.mortgage_rate = parseFloat(form.mortgage_rate)
    if (form.equity) payload.equity = parseFloat(form.equity)
    if (form.monthly_rent) payload.monthly_rent = parseFloat(form.monthly_rent)

    const { error } = await supabase.from('property_assets').update(payload).eq('id', propertyId)
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
      <div style={{ background: '#0a0a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '28px 32px', width: '100%', maxWidth: 580, maxHeight: '90vh', overflow: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Property Metadata</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Edit Property</div>
          </div>
          <button style={iconBtn} onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Loading…</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Name + Slug */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Display Name">
                <input style={inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Graeagle Cabin" />
              </Field>
              <Field label="Slug (URL)">
                <input style={inp} value={form.slug} onChange={e => set('slug', e.target.value)} placeholder="graeagle-cabin" />
              </Field>
            </div>

            {/* Address */}
            <Field label="Street Address *">
              <input style={inp} value={form.address} onChange={e => set('address', e.target.value)} placeholder="123 Main St" />
            </Field>

            {/* City, State, Zip */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px', gap: 12 }}>
              <Field label="City">
                <input style={inp} value={form.city} onChange={e => set('city', e.target.value)} placeholder="Los Angeles" />
              </Field>
              <Field label="State">
                <select style={inp} value={form.state} onChange={e => set('state', e.target.value)}>
                  <option value="">—</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="ZIP">
                <input style={inp} value={form.zip} onChange={e => set('zip', e.target.value)} placeholder="90001" />
              </Field>
            </div>

            {/* Type + Purpose */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Property Type">
                <select style={inp} value={form.property_type} onChange={e => set('property_type', e.target.value)}>
                  <option value="">— type —</option>
                  {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Purpose">
                <select style={inp} value={form.purpose} onChange={e => set('purpose', e.target.value)}>
                  <option value="">— purpose —</option>
                  {PROPERTY_PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
            </div>

            {/* Value + Equity */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Current Value ($)">
                <input style={inp} type="number" value={form.current_value} onChange={e => set('current_value', e.target.value)} placeholder="750000" />
              </Field>
              <Field label="Equity ($)">
                <input style={inp} type="number" value={form.equity} onChange={e => set('equity', e.target.value)} placeholder="200000" />
              </Field>
            </div>

            {/* Mortgage */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Mortgage Balance ($)">
                <input style={inp} type="number" value={form.mortgage_balance} onChange={e => set('mortgage_balance', e.target.value)} placeholder="550000" />
              </Field>
              <Field label="Mortgage Rate (%)">
                <input style={inp} type="number" step="0.01" value={form.mortgage_rate} onChange={e => set('mortgage_rate', e.target.value)} placeholder="6.75" />
              </Field>
            </div>

            {/* Rental toggle + monthly rent */}
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 16, alignItems: 'end' }}>
              <Field label="Is Rental">
                <div style={{ display: 'flex', gap: 8 }}>
                  {[true, false].map(v => (
                    <button
                      key={String(v)}
                      style={{
                        padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                        fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans, sans-serif',
                        background: form.is_rental === v
                          ? (v ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)')
                          : 'rgba(255,255,255,0.04)',
                        color: form.is_rental === v
                          ? (v ? '#10b981' : 'rgba(255,255,255,0.7)')
                          : 'rgba(255,255,255,0.35)',
                        border: form.is_rental === v
                          ? `1px solid ${v ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'}`
                          : '1px solid rgba(255,255,255,0.06)',
                      }}
                      onClick={() => set('is_rental', v)}
                    >
                      {v ? 'Yes' : 'No'}
                    </button>
                  ))}
                </div>
              </Field>
              {form.is_rental && (
                <Field label="Monthly Rent ($)">
                  <input style={inp} type="number" value={form.monthly_rent} onChange={e => set('monthly_rent', e.target.value)} placeholder="3500" />
                </Field>
              )}
            </div>

            {/* Notes */}
            <Field label="Notes">
              <textarea
                style={{ ...inp, height: 64, resize: 'vertical' }}
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Additional notes about this property…"
              />
            </Field>

            {err && <div style={{ fontSize: 12, color: '#ef4444' }}>{err}</div>}

            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <button style={primaryBtn} disabled={saving} onClick={handleSave}>
                {saving ? 'Saving…' : 'Save Property'}
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
  fontSize: 13, fontWeight: 700, color: '#60a5fa',
  cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
}

const cancelBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10, padding: '10px 22px',
  fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)',
  cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
}
