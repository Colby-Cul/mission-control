'use client'
/**
 * EntityQuickActions — icon-button cluster for entity cards.
 * Pencil: edit entity metadata (EditEntityModal)
 * Share graph icon: edit ownership edges (EditOwnershipModal)
 * Eye: navigate to /companies/[slug]
 *
 * Mounts modals inline (portal-style via fixed positioning built into the modals).
 */
import React, { useState } from 'react'
import EditEntityModal from './EditEntityModal'
import EditOwnershipModal from './EditOwnershipModal'

interface Props {
  entityId: string
  entityName?: string
  slug?: string | null
  /** Callback after any save, so parent can refresh */
  onSaved?: () => void
}

export default function EntityQuickActions({ entityId, entityName = '', slug, onSaved }: Props) {
  const [showEditEntity, setShowEditEntity] = useState(false)
  const [showEditOwnership, setShowEditOwnership] = useState(false)

  function stopPropagation(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
  }

  return (
    <>
      <div
        style={{ display: 'flex', gap: 4, alignItems: 'center' }}
        onClick={stopPropagation}
        onMouseDown={stopPropagation}
      >
        {/* Edit entity metadata */}
        <button
          title="Edit entity"
          style={btn('rgba(249,115,22,0.12)', 'rgba(249,115,22,0.25)')}
          onClick={e => { stopPropagation(e); setShowEditEntity(true) }}
        >
          {/* pencil icon */}
          <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11.05 3L17 8.95l-9.9 9.9H1.05V12.9L11.05 3z"/>
          </svg>
        </button>

        {/* Edit ownership */}
        <button
          title="Edit ownership edges"
          style={btn('rgba(139,92,246,0.12)', 'rgba(139,92,246,0.25)')}
          onClick={e => { stopPropagation(e); setShowEditOwnership(true) }}
        >
          {/* share/graph icon */}
          <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="15" cy="4" r="2.5"/>
            <circle cx="5" cy="10" r="2.5"/>
            <circle cx="15" cy="16" r="2.5"/>
            <line x1="7.4" y1="8.8" x2="12.6" y2="5.2"/>
            <line x1="7.4" y1="11.2" x2="12.6" y2="14.8"/>
          </svg>
        </button>

        {/* Go to detail page */}
        {slug && (
          <a
            href={`/companies/${slug}`}
            title="View detail page"
            style={{ ...btn('rgba(16,185,129,0.10)', 'rgba(16,185,129,0.22)'), display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
            onClick={stopPropagation}
          >
            {/* eye icon */}
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 10S4.5 3 10 3s9 7 9 7-3.5 7-9 7-9-7-9-7z"/>
              <circle cx="10" cy="10" r="2.5"/>
            </svg>
          </a>
        )}
      </div>

      {showEditEntity && (
        <EditEntityModal
          entityId={entityId}
          onClose={() => setShowEditEntity(false)}
          onSaved={() => { onSaved?.(); setShowEditEntity(false) }}
        />
      )}

      {showEditOwnership && (
        <EditOwnershipModal
          entityId={entityId}
          entityName={entityName}
          childType="entity"
          onClose={() => setShowEditOwnership(false)}
          onSaved={() => { onSaved?.(); setShowEditOwnership(false) }}
        />
      )}
    </>
  )
}

function btn(bg: string, hoverBg: string): React.CSSProperties {
  return {
    background: bg,
    border: '1px solid ' + hoverBg,
    borderRadius: 7,
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'rgba(255,255,255,0.7)',
    flexShrink: 0,
    padding: 0,
  }
}
