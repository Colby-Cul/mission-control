'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  Plus, Bot, Rocket, BarChart2, List, LayoutGrid, Search,
  TrendingUp, Clock, Zap, X, RefreshCw, ChevronRight, Trash2,
  PackageCheck,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { invokeAgent, listRecentRuns, type AgentRun } from '../lib/agents'
import { formatDbError } from '../lib/format-error'
import AgentTicker from '../_components/AgentTicker'
import AskAgentModal from '../_components/AskAgentModal'
import { STAGES, getStageDef, nextStage, deriveForgeStage, type StageKey } from './stageMapper'
import {
  computeConfidence, computeRevenueEstimate, computeBuildCost,
  computeTimeToMVP, isQuickWin, fmtRevenue, fmtBuildCost, computeROI,
} from './computeMetrics'
import IdeaDetailDrawer, { type ForgeIdeaFull } from './IdeaDetailDrawer'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ForgeIdea {
  id: string
  title?: string
  name?: string
  description?: string
  status?: string
  forge_stage?: string
  confidence_score?: number
  date_added?: string
  source?: string
  category?: string
  [key: string]: unknown
}

interface EnrichedIdea extends ForgeIdea {
  forgeStage: StageKey
  confidenceScore: number
  revenueEstimate: { min: number; max: number; period: string }
  buildCostEstimate: number
  timeToMVP: string
  isQuickWin: boolean
  roi: number | null
}

// ─── Enrich helper ────────────────────────────────────────────────────────────

function enrich(idea: ForgeIdea): EnrichedIdea {
  const forgeStage = deriveForgeStage(idea as Record<string, unknown>) as StageKey
  return {
    ...idea,
    forgeStage,
    confidenceScore: computeConfidence(idea as Record<string, unknown>),
    revenueEstimate: computeRevenueEstimate(idea as Record<string, unknown>),
    buildCostEstimate: computeBuildCost(idea as Record<string, unknown>),
    timeToMVP: computeTimeToMVP(idea as Record<string, unknown>),
    isQuickWin: isQuickWin(idea as Record<string, unknown>),
    roi: computeROI(idea as Record<string, unknown>),
  }
}

function getIdeaName(idea: ForgeIdea): string {
  return String(idea.name ?? idea.title ?? 'Untitled')
}

// ─── Stage badge ─────────────────────────────────────────────────────────────

