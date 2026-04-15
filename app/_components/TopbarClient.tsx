'use client'
/**
 * TopbarClient — interactive shell of the top bar.
 * Handles:
 *   1. ⌘K command palette
 *   2. Context-aware Export (CSV/JSON by route)
 *   3. Context-aware + New (modal by route)
 *   4. Notifications drawer (agent_runs, incidents, tax_deadlines)
 *   5. LVL / XP bar (tooltip + click → /settings)
 *   6. Avatar dropdown (Profile / Settings / Billing / Logout)
 */
import { useEffect, useState, useCallback, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import CommandPalette from './CommandPalette'
import NotificationsDrawer from './NotificationsDrawer'
import NewThingModal, { type NewType } from './NewThingModal'
import AvatarMenu from './AvatarMenu'
import { exportAsCsv, exportAsJson } from '../lib/export'
import { supabase } from '../lib/supabase'

interface TopbarClientProps {
  currentPage: string
  initials: string
  level: number
  xp: number
  xpNext: number
}

// ── Toast helper ─────────────────────────────────────────────────────────────

function showToast(msg: string, ok = true) {
  const el = document.createElement('div')
  el.textContent = msg
  Object.assign(el.style, {
    position: 'fixed', bottom: '28px', right: '28px',
    background: 'rgba(14,12,30,0.96)',
    border: `1px solid ${ok ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
    borderRadius: '12px', padding: '11px 18px',
    fontSize: '13px', color: ok ? 'var(--green)' : 'var(--red)',
    zIndex: '9999', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    fontFamily: "'DM Sans', sans-serif",
    transition: 'opacity 0.3s',
  })
  document.body.appendChild(el)
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 350) }, 3000)
}

// ── Route-to-NewType map ─────────────────────────────────────────────────────

function newTypeForPath(pathname: string): NewType {
  if (pathname === '/projects' || pathname.startsWith('/projects')) return 'project'
  if (pathname === '/tasks'    || pathname.startsWith('/tasks'))    return 'task'
  if (pathname === '/vision'   || pathname.startsWith('/vision'))   return 'vision'
  if (pathname === '/forge'    || pathname.startsWith('/forge'))    return 'forge'
  if (pathname === '/companies')                                     return 'entity'
  if (pathname === '/agents'   || pathname.startsWith('/agents'))   return 'agent'
  return 'none'
}

// ── Export logic ─────────────────────────────────────────────────────────────

async function runExport(pathname: string) {
  const ts = new Date().toISOString().split('T')[0]

  // /accounts
  if (pathname === '/accounts' || pathname.startsWith('/accounts')) {
    const { data } = await supabase.from('financial_accounts').select('*').order('balance_current', { ascending: false })
    if (!data?.length) { showToast('No accounts data', false); return }
    const n = exportAsCsv(data, `accounts-${ts}`)
    showToast(`Exported ${n} accounts`)
    return
  }

  // /tasks
  if (pathname === '/tasks' || pathname.startsWith('/tasks')) {
    const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false })
    if (!data?.length) { showToast('No tasks data', false); return }
    const n = exportAsCsv(data, `tasks-${ts}`)
    showToast(`Exported ${n} tasks`)
    return
  }

  // /projects
  if (pathname === '/projects' || pathname.startsWith('/projects')) {
    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
    if (!data?.length) { showToast('No projects data', false); return }
    const n = exportAsCsv(data, `projects-${ts}`)
    showToast(`Exported ${n} projects`)
    return
  }

  // /sessions
  if (pathname === '/sessions' || pathname.startsWith('/sessions')) {
    const { data } = await supabase.from('sessions').select('id,title,agent_name,status,cost_usd,tokens,started_at,ended_at').order('started_at', { ascending: false })
    if (!data?.length) { showToast('No sessions data', false); return }
    const n = exportAsCsv(data, `sessions-cost-${ts}`)
    showToast(`Exported ${n} sessions`)
    return
  }

  // /agents
  if (pathname === '/agents' || pathname.startsWith('/agents')) {
    const { data } = await supabase.from('agents').select('*').order('name')
    if (!data?.length) { showToast('No agents data', false); return }
    const n = exportAsCsv(data, `agents-${ts}`)
    showToast(`Exported ${n} agents`)
    return
  }

  // /rentals or /properties
  if (pathname === '/rentals' || pathname === '/properties' || pathname.startsWith('/rentals') || pathname.startsWith('/properties')) {
    const { data } = await supabase.from('property_assets').select('*').order('current_value', { ascending: false })
    if (!data?.length) { showToast('No property data', false); return }
    const n = exportAsCsv(data, `properties-${ts}`)
    showToast(`Exported ${n} properties`)
    return
  }

  // /companies/[slug] — multi-sheet JSON
  const companySlugMatch = pathname.match(/^\/companies\/([^/]+)$/)
  if (companySlugMatch) {
    const slug = companySlugMatch[1]
    const [{ data: entity }, { data: kpis }, { data: accounts }, { data: txns }] = await Promise.all([
      supabase.from('entity_ownership').select('*').eq('slug', slug).single(),
      supabase.from('company_kpis').select('*').eq('entity_id', slug).limit(100),
      supabase.from('financial_accounts').select('*').eq('entity_id', slug),
      supabase.from('financial_transactions').select('*').eq('entity_id', slug).order('date', { ascending: false }).limit(200),
    ])
    const bundle = { entity, kpis: kpis ?? [], accounts: accounts ?? [], transactions: txns ?? [] }
    exportAsJson(bundle, `entity-${slug}-${ts}`)
    showToast('Entity detail exported as JSON')
    return
  }

  // /companies
  if (pathname === '/companies') {
    const { data: entities } = await supabase.from('entity_ownership').select('*').order('entity_name')
    if (!entities?.length) { showToast('No entity data', false); return }
    const n = exportAsCsv(entities, `entities-${ts}`)
    showToast(`Exported ${n} entities`)
    return
  }

  // /forge
  if (pathname === '/forge' || pathname.startsWith('/forge')) {
    const { data } = await supabase.from('forge_ideas').select('*').order('date_added', { ascending: false })
    if (!data?.length) { showToast('No forge ideas', false); return }
    const n = exportAsCsv(data, `forge-ideas-${ts}`)
    showToast(`Exported ${n} ideas`)
    return
  }

  // Fallback — generic JSON
  showToast('No structured export for this page — using JSON fallback')
  exportAsJson({ page: pathname, exported_at: new Date().toISOString() }, `export-${ts}`)
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TopbarClient({
  currentPage,
  initials,
  level,
  xp,
  xpNext,
}: TopbarClientProps) {
  const pathname  = usePathname()
  const router    = useRouter()
  const xpPct     = Math.round((xp / (xpNext || 1)) * 100)
  const xpRef     = useRef<HTMLDivElement>(null)

  // UI state
  const [paletteOpen,   setPaletteOpen]   = useState(false)
  const [notifOpen,     setNotifOpen]     = useState(false)
  const [avatarOpen,    setAvatarOpen]    = useState(false)
  const [newType,       setNewType]       = useState<NewType>('none')
  const [exporting,     setExporting]     = useState(false)
  const [xpTooltip,     setXpTooltip]     = useState(false)

  // Unread badge — lazy
  const [unreadCount, setUnreadCount]     = useState(0)

  // ── Global keyboard shortcut ──────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen(p => !p)
      }
      if (e.key === 'Escape') {
        setPaletteOpen(false)
        setNotifOpen(false)
        setAvatarOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ── Listen for global 'topbar:new' events from page components ────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ type?: NewType }>
      if (ce.detail?.type) setNewType(ce.detail.type)
    }
    window.addEventListener('topbar:new', handler)
    return () => window.removeEventListener('topbar:new', handler)
  }, [])

  // ── Lazy unread count (query once on mount) ───────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function countUnread() {
      try {
        const SEEN_KEY = 'mc_notif_seen_ids'
        let seen: Set<string> = new Set()
        try {
          const raw = localStorage.getItem(SEEN_KEY)
          seen = new Set(raw ? JSON.parse(raw) : [])
        } catch {}

        const [runs, incs, tax] = await Promise.allSettled([
          supabase.from('agent_runs').select('id').order('started_at', { ascending: false }).limit(10),
          supabase.from('incidents').select('id').not('status', 'eq', 'resolved').limit(5),
          (async () => {
            const cutoff = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            const today  = new Date().toISOString().split('T')[0]
            return supabase.from('tax_deadlines').select('id').eq('status','upcoming').gte('deadline_date', today).lte('deadline_date', cutoff).limit(5)
          })(),
        ])

        if (cancelled) return
        let n = 0
        if (runs.status === 'fulfilled' && runs.value.data)
          n += runs.value.data.filter(r => !seen.has(`ar-${r.id}`)).length
        if (incs.status === 'fulfilled' && incs.value.data)
          n += incs.value.data.filter(r => !seen.has(`inc-${r.id}`)).length
        if (tax.status === 'fulfilled' && tax.value.data)
          n += tax.value.data.filter(r => !seen.has(`td-${r.id}`)).length
        setUnreadCount(n)
      } catch {}
    }
    countUnread()
    return () => { cancelled = true }
  }, [notifOpen]) // re-run after drawer closes

  // ── Export handler ────────────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    if (exporting) return
    setExporting(true)
    try {
      await runExport(pathname)
    } catch (err) {
      showToast('Export failed', false)
      console.error(err)
    } finally {
      setExporting(false)
    }
  }, [pathname, exporting])

  // ── + New handler ─────────────────────────────────────────────────────────
  const handleNew = useCallback(() => {
    const t = newTypeForPath(pathname)
    if (t === 'none') {
      // /accounts → scroll to link-account bar
      if (pathname === '/accounts' || pathname.startsWith('/accounts')) {
        const bar = document.querySelector('[data-link-account-bar]') as HTMLElement | null
        if (bar) { bar.scrollIntoView({ behavior: 'smooth' }); bar.focus?.(); return }
      }
      showToast('Nothing to add here yet', false)
      return
    }
    setNewType(t)
  }, [pathname])

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
        <button
          className="btn"
          aria-label="Export current view"
          onClick={handleExport}
          disabled={exporting}
          style={{ opacity: exporting ? 0.6 : 1, cursor: exporting ? 'not-allowed' : undefined }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          {exporting ? 'Exporting…' : 'Export'}
        </button>

        {/* + New */}
        <button
          className="btn btn-g"
          aria-label="Create new item"
          onClick={handleNew}
        >
          + New
        </button>

        {/* Notifications */}
        <div
          className="notif"
          role="button"
          tabIndex={0}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          onClick={() => { setNotifOpen(o => !o); setAvatarOpen(false) }}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setNotifOpen(o => !o) }}
        >
          <Bell size={14} aria-hidden="true" />
          {unreadCount > 0 && (
            <div className="notif-dot" aria-hidden="true" />
          )}
        </div>

        {/* XP chip */}
        <div
          ref={xpRef}
          className="xp"
          aria-label={`Level ${level}, ${xp} of ${xpNext} XP`}
          style={{ cursor: 'pointer', position: 'relative' }}
          onClick={() => { router.push('/settings') }}
          onMouseEnter={() => setXpTooltip(true)}
          onMouseLeave={() => setXpTooltip(false)}
          title={`${xp} / ${xpNext} XP to next level`}
        >
          <span className="xp-lvl">LVL {level}</span>
          <div className="xp-bar" aria-hidden="true">
            <div className="xp-fill" style={{ width: `${xpPct}%` }} />
          </div>
          {xpTooltip && (
            <div style={{
              position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(14,12,30,0.97)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '6px 10px',
              fontSize: 11, color: 'var(--t2)', whiteSpace: 'nowrap',
              fontFamily: 'var(--mo)',
              pointerEvents: 'none', zIndex: 700,
            }}>
              {xp} / {xpNext} XP to next level
            </div>
          )}
        </div>

        {/* Avatar */}
        <div
          className="avatar"
          role="button"
          tabIndex={0}
          aria-label="User menu"
          aria-expanded={avatarOpen}
          onClick={() => { setAvatarOpen(o => !o); setNotifOpen(false) }}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setAvatarOpen(o => !o) }}
        >
          {initials}
        </div>
      </div>

      {/* ── Overlays ── */}

      {paletteOpen && (
        <CommandPalette onClose={() => setPaletteOpen(false)} />
      )}

      {notifOpen && (
        <NotificationsDrawer onClose={() => setNotifOpen(false)} />
      )}

      {avatarOpen && (
        <AvatarMenu initials={initials} onClose={() => setAvatarOpen(false)} />
      )}

      {newType !== 'none' && (
        <NewThingModal
          type={newType}
          onClose={() => setNewType('none')}
          onCreated={() => setNewType('none')}
        />
      )}
    </>
  )
}
