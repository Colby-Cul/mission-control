'use client'

import { useState, useTransition } from 'react'
import { Bot, Plus, X, Loader2 } from 'lucide-react'
import { BUILTIN_AGENTS } from '../../../lib/agents'

interface Props {
  projectId: string
  initialAgents: string[]
}

const AGENT_MAP = new Map(BUILTIN_AGENTS.map(a => [a.id, a]))

export default function AssignedAgentsPanel({ projectId, initialAgents }: Props) {
  const [agents, setAgents] = useState<string[]>(initialAgents)
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const unassigned = BUILTIN_AGENTS
    .filter(a => !agents.includes(a.id))
    .filter(a => !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.id.includes(search.toLowerCase()))

  async function save(next: string[]) {
    setError(null)
    startTransition(async () => {
      const res = await fetch(`/api/projects/${projectId}/agents`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agents: next }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? 'Failed to save')
        return
      }
      setAgents(next)
    })
  }

  function remove(agentId: string) {
    save(agents.filter(a => a !== agentId))
  }

  function add(agentId: string) {
    setAdding(false)
    setSearch('')
    save([...agents, agentId])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          <Bot size={13} />
          Assigned Agents
          {isPending && <Loader2 size={11} style={{ opacity: 0.5, animation: 'spin 1s linear infinite' }} />}
        </div>
        <button
          onClick={() => { setAdding(a => !a); setSearch('') }}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)', fontSize: 11, cursor: 'pointer' }}
        >
          <Plus size={11} /> Add
        </button>
      </div>

      {/* Add dropdown */}
      {adding && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 10, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search agents…"
            style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#f5f5f7', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
          />
          <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {unassigned.length === 0 && (
              <div style={{ padding: '6px 4px', color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
                {search ? 'No matches' : 'All agents assigned'}
              </div>
            )}
            {unassigned.map(a => (
              <button
                key={a.id}
                onClick={() => add(a.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, border: 'none', background: 'transparent', color: '#f5f5f7', fontSize: 12, cursor: 'pointer', textAlign: 'left', width: '100%' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <Bot size={12} style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
                <span style={{ fontWeight: 500 }}>{a.name}</span>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginLeft: 'auto' }}>{a.tier}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Assigned chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {agents.length === 0 && (
          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>No agents assigned</span>
        )}
        {agents.map(id => {
          const a = AGENT_MAP.get(id)
          return (
            <div
              key={id}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px', borderRadius: 20, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', fontSize: 12, color: 'rgba(255,255,255,0.85)' }}
            >
              <Bot size={11} style={{ color: 'rgba(99,102,241,0.8)' }} />
              {a?.name ?? id}
              <button
                onClick={() => remove(id)}
                style={{ display: 'flex', alignItems: 'center', marginLeft: 2, padding: 1, borderRadius: '50%', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', lineHeight: 1 }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
              >
                <X size={10} />
              </button>
            </div>
          )
        })}
      </div>

      {error && <div style={{ color: '#ef4444', fontSize: 11 }}>{error}</div>}
    </div>
  )
}
