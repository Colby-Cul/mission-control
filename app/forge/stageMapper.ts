// ─── Forge Pipeline Stage Definitions ────────────────────────────────────────
// Ported from master src/pages/TheForge/utils/stageMapper.js

export const STAGES = [
  { key: 'sourced',    label: 'Sourced',    color: '#94a3b8', accent: '#94a3b8'  },
  { key: 'evaluating', label: 'Evaluating', color: '#facc15', accent: '#facc15' },
  { key: 'approved',   label: 'Approved',   color: '#a78bfa', accent: '#a78bfa' },
  { key: 'building',   label: 'Building',   color: '#60a5fa', accent: '#60a5fa' },
  { key: 'testing',    label: 'Testing',    color: '#fb923c', accent: '#fb923c' },
  { key: 'launched',   label: 'Launched',   color: '#4ade80', accent: '#4ade80' },
] as const

export type StageKey = (typeof STAGES)[number]['key']

export function getStageDef(key: string) {
  return STAGES.find((s) => s.key === key) ?? STAGES[0]
}

export function getStageIndex(key: string): number {
  return STAGES.findIndex((s) => s.key === key)
}

export function nextStage(key: string): StageKey {
  const idx = getStageIndex(key)
  return idx < STAGES.length - 1 ? STAGES[idx + 1].key : key as StageKey
}

export function deriveForgeStage(idea: Record<string, unknown>): StageKey {
  if (idea.forge_stage) return idea.forge_stage as StageKey
  if (idea.status) {
    const s = String(idea.status).toLowerCase()
    if (s === 'launched' || s === 'shipped') return 'launched'
    if (s === 'building') return 'building'
    if (s === 'approved') return 'approved'
    if (s === 'evaluating') return 'evaluating'
    if (s === 'rejected') return 'sourced'
  }
  return 'sourced'
}
