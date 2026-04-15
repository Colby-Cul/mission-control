'use client'
/**
 * CompanyTabs — sticky top-level tab shell for /companies/[slug] pages.
 *
 * Behavior:
 *  - Reads active tab from URL query `?tab=` (client-only), defaults to 'overview'.
 *  - Renders tab triggers with optional count badges and disabled styling.
 *  - Toggles visibility on DOM nodes tagged `data-tab="<id>"`.
 *  - Persists active tab back to the URL (replaceState, no reload).
 *  - On mount, relocates the tab bar DOM to sit immediately after the
 *    page hero (`.hero-banner`) so it appears at the top of the content
 *    area even though the React component is declared below the
 *    dangerouslySetInnerHTML blob.
 *
 * Why DOM toggling rather than React children? The slug page emits a
 * single `dangerouslySetInnerHTML` HTML blob (≈1200 lines of hand-rolled
 * markup). Wrapping sections in React would require a ground-up rewrite.
 * Tagging every section with `data-tab` and flipping `display` is the
 * smallest change that gets us a tabbed UX without disturbing the existing
 * widget renderers (achievements, KPIs, Xome Monday widgets, FUB widgets,
 * ownership, etc.).
 */
import { useEffect, useRef, useState } from 'react'

export interface TabDef {
  id: string
  label: string
  count?: number | null   // shown as a pill next to label
  empty?: boolean         // renders grayed-out + "(empty)"
  hidden?: boolean        // hide entirely
}

interface Props {
  tabs: TabDef[]
  defaultTab?: string
}

export default function CompanyTabs({ tabs, defaultTab = 'overview' }: Props) {
  const [active, setActive] = useState<string>(defaultTab)
  const shellRef = useRef<HTMLDivElement | null>(null)

  // Read initial tab from URL on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    const qp = new URLSearchParams(window.location.search)
    const tab = qp.get('tab')
    if (tab && tabs.some(t => t.id === tab && !t.hidden)) {
      setActive(tab)
    }
  }, [tabs])

  // Relocate the tab bar so it sits directly after the hero banner.
  // The /companies/[slug] page renders a giant dangerouslySetInnerHTML
  // blob first, then this component. By moving the DOM node, the tab bar
  // visually lands at the top of the main content area instead of after
  // the whole HTML blob.
  useEffect(() => {
    if (typeof document === 'undefined') return
    const el = shellRef.current
    if (!el) return
    // Prefer .hero-banner (rendered in both page shapes)
    const hero = document.querySelector<HTMLElement>('.hero-banner')
    if (hero && hero.parentElement && hero.nextElementSibling !== el) {
      hero.parentElement.insertBefore(el, hero.nextElementSibling)
    }
  }, [])

  // Toggle section visibility when active tab changes
  useEffect(() => {
    if (typeof document === 'undefined') return

    // Hide all sections, then show only those belonging to the active tab
    const allSections = document.querySelectorAll<HTMLElement>('[data-tab]')
    allSections.forEach(el => {
      const tabId = el.getAttribute('data-tab')
      el.style.display = tabId === active ? '' : 'none'
    })

    // Persist to URL (without reload)
    try {
      const url = new URL(window.location.href)
      if (active === 'overview') {
        url.searchParams.delete('tab')
      } else {
        url.searchParams.set('tab', active)
      }
      window.history.replaceState(null, '', url.toString())
    } catch {
      // ignore
    }
  }, [active])

  const visibleTabs = tabs.filter(t => !t.hidden)

  return (
    <div
      ref={shellRef}
      style={{
        position: 'sticky',
        top: 72,  // below the main nav
        zIndex: 90,
        background: 'rgba(6,6,16,0.95)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        marginBottom: 28,
        marginTop: -8,
      }}
    >
      <div
        style={{
          width: '86%',
          margin: '0 auto',
          display: 'flex',
          gap: 6,
          overflowX: 'auto',
          padding: '10px 0',
        }}
        role="tablist"
        aria-label="Company sections"
      >
        {visibleTabs.map(t => {
          const isActive = t.id === active
          const isEmpty = !!t.empty
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={isEmpty}
              onClick={() => !isEmpty && setActive(t.id)}
              style={{
                padding: '8px 14px',
                borderRadius: 10,
                border: isActive
                  ? '1px solid rgba(249,115,22,0.35)'
                  : '1px solid rgba(255,255,255,0.06)',
                background: isActive
                  ? 'rgba(249,115,22,0.12)'
                  : 'rgba(255,255,255,0.02)',
                color: isActive
                  ? '#f97316'
                  : isEmpty
                  ? 'rgba(255,255,255,0.25)'
                  : 'rgba(255,255,255,0.75)',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: 'DM Sans, sans-serif',
                letterSpacing: '0.01em',
                textTransform: 'none',
                cursor: isEmpty ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                opacity: isEmpty ? 0.45 : 1,
              }}
            >
              <span>{t.label}</span>
              {t.count != null && t.count > 0 && (
                <span
                  style={{
                    fontSize: 11,
                    padding: '1px 7px',
                    borderRadius: 6,
                    background: isActive
                      ? 'rgba(249,115,22,0.2)'
                      : 'rgba(255,255,255,0.06)',
                    color: isActive ? '#f97316' : 'rgba(255,255,255,0.5)',
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontWeight: 700,
                  }}
                >
                  {t.count}
                </span>
              )}
              {isEmpty && (
                <span
                  style={{
                    fontSize: 10,
                    color: 'rgba(255,255,255,0.3)',
                    fontStyle: 'italic',
                  }}
                >
                  (empty)
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
