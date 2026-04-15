'use client'
/**
 * Step 4 — "Who owns what?"
 * Visual assignment grid: drag (or click) each asset onto an owner box.
 * Supports co-ownership with custom percentages.
 */
import React, { useState } from 'react'
import { WizardState, OwnershipAssignment } from '../OwnershipWizard'
import { StepCard, StepNav, TIPS, InfoTip, inputStyle, selectStyle } from '../WizardHelpers'

interface Props {
  state: WizardState
  update: (patch: Partial<WizardState>) => void
  onNext: () => void
  onPrev: () => void
}

type AssetItem = {
  id: string
  type: 'business' | 'property'
  label: string
  sublabel: string
}

type OwnerBox = {
  id: string
  type: 'person' | 'trust' | 'business'
  label: string
  sublabel: string
  color: string
}

const ROLE_OPTIONS = [
  'managing member', 'member', 'sole member',
  'shareholder', 'trustee', 'beneficiary',
  'general partner', 'limited partner', 'owner',
]

type CoOwnerForm = {
  ownerId: string
  ownerType: string
  pct: string
  role: string
}

export default function Step4WhoOwnsWhat({ state, update, onNext, onPrev }: Props) {
  const [activeAsset, setActiveAsset] = useState<AssetItem | null>(null)
  const [showCoOwner, setShowCoOwner] = useState(false)
  const [coForm, setCoForm] = useState<CoOwnerForm>({ ownerId: '', ownerType: '', pct: '', role: '' })

  // Build asset list
  const assets: AssetItem[] = [
    ...state.businesses.map(b => ({
      id: b.id,
      type: 'business' as const,
      label: b.name,
      sublabel: `${b.legalType === 'unknown' ? 'LLC' : b.legalType}${b.state ? ' · ' + b.state : ''}`,
    })),
    ...state.properties.map(p => ({
      id: p.id,
      type: 'property' as const,
      label: p.address,
      sublabel: p.type,
    })),
  ]

  // Build owner box list
  const owners: OwnerBox[] = [
    {
      id: 'person-me',
      type: 'person',
      label: state.person.name || 'Me',
      sublabel: 'You (individual)',
      color: '#8b5cf6',
    },
    ...(state.person.hasTrust && state.person.trustName ? [{
      id: 'trust-main',
      type: 'trust' as const,
      label: state.person.trustName,
      sublabel: `Trust${state.person.trustState ? ' · ' + state.person.trustState : ''}`,
      color: '#f59e0b',
    }] : []),
    ...state.businesses.map(b => ({
      id: b.id,
      type: 'business' as const,
      label: b.name,
      sublabel: `Business entity`,
      color: '#f97316',
    })),
  ]

  // Get current assignments for an asset
  function getAssignmentsForAsset(assetId: string): OwnershipAssignment[] {
    return state.assignments.filter(a => a.assetId === assetId)
  }

  // Check if asset is assigned
  function isAssigned(assetId: string): boolean {
    return state.assignments.some(a => a.assetId === assetId)
  }

  // Quick-assign: one owner, 100%
  function quickAssign(asset: AssetItem, owner: OwnerBox) {
    // Remove existing assignments for this asset, then add new one
    const filtered = state.assignments.filter(a => a.assetId !== asset.id)
    const role = owner.type === 'person'
      ? (state.businesses.some(b => b.id === asset.id) ? 'managing member' : 'owner')
      : owner.type === 'trust' ? 'owner' : 'managing member'
    update({
      assignments: [...filtered, {
        assetId: asset.id,
        assetType: asset.type,
        ownerId: owner.id,
        ownerType: owner.type,
        pct: 100,
        role,
      }],
    })
  }

  function openCoOwner(asset: AssetItem) {
    setActiveAsset(asset)
    setCoForm({ ownerId: '', ownerType: '', pct: '', role: '' })
    setShowCoOwner(true)
  }

  function addCoOwner() {
    if (!activeAsset || !coForm.ownerId || !coForm.pct) return
    const matchedOwner = owners.find(o => o.id === coForm.ownerId)
    if (!matchedOwner) return
    const newA: OwnershipAssignment = {
      assetId: activeAsset.id,
      assetType: activeAsset.type,
      ownerId: matchedOwner.id,
      ownerType: matchedOwner.type,
      pct: parseFloat(coForm.pct),
      role: coForm.role || 'member',
    }
    // Adjust existing assignments to fit
    const existing = state.assignments.filter(a => a.assetId === activeAsset.id)
    const totalExisting = existing.reduce((s, a) => s + a.pct, 0)
    const newPct = parseFloat(coForm.pct)
    // Reduce existing proportionally if needed
    let updated = existing
    if (totalExisting + newPct > 100) {
      const excess = totalExisting + newPct - 100
      const factor = (totalExisting - excess) / totalExisting
      updated = existing.map(a => ({ ...a, pct: Math.round(a.pct * factor * 10) / 10 }))
    }
    update({
      assignments: [
        ...state.assignments.filter(a => a.assetId !== activeAsset.id),
        ...updated,
        newA,
      ],
    })
    setShowCoOwner(false)
  }

  function removeAssignment(assetId: string, ownerId: string) {
    update({ assignments: state.assignments.filter(a => !(a.assetId === assetId && a.ownerId === ownerId)) })
  }

  function updateAssignmentPct(assetId: string, ownerId: string, pct: number) {
    update({
      assignments: state.assignments.map(a =>
        a.assetId === assetId && a.ownerId === ownerId ? { ...a, pct } : a
      ),
    })
  }

  if (assets.length === 0) {
    return (
      <StepCard>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 10px' }}>Who owns what?</h2>
        <div style={{ padding: '24px 0', fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
          You haven&apos;t added any businesses or properties yet.<br />
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.28)' }}>Go back to add them, or skip to the review step.</span>
        </div>
        <StepNav onPrev={onPrev} onNext={onNext} />
      </StepCard>
    )
  }

  const unassigned = assets.filter(a => !isAssigned(a.id))
  const assigned = assets.filter(a => isAssigned(a.id))

  return (
    <StepCard>
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 6px' }}>Who owns what?</h2>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '0 0 28px', lineHeight: 1.6 }}>
        For each business or property, click the owner that holds it.
        If multiple people or entities share ownership, you can add co-owners with custom percentages.
      </p>

      {/* Unassigned assets */}
      {unassigned.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
            Unassigned — click an owner below each one
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {unassigned.map(asset => (
              <AssetAssignBlock
                key={asset.id}
                asset={asset}
                owners={owners}
                assignments={getAssignmentsForAsset(asset.id)}
                onQuickAssign={owner => quickAssign(asset, owner)}
                onAddCoOwner={() => openCoOwner(asset)}
                onRemove={(ownerId) => removeAssignment(asset.id, ownerId)}
                onUpdatePct={(ownerId, pct) => updateAssignmentPct(asset.id, ownerId, pct)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Assigned assets */}
      {assigned.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#10b981', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
            Assigned ✓
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {assigned.map(asset => (
              <AssetAssignBlock
                key={asset.id}
                asset={asset}
                owners={owners}
                assignments={getAssignmentsForAsset(asset.id)}
                onQuickAssign={owner => quickAssign(asset, owner)}
                onAddCoOwner={() => openCoOwner(asset)}
                onRemove={(ownerId) => removeAssignment(asset.id, ownerId)}
                onUpdatePct={(ownerId, pct) => updateAssignmentPct(asset.id, ownerId, pct)}
              />
            ))}
          </div>
        </div>
      )}

      <StepNav onPrev={onPrev} onNext={onNext} />

      {/* Co-owner modal */}
      {showCoOwner && activeAsset && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setShowCoOwner(false) }}
        >
          <div style={{ background: '#0a0a1a', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20, width: '100%', maxWidth: 440, padding: '28px' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>Add a co-owner</h3>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '0 0 20px' }}>{activeAsset.label}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                  Owner
                </label>
                <select style={selectStyle} value={coForm.ownerId} onChange={e => {
                  const o = owners.find(o => o.id === e.target.value)
                  setCoForm(prev => ({ ...prev, ownerId: e.target.value, ownerType: o?.type ?? '' }))
                }}>
                  <option value="">— select an owner —</option>
                  {owners.map(o => <option key={o.id} value={o.id}>{o.label} ({o.sublabel})</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                  Ownership %
                  <InfoTip text={TIPS.ownershipPct} />
                </label>
                <input
                  style={{ ...inputStyle, width: 140 }}
                  type="number" min="1" max="100" step="0.1"
                  placeholder="50"
                  value={coForm.pct}
                  onChange={e => setCoForm(prev => ({ ...prev, pct: e.target.value }))}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                  Role
                  <InfoTip text={TIPS.role} />
                </label>
                <select style={selectStyle} value={coForm.role} onChange={e => setCoForm(prev => ({ ...prev, role: e.target.value }))}>
                  <option value="">— select role —</option>
                  {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button
                onClick={addCoOwner}
                disabled={!coForm.ownerId || !coForm.pct}
                style={{
                  background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.35)',
                  borderRadius: 10, padding: '9px 20px', fontSize: 13, fontWeight: 700,
                  color: '#a78bfa', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                  opacity: !coForm.ownerId || !coForm.pct ? 0.45 : 1,
                }}
              >
                Add co-owner
              </button>
              <button
                onClick={() => setShowCoOwner(false)}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '9px 16px', fontSize: 13, color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
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

function AssetAssignBlock({
  asset,
  owners,
  assignments,
  onQuickAssign,
  onAddCoOwner,
  onRemove,
  onUpdatePct,
}: {
  asset: AssetItem
  owners: OwnerBox[]
  assignments: OwnershipAssignment[]
  onQuickAssign: (o: OwnerBox) => void
  onAddCoOwner: () => void
  onRemove: (ownerId: string) => void
  onUpdatePct: (ownerId: string, pct: number) => void
}) {
  const assigned = assignments.length > 0
  const totalPct = assignments.reduce((s, a) => s + a.pct, 0)
  const pctOk = Math.abs(totalPct - 100) < 1

  return (
    <div style={{
      background: assigned ? 'rgba(16,185,129,0.035)' : 'rgba(255,255,255,0.025)',
      border: `1px solid ${assigned ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.07)'}`,
      borderRadius: 14,
      padding: '16px 18px',
    }}>
      {/* Asset header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 16 }}>{asset.type === 'business' ? '🏢' : '🏠'}</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#f5f5f7' }}>{asset.label}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'capitalize' }}>{asset.sublabel}</div>
        </div>
        {assigned && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontSize: 10, fontFamily: 'IBM Plex Mono, monospace',
              color: pctOk ? '#10b981' : '#f59e0b',
              background: pctOk ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
              border: `1px solid ${pctOk ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
              borderRadius: 8, padding: '2px 8px',
            }}>
              {totalPct.toFixed(0)}% assigned
            </span>
          </div>
        )}
      </div>

      {/* Current assignments */}
      {assignments.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
          {assignments.map(a => {
            const owner = owners.find(o => o.id === a.ownerId)
            return (
              <div key={a.ownerId} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '7px 10px',
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: owner?.color ?? '#888', flexShrink: 0,
                }} />
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', flex: 1 }}>
                  {owner?.label ?? 'Unknown'}
                </span>
                <input
                  type="number" min="0" max="100" step="1"
                  value={a.pct}
                  onChange={e => onUpdatePct(a.ownerId, parseFloat(e.target.value) || 0)}
                  style={{
                    width: 56, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 6, padding: '3px 6px', fontSize: 12, color: '#f5f5f7', textAlign: 'center',
                    fontFamily: 'IBM Plex Mono, monospace',
                  }}
                />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: 'IBM Plex Mono, monospace' }}>%</span>
                <button onClick={() => onRemove(a.ownerId)} style={{ background: 'none', border: 'none', color: 'rgba(239,68,68,0.5)', cursor: 'pointer', fontSize: 13, padding: '0 2px' }}>✕</button>
              </div>
            )
          })}
        </div>
      )}

      {/* Quick assign owner buttons */}
      {!assigned && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>Who owns this?</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {owners.map(o => (
              <button
                key={o.id}
                onClick={() => onQuickAssign(o)}
                style={{
                  background: `${o.color}12`, border: `1px solid ${o.color}30`,
                  borderRadius: 20, padding: '6px 14px',
                  fontSize: 12, fontWeight: 600, color: o.color,
                  cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add co-owner */}
      <button
        onClick={onAddCoOwner}
        style={{
          background: 'none', border: '1px dashed rgba(139,92,246,0.25)',
          borderRadius: 8, padding: '5px 12px',
          fontSize: 12, color: 'rgba(139,92,246,0.7)',
          cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
        }}
      >
        + Add co-owner / split ownership
      </button>
    </div>
  )
}
