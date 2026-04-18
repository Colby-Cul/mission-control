'use client'
import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

type NavItem = { label: string; icon: string; href: string; badgeKey?: 'forge' | 'projects' | 'tasks' | 'photos' | 'team' | 'companies' | 'properties' }
type NavGroup = { title: string; groupIcon: string; items: NavItem[] }

const PINNED: NavItem[] = [
  { label: 'Dashboard',    icon: '◆', href: '/' },
  { label: 'Vision Board', icon: '✦', href: '/vision' },
  { label: 'The Forge',    icon: '🔥', href: '/forge', badgeKey: 'forge' },
]

const GROUPS: NavGroup[] = [
  { title: 'Finance',     groupIcon: '💰', items: [
    { label: 'Finance',    icon: '◈', href: '/finance' },
    { label: 'Cash Flow',  icon: '≈', href: '/cash-flow' },
    { label: 'Tax Center', icon: '⬡', href: '/tax' },
  ]},
  { title: 'Work',        groupIcon: '💼', items: [
    { label: 'Projects',   icon: '⬢', href: '/projects', badgeKey: 'projects' },
    { label: 'Tasks',      icon: '✓', href: '/tasks',    badgeKey: 'tasks' },
  ]},
  { title: 'Assets',      groupIcon: '🏠', items: [
    { label: 'Companies',     icon: '▦', href: '/companies',  badgeKey: 'companies' },
    { label: 'Properties',    icon: '⌂', href: '/properties', badgeKey: 'properties' },
    { label: 'Rentals',       icon: '🏝', href: '/rentals' },
    { label: 'Photo Manager', icon: '📷', href: '/photos',    badgeKey: 'photos' },
    { label: 'Entity Map',    icon: '🗺', href: '/entities' },
  ]},
  { title: 'Engineering', groupIcon: '⚡', items: [
    { label: 'Skill Lab',     icon: '🧪', href: '/skills' },
    { label: 'Activity Feed', icon: '📡', href: '/activity' },
    { label: 'Sessions',      icon: '🕐', href: '/sessions' },
  ]},
  { title: 'Documents',   groupIcon: '📄', items: [
    { label: 'Docs Hub',         icon: '📘', href: '/docs' },
    { label: 'Workspace Files',  icon: '📁', href: '/files' },
    { label: 'Legal Docs',       icon: '⚖', href: '/legal' },
    { label: 'Memory & Knowledge', icon: '🧠', href: '/memory' },
  ]},
  { title: 'Operations',  groupIcon: '🖥', items: [
    { label: 'System Monitor',  icon: '📊', href: '/monitor' },
    { label: 'Incident Room',   icon: '🚨', href: '/incidents' },
    { label: 'Integrations Hub',icon: '🔌', href: '/integrations' },
  ]},
  { title: 'People',      groupIcon: '👥', items: [
    { label: 'Team',      icon: '👤', href: '/team',  badgeKey: 'team' },
    { label: 'The Floor', icon: '🏢', href: '/floor' },
  ]},
  { title: 'System',      groupIcon: '⚙', items: [
    { label: 'Settings',  icon: '⚙', href: '/settings' },
  ]},
]

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [closed, setClosed] = useState<Set<string>>(new Set())
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [badges, setBadges] = useState<Record<string, number>>({})

  // Fetch live counts for nav badges
  useEffect(() => {
    ;(async () => {
      const [forge, projects, tasks, photos, team, companies, properties] = await Promise.all([
        supabase.from('forge_ideas').select('id', { count: 'exact', head: true }).eq('status', 'new'),
        supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).neq('status', 'completed'),
        supabase.from('property_photos').select('id', { count: 'exact', head: true }),
        supabase.from('agents').select('id', { count: 'exact', head: true }),
        supabase.from('entity_ownership').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('property_assets').select('id', { count: 'exact', head: true }),
      ])
      setBadges({
        forge: forge.count ?? 0,
        projects: projects.count ?? 0,
        tasks: tasks.count ?? 0,
        photos: photos.count ?? 0,
        team: team.count ?? 0,
        companies: companies.count ?? 0,
        properties: properties.count ?? 0,
      })
    })()
  }, [])

  // ⌘K for command palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setPaletteOpen(p => !p) }
      if (e.key === 'Escape') setPaletteOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const toggleGroup = (t: string) => {
    setClosed(s => { const n = new Set(s); n.has(t) ? n.delete(t) : n.add(t); return n })
  }

  const currentLabel = [...PINNED, ...GROUPS.flatMap(g => g.items)]
    .find(i => i.href === pathname)?.label ?? 'Dashboard'

  return (
    <div className="app">
      <aside className="sb">
        <div className="sb-brand">
          <div className="sb-logo">MC</div>
          <div>
            <div className="sb-brand-t">Mission Control</div>
            <div className="sb-brand-s">v7 · CEO</div>
          </div>
        </div>

        <div className="sb-pinned">
          {PINNED.map(item => (
            <Link key={item.href} href={item.href} className={`sb-item ${pathname === item.href ? 'on' : ''}`}>
              <span className="sb-item-ico" style={item.label === 'The Forge' ? { color: 'var(--orange)' } : undefined}>{item.icon}</span>
              {item.label}
              {item.badgeKey && (badges[item.badgeKey] ?? 0) > 0 && (
                <span className="sb-badge">{badges[item.badgeKey]}</span>
              )}
            </Link>
          ))}
        </div>

        {GROUPS.map(group => (
          <div key={group.title} className={`sb-grp ${closed.has(group.title) ? 'closed' : ''}`}>
            <div className="sb-grp-h" onClick={() => toggleGroup(group.title)}>
              <span className="sb-grp-ico">{group.groupIcon}</span>
              {group.title}
              <span className="sb-grp-caret">▾</span>
            </div>
            {group.items.map(item => (
              <Link key={item.href} href={item.href} className={`sb-item ${pathname === item.href ? 'on' : ''}`}>
                <span className="sb-item-ico">{item.icon}</span>
                {item.label}
                {item.badgeKey && (badges[item.badgeKey] ?? 0) > 0 && (
                  <span className="sb-badge">{badges[item.badgeKey]}</span>
                )}
              </Link>
            ))}
          </div>
        ))}
      </aside>

      <div className="main">
        <div className="tb">
          <div className="crumb">Mission Control / <b>{currentLabel}</b></div>
          <div className="tb-sp" />
          <div className="search" onClick={() => setPaletteOpen(true)}>
            <span>🔍</span><span>Search everything…</span><span className="search-kbd">⌘K</span>
          </div>
          <button className="btn">Export</button>
          <button className="btn btn-g">+ New</button>
          <div className="notif">🔔<div className="notif-dot" /></div>
          {/* LVL/XP rendered by TopbarWrapper — don't hardcode a level here */}
          <div className="avatar">C</div>
        </div>
        <div className="page">{children}</div>
      </div>

      {paletteOpen && (
        <div className="palette-overlay" onClick={e => { if (e.target === e.currentTarget) setPaletteOpen(false) }}>
          <div className="palette">
            <div className="palette-input">
              <span>🔍</span>
              <input autoFocus placeholder="Search pages, entities, docs, visions, tasks, agents…" />
              <span className="search-kbd">ESC</span>
            </div>
            <div className="palette-results">
              {[...PINNED, ...GROUPS.flatMap(g => g.items)].slice(0, 10).map(i => (
                <div key={i.href} className="pres" onClick={() => { setPaletteOpen(false); router.push(i.href) }}>
                  <div className="pres-ico">{i.icon}</div>
                  <div className="pres-t">{i.label}</div>
                  <span className="pres-kind">page</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
