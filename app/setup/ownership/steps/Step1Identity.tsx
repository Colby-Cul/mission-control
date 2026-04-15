'use client'
/**
 * Step 1 — "Who are you?"
 * Collects: name, email, US-taxpayer toggle, optional trust info.
 */
import React from 'react'
import { WizardState } from '../OwnershipWizard'
import { Field, Toggle, StepCard, StepNav, inputStyle, selectStyle, US_STATES, TIPS } from '../WizardHelpers'

interface Props {
  state: WizardState
  update: (patch: Partial<WizardState>) => void
  onNext: () => void
  onPrev: () => void
}

export default function Step1Identity({ state, update, onNext }: Props) {
  const p = state.person
  const set = (patch: Partial<typeof p>) =>
    update({ person: { ...p, ...patch } })

  const canContinue = p.name.trim().length > 0

  return (
    <StepCard>
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 6px' }}>Who are you?</h2>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '0 0 28px', lineHeight: 1.6 }}>
        We&apos;ll use this to set you up as an owner in the system. You can always update this later.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <Field label="Your full name" required>
          <input
            style={inputStyle}
            type="text"
            placeholder="Jane Smith"
            value={p.name}
            onChange={e => set({ name: e.target.value })}
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter' && canContinue) onNext() }}
          />
        </Field>
        <Field label="Email address">
          <input
            style={inputStyle}
            type="email"
            placeholder="jane@example.com"
            value={p.email}
            onChange={e => set({ email: e.target.value })}
          />
        </Field>
      </div>

      <div style={{ marginBottom: 24 }}>
        <Toggle
          checked={p.usTaxpayer}
          onChange={v => set({ usTaxpayer: v })}
          label="I file US taxes (US taxpayer)"
        />
      </div>

      {/* Trust section */}
      <div style={{
        background: 'rgba(139,92,246,0.04)',
        border: '1px solid rgba(139,92,246,0.12)',
        borderRadius: 12,
        padding: '18px 20px',
        marginBottom: 8,
      }}>
        <Toggle
          checked={p.hasTrust}
          onChange={v => set({ hasTrust: v, trustName: v ? p.trustName : '', trustState: v ? p.trustState : '' })}
          label="I own things through a trust"
        />
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '8px 0 0', lineHeight: 1.5 }}>
          A trust is a legal structure that holds assets for you or your family — common for estate planning.
          If you have one, we&apos;ll add it as an owner.
        </p>

        {p.hasTrust && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 18 }}>
            <Field label="Trust name" required tip={TIPS.trust}>
              <input
                style={inputStyle}
                type="text"
                placeholder="The Smith Family Trust"
                value={p.trustName}
                onChange={e => set({ trustName: e.target.value })}
              />
            </Field>
            <Field label="State the trust was formed in" tip={TIPS.formationState}>
              <select
                style={selectStyle}
                value={p.trustState}
                onChange={e => set({ trustState: e.target.value })}
              >
                <option value="">— select state —</option>
                {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>
        )}
      </div>

      <StepNav showPrev={false} onNext={onNext} nextDisabled={!canContinue} />
    </StepCard>
  )
}
