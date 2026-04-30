'use client'
/**
 * NotificationsDrawer — right-side drawer showing agent runs,
 * incidents, upcoming tax deadlines, and recent activity.
 * Aggregates data from existing tables (no new schema required).
 */
import { useEffect, useState, useCallback } from 'react'
import { X, CheckCheck, Bot, AlertTriangle, Calendar, Activity } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface AgentRun {
  id: string
  agent?: { name?: string; color?: string } | null
  status?: string | null
  task?: string | null
  started_at?: string | null
  ended_at?: string | null
  output?: string | null
}

interface Incident {
  id: string
  title?: string | null
  severity?: string | null
  status?: string | null
  created_at?: string | null
}

interface TaxDeadline {
  id: string
  deadline_name?: string | null
  deadline_date?: string | null
  status?: string | null
}

interface NotifItem {
  id: string
  type: 'agent' | 'incident' | 'tax' | 'activity'
  title: string
  subtitle: string
  timestamp: string | null
  color: string
  seen: boolean
}

const SEEN_KEY = 'mc_notif_seen_ids'

function getSeenIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

function saveSeenIds(ids: Set<string>) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...ids]))
  } catch {}
}

function relativeTime(ts: string | null): string {
  if (!ts) return ''
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function NotificationsDrawer({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<NotifItem[]>([])
  const [loading, setLoading] = useState(true)
  const [seen, setSeen] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    const seenIds = getSeenIds()
    setSeen(new Set(seenIds))

    const results: NotifItem[] = []

    // Agent runs (last 10)
    try {
      const { data } = await supabase
        .from('agent_runs')
        .select('id, status, task, started_at, ended_at, agent:agents(name, color)')
        .order('started_at', { ascending: false })
        .limit(10)
      if (data) {
        for (const r of data as AgentRun[]) {
          const status = (r.status ?? '').toLowerCase()
          results.push({
            id: `ar-${r.id}`,
            type: 'agent',
            title: r.agent?.name ? `Agent: ${r.agent.name}` : 'Agent Run',
            subtitle: r.task ?? status ?? 'no task',
            timestamp: r.started_at ?? null,
            color: status === 'failed' || status === 'error'
              ? 'var(--red)'
              : status === 'success' || status === 'completed'
              ? 'var(--green)'
              : 'var(--cyan)',
            seen: seenIds.has(`ar-${r.id}`),
          })
        }
      }
    } catch {}

    // Incidents (open only)
    try {
      const { data } = await supabase
        .from('incidents')
        .select('id, title, severity, status, created_at')
        .not('status', 'eq', 'resolved')
        .order('created_at', { ascending: false })
        .limit(5)
      if (data) {
        for (const inc of data as Incident[]) {
          results.push({
            id: `inc-${inc.id}`,
            type: 'incident',
            title: inc.title ?? 'Incident',
            subtitle: `${inc.severity ?? 'unknown'} severity · ${inc.status ?? 'open'}`,
            timestamp: inc.created_at ?? null,
            color: 'var(--red)',
            seen: seenIds.has(`inc-${inc.id}`),
          })
        }
      }
    } catch {}

    // Tax deadlines within 30 days
    try {
      const cutoff = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('tax_deadlines')
        .select('id, deadline_name, deadline_date, status')
        .eq('status', 'upcoming')
        .gte('deadline_date', today)
        .lte('deadline_date', cutoff)
        .order('deadline_date', { ascending: true })
        .limit(5)
      if (data) {
        for (const td of data as TaxDeadline[]) {
          results.push({
            id: `td-${td.id}`,
            type: 'tax',
            title: td.deadline_name ?? 'Tax Deadline',
            subtitle: td.deadline_date ? `Due ${td.deadline_date}` : 'upcoming',
            timestamp: td.deadline_date ? `${td.deadline_date}T00:00:00Z` : null,
            color: 'var(--amber)',
            seen: seenIds.has(`td-${td.id}`),
          })
        }
      }
    } catch {}

    setItems(results)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    // Close on Escape
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [load, onClose])

  const markAllRead = () => {
    const newSeen = new Set([...seen, ...items.map(i => i.id)])
    setSeen(newSeen)
    saveSeenIds(newSeen)
    setItems(prev => prev.map(i => ({ ...i, seen: true })))
  }

  const unread = items.filter(i => !seen.has(i.id)).length

  const typeIcon = (type: NotifItem['type']) => {
    if (type === 'agent') return <Bot size={13} />
    if (type === 'incident') return <AlertTriangle size={13} />
    if (type === 'tax') return <Calendar size={13} />
    return <Activity size={13} />
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 800,
          background: 'rgba(0,0,0,0.4)',
        }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 360, zIndex: 801,
        background: 'rgba(12,10,28,0.97)',
        backdropFilter: 'blur(24px)',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)' }}>Notifications</span>
            {unread > 0 && (
              <span style={{
                fontSize: 10, fontWeight: 700, color: '#fff',
                background: 'var(--accent)',
                padding: '2px 7px', borderRadius: 10,
              }}>{unread}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  background: 'none', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8, padding: '5px 10px', color: 'var(--t3)',
                  fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                <CheckCheck size={11} /> Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--t4)', cursor: 'pointer', padding: 4 }}
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {loading && (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--t4)', fontSize: 13 }}>
              Loading…
            </div>
          )}
          {!loading && items.length === 0 && (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--t4)', fontSize: 13 }}>
              No recent notifications
            </div>
          )}
          {!loading && items.map((item) => {
            const isNew = !seen.has(item.id)
            return (
              <div
                key={item.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '12px 20px',
                  background: isNew ? 'rgba(255,255,255,0.025)' : 'transparent',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  cursor: 'default',
                  transition: 'background 0.15s',
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  background: `${item.color}15`,
                  border: `1px solid ${item.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: item.color,
                }}>
                  {typeIcon(item.type)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: isNew ? 600 : 400,
                    color: isNew ? 'var(--t1)' : 'var(--t2)',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    {item.title}
                    {isNew && (
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: 'var(--accent)', flexShrink: 0,
                        display: 'inline-block',
                      }} />
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.subtitle}
                  </div>
                </div>
                <div style={{ fontSize: 10, color: 'var(--t4)', flexShrink: 0, marginTop: 1, fontFamily: 'var(--mo)' }}>
                  {relativeTime(item.timestamp)}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.07)',
          fontSize: 11, color: 'var(--t4)', textAlign: 'center',
        }}>
          Showing agent runs · incidents · tax deadlines (30d)
        </div>
      </div>
    </>
  )
}