function StageBadge({ stageKey }: { stageKey: string }) {
  const def = getStageDef(stageKey)
  return (
    <span style={{
      fontSize: 10, padding: '2px 8px', borderRadius: 12,
      background: def.color + '20', color: def.color, fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      {def.label}
    </span>
  )
}

// ─── Confidence bar ───────────────────────────────────────────────────────────

function ConfidenceBar({ score }: { score: number }) {
  const color = score >= 75 ? '#4ade80' : score >= 50 ? '#facc15' : '#ef4444'
  return (
    <div style={{ height: 3, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: 3 }} />
    </div>
  )
}

// ─── Idea Card ────────────────────────────────────────────────────────────────

function IdeaCard({
  idea,
  onClick,
  onDeploy,
  onKill,
  onShelve,
  onAskAgent,
}: {
  idea: EnrichedIdea
  onClick: () => void
  onDeploy: (id: string) => void
  onKill: (id: string) => void
  onShelve: (id: string) => void
  onAskAgent: (idea: EnrichedIdea) => void
}) {
  const stageDef = getStageDef(idea.forgeStage)

  return (
    <div
      onClick={onClick}
      className="mc-card"
      style={{
        borderLeft: `3px solid ${stageDef.color}`,
        borderRadius: 14, padding: 14, cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {/* Badges */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        {idea.isQuickWin && (
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 12, background: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}>
            ⚡ QUICK WIN
          </span>
        )}
        {idea.source === 'agent' && (
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 12, background: 'rgba(139,92,246,0.2)', color: '#a78bfa' }}>
            🤖 Agent
          </span>
        )}
        <div style={{ flex: 1 }} />
        <StageBadge stageKey={idea.forgeStage} />
      </div>

      {/* Title */}
      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--t1)', marginBottom: 4, lineHeight: 1.3 }}>
        {getIdeaName(idea)}
      </div>
      {idea.description && (
        <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 8, lineHeight: 1.5 }}>
          {String(idea.description).slice(0, 80)}{String(idea.description).length > 80 ? '…' : ''}
        </div>
      )}

      {/* 3-col metrics: Revenue / Build Cost / Time to MVP */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 10 }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#4ade80', fontFamily: 'var(--mo)' }}>
            {fmtRevenue(idea.revenueEstimate)}
          </div>
          <div style={{ fontSize: 9, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 2 }}>Rev/mo</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', fontFamily: 'var(--mo)' }}>
            {fmtBuildCost(idea.buildCostEstimate)}
          </div>
          <div style={{ fontSize: 9, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 2 }}>Build Cost</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)' }}>
            {idea.timeToMVP}
          </div>
          <div style={{ fontSize: 9, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 2 }}>MVP</div>
        </div>
      </div>

      {/* ROI badge (when positive) */}
      {idea.roi !== null && idea.roi > 0 && (
        <div style={{ marginBottom: 8, fontSize: 11, color: idea.roi >= 5 ? '#4ade80' : 'var(--t3)', fontFamily: 'var(--mo)', fontWeight: 600 }}>
          ROI: {idea.roi}x
        </div>
      )}

      {/* Tags */}
      {Array.isArray((idea as any).tags) && (idea as any).tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          {((idea as any).tags as string[]).slice(0, 4).map((tag: string) => (
            <span key={tag} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: 'var(--t3)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Confidence */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <span style={{ fontSize: 10, color: 'var(--t4)' }}>Confidence</span>
          <span style={{ fontSize: 10, color: 'var(--t2)', fontFamily: 'var(--mo)' }}>{idea.confidenceScore}%</span>
        </div>
        <ConfidenceBar score={idea.confidenceScore} />
      </div>

      {/* Task progress bar */}
      {(() => {
        const doneCount = Number((idea as any).done_count ?? (idea as any).doneCount ?? 0)
        const taskCount = Number((idea as any).task_count ?? (idea as any).taskCount ?? 0)
        const pct = taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0
        return taskCount > 0 ? (
          <div style={{ marginBottom: 8 }}>
            <div style={{ height: 3, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: '#a78bfa', borderRadius: 3 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
              <span style={{ fontSize: 10, color: 'var(--t4)' }}>{doneCount}/{taskCount} tasks</span>
              <span style={{ fontSize: 10, color: 'var(--t4)' }}>{pct}%</span>
            </div>
          </div>
        ) : null
      })()}

      {/* Actions: Advance / Ask / Shelve / Kill */}
      <div style={{ display: 'flex', gap: 4, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>
        <button onClick={(e) => { e.stopPropagation(); onDeploy(idea.id) }}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '5px 0', fontSize: 10, fontWeight: 600, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 6, color: '#4ade80', cursor: 'pointer' }}>
          <Rocket size={10} /> Advance
        </button>
        <button onClick={(e) => { e.stopPropagation(); onAskAgent(idea) }}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '5px 0', fontSize: 10, fontWeight: 600, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 6, color: '#a78bfa', cursor: 'pointer' }}>
          <Bot size={10} /> Ask
        </button>
        <button onClick={(e) => { e.stopPropagation(); onShelve(idea.id) }}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '5px 0', fontSize: 10, fontWeight: 600, background: 'rgba(100,116,139,0.15)', border: '1px solid rgba(100,116,139,0.3)', borderRadius: 6, color: '#94a3b8', cursor: 'pointer' }}>
          ⏸ Shelve
        </button>
        <button onClick={(e) => { e.stopPropagation(); onKill(idea.id) }}
          style={{ padding: '5px 8px', fontSize: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, color: '#f87171', cursor: 'pointer' }}>
          <X size={10} />
        </button>
      </div>
    </div>
  )
}

// ─── Kanban View ──────────────────────────────────────────────────────────────

