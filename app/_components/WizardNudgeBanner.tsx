'use client'
/**
 * WizardNudgeBanner — shown on /entities, /companies, and dashboard
 * when there are zero entity_ownership_edges rows.
 * Directs new users to the guided setup wizard.
 */
import React, { useState } from 'react'

interface Props {
  edgeCount: number
}

export default function WizardNudgeBanner({ edgeCount }: Props) {
  const [dismissed, setDismissed] = useState(false)

  if (edgeCount > 0) return null
  if (dismissed) return null

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(139,92,246,0.08) 100%)',
      border: '1px solid rgba(59,130,246,0.22)',
      borderRadius: 16,
      padding: '18px 22px',
      marginBottom: 28,
      display: 'flex',
      alignItems: 'center',
      gap: 18,
      flexWrap: 'wrap' as const,
    }}>
      <div style={{ fontSize: 28 }}>🗺️</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#f5f5f7', marginBottom: 3 }}>
          Set up your ownership structure
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
          You haven&apos;t mapped out who owns what yet. Use our 5-minute guided wizard to add your businesses,
          properties, and ownership percentages — no legal jargon required.
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <a
          href="/setup/ownership"
          style={{
            display: 'inline-block',
            background: 'rgba(59,130,246,0.18)',
            border: '1px solid rgba(59,130,246,0.4)',
            borderRadius: 10,
            padding: '9px 20px',
            fontSize: 13,
            fontWeight: 700,
            color: '#3b82f6',
            textDecoration: 'none',
            whiteSpace: 'nowrap' as const,
          }}
        >
          Start guided setup →
        </a>
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.25)',
            fontSize: 18,
            cursor: 'pointer',
            padding: '4px 6px',
            lineHeight: 1,
          }}
          title="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
