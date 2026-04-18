'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, Send, Zap } from 'lucide-react'
import { invokeAgent, listAvailableAgents, type Agent } from '../lib/agents'
import { supabase } from '../lib/supabase'
import { formatDbError } from '../lib/format-error'

// Fallback prompts shown when the selected agent has no curated list.
const GENERIC_PROMPTS = [
  'Summarize current status',
  'Identify blockers',
  'Generate action plan',
  'Flag anything unusual',
]

/**
 * Curated quick-prompt chips per agent. Keys are agent ids (see BUILTIN_AGENTS
 * in lib/agents.ts). Add/adjust freely — falls back to GENERIC_PROMPTS when
 * the id isn't mapped.
 *
 * Keep each chip short (<30 chars) and action-oriented — they land in the
 * textarea as the actual prompt body.
 */
const AGENT_PROMPTS: Record<string, string[]> = {
  // Communications & inbox
  'agentmail':         ['Triage unread emails', 'Draft reply to latest thread', 'Flag urgent messages', 'Summarize today\u2019s inbox'],
  'beacon':            ['Push Slack update', 'Send status notification', 'Alert on threshold breach', 'Schedule reminder'],
  'herald':            ['Draft empire-wide announcement', 'Post daily digest', 'Brand health snapshot', 'PR risk scan'],
  'communication-bot': ['Draft team update', 'Post to Slack channel', 'Compose customer email', 'Schedule follow-up'],

  // Finance / accounting
  'bookkeeper':        ['Review this month\u2019s expenses', 'Flag unusual transactions', 'Run vendor spend audit', 'Find margin leakage'],
  'cfo':               ['Forecast next quarter cash flow', 'Run budget-vs-actual', 'Summarize P&L position', 'Identify cost cuts'],
  'tax-advisor':       ['Check Q2 estimated tax', 'Plan year-end tax moves', 'Review entity structure', 'Find deductions'],
  'crypto-analyst':    ['Portfolio snapshot', 'BTC/ETH trend scan', 'Rebalance recommendations', 'DeFi yield check'],
  'stock-analyst':     ['Portfolio performance review', 'Sector rotation ideas', 'Earnings watch this week', 'Rebalance advice'],
  'analytics-bot':     ['Build KPI report', 'Pull weekly metrics', 'Trend analysis on revenue', 'Cohort breakdown'],

  // Research & market
  'maven':             ['Research competitor launches', 'Analyze market share', 'Find growth channels', 'Build buyer persona'],
  'lens':              ['Competitive scan this week', 'Extract market insights', 'Find positioning gaps', 'Summarize industry news'],
  'pulse':             ['Roll up KPIs across entities', 'Flag off-trend metrics', 'Design new KPI dashboard', 'Weekly empire snapshot'],

  // Engineering & coding
  'worker':            ['Implement the next sprint task', 'Fix open PR blockers', 'Write tests for this module', 'Refactor for clarity'],
  'coding-agent':      ['Implement feature spec', 'Review this diff', 'Debug reported issue', 'Add test coverage'],
  'codex':             ['Generate component skeleton', 'Refactor messy function', 'Draft migration script', 'Add type safety'],
  'apex-coder-backup': ['Pick up stalled coding task', 'Heavy refactor pass', 'Rewrite legacy module', 'Audit tech debt'],
  'validator':         ['Validate the latest build', 'Check cron health', 'Regression sweep', 'Audit deploy checklist'],
  'validation':        ['Run pre-deploy checks', 'Validate data integrity', 'Confirm cron still firing', 'QA sweep'],
  'atlas':             ['Architecture review', 'System design RFC', 'Scalability audit', 'Pick next engineering priority'],
  'designer':          ['Review dashboard layout', 'Suggest UX improvements', 'Design new widget', 'Color/typography audit'],
  'echo':              ['Rerun failed task', 'Replay last session', 'Retry with different model', 'Continue prior work'],

  // Ops
  'ops-runner':        ['Refresh Mission Control data', 'Check gateway health', 'Restart a cron', 'Poll latest metrics'],
  'cron':              ['Show cron schedule', 'Force-run a job now', 'Disable a flaky job', 'Audit cron failures'],

  // Assistants
  'assistant':         ['Plan today\u2019s priorities', 'Draft a quick brief', 'Summarize this context', 'Pick next action'],
  'victoria':          ['Plan today\u2019s calendar', 'Draft follow-up emails', 'Prep for next meeting', 'Summarize recent threads'],
  'jarvis':            ['Empire status rollup', 'Coordinate next move', 'Escalate what needs me', 'Daily CEO brief'],

  // ACP / delegation
  'acp-codex':         ['Delegate coding task', 'Route to best coder', 'Rerun with different model', 'Check delegation queue'],
  'acp-defaultagent':  ['Handle this request', 'Route to specialist', 'Pick best agent for job', 'Escalate if unclear'],

  // Models (as passthroughs)
  'claude-opus':       ['Deep reasoning pass', 'Long-form analysis', 'Strategic recommendation', 'Complex write-up'],
  'claude-sonnet':     ['Code + reasoning', 'Balanced analysis', 'Draft + critique', 'General agent work'],
  'default':           ['Handle this request', 'Route to the right agent', 'Summarize + advise'],
}

