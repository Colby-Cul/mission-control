'use client'
/**
 * Step 5 — Review
 * Shows resulting ownership structure in plain English.
 * Edit buttons per row. Save commits to Supabase.
 */
import React from 'react'
import { WizardState, OwnershipAssignment } from '../OwnershipWizard'
import { StepCard, StepNav, InfoTip, TIPS } from '../WizardHelpers'

interface Props {
  state: WizardState
  update: (patch: Partial<WizardState>) => void
  onNext: () => void
  onPrev: () => void
  onFinish: () => void
  saving: boolean
  saveError: string
}

export default function Step5Review({ state, onPrev, onFinish, saving, saveError }: Props) {
  const { person, businesses, properties, assignments } = state

  // Build plain-English lines
  const lines: { text: string; editStep: number }[] = []

  // Person
  lines.push({
    text: `You (${person.name || 'unnamed'})${person.usTaxpayer ? ' are a US taxpayer' : ''}.`,
    editStep: 1,
  })

  // Trust
  if (person.hasTrust && person.trustName) {
    lines.push({ text: `You have a trust: "${person.trustName}"${person.trustState ? ' (' + person.trustState + ')' : ''}.`, editStep: 1 })
  }

  // Businesses
  for (const biz of businesses) {
    const legalLabel = biz.legalType === 'unknown' ? 'LLC' : biz.legalType
    const stateStr = biz.state ? ` (${biz.state})` : ''
    lines.push({ text: `Business: ${biz.name} — ${legalLabel}${stateStr}`, editStep: 2 })
  }

  // Properties
  for (const prop of properties) {
    const typeLabel = { primary: 'Primary residence', rental: 'Rental', vacation: 'Vacation rental', investment: 'Investment' }[prop.type] ?? prop.type
    lines.push({ text: `Property: ${prop.address} — ${typeLabel}`, editStep: 3 })
  }

  // Build owner map
  const ownerName = (a: OwnershipAssignment): string => {
    if (a.ownerType === 'person') return person.name || 'You'
    if (a.ownerType === 'trust') return person.trustName || 'Your trust'
    const biz = businesses.find(b => b.id === a.ownerId)
    return biz?.name ?? 'Unknown'
  }
  const assetName = (a: OwnershipAssignment): string => {
    if (a.assetType === 'business') return businesses.find(b => b.id === a.assetId)?.name ?? 'Unknown'
    return properties.find(p => p.id === a.assetId)?.address ?? 'Unknown'
  }

  const ownershipLines: string[] = assignments.map(a =>
    `${ownerName(a)} owns ${a.pct}% of ${assetName(a)}${a.role ? ' (as ' + a.role + ')' : ''}.`
  )

  const allEmpty = businesses.length === 0 && properties.length === 0

  return (
    <StepCard>
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 6px' }}>Review your ownership structure</h2>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '0 0 28px', lineHeight: 1.6 }}>
        Here&apos;s what we&apos;ll save. Click any edit button to go back and adjust.
        When you click &quot;Save &amp; Finish,&quot; everything is committed to your account at once.
      </p>

      {allEmpty && (
        <div style={{
          background: 'rgba(245,158,11,0.07)',
          border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: 12,
          padding: '16px 20px',
          marginBottom: 20,
          fontSize: 13,
          color: '#fbbf24',
          lineHeight: 1.55,
        }}>
          You haven&apos;t added any businesses or properties yet. You can go back and add them, or save now and add them later from the Entities page.
        </div>
      )}

      {/* Entity summary */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
          What will be created
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {lines.map((line, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 10, padding: '11px 14px',
            }}>
              <span style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.78)', lineHeight: 1.5 }}>{line.text}</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: 'IBM Plex Mono, monospace', flexShrink: 0 }}>
                Step {line.editStep}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Ownership summary */}
      {ownershipLines.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            Ownership relationships
            <InfoTip text={TIPS.ownershipPct} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ownershipLines.map((line, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'rgba(249,115,22,0.04)',
                border: '1px solid rgba(249,115,22,0.12)',
                borderRadius: 10, padding: '11px 14px',
              }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>→</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>{line}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unassigned warning */}
      {(() => {
        const allAssets = [...businesses.map(b => b.id), ...properties.map(p => p.id)]
        const unassigned = allAssets.filter(id => !assignments.some(a => a.assetId === id))
        if (unassigned.length === 0) return null
        return (
          <div style={{
            background: 'rgba(245,158,11,0.07)',
            border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: 10, padding: '12px 16px',
            fontSize: 12, color: '#fbbf24', lineHeight: 1.5,
            marginBottom: 20,
          }}>
            ⚠ {unassigned.length} asset{unassigned.length > 1 ? 's' : ''} have no owner assigned — you can add ownership later from the Entities page.
          </div>
        )
      })()}

      {/* Error */}
      {saveError && (
        <div style={{
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.22)',
          borderRadius: 10, padding: '12px 16px',
          fontSize: 13, color: '#f87171',
          marginBottom: 16,
        }}>
          Error: {saveError}
        </div>
      )}

      {/* Footer nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 28 }}>
        <button
          onClick={onPrev}
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.55)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
        >
          ← Back
        </button>

        <button
          onClick={onFinish}
          disabled={saving}
          style={{
            background: saving ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.15)',
            border: `1px solid ${saving ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.4)'}`,
            borderRadius: 10, padding: '11px 28px',
            fontSize: 14, fontWeight: 800,
            color: saving ? 'rgba(16,185,129,0.55)' : '#10b981',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontFamily: 'DM Sans, sans-serif',
            opacity: saving ? 0.75 : 1,
          }}
        >
          {saving ? 'Saving…' : 'Save & Finish →'}
        </button>
      </div>
    </StepCard>
  )
}