function KanbanView({
  ideas,
  onDeploy,
  onKill,
  onShelve,
  onAskAgent,
  onClick,
}: {
  ideas: EnrichedIdea[]
  onDeploy: (id: string) => void
  onKill: (id: string) => void
  onShelve: (id: string) => void
  onAskAgent: (idea: EnrichedIdea) => void
  onClick: (idea: EnrichedIdea) => void
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, alignItems: 'start' }}>
      {STAGES.map((stage) => {
        const stageIdeas = ideas.filter((i) => i.forgeStage === stage.key)
        return (
          <div key={stage.key}>
            {/* Column header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 12px', borderRadius: '12px 12px 0 0',
              background: stage.color + '12', border: `1px solid ${stage.color}30`,
              borderBottom: 'none',
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: stage.color }}>
                {stage.label}
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: stage.color, background: stage.color + '20', padding: '1px 7px', borderRadius: 10, fontFamily: 'var(--mo)' }}>
                {stageIdeas.length}
              </span>
            </div>

            {/* Cards */}
            <div style={{
              border: `1px solid ${stage.color}20`, borderTop: 'none',
              borderRadius: '0 0 12px 12px', padding: 8,
              display: 'flex', flexDirection: 'column', gap: 8, minHeight: 120,
              background: 'rgba(255,255,255,0.01)',
            }}>
              {stageIdeas.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 11, color: 'rgba(255,255,255,0.15)' }}>Empty</div>
              ) : stageIdeas.map((idea) => (
                <IdeaCard key={idea.id} idea={idea} onClick={() => onClick(idea)}
                  onDeploy={onDeploy} onKill={onKill} onShelve={onShelve} onAskAgent={onAskAgent} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Table View ───────────────────────────────────────────────────────────────

function TableView({
  ideas,
  onDeploy,
  onKill,
  onAskAgent,
  onClick,
}: {
  ideas: EnrichedIdea[]
  onDeploy: (id: string) => void
  onKill: (id: string) => void
  onAskAgent: (idea: EnrichedIdea) => void
  onClick?: (idea: EnrichedIdea) => void
}) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
        <thead>
          <tr>
            {['Idea', 'Stage', 'Confidence', 'Revenue Est.', 'Build Cost', 'Time to MVP', 'ROI', ''].map((h) => (
              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'rgba(255,255,255,0.4)', borderBottom: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ideas.map((idea) => (
            <tr key={idea.id} onClick={() => onClick?.(idea)} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: onClick ? 'pointer' : undefined }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.02)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = '' }}>
              <td style={{ padding: '12px 14px' }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--t1)' }}>{getIdeaName(idea)}</div>
                {idea.isQuickWin && <span style={{ fontSize: 10, color: '#f59e0b' }}>⚡ Quick Win</span>}
              </td>
              <td style={{ padding: '12px 14px' }}><StageBadge stageKey={idea.forgeStage} /></td>
              <td style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 100 }}>
                  <ConfidenceBar score={idea.confidenceScore} />
                  <span style={{ fontSize: 11, color: 'var(--t2)', fontFamily: 'var(--mo)', flexShrink: 0 }}>{idea.confidenceScore}%</span>
                </div>
              </td>
              <td style={{ padding: '12px 14px', fontSize: 12, color: '#4ade80', fontFamily: 'var(--mo)', whiteSpace: 'nowrap' }}>{fmtRevenue(idea.revenueEstimate)}</td>
              <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--t2)', fontFamily: 'var(--mo)' }}>{fmtBuildCost(idea.buildCostEstimate)}</td>
              <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--t3)' }}>{idea.timeToMVP}</td>
              <td style={{ padding: '12px 14px', fontSize: 12, color: idea.roi && idea.roi > 5 ? '#4ade80' : 'var(--t3)', fontFamily: 'var(--mo)' }}>
                {idea.roi ? `${idea.roi}x` : '—'}
              </td>
              <td style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => onDeploy(idea.id)} style={{ padding: '5px 10px', fontSize: 11, fontWeight: 600, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 6, color: '#4ade80', cursor: 'pointer' }}>
                    <Rocket size={11} />
                  </button>
                  <button onClick={() => onAskAgent(idea)} style={{ padding: '5px 10px', fontSize: 11, fontWeight: 600, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 6, color: '#a78bfa', cursor: 'pointer' }}>
                    <Bot size={11} />
                  </button>
                  <button onClick={() => onKill(idea.id)} style={{ padding: '5px 10px', fontSize: 11, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, color: '#f87171', cursor: 'pointer' }}>
                    <X size={11} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Pipeline Funnel ─────────────────────────────────────────────────────────

