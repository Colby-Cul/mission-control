'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'

export const TIME_RANGES = [
  { key: 'all',      label: 'All time' },
  { key: 'today',    label: 'Today' },
  { key: 'yesterday',label: 'Yesterday' },
  { key: 'week',     label: 'Last week' },
  { key: 'month',    label: 'Last 1 month' },
  { key: '3mo',      label: 'Last 3 months' },
  { key: '6mo',      label: 'Last 6 months' },
  { key: 'ytd',      label: 'YTD' },
  { key: 'year',     label: 'Last year' },
] as const

export type TimeRangeKey = typeof TIME_RANGES[number]['key']

/**
 * TimeRangeSelector — the 8-option dropdown shown top-right of CEO-style
 * dashboards. Writes `range=<key>` into the URL; server component reads
 * searchParams and passes to query helpers. No client-state gymnastics.
 */
export default function TimeRangeSelector({
  paramName = 'range',
  defaultRange = 'ytd',
}: {
  paramName?: string
  defaultRange?: TimeRangeKey
}) {
  const router = useRouter()
  const pathname = usePathname()
  const search = useSearchParams()
  const current = (search.get(paramName) ?? defaultRange) as TimeRangeKey
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  function pick(key: TimeRangeKey) {
    setOpen(false)
    const params = new URLSearchParams(search.toString())
    params.set(paramName, key)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const label = TIME_RANGES.find((r) => r.key === current)?.label ?? current

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          fontSize: 11, fontFamily: 'var(--mo)', fontWeight: 700,
          padding: '6px 12px', borderRadius: 8,
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
          color: 'var(--t2)', cursor: 'pointer', letterSpacing: '.04em',
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}
      >
        {label}
        <span style={{ opacity: 0.5 }}>▾</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', right: 0,
          background: '#14102a', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 10, padding: 4, zIndex: 50, minWidth: 180,
          boxShadow: '0 8px 28px rgba(0,0,0,0.5)',
        }}>
          {TIME_RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => pick(r.key)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '7px 10px', borderRadius: 6,
                background: r.key === current ? 'rgba(249,115,22,0.12)' : 'transparent',
                color: r.key === current ? 'var(--orange)' : 'var(--t2)',
                border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: r.key === current ? 700 : 500,
              }}
              onMouseEnter={(e) => {
                if (r.key !== current) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'
              }}
              onMouseLeave={(e) => {
                if (r.key !== current) (e.currentTarget as HTMLElement).style.background = 'transparent'
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Server helper: converts a URL range key into a {start, end} date pair.
 * Returns null for 'all' so callers can skip the date filter.
 */
export function resolveRange(key: string | undefined | null): { start: string; end: string } | null {
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const k = String(key ?? 'ytd').toLowerCase()
  const d = (days: number) => new Date(now.getTime() - days * 86400000).toISOString().slice(0, 10)
  switch (k) {
    case 'all':       return null
    case 'today':     return { start: today, end: today }
    case 'yesterday': return { start: d(1), end: d(1) }
    case 'week':      return { start: d(7), end: today }
    case 'month':     return { start: d(30), end: today }
    case '3mo':       return { start: d(90), end: today }
    case '6mo':       return { start: d(180), end: today }
    case 'year':      return { start: d(365), end: today }
    case 'ytd':
    default:          return { start: `${now.getUTCFullYear()}-01-01`, end: today }
  }
}