/** Build the prompt chips for a given agent — curated first, capability-derived next, generic last. */
function promptsForAgent(agent: Agent | null): string[] {
  if (!agent) return GENERIC_PROMPTS
  const id = String(agent.id || '').toLowerCase()
  if (AGENT_PROMPTS[id]) return AGENT_PROMPTS[id]
  // Capability-derived fallback — keep it short and role-flavored.
  const caps = Array.isArray(agent.capabilities) ? agent.capabilities.map(c => String(c).toLowerCase()) : []
  const derived: string[] = []
  if (caps.some(c => c.includes('finance') || c.includes('expense') || c.includes('budget'))) derived.push('Financial status rollup', 'Flag unusual spend')
  if (caps.some(c => c.includes('analy'))) derived.push('Analyze current trend', 'Extract insights')
  if (caps.some(c => c.includes('code') || c.includes('build'))) derived.push('Implement next task', 'Review latest diff')
  if (caps.some(c => c.includes('email') || c.includes('respond'))) derived.push('Triage inbox', 'Draft reply')
  if (caps.some(c => c.includes('research'))) derived.push('Research a topic', 'Market scan')
  if (caps.some(c => c.includes('design'))) derived.push('Design review', 'Suggest UI improvement')
  if (caps.some(c => c.includes('notify') || c.includes('alert') || c.includes('broadcast'))) derived.push('Push notification', 'Schedule alert')
  if (caps.some(c => c.includes('schedul') || c.includes('cron'))) derived.push('Run now', 'Audit schedule')
  if (derived.length) return Array.from(new Set(derived)).slice(0, 5)
  return GENERIC_PROMPTS
}

interface AskAgentModalProps {
  open: boolean
  onClose: () => void
  contextType?: string
  contextId?: string
  contextLabel?: string
  initialPrompt?: string
}

