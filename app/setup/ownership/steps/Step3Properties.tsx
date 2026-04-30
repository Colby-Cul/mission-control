'use client'
/**
 * Step 3 — "Do you own any rental properties or real estate?"
 */
import React, { useState } from 'react'
import { WizardState, WizardProperty } from '../OwnershipWizard'
import { Field, StepCard, StepNav, inputStyle, selectStyle } from '../WizardHelpers'

interface Props {
  state: WizardState
  update: (patch: Partial<WizardState>) => void
  onNext: () => void
  onPrev: () => void
}

type PropForm = {
  address: string
  type: string
  purchasePrice: string
  currentValue: string
  mortgageBalance: string
}

const BLANK: PropForm = { address: '', type: '', purchasePrice: '', currentValue: '', mortgageBalance: '' }

const PROP_TYPES = [
  { value: 'primary', label: 'Primary residence (where I live)' },
  { value: 'rental', label: 'Rental property (long-term tenants)' },
  { value: 'vacation', label: 'Vacation / short-term rental' },
  { value: 'investment', label: 'Investment / land / commercial' },
]

function nanoid(): string {
  return Math.random().toString(36).slice(2, 10)
}

export default function Step3Properties({ state, update, onNext, onPrev }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<PropForm>(BLANK)
  const [editingId, setEditingId] = useState<string | null>(null)

  function setField(patch: Partial<PropForm>) {
    setForm(prev => ({ ...prev, ...patch }))
  }

  function openNew() { setForm(BLANK); setEditingId(null); setShowModal(true) }
  function openEdit(p: WizardProperty) {
    setForm({ address: p.address, type: p.type, purchasePrice: p.purchasePrice, currentValue: p.currentValue, mortgageBalance: p.mortgageBalance })
    setEditingId(p.id)
    setShowModal(true)
  }

  function saveProp() {
    if (!form.address.trim()) return
    const prop: WizardProperty = {
      id: editingId ?? nanoid(),
      address: form.address.trim(),
      type: form.type || 'investment',
      purchasePrice: form.purchasePrice,
      currentValue: form.currentValue,
      mortgageBalance: form.mortgageBalance,
    }
    if (editingId) {
      update({ properties: state.properties.map(p => p.id === editingId ? prop : p) })
    } else {
      update({ properties: [...state.properties, prop] })
    }
    setShowModal(false)
  }

  function removeProp(id: string) {
    update({
      properties: state.properties.filter(p => p.id !== id),
      assignments: state.assignments.filter(a => !(a.assetId === id && a.assetType === 'property')),
    })
  }

  const canSave = form.address.trim().length > 0

  return (
    <StepCard>
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 6px' }}>Do you own any real estate or properties?</h2>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '0 0 24px', lineHeight: 1.6 }}>
        Add any homes, rental units, land, or other property you own (alone or with others). You can skip this step if you don&apos;t own any property yet.
      </p>

      {state.properties.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {state.properties.map(p => (
            <PropCard key={p.id} prop={p} onEdit={() => openEdit(p)} onRemove={() => removeProp(p.id)} />
          ))}
        </div>
      )}

      <button
        onClick={openNew}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(16,185,129,0.06)',
          border: '1px dashed rgba(16,185,129,0.28)',
          borderRadius: 12, padding: '13px 18px',
          fontSize: 14, fontWeight: 600, color: '#34d399',
          cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', width: '100%',
        }}
      >
        <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
        Add a property
      </button>

      <StepNav onPrev={onPrev} onNext={onNext} />

      {showModal && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div style={{
            background: '#0a0a1a',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: 20,
            width: '100%',
            maxWidth: 520,
            padding: '32px',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>
                {editingId ? 'Edit property' : 'Add a property'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 18, cursor: 'pointer', padding: '0 4px' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label="Property address" required>
                <input
                  style={inputStyle}
                  type="text"
                  placeholder="123 Main St, Miami, FL 33101"
                  value={form.address}
                  onChange={e => setField({ address: e.target.value })}
                  autoFocus
                />
              </Field>

              <Field label="Property type">
                <select style={selectStyle} value={form.type} onChange={e => setField({ type: e.target.value })}>
                  <option value="">— select type —</option>
                  {PROP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
                  Optional financial details
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <Field label="Purchase price">
                    <input style={inputStyle} type="number" placeholder="450000" value={form.purchasePrice} onChange={e => setField({ purchasePrice: e.target.value })} />
                  </Field>
                  <Field label="Current value">
                    <input style={inputStyle} type="number" placeholder="580000" value={form.currentValue} onChange={e => setField({ currentValue: e.target.value })} />
                  </Field>
                  <Field label="Mortgage balance">
                    <input style={inputStyle} type="number" placeholder="320000" value={form.mortgageBalance} onChange={e => setField({ mortgageBalance: e.target.value })} />
                  </Field>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button
                onClick={saveProp}
                disabled={!canSave}
                style={{
                  background: canSave ? 'rgba(16,185,129,0.14)' : 'rgba(16,185,129,0.05)',
                  border: `1px solid ${canSave ? 'rgba(16,185,129,0.35)' : 'rgba(16,185,129,0.1)'}`,
                  borderRadius: 10, padding: '10px 22px',
                  fontSize: 13, fontWeight: 700,
                  color: canSave ? '#10b981' : 'rgba(16,185,129,0.4)',
                  cursor: canSave ? 'pointer' : 'not-allowed',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                {editingId ? 'Save changes' : 'Add property'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </StepCard>
  )
}

function PropCard({ prop, onEdit, onRemove }: { prop: WizardProperty; onEdit: () => void; onRemove: () => void }) {
  const typeLabel = { primary: 'Primary residence', rental: 'Rental', vacation: 'Vacation rental', investment: 'Investment' }[prop.type] ?? prop.type
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      background: 'rgba(16,185,129,0.04)',
      border: '1px solid rgba(16,185,129,0.14)',
      borderRadius: 12, padding: '13px 16px',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#f5f5f7' }}>{prop.address}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
          {typeLabel}
          {prop.currentValue ? ` · ~$${Number(prop.currentValue).toLocaleString()} value` : ''}
        </div>
      </div>
      <button onClick={onEdit} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '5px 12px', fontSize: 12, color: 'rgba(255,255,255,0.55)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Edit</button>
      <button onClick={onRemove} style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8, padding: '5px 10px', fontSize: 12, color: 'rgba(239,68,68,0.7)', cursor: 'pointer' }}>✕</button>
    </div>
  )
}
