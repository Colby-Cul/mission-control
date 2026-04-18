'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'mc.calm-mode'

function readStored(): boolean {
  if (typeof window === 'undefined') return false
  try { return window.localStorage.getItem(STORAGE_KEY) === '1' } catch { return false }
}
function writeStored(v: boolean) {
  try { window.localStorage.setItem(STORAGE_KEY, v ? '1' : '0') } catch { /* ignore */ }
}
function apply(v: boolean) {
  if (typeof document === 'undefined') return
  if (v) document.body.setAttribute('data-calm', 'true')
  else document.body.removeAttribute('data-calm')
}

/**
 * Mount once in the root layout. On first render reads the saved preference
 * from localStorage and mirrors it to `<body data-calm="true">`, which the
 * global CSS targets to freeze hero canvases, kill transitions, and de-
 * saturate motion-heavy decoration. Also listens for storage events so the
 * toggle works across tabs.
 */
export function CalmModeProvider() {
  useEffect(() => {
    apply(readStored())
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) apply(e.newValue === '1')
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])
  return null
}

/**
 * UI toggle. Renders as an accessible switch with a short explanation.
 * Drop this into /settings or any page where the user should be able to
 * calm the app down.
 */
export function CalmModeToggle() {
  const [on, setOn] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setOn(readStored())
    setMounted(true)
  }, [])

  const toggle = () => {
    const next = !on
    setOn(next)
    writeStored(next)
    apply(next)
  }

  if (!mounted) return null  // avoid hydration flash

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 16px',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 12,
      gap: 16,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', marginBottom: 2 }}>
          Calm Mode
        </div>
        <div style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.5 }}>
          Freezes hero animations and removes page transitions. Helpful for focus — also auto-enables when your OS has Reduce Motion on.
        </div>
      </div>
      <button
        role="switch"
        aria-checked={on}
        onClick={toggle}
        style={{
          width: 48, height: 26, borderRadius: 13,
          background: on ? 'var(--orange)' : 'rgba(255,255,255,0.15)',
          border: '1px solid rgba(255,255,255,0.15)',
          padding: 2, cursor: 'pointer', position: 'relative',
          transition: 'background 0.15s',
          flexShrink: 0,
        }}
      >
        <span style={{
          display: 'block', width: 20, height: 20, borderRadius: '50%',
          background: '#f5f5f7',
          transform: on ? 'translateX(22px)' : 'translateX(0)',
          transition: 'transform 0.15s',
        }} />
      </button>
    </div>
  )
}
