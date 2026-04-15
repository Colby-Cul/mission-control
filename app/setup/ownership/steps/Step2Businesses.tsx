'use client'
/**
 * Step 2 — "Do you have any businesses?"
 * Users can add multiple businesses with a modal.
 * Smart templates pre-fill fields.
 */
import React, { useState } from 'react'
import { WizardState, WizardBusiness } from '../OwnershipWizard'
import { Field, StepCard, StepNav, inputStyle, selectStyle, US_STATES, TIPS, InfoTip } from '../WizardHelpers'
import { BUSINESS_TEMPLATES, BusinessTemplate } from '../templates'

interface Props {
  state: WizardState
  update: (patch: Partial<WizardState>) => void
  onNext: () => void
  onPrev: () => void
}

type BizForm = {
  name: string
  businessType: string
  legalType: string
  state: string
  ein: string
}

const BLANK_FORM: BizForm = { name: '', businessType: '', legalType: '', state: '', ein: '' }

const BUSINESS_TYPES = [
  { value: 'STR', label: 'Short-term rental / vacation rental' },
  { value: 'rental', label: 'Long-term rental / real estate' },
  { value: 'software', label: 'Software / SaaS' },
  { value: 'consulting', label: 'Consulting / services' },
  { value: 'ecommerce', label: 'E-commerce / retail' },
  { value: 'other', label: 'Other / general business' },
]

const LEGAL_TYPES = [
  { value: 'LLC', label: 'LLC (Limited Liability Company)' },
  { value: 'S-Corp', label: 'S-Corp' },
  { value: 'Corp', label: 'Corporation (C-Corp)' },
  { value: 'SoleProp', label: 'Sole Proprietorship' },
  { value: 'unknown', label: "I don't know yet" },
]

const LEGAL_TYPE_TIP: Record<string, string> = {
  LLC: 'An LLC is the most flexible and popular structure. Single-member LLCs are simple — income flows to your personal tax return.',
  'S-Corp': 'An S-Corp lets you split income into salary + distributions, which can reduce self-employment taxes. More complex to run.',
  Corp: 'A C-Corporation is a separate tax-paying entity. Great if you plan to raise venture capital or have lots of shareholders.',
  SoleProp: 'No formal entity — you and the business are the same. Simplest, but no liability protection.',
  unknown: "No worries — LLC is almost always the best starting point. We'll note it as unknown for now.",
}

function nanoid(): string {
  return Math.random().toString(36).slice(2, 10)
}