export default function AskAgentModal({
  open,
  onClose,
  contextType,
  contextId,
  contextLabel,
  initialPrompt = '',
}: AskAgentModalProps) {
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState('')
  const [prompt, setPrompt] = useState(initialPrompt)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)
  // Live poll state for the in-flight run so the user actually sees the
  // agent's response (not just "queued"). Status transitions:
  //   queued → running → completed | false_report | error
  const [activeRun, setActiveRun] = useState<{
    id: string
    status: string
    startedAt: number
    output?: string
    error?: string
    verificationReason?: string
  } | null>(null)

  useEffect(() => {
    if (open) {
      listAvailableAgents().then((list) => {
        setAgents(list)
        if (list.length && !selectedAgent) setSelectedAgent(list[0].id)
      })
      setPrompt(initialPrompt)
      setResult(null)
      setActiveRun(null)
    }
  }, [open])

  // Poll the active run every 2s until it reaches a terminal state. Gives
  // up after 120s so a stuck agent doesn't keep the modal open indefinitely.
  useEffect(() => {
    if (!activeRun || !activeRun.id || activeRun.status === 'completed' || activeRun.status === 'error' || activeRun.status === 'false_report') return
    const runId = activeRun.id
    const startedAt = activeRun.startedAt
    let cancelled = false

    const tick = async () => {
      if (cancelled) return
      const { data } = await supabase
        .from('agent_runs')
        .select('id, status, output, error, ended_at')
        .eq('id', runId)
        .maybeSingle()
      if (cancelled) return
      if (data) {
        const row = data as unknown as {
          status: string | null
          output: { tail?: string; verification?: { reason?: string; matched?: string } } | null
          error: string | null
        }
        const nextStatus = row.status ?? 'running'
        const output = row.output?.tail
        const verificationReason = row.output?.verification?.reason
        setActiveRun((prev) => prev && prev.id === runId ? {
          ...prev,
          status: nextStatus,
          output: output ?? prev.output,
          error: row.error ?? prev.error,
          verificationReason: verificationReason ?? prev.verificationReason,
        } : prev)
      }
      // Timeout guard
      if (Date.now() - startedAt > 120_000 && !cancelled) {
        setActiveRun((prev) => prev && prev.id === runId ? {
          ...prev,
          status: 'error',
          error: 'Timed out after 120s — check the Command Deck for the full run record.',
        } : prev)
      }
    }
    const interval = setInterval(tick, 2000)
    tick()
    return () => { cancelled = true; clearInterval(interval) }
  }, [activeRun?.id, activeRun?.status])

  // Chips are computed from the currently-selected agent so switching agents
  // swaps the suggestions to match the agent's actual job.
  const selectedAgentObj = useMemo(
    () => agents.find(a => a.id === selectedAgent) ?? null,
    [agents, selectedAgent],
  )
  const quickPrompts = useMemo(() => promptsForAgent(selectedAgentObj), [selectedAgentObj])

  if (!open) return null

  const handleSend = async () => {
    if (!prompt.trim() || !selectedAgent) return
    setSending(true)
    setResult(null)
    setActiveRun(null)
    try {
      const run = await invokeAgent({
        agentId: selectedAgent,
        payload: { prompt: prompt.trim(), contextLabel },
        contextType,
        contextId,
      })
      // Seed the polling state — the effect above will take over from here.
      const runAny = run as typeof run & { error?: string }
      setActiveRun({
        id: run.id,
        status: run.status,
        startedAt: Date.now(),
        error: runAny.error,
      })
      setResult({ ok: true, message: `Sent to ${selectedAgent}` })
    } catch (e) {
      setResult({ ok: false, message: `Failed: ${formatDbError(e)}` })
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', zIndex: 900 }}
        onClick={onClose}
      />

      {/* Modal — max-height + flex column so the action bar is always in view */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'calc(100% - 32px)', maxWidth: 520,
        maxHeight: 'calc(100vh - 48px)',
        display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(135deg, rgba(15,10,40,0.98), rgba(10,8,30,0.98))',
        border: '1px solid rgba(139,92,246,0.3)',
        borderRadius: 20,
        boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(139,92,246,0.1)',
        zIndex: 901,
        padding: 0,
      }}>
        {/* Header — fixed at top */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '24px 28px 16px', flexShrink: 0 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#8b5cf6,#ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={16} color="#fff" />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: '#f5f5f7', margin: 0 }}>
                {selectedAgentObj ? `Ask ${selectedAgentObj.name}` : 'Ask Agent'}
              </h3>
            </div>
            {selectedAgentObj?.description && (
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 6, marginLeft: 40, lineHeight: 1.4 }}>
                {selectedAgentObj.description}
              </div>
            )}
            {contextLabel && (
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 6, marginLeft: 40 }}>
                Context: <span style={{ color: 'rgba(139,92,246,0.9)' }}>{contextLabel}</span>
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body — fills remaining space */}
        <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '0 28px' }}>

        {/* Agent picker */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 6 }}>
            Select Agent
          </label>
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px', fontSize: 13,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10, color: '#f5f5f7', outline: 'none',
            }}
          >
            {agents.map((a) => (
              <option key={a.id} value={a.id} style={{ background: '#0f0a28' }}>
                {a.name} {a.status === 'active' ? '●' : '○'}
              </option>
            ))}
          </select>
        </div>

        {/* Quick prompts — tailored to the selected agent's job */}
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>
          Quick actions
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {quickPrompts.map((qp) => (
            <button
              key={qp}
              onClick={() => setPrompt(qp)}
              style={{
                fontSize: 11, padding: '4px 10px', borderRadius: 6,
                background: prompt === qp ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${prompt === qp ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.08)'}`,
                color: prompt === qp ? '#a78bfa' : 'rgba(255,255,255,0.5)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {qp}
            </button>
          ))}
        </div>

        {/* Prompt textarea */}
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Type your prompt for the agent…"
          rows={4}
          style={{
            width: '100%', padding: '12px 14px', fontSize: 13,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10, color: '#f5f5f7', outline: 'none',
            resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6,
            boxSizing: 'border-box',
          }}
          onFocus={(e) => { e.target.style.borderColor = 'rgba(139,92,246,0.5)' }}
          onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
        />

        {/* Result feedback + live agent response */}
        {result && (
          <div style={{
            marginTop: 12, padding: '10px 14px', borderRadius: 8, fontSize: 12, fontFamily: 'var(--mo)',
            background: result.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${result.ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            color: result.ok ? '#10b981' : '#ef4444',
          }}>
            {result.message}
          </div>
        )}

        {/* Live run status + streamed response. Polls agent_runs every 2s. */}
        {activeRun && (() => {
          const { status, output, error, verificationReason, id } = activeRun
          const isTerminal = status === 'completed' || status === 'error' || status === 'false_report'
          const headerColor =
            status === 'completed' ? '#10b981' :
            status === 'running'   ? '#60a5fa' :
            status === 'blocked'   ? '#f59e0b' :
            status === 'false_report' ? '#f59e0b' :
            status === 'error' || status === 'failed' ? '#ef4444' : '#9ca3af'
          const headerLabel =
            status === 'completed' ? '✓ Response ready' :
            status === 'running'   ? '▸ Agent is working…' :
            status === 'queued'    ? '▸ Queued — waiting for agent to pick up' :
            status === 'blocked'   ? '⚠ Agent is blocked — needs your input' :
            status === 'false_report' ? '🎭 Agent replied with evasion (not a real answer)' :
            status === 'error' || status === 'failed' ? '✗ Run failed' :
            status
          return (
            <div style={{
              marginTop: 12, padding: '12px 14px', borderRadius: 8, fontSize: 12,
              background: 'rgba(15,23,42,0.6)',
              border: `1px solid ${headerColor}40`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: output || error ? 10 : 0 }}>
                <div style={{ color: headerColor, fontWeight: 600, fontFamily: 'var(--mo)' }}>
                  {headerLabel}
                </div>
                <div style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--mo)' }}>
                  {id.slice(0, 8)}…
                  {!isTerminal && <span style={{ marginLeft: 8 }}>• {Math.floor((Date.now() - activeRun.startedAt) / 1000)}s</span>}
                </div>
              </div>
              {verificationReason && (
                <div style={{
                  fontSize: 11, color: '#f59e0b', background: 'rgba(245,158,11,0.08)',
                  padding: '6px 10px', borderRadius: 4, marginBottom: 10,
                  fontFamily: 'var(--mo)',
                }}>
                  Truthfulness layer flagged: {verificationReason}. Agent produced deferral instead of a real answer. Retry with a more specific prompt.
                </div>
              )}
              {output && (
                <div style={{
                  maxHeight: 280, overflowY: 'auto',
                  fontSize: 13, lineHeight: 1.55, color: 'var(--t1)',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  fontFamily: 'inherit',
                }}>
                  {output}
                </div>
              )}
              {error && !output && (
                <div style={{ fontSize: 12, color: '#ef4444', fontFamily: 'var(--mo)' }}>
                  {error}
                </div>
              )}
              {!output && !error && (
                <div style={{ fontSize: 11, color: 'var(--dim)', fontFamily: 'var(--mo)' }}>
                  Typical runs take 10–60s. You can close this modal — the run continues in the background and shows up on the Command Deck.
                </div>
              )}
            </div>
          )
        })()}

        {/* /end scrollable body */}
        </div>

        {/* Action bar — pinned at bottom, always visible */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 10,
          padding: '16px 28px 24px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
          background: 'rgba(10,8,30,0.6)',
        }}>
          <button
            onClick={onClose}
            style={{ padding: '10px 18px', fontSize: 13, background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!prompt.trim() || !selectedAgent || sending}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', fontSize: 13, fontWeight: 600,
              background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)',
              border: 'none', borderRadius: 10, color: '#fff',
              cursor: prompt.trim() && selectedAgent && !sending ? 'pointer' : 'not-allowed',
              opacity: !prompt.trim() || !selectedAgent || sending ? 0.5 : 1,
            }}
          >
            <Send size={14} />
            {sending ? 'Sending…' : 'Send to Agent'}
          </button>
        </div>
      </div>
    </>
  )
}
