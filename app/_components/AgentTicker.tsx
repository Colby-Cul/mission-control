'use client'

import { useEffect, useState } from 'react'
import { listRecentRuns, type AgentRun } from '../lib/agents'

function tickerIcon(payload: Record<string, unknown> | null): string {
  const t = (String(payload?.prompt ?? payload?.task ?? '')).toLowerCase()
  if (t.includes('research') || t.includes('search')) return '🔍'
  if (t.includes('score') || t.includes('analy')) return '📊'
  if (t.includes('deploy') || t.includes('release')) return '🚀'
  if (t.includes('build') || t.includes('creat')) return '🔨'
  if (t.includes('test') || t.includes('valid')) return '🧪'
  return '📥'
}

function statusDot(status: string): string {
  if (status === 'running') return '#10b981'
  if (status === 'done') return '#6b7280'
  if (status === 'error') return '#ef4444'
  return '#f59e0b' // queued
}

interface AgentTickerProps {
  /** Pass pre-fetched runs from server, or leave empty and it will self-fetch client-side */
  initialRuns?: AgentRun[]
  /** Poll interval in ms (default 15000) */
  pollMs?: number
}

export default function AgentTicker({ initialRuns = [], pollMs = 15000 }: AgentTickerProps) {
  const [runs, setRuns] = useState<AgentRun[]>(initialRuns)

  useEffect(() => {
    let mounted = true
    const fetch = () => listRecentRuns(12).then((r) => { if (mounted) setRuns(r) })
    fetch()
    const timer = setInterval(fetch, pollMs)
    return () => { mounted = false; clearInterval(timer) }
  }, [pollMs])

  if (!runs.length) return null

  const items = runs.slice(0, 10)
  // Double for seamless scroll
  const doubled = [...items, ...items]

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 12, padding: '8px 16px', overflow: 'hidden',
      marginBottom: 20,
    }}>
      {/* Label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse 2s infinite' }} />
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#8b5cf6', fontFamily: 'var(--mo)' }}>
          Agent Feed
        </span>
      </div>

      {/* Scrolling strip */}
      <div style={{ overflow: 'hidden', flex: 1, position: 'relative' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 24, whiteSpace: 'nowrap',
          animation: 'ticker 30s linear infinite',
        }}>
          {doubled.map((run, i) => (
            <span key={`${run.id}-${i}`} style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusDot(run.status), display: 'inline-block' }} />
              <span>{tickerIcon(run.payload)}</span>
              <span style={{ color: '#a78bfa', fontWeight: 600 }}>{run.agent_id}</span>
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
              <span>{String(run.payload?.prompt ?? run.payload?.task ?? 'Agent task').slice(0, 48)}</span>
              <span style={{ color: 'rgba(255,255,255,0.2)', marginLeft: 12 }}>|</span>
            </span>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}