export default function Step2Businesses({ state, update, onNext, onPrev }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<BizForm>(BLANK_FORM)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)

  function setField(patch: Partial<BizForm>) {
    setForm(prev => ({ ...prev, ...patch }))
  }

  function openNew() {
    setForm(BLANK_FORM)
    setSelectedTemplateId(null)
    setEditingId(null)
    setShowModal(true)
    setShowTemplates(true)
  }

  function openEdit(biz: WizardBusiness) {
    setForm({ name: biz.name, businessType: biz.businessType, legalType: biz.legalType, state: biz.state, ein: biz.ein })
    setSelectedTemplateId(biz.templateId ?? null)
    setEditingId(biz.id)
    setShowModal(true)
    setShowTemplates(false)
  }

  function applyTemplate(t: BusinessTemplate) {
    setField({ legalType: t.defaults.legalType, businessType: t.defaults.businessType })
    setSelectedTemplateId(t.id)
    setShowTemplates(false)
  }

  function saveBiz() {
    if (!form.name.trim()) return
    const biz: WizardBusiness = {
      id: editingId ?? nanoid(),
      name: form.name.trim(),
      businessType: form.businessType,
      legalType: form.legalType || 'LLC',
      state: form.state,
      ein: form.ein,
      templateId: selectedTemplateId ?? undefined,
    }
    if (editingId) {
      update({ businesses: state.businesses.map(b => b.id === editingId ? biz : b) })
    } else {
      update({ businesses: [...state.businesses, biz] })
    }
    setShowModal(false)
    setForm(BLANK_FORM)
  }

  function removeBiz(id: string) {
    update({
      businesses: state.businesses.filter(b => b.id !== id),
      assignments: state.assignments.filter(a => !(a.assetId === id && a.assetType === 'business')),
    })
  }

  const canSave = form.name.trim().length > 0

  return (
    <StepCard>
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 6px' }}>Do you have any businesses?</h2>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '0 0 24px', lineHeight: 1.6 }}>
        Add each LLC, corporation, partnership, or other business you own (or co-own). You can add as many as you like.
        Skip this step if you don&apos;t have any businesses yet.
      </p>

      {/* Existing businesses */}
      {state.businesses.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {state.businesses.map(biz => (
            <BizCard
              key={biz.id}
              biz={biz}
              onEdit={() => openEdit(biz)}
              onRemove={() => removeBiz(biz.id)}
            />
          ))}
        </div>
      )}

      {/* Add button */}
      <button
        onClick={openNew}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(249,115,22,0.07)',
          border: '1px dashed rgba(249,115,22,0.3)',
          borderRadius: 12,
          padding: '13px 18px',
          fontSize: 14,
          fontWeight: 600,
          color: '#fb923c',
          cursor: 'pointer',
          fontFamily: 'DM Sans, sans-serif',
          width: '100%',
        }}
      >
        <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
        Add a business
      </button>

      <StepNav onPrev={onPrev} onNext={onNext} />

      {/* Add / Edit modal */}
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
            maxWidth: 560,
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '32px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>
                {editingId ? 'Edit business' : 'Add a business'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 18, cursor: 'pointer', padding: '0 4px' }}>✕</button>
            </div>

            {/* Templates picker */}
            {showTemplates && !editingId && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                  Quick-start templates
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {BUSINESS_TEMPLATES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => applyTemplate(t)}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        background: selectedTemplateId === t.id ? 'rgba(249,115,22,0.1)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${selectedTemplateId === t.id ? 'rgba(249,115,22,0.35)' : 'rgba(255,255,255,0.07)'}`,
                        borderRadius: 10,
                        padding: '12px 14px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily: 'DM Sans, sans-serif',
                        transition: 'background 0.15s',
                        width: '100%',
                      }}
                    >
                      <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>{t.icon}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#f5f5f7', marginBottom: 2 }}>{t.name}</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.45 }}>{t.tagline}</div>
                      </div>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowTemplates(false)}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 12, cursor: 'pointer', marginTop: 10, textDecoration: 'underline', padding: 0, fontFamily: 'DM Sans, sans-serif' }}
                >
                  Skip templates — fill in manually
                </button>
              </div>
            )}

            {/* Form fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label="Business name" required>
                <input
                  style={inputStyle}
                  type="text"
                  placeholder="e.g. Smith Rentals LLC"
                  value={form.name}
                  onChange={e => setField({ name: e.target.value })}
                  autoFocus
                />
              </Field>

              <Field label="What does this business do?">
                <select style={selectStyle} value={form.businessType} onChange={e => setField({ businessType: e.target.value })}>
                  <option value="">— choose a category —</option>
                  {BUSINESS_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>

              <Field label="Legal type" tip={TIPS.legalType}>
                <select style={selectStyle} value={form.legalType} onChange={e => setField({ legalType: e.target.value })}>
                  <option value="">— choose legal structure —</option>
                  {LEGAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                {form.legalType && (
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginTop: 6, lineHeight: 1.5 }}>
                    {LEGAL_TYPE_TIP[form.legalType]}
                  </div>
                )}
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="State formed in" tip={TIPS.formationState}>
                  <select style={selectStyle} value={form.state} onChange={e => setField({ state: e.target.value })}>
                    <option value="">— state —</option>
                    {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="EIN (optional)" tip={TIPS.ein}>
                  <input
                    style={inputStyle}
                    type="text"
                    placeholder="12-3456789"
                    value={form.ein}
                    onChange={e => setField({ ein: e.target.value })}
                  />
                </Field>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button
                onClick={saveBiz}
                disabled={!canSave}
                style={{
                  background: canSave ? 'rgba(249,115,22,0.18)' : 'rgba(249,115,22,0.07)',
                  border: `1px solid ${canSave ? 'rgba(249,115,22,0.4)' : 'rgba(249,115,22,0.15)'}`,
                  borderRadius: 10,
                  padding: '10px 22px',
                  fontSize: 13,
                  fontWeight: 700,
                  color: canSave ? '#f97316' : 'rgba(249,115,22,0.4)',
                  cursor: canSave ? 'pointer' : 'not-allowed',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                {editingId ? 'Save changes' : 'Add business'}
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

function BizCard({ biz, onEdit, onRemove }: { biz: WizardBusiness; onEdit: () => void; onRemove: () => void }) {
  const legalLabel = biz.legalType === 'unknown' ? 'Type TBD' : biz.legalType
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      background: 'rgba(249,115,22,0.04)',
      border: '1px solid rgba(249,115,22,0.14)',
      borderRadius: 12,
      padding: '13px 16px',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#f5f5f7' }}>{biz.name}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
          {legalLabel}{biz.state ? ` · ${biz.state}` : ''}{biz.businessType ? ` · ${biz.businessType}` : ''}
        </div>
      </div>
      <button onClick={onEdit} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '5px 12px', fontSize: 12, color: 'rgba(255,255,255,0.55)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Edit</button>
      <button onClick={onRemove} style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8, padding: '5px 10px', fontSize: 12, color: 'rgba(239,68,68,0.7)', cursor: 'pointer' }}>✕</button>
    </div>
  )
}
