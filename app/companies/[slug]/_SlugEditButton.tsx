'use client'
/**
 * SlugEditButton — the "⚙ Edit" button in the entity detail page hero.
 * Opens EditEntityModal for this entity.
 */
import React, { useState } from 'react'
import EditEntityModal from '../../_components/EditEntityModal'

interface Props {
  entityId: string
  entityName: string
}

export default function SlugEditButton({ entityId, entityName }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 16px',
          background: 'rgba(59,130,246,0.1)',
          border: '1px solid rgba(59,130,246,0.25)',
          borderRadius: 10,
          fontSize: 12,
          fontWeight: 700,
          color: '#3b82f6',
          cursor: 'pointer',
          fontFamily: 'DM Sans, sans-serif',
          letterSpacing: '0.04em',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="10" cy="10" r="3"/>
          <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42"/>
        </svg>
        ⚙ Edit Entity
      </button>

      {open && (
        <EditEntityModal
          entityId={entityId}
          onClose={() => setOpen(false)}
          onSaved={() => { setOpen(false); window.location.reload() }}
        />
      )}
    </>
  )
}
