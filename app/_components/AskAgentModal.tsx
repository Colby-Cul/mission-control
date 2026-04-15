'use client'

import { useState, useEffect } from 'react'
import { X, Send, Zap } from 'lucide-react'
import { invokeAgent, listAvailableAgents, type Agent } from '../lib/agents'

const QUICK_PROMPTS = [
  'Research competitors',
  'Estimate build cost',
  'Find potential customers',
  'Analyze market size',
  'Generate action plan',
  'Draft announcement copy',
  'Identify blockers',
  'Summarize current status',
]

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

  useEffect(() => {
    if (open) {
      listAvailableAgents().then((list) => {
        setAgents(list)
        if (list.length && !selectedAgent) setSelectedAgent(list[0].id)
      })
      setPrompt(initialPrompt)
      setResult(null)
    }
  }, [open])

  if (!open) return null

  const handleSend = async () => {
    if (!prompt.trim() || !selectedAgent) return
    setSending(true)
    setResult(null)
    try {
      const run = await invokeAgent({
        agentId: selectedAgent,
        payload: { prompt: prompt.trim(), contextLabel },
        contextType,
        contextId,
      })
      setResult({ ok: true, message: `Run queued — ID ${run.id.slice(0, 8)}… Status: ${run.status}` })
    } catch (e) {
      setResult({ ok: false, message: `Failed: ${e instanceof Error ? e.message : String(e)}` })
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

      {/* Modal */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '100%', maxWidth: 520,
        background: 'linear-gradient(135deg, rgba(15,10,40,0.98), rgba(10,8,30,0.98))',
        border: '1px solid rgba(139,92,246,0.3)',
        borderRadius: 20,
        boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(139,92,246,0.1)',
        zIndex: 901,
        padding: 28,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#8b5cf6,#ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={16} color="#fff" />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: '#f5f5f7', margin: 0 }}>Ask Agent</h3>
            </div>
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

        {/* Quick prompts */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {QUICK_PROMPTS.map((qp) => (
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

        {/* Result feedback */}
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

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
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
