'use client'
/**
 * CommandPalette — ⌘K global command palette.
 * Uses `cmdk` library for fuzzy search + keyboard navigation.
 * Searches pages, entities, properties, transactions, visions, tasks, agents.
 * Wired to Supabase for live entity/vision/task results.
 */
import { useEffect, useState, useCallback } from 'react'
import { Command } from 'cmdk'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

interface ResultItem {
  id: string
  title: string
  subtitle?: string
  kind: 'page' | 'entity' | 'vision' | 'task' | 'agent' | 'property' | 'transaction'
  href: string
  icon: string
}

// Static page list
const PAGES: ResultItem[] = [
  { id: 'p-dashboard',    title: 'Dashboard',        kind: 'page', href: '/',            icon: '◆'  },
  { id: 'p-vision',       title: 'Vision Board',     kind: 'page', href: '/vision',      icon: '✦'  },
  { id: 'p-finance',      title: 'Finance',          kind: 'page', href: '/finance',     icon: '◈'  },
  { id: 'p-cashflow',     title: 'Cash Flow',        kind: 'page', href: '/cash-flow',   icon: '≈'  },
  { id: 'p-companies',    title: 'Companies',        kind: 'page', href: '/companies',   icon: '▦'  },
  { id: 'p-properties',   title: 'Properties',       kind: 'page', href: '/properties',  icon: '⌂'  },
  { id: 'p-projects',     title: 'Projects',         kind: 'page', href: '/projects',    icon: '⬢'  },
  { id: 'p-tasks',        title: 'Tasks',            kind: 'page', href: '/tasks',       icon: '✓'  },
  { id: 'p-tax',          title: 'Tax Center',       kind: 'page', href: '/tax',         icon: '⬡'  },
  { id: 'p-agents',       title: 'Agents',           kind: 'page', href: '/agents',      icon: '◎'  },
  { id: 'p-forge',        title: 'The Forge',        kind: 'page', href: '/forge',       icon: '🔥' },
  { id: 'p-settings',     title: 'Settings',         kind: 'page', href: '/settings',    icon: '⚙'  },
]

const KIND_COLOR: Record<ResultItem['kind'], string> = {
  page:        'var(--purple)',
  entity:      'var(--accent)',
  vision:      'var(--pink)',
  task:        'var(--green)',
  agent:       'var(--cyan)',
  property:    'var(--amber)',
  transaction: 'var(--lime)',
}

export default function CommandPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [liveResults, setLiveResults] = useState<ResultItem[]>([])
  const [loading, setLoading] = useState(false)

  // Live Supabase search
  const search = useCallback(async (q: string) => {
    if (!q || q.length < 2) { setLiveResults([]); return }
    setLoading(true)
    try {
      const [entities, visions, tasks, agents] = await Promise.allSettled([
        supabase
          .from('entity_ownership')
          .select('id, entity_name, slug')
          .ilike('entity_name', `%${q}%`)
          .limit(5),
        supabase
          .from('visions')
          .select('id, title, status')
          .ilike('title', `%${q}%`)
          .limit(5),
        supabase
          .from('tasks')
          .select('id, title, status')
          .ilike('title', `%${q}%`)
          .limit(5),
        supabase
          .from('agents')
          .select('id, name, role')
          .ilike('name', `%${q}%`)
          .limit(5),
      ])

      const results: ResultItem[] = []

      if (entities.status === 'fulfilled' && entities.value.data) {
        for (const e of entities.value.data) {
          results.push({
            id: `e-${e.id}`,
            title: e.entity_name ?? 'Entity',
            kind: 'entity',
            href: `/companies/${e.slug ?? e.id}`,
            icon: '▦',
          })
        }
      }
      if (visions.status === 'fulfilled' && visions.value.data) {
        for (const v of visions.value.data) {
          results.push({
            id: `v-${v.id}`,
            title: v.title ?? 'Vision',
            subtitle: v.status ?? undefined,
            kind: 'vision',
            href: '/vision',
            icon: '✦',
          })
        }
      }
      if (tasks.status === 'fulfilled' && tasks.value.data) {
        for (const t of tasks.value.data) {
          results.push({
            id: `t-${t.id}`,
            title: t.title ?? 'Task',
            subtitle: t.status ?? undefined,
            kind: 'task',
            href: '/tasks',
            icon: '✓',
          })
        }
      }
      if (agents.status === 'fulfilled' && agents.value.data) {
        for (const a of agents.value.data) {
          results.push({
            id: `a-${a.id}`,
            title: a.name ?? 'Agent',
            subtitle: a.role ?? undefined,
            kind: 'agent',
            href: '/agents',
            icon: '◎',
          })
        }
      }

      setLiveResults(results)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => search(query), 200)
    return () => clearTimeout(timer)
  }, [query, search])

  const navigate = (href: string) => {
    onClose()
    router.push(href)
  }

  // Filter static pages by query
  const filteredPages = query.length < 2
    ? PAGES.slice(0, 8)
    : PAGES.filter(p => p.title.toLowerCase().includes(query.toLowerCase()))

  return (
    <div
      className="palette-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div className="palette">
        <Command label="Command palette" shouldFilter={false}>
          <div
            // cmdk renders its own input via [cmdk-input-wrapper]
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid var(--border)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--dim)" strokeWidth="2.5" aria-hidden="true">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search pages, entities, visions, tasks, agents…"
              autoFocus
              style={{
                flex: 1, background: 'none', border: 'none',
                color: 'var(--t1)', fontSize: 16, outline: 'none',
                fontFamily: "'DM Sans', sans-serif",
              }}
            />
            {loading && (
              <span style={{ fontSize: 11, color: 'var(--dim)', fontFamily: 'var(--mo)' }}>…</span>
            )}
            <span
              className="search-kbd"
              style={{ cursor: 'pointer' }}
              onClick={onClose}
              aria-label="Close palette"
            >
              ESC
            </span>
          </div>

          <Command.List style={{ maxHeight: 420, overflowY: 'auto', padding: '8px 0' }}>
            <Command.Empty>
              <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--dim)', fontSize: 13 }}>
                No results for &ldquo;{query}&rdquo;
              </div>
            </Command.Empty>

            {/* Pages */}
            {filteredPages.length > 0 && (
              <Command.Group heading="Pages">
                {filteredPages.map(item => (
                  <Command.Item
                    key={item.id}
                    value={item.title}
                    onSelect={() => navigate(item.href)}
                  >
                    <div className="pres-ico">{item.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div className="pres-t">{item.title}</div>
                    </div>
                    <span
                      className="pres-kind"
                      style={{ color: KIND_COLOR[item.kind] }}
                    >
                      {item.kind}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Live results */}
            {liveResults.length > 0 && (
              <Command.Group heading="Results">
                {liveResults.map(item => (
                  <Command.Item
                    key={item.id}
                    value={item.title}
                    onSelect={() => navigate(item.href)}
                  >
                    <div className="pres-ico">{item.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div className="pres-t">{item.title}</div>
                      {item.subtitle && (
                        <div className="pres-sub">{item.subtitle}</div>
                      )}
                    </div>
                    <span
                      className="pres-kind"
                      style={{ color: KIND_COLOR[item.kind] }}
                    >
                      {item.kind}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  )
}
