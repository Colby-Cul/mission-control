'use client'
/**
 * TopbarClient — interactive shell of the top bar.
 * Handles ⌘K command palette open, export/new button actions.
 */
import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import CommandPalette from './CommandPalette'

interface TopbarClientProps {
  currentPage: string
  initials: string
  level: number
  xp: number
  xpNext: number
}

export default function TopbarClient({
  currentPage,
  initials,
  level,
  xp,
  xpNext,
}: TopbarClientProps) {
  const [paletteOpen, setPaletteOpen] = useState(false)
  const xpPct = Math.round((xp / (xpNext || 1)) * 100)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen(p => !p)
      }
      if (e.key === 'Escape') setPaletteOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <div className="tb" role="banner">
        {/* Breadcrumb */}
        <div className="crumb" aria-label="Breadcrumb">
          Mission Control / <b>{currentPage}</b>
        </div>

        <div className="tb-sp" />

        {/* Search button → opens ⌘K palette */}
        <button
          className="search"
          onClick={() => setPaletteOpen(true)}
          aria-label="Open command palette (⌘K)"
          aria-expanded={paletteOpen}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <span>Search everything…</span>
          <span className="search-kbd">⌘K</span>
        </button>

        {/* Export */}
        <button className="btn" aria-label="Export current view">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export
        </button>

        {/* + New */}
        <button className="btn btn-g" aria-label="Create new item">
          + New
        </button>

        {/* Notifications */}
        <div className="notif" role="button" tabIndex={0} aria-label="Notifications">
          <Bell size={14} aria-hidden="true" />
          <div className="notif-dot" aria-hidden="true" />
        </div>

        {/* XP chip */}
        <div className="xp" aria-label={`Level ${level}, ${xp} of ${xpNext} XP`}>
          <span className="xp-lvl">LVL {level}</span>
          <div className="xp-bar" aria-hidden="true">
            <div className="xp-fill" style={{ width: `${xpPct}%` }} />
          </div>
        </div>

        {/* Avatar */}
        <div
          className="avatar"
          role="button"
          tabIndex={0}
          aria-label="User menu"
        >
          {initials}
        </div>
      </div>

      {/* Command Palette */}
      {paletteOpen && (
        <CommandPalette onClose={() => setPaletteOpen(false)} />
      )}
    </>
  )
}