function PipelineFunnel({ ideas }: { ideas: EnrichedIdea[] }) {
  const stageCounts = STAGES.map((s) => ({
    ...s,
    count: ideas.filter((i) => i.forgeStage === s.key).length,
  }))
  const max = Math.max(...stageCounts.map((s) => s.count), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {stageCounts.map((stage, idx) => {
        const width = Math.max((stage.count / max) * 100, 4)
        return (
          <div key={stage.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 80, fontSize: 11, color: stage.color, fontWeight: 600, textAlign: 'right', flexShrink: 0 }}>
              {stage.label}
            </div>
            <div style={{ flex: 1, height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${width}%`, background: stage.color, opacity: 0.7, borderRadius: 6, display: 'flex', alignItems: 'center', paddingLeft: 10, transition: 'width 0.4s' }}>
                {stage.count > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{stage.count}</span>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Review Queue ─────────────────────────────────────────────────────────────

function ReviewQueue({
  ideas,
  onDeploy,
  onKill,
  onAskAgent,
  onClick,
}: {
  ideas: EnrichedIdea[]
  onDeploy: (id: string) => void
  onKill: (id: string) => void
  onAskAgent: (idea: EnrichedIdea) => void
  onClick?: (idea: EnrichedIdea) => void
}) {
  const queue = ideas.filter((i) => i.forgeStage === 'sourced' || i.forgeStage === 'evaluating')
  if (!queue.length) {
    return <div style={{ color: 'var(--t4)', fontSize: 13, textAlign: 'center', padding: 20 }}>Review queue is empty.</div>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {queue.map((idea) => (
        <div key={idea.id} onClick={() => onClick?.(idea)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.025)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', cursor: onClick ? 'pointer' : undefined }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--t1)' }}>{getIdeaName(idea)}</div>
            <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>
              {idea.date_added ?? ''} · Confidence {idea.confidenceScore}%
            </div>
          </div>
          <StageBadge stageKey={idea.forgeStage} />
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button onClick={() => onDeploy(idea.id)} style={{ padding: '5px 10px', fontSize: 11, fontWeight: 600, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 6, color: '#4ade80', cursor: 'pointer' }}>
              Approve
            </button>
            <button onClick={() => onAskAgent(idea)} style={{ padding: '5px 10px', fontSize: 11, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 6, color: '#a78bfa', cursor: 'pointer' }}>
              <Bot size={11} />
            </button>
            <button onClick={() => onKill(idea.id)} style={{ padding: '5px 10px', fontSize: 11, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, color: '#f87171', cursor: 'pointer' }}>
              <X size={11} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Analytics Panel ─────────────────────────────────────────────────────────

function AnalyticsPanel({ ideas }: { ideas: EnrichedIdea[] }) {
  const totalRevPotential = ideas.reduce((s, i) => s + i.revenueEstimate.min, 0)
  const totalBuildCost = ideas.reduce((s, i) => s + i.buildCostEstimate, 0)
  const avgConf = ideas.length ? Math.round(ideas.reduce((s, i) => s + i.confidenceScore, 0) / ideas.length) : 0
  const quickWins = ideas.filter((i) => i.isQuickWin).length
  const highConf = ideas.filter((i) => i.confidenceScore >= 75).length

  const fmt = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
      {[
        { label: 'Rev. Potential', value: fmt(totalRevPotential) + '/mo', color: '#4ade80' },
        { label: 'Total Build Cost', value: fmt(totalBuildCost), color: '#f87171' },
        { label: 'Avg Confidence', value: `${avgConf}%`, color: '#facc15' },
        { label: 'Quick Wins', value: quickWins, color: '#f59e0b' },
        { label: 'High Confidence', value: highConf, color: '#a78bfa' },
      ].map(({ label, value, color }) => (
        <div key={label} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>{label}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
        </div>
      ))}
    </div>
  )
}

// ─── Deploy Modal ─────────────────────────────────────────────────────────────

function DeployModal({
  open,
  idea,
  onConfirm,
  onClose,
}: {
  open: boolean
  idea: EnrichedIdea | null
  onConfirm: (id: string) => Promise<void>
  onClose: () => void
}) {
  const [deploying, setDeploying] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  if (!open || !idea) return null

  const next = nextStage(idea.forgeStage)
  const nextDef = getStageDef(next)
  const currentDef = getStageDef(idea.forgeStage)

  const handleDeploy = async () => {
    setDeploying(true)
    setResult(null)
    try {
      // Advance stage via ops-runner (real OpenClaw agent; 'deployment' was a
      // non-existent stub that errored silently).
      await invokeAgent({
        agentId: 'ops-runner',
        payload: {
          action: 'advance_stage',
          ideaId: idea.id,
          ideaName: getIdeaName(idea),
          fromStage: idea.forgeStage,
          toStage: next,
        },
        contextType: 'forge_idea',
        contextId: idea.id,
      })
      await onConfirm(idea.id)
      setResult({ ok: true, message: `Advanced to ${nextDef.label} and queued deployment agent.` })
      setTimeout(onClose, 1200)
    } catch (e) {
      setResult({ ok: false, message: `Deploy failed: ${formatDbError(e)}` })
    } finally {
      setDeploying(false)
    }
  }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 900 }} onClick={onClose} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: '100%', maxWidth: 440, background: '#0d0a20',
        border: '1px solid rgba(74,222,128,0.3)', borderRadius: 20, padding: 28, zIndex: 901,
        boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(74,222,128,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Rocket size={18} color="#4ade80" />
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--t1)', margin: 0 }}>Deploy Idea</h3>
        </div>

        <div style={{ padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 12, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--t1)', marginBottom: 8 }}>{getIdeaName(idea)}</div>
          <div style={{ fontSize: 13, color: 'var(--t3)' }}>
            Move from <span style={{ color: currentDef.color, fontWeight: 600 }}>{currentDef.label}</span> →{' '}
            <span style={{ color: nextDef.color, fontWeight: 600 }}>{nextDef.label}</span>
          </div>
        </div>

        {next === 'building' && (
          <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.3)', marginBottom: 16, fontSize: 12, color: '#93c5fd' }}>
            This will invoke the deployment agent to generate tasks and begin the build phase.
          </div>
        )}

        {result && (
          <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 12, fontFamily: 'var(--mo)', background: result.ok ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${result.ok ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.3)'}`, color: result.ok ? '#4ade80' : '#f87171' }}>
            {result.message}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ padding: '10px 18px', fontSize: 13, background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'var(--t3)', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleDeploy} disabled={deploying}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', fontSize: 13, fontWeight: 600, background: 'linear-gradient(135deg,#22c55e,#16a34a)', border: 'none', borderRadius: 10, color: '#fff', cursor: deploying ? 'wait' : 'pointer', opacity: deploying ? 0.7 : 1 }}>
            <Rocket size={14} /> {deploying ? 'Deploying…' : `Deploy to ${nextDef.label}`}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Add Idea Modal ───────────────────────────────────────────────────────────

function AddIdeaModal({
  open,
  onClose,
  onAdded,
}: {
  open: boolean
  onClose: () => void
  onAdded: (idea: ForgeIdea) => void
}) {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [stage, setStage] = useState<StageKey>('sourced')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  const handleSave = async () => {
    if (!name.trim()) { setError('Name required'); return }
    setSaving(true); setError('')
    const { data, err } = await (supabase.from('forge_ideas').insert({
      name: name.trim(), description: desc || null,
      status: stage, forge_stage: stage, date_added: new Date().toISOString().slice(0, 10),
    }).select().single() as any)
    setSaving(false)
    if (err ?? !data) { setError('Insert failed — check forge_ideas table exists'); return }
    onAdded(data as ForgeIdea)
    setName(''); setDesc(''); setStage('sourced')
    onClose()
  }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 900 }} onClick={onClose} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '100%', maxWidth: 440, background: '#0d0a20', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 28, zIndex: 901 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--t1)', margin: 0 }}>New Idea</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--t4)', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>Idea Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="What's the idea?"
              style={{ width: '100%', padding: '10px 12px', fontSize: 13, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'var(--t1)', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>Description</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3}
              style={{ width: '100%', padding: '10px 12px', fontSize: 13, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'var(--t1)', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>Initial Stage</label>
            <select value={stage} onChange={(e) => setStage(e.target.value as StageKey)}
              style={{ width: '100%', padding: '10px 12px', fontSize: 13, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'var(--t1)', outline: 'none' }}>
              {STAGES.map((s) => <option key={s.key} value={s.key} style={{ background: '#0d0a20' }}>{s.label}</option>)}
            </select>
          </div>
        </div>
        {error && <div style={{ marginTop: 12, fontSize: 12, color: 'var(--red)' }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: '10px 18px', fontSize: 13, background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'var(--t3)', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: '10px 22px', fontSize: 13, fontWeight: 600, background: 'linear-gradient(135deg,var(--purple),var(--pink))', border: 'none', borderRadius: 10, color: '#fff', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Creating…' : 'Add Idea'}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ForgeClient({
  initialIdeas,
  initialRuns,
}: {
  initialIdeas: ForgeIdea[]
  initialRuns: AgentRun[]
}) {
  const [ideas, setIdeas] = useState<ForgeIdea[]>(initialIdeas)
  const [killed, setKilled] = useState<Set<string>>(new Set())
  const [overrides, setOverrides] = useState<Record<string, Partial<ForgeIdea>>>({})
  const [viewMode, setViewMode] = useState<'kanban' | 'table' | 'funnel'>('kanban')
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'confidence' | 'date' | 'name'>('confidence')
  // Panel starts collapsed so the Kanban is the first thing you see.
  // Click "Review Queue" or "Analytics" in the filter bar to expand below the board.
  const [showPanel, setShowPanel] = useState<'analytics' | 'review' | null>(null)
  const [agentModal, setAgentModal] = useState<{ open: boolean; idea: EnrichedIdea | null }>({ open: false, idea: null })
  const [deployModal, setDeployModal] = useState<{ open: boolean; idea: EnrichedIdea | null }>({ open: false, idea: null })
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const enriched: EnrichedIdea[] = useMemo(() => {
    return ideas
      .filter((i) => !killed.has(i.id))
      .map((i) => enrich({ ...i, ...(overrides[i.id] ?? {}) }))
  }, [ideas, killed, overrides])

  const filtered = useMemo(() => {
    return enriched
      .filter((i) => {
        if (stageFilter !== 'all' && i.forgeStage !== stageFilter) return false
        if (search.trim()) {
          const q = search.toLowerCase()
          if (!getIdeaName(i).toLowerCase().includes(q) && !String(i.description ?? '').toLowerCase().includes(q)) return false
        }
        return true
      })
      .sort((a, b) => {
        if (sortBy === 'confidence') return b.confidenceScore - a.confidenceScore
        if (sortBy === 'date') return String(b.date_added ?? '').localeCompare(String(a.date_added ?? ''))
        return getIdeaName(a).localeCompare(getIdeaName(b))
      })
  }, [enriched, stageFilter, search, sortBy])

  const handleRefresh = async () => {
    setRefreshing(true)
    const { data } = await supabase.from('forge_ideas').select('*').order('date_added', { ascending: false })
    if (data) setIdeas(data as ForgeIdea[])
    setRefreshing(false)
  }

  const handleDeploy = useCallback((id: string) => {
    const idea = filtered.find((i) => i.id === id)
    if (idea) setDeployModal({ open: true, idea })
  }, [filtered])

  const handleDeployConfirm = useCallback(async (id: string) => {
    setOverrides((prev) => {
      const idea = enriched.find((i) => i.id === id)
      if (!idea) return prev
      const next = nextStage(idea.forgeStage)
      return { ...prev, [id]: { ...(prev[id] ?? {}), forge_stage: next, status: next } }
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase.from('forge_ideas').update({ forge_stage: nextStage(enriched.find((i) => i.id === id)?.forgeStage ?? 'sourced') as never, status: nextStage(enriched.find((i) => i.id === id)?.forgeStage ?? 'sourced') }).eq('id', id)
  }, [enriched])

  const handleKill = useCallback(async (id: string) => {
    setKilled((prev) => new Set([...prev, id]))
    await supabase.from('forge_ideas').update({ status: 'killed' }).eq('id', id)
  }, [])

  const handleShelve = useCallback(async (id: string) => {
    setOverrides((prev) => {
      return { ...prev, [id]: { ...(prev[id] ?? {}), forge_stage: 'parked', status: 'parked' } }
    })
    await supabase.from('forge_ideas').update({ forge_stage: 'parked' as never, status: 'parked' }).eq('id', id)
  }, [])

  const handleAdded = (idea: ForgeIdea) => {
    setIdeas((prev) => [idea, ...prev])
  }

  const stats = useMemo(() => ({
    total: enriched.length,
    launching: enriched.filter((i) => i.forgeStage === 'building' || i.forgeStage === 'testing').length,
    review: enriched.filter((i) => i.forgeStage === 'sourced' || i.forgeStage === 'evaluating').length,
    launched: enriched.filter((i) => i.forgeStage === 'launched').length,
    quickWins: enriched.filter((i) => i.isQuickWin).length,
  }), [enriched])

  return (
    <div style={{ padding: 24 }}>
      {/* ── Agent Ticker ── */}
      <AgentTicker initialRuns={initialRuns} pollMs={20000} />

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.12em', fontFamily: 'var(--mo)', marginBottom: 6 }}>
            ≈ THE FORGE · IDEA PIPELINE
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, background: 'linear-gradient(135deg,var(--accent),var(--pink),var(--purple))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            The Forge
          </h1>
          <div style={{ fontSize: 13, color: 'var(--t3)', marginTop: 4 }}>
            {stats.total} ideas · {stats.launching} building · {stats.review} awaiting review · {stats.quickWins} quick wins
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setAddOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px', fontSize: 13, fontWeight: 700, background: 'linear-gradient(135deg,var(--purple),var(--pink))', border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer' }}>
            <Plus size={15} /> New Idea
          </button>
          <button onClick={handleRefresh} disabled={refreshing}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', fontSize: 13, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'var(--t3)', cursor: 'pointer' }}>
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Ideas',  value: stats.total,     color: 'var(--purple)' },
          { label: 'Building',     value: stats.launching, color: '#60a5fa'       },
          { label: 'For Review',   value: stats.review,    color: '#facc15'       },
          { label: 'Launched',     value: stats.launched,  color: '#4ade80'       },
          { label: 'Quick Wins',   value: stats.quickWins, color: '#f59e0b'       },
        ].map(({ label, value, color }) => (
          <div key={label} className="mc-card accent" style={{ padding: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── Controls ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {/* Stage filter */}
        <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}
          style={{ padding: '7px 12px', fontSize: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'var(--t2)', outline: 'none' }}>
          <option value="all" style={{ background: '#0d0a20' }}>All Stages</option>
          {STAGES.map((s) => <option key={s.key} value={s.key} style={{ background: '#0d0a20' }}>{s.label}</option>)}
        </select>
        {/* Sort */}
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          style={{ padding: '7px 12px', fontSize: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'var(--t2)', outline: 'none' }}>
          <option value="confidence" style={{ background: '#0d0a20' }}>Sort: Confidence</option>
          <option value="date" style={{ background: '#0d0a20' }}>Sort: Date</option>
          <option value="name" style={{ background: '#0d0a20' }}>Sort: Name</option>
        </select>
        <div style={{ flex: 1 }} />
        {/* Panel toggles */}
        {(['review', 'analytics'] as const).map((panel) => (
          <button key={panel} onClick={() => setShowPanel(showPanel === panel ? null : panel)}
            style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600, borderRadius: 8, background: showPanel === panel ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)', border: `1px solid ${showPanel === panel ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.08)'}`, color: showPanel === panel ? 'var(--accent)' : 'var(--t4)', cursor: 'pointer', textTransform: 'capitalize' }}>
            {panel === 'analytics' ? <><BarChart2 size={12} style={{ marginRight: 5, verticalAlign: 'middle' }} />Analytics</> : <><PackageCheck size={12} style={{ marginRight: 5, verticalAlign: 'middle' }} />Review Queue</>}
          </button>
        ))}
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--t4)' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search ideas…"
            style={{ padding: '7px 12px 7px 28px', fontSize: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'var(--t1)', outline: 'none', width: 160 }} />
        </div>
        {/* View mode */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, overflow: 'hidden' }}>
          {([['kanban', <LayoutGrid size={14} />], ['table', <List size={14} />], ['funnel', <TrendingUp size={14} />]] as [string, React.ReactNode][]).map(([v, icon]) => (
            <button key={v} onClick={() => setViewMode(v as typeof viewMode)}
              style={{ padding: '7px 11px', border: 'none', background: viewMode === v ? 'rgba(59,130,246,0.2)' : 'transparent', color: viewMode === v ? 'var(--accent)' : 'var(--t4)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main view (Kanban / Table / Funnel) — primary work surface, sits
            above the side panels so it's the first thing the CEO sees on load. */}
      {viewMode === 'kanban' && (
        <KanbanView ideas={filtered} onDeploy={handleDeploy} onKill={handleKill} onShelve={handleShelve}
          onAskAgent={(idea) => setAgentModal({ open: true, idea })}
          onClick={(idea) => setSelectedIdeaId(idea.id)} />
      )}

      {viewMode === 'table' && (
        <div className="mc-card accent" style={{ padding: 0, overflow: 'hidden' }}>
          <TableView ideas={filtered} onDeploy={handleDeploy} onKill={handleKill}
            onAskAgent={(idea) => setAgentModal({ open: true, idea })}
            onClick={(idea) => setSelectedIdeaId(idea.id)} />
        </div>
      )}

      {/* ── Side panels — opt-in, collapsed by default, rendered BELOW the board. */}
      {showPanel === 'analytics' && (
        <div className="mc-card accent" style={{ marginTop: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart2 size={15} style={{ color: 'var(--accent)' }} /> Analytics
          </div>
          <AnalyticsPanel ideas={enriched} />
        </div>
      )}

      {showPanel === 'review' && (
        <div className="mc-card accent" style={{ marginTop: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <PackageCheck size={15} style={{ color: 'var(--accent)' }} /> Review Queue
            <span style={{ fontSize: 11, color: 'var(--t4)', fontWeight: 400 }}>({stats.review} ideas need review)</span>
          </div>
          <ReviewQueue ideas={enriched} onDeploy={handleDeploy} onKill={handleKill} onAskAgent={(idea) => setAgentModal({ open: true, idea })} onClick={(idea) => setSelectedIdeaId(idea.id)} />
        </div>
      )}

      {viewMode === 'funnel' && (
        <div className="mc-card accent">
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)', marginBottom: 16 }}>Pipeline Funnel</div>
          <PipelineFunnel ideas={enriched} />
        </div>
      )}

      {/* ── Modals ── */}
      <AskAgentModal
        open={agentModal.open}
        onClose={() => setAgentModal({ open: false, idea: null })}
        contextType="forge_idea"
        contextId={agentModal.idea?.id}
        contextLabel={agentModal.idea ? getIdeaName(agentModal.idea) : undefined}
      />

      <DeployModal
        open={deployModal.open}
        idea={deployModal.idea}
        onConfirm={handleDeployConfirm}
        onClose={() => setDeployModal({ open: false, idea: null })}
      />

      <AddIdeaModal open={addOpen} onClose={() => setAddOpen(false)} onAdded={handleAdded} />

      {/* ── Idea Detail Drawer ── */}
      <IdeaDetailDrawer
        ideaId={selectedIdeaId}
        allIdeas={enriched as unknown as ForgeIdeaFull[]}
        onClose={() => setSelectedIdeaId(null)}
        onIdeaUpdated={(updated) => {
          setIdeas((prev) => prev.map((i) => i.id === updated.id ? { ...i, ...updated } : i))
        }}
        onAskAgent={(idea) => {
          setSelectedIdeaId(null)
          setAgentModal({ open: true, idea: idea as unknown as EnrichedIdea })
        }}
      />

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
