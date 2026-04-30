'use client'
import React, { useState } from 'react'

// ─── Tooltip (ⓘ info icon) ────────────────────────────────────────────────
export function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <span style={{ position: 'relative', display: 'inline-block', verticalAlign: 'middle', marginLeft: 5 }}>
      <span
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        tabIndex={0}
        role="button"
        aria-label="More info"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: 'rgba(139,92,246,0.18)',
          border: '1px solid rgba(139,92,246,0.35)',
          color: '#a78bfa',
          fontSize: 10,
          fontWeight: 700,
          cursor: 'default',
          lineHeight: 1,
          userSelect: 'none' as const,
        }}
      >
        i
      </span>
      {open && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 8px)',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(10,10,30,0.98)',
          border: '1px solid rgba(139,92,246,0.3)',
          borderRadius: 10,
          padding: '10px 14px',
          fontSize: 12,
          color: 'rgba(255,255,255,0.78)',
          width: 220,
          lineHeight: 1.55,
          zIndex: 999,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          whiteSpace: 'normal' as const,
          textAlign: 'left' as const,
        }}>
          {text}
          {/* caret */}
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid rgba(139,92,246,0.3)',
          }} />
        </div>
      )}
    </span>
  )
}

// ─── Shared tooltip definitions ───────────────────────────────────────────
export const TIPS = {
  entity: 'A legal business, trust, or other organization you\'ve set up. Examples: an LLC, a corporation, a trust.',
  ownershipPct: 'How much of this entity you or someone else owns. All owners\' percentages must add up to 100%.',
  role: 'Your title/role in this entity — e.g. "managing member" for the main person running an LLC, "member" for other owners.',
  formationState: 'The state where this entity was legally registered (e.g. California, Wyoming). Not necessarily where you live.',
  taxClassification: 'How the IRS treats this entity for taxes. Most single-member LLCs are "disregarded" — income flows to your personal return. Partnerships file their own return.',
  trust: 'A legal structure that holds assets on your behalf. Common for estate planning and asset protection. Your trust can own businesses and properties just like you can.',
  ein: 'Employer Identification Number — a 9-digit tax ID for businesses, like a Social Security Number but for your company. Optional to add now.',
  legalType: 'The official structure you chose when forming the business. If you\'re not sure, LLC is the most common and flexible option for small business owners.',
}

// ─── Field wrapper with label + optional tooltip ─────────────────────────
export function Field({
  label,
  tip,
  children,
  required,
  style,
}: {
  label: string
  tip?: string
  children: React.ReactNode
  required?: boolean
  style?: React.CSSProperties
}) {
  return (
    <div style={{ ...style }}>
      <label style={{
        display: 'flex',
        alignItems: 'center',
        fontSize: 12,
        fontWeight: 600,
        color: 'rgba(255,255,255,0.55)',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.08em',
        marginBottom: 7,
        gap: 2,
      }}>
        {label}
        {required && <span style={{ color: '#3b82f6', marginLeft: 3 }}>*</span>}
        {tip && <InfoTip text={tip} />}
      </label>
      {children}
    </div>
  )
}

// ─── Shared input style ───────────────────────────────────────────────────
export const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.055)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  padding: '11px 14px',
  fontSize: 14,
  color: '#f5f5f7',
  fontFamily: 'DM Sans, sans-serif',
  outline: 'none',
  boxSizing: 'border-box' as const,
  transition: 'border-color 0.15s',
}

export const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
}

// ─── Step card wrapper ─────────────────────────────────────────────────────
export function StepCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 18,
      padding: '32px 32px',
      ...style,
    }}>
      {children}
    </div>
  )
}

// ─── Step navigation buttons ──────────────────────────────────────────────
export function StepNav({
  onPrev,
  onNext,
  nextLabel = 'Continue →',
  prevLabel = '← Back',
  showPrev = true,
  nextDisabled = false,
}: {
  onPrev?: () => void
  onNext?: () => void
  nextLabel?: string
  prevLabel?: string
  showPrev?: boolean
  nextDisabled?: boolean
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, gap: 12 }}>
      <div>
        {showPrev && onPrev && (
          <button onClick={onPrev} style={prevBtnStyle}>{prevLabel}</button>
        )}
      </div>
      {onNext && (
        <button
          onClick={onNext}
          disabled={nextDisabled}
          style={{
            ...nextBtnStyle,
            opacity: nextDisabled ? 0.45 : 1,
            cursor: nextDisabled ? 'not-allowed' : 'pointer',
          }}
        >
          {nextLabel}
        </button>
      )}
    </div>
  )
}

const prevBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  padding: '10px 20px',
  fontSize: 13,
  fontWeight: 600,
  color: 'rgba(255,255,255,0.55)',
  cursor: 'pointer',
  fontFamily: 'DM Sans, sans-serif',
}

const nextBtnStyle: React.CSSProperties = {
  background: 'rgba(59,130,246,0.15)',
  border: '1px solid rgba(59,130,246,0.3)',
  borderRadius: 10,
  padding: '11px 26px',
  fontSize: 14,
  fontWeight: 700,
  color: '#3b82f6',
  fontFamily: 'DM Sans, sans-serif',
}

// ─── Toggle switch ────────────────────────────────────────────────────────
export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', userSelect: 'none' as const }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 44,
          height: 24,
          borderRadius: 12,
          background: checked ? 'rgba(59,130,246,0.7)' : 'rgba(255,255,255,0.1)',
          border: `1px solid ${checked ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.15)'}`,
          position: 'relative',
          transition: 'background 0.2s, border-color 0.2s',
          flexShrink: 0,
        }}
      >
        <div style={{
          position: 'absolute',
          top: 2,
          left: checked ? 22 : 2,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.2s',
          boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
        }} />
      </div>
      <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)' }}>{label}</span>
    </label>
  )
}

// ─── US States list ───────────────────────────────────────────────────────
export const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
]
