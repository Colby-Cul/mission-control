/**
 * Memory — stored agent memories, recalls, categories.
 * Hero metric: Memories stored
 * Animation: Neural net web with synaptic pulses
 * Sources: agent_memory (ComingSoon), memories (ComingSoon), memory_entries (live if exists)
 */
import Hero from '../_components/Hero'
import Achievements from '../_components/Achievements'
import { SpecCard } from '../_components/SpecCard'
import ComingSoon from '../_components/ComingSoon'
import HeroCanvas from './HeroCanvas'
import { getMemoryEntries, getUserProfile } from '../lib/queries'
import { supabase } from '../lib/supabase'
import MemorySearch from './MemorySearch'

export const dynamic = 'force-dynamic'

const ACHIEVEMENTS = [
  { name: 'First Memory',  description: 'The first memory was stored.',                  xp: 100, progress: 100, icon: '🧠', earned: true  },
  { name: 'Memory Bank',   description: '25+ memories stored in the knowledge base.',    xp: 250, progress: 100, icon: '🏦', earned: true  },
  { name: 'Total Recall',  description: 'An agent recalled a memory to solve a task.',   xp: 200, progress: 50,  icon: '💡', earned: false },
  { name: 'Categorized',   description: 'Memories span 3+ categories.',                  xp: 150, progress: 60,  icon: '📁', earned: false },
  { name: 'Top of Mind',   description: 'A single topic recalled 10+ times.',            xp: 300, progress: 20,  icon: '🎯', earned: false },
  { name: 'Long Memory',   description: 'Oldest memory is 90+ days old.',                xp: 350, progress: 10,  icon: '⏳', earned: false },
  { name: 'Neural Net',    description: '100+ memories stored.',                          xp: 500, progress: 8,   icon: '🕸️', earned: false },
  { name: 'Perfect Recall',description: 'Agent accuracy above 95% on memory retrieval.', xp: 750, progress: 3,   icon: '✨', earned: false },
]

async function getAgentMemory() {
  try {
    const { data, error } = await supabase.from('agent_memory').select('*').order('created_at', { ascending: false }).limit(50)
    if (error) return null
    return data ?? []
  } catch { return null }
}

async function getMemories() {
  try {
    const { data, error } = await supabase.from('memories').select('*').order('created_at', { ascending: false }).limit(50)
    if (error) return null
    return data ?? []
  } catch { return null }
}

const CATEGORY_COLORS: Record<string, string> = {
  general: 'var(--orange)', preference: 'var(--purple)', fact: 'var(--green)',
  feedback: 'var(--pink)', task: 'var(--amber)', context: 'var(--purple)',
}

export default async function MemoryPage() {
  const [agentMemory, memories, memoryEntries, profile] = await Promise.all([
    getAgentMemory(),
    getMemories(),
    getMemoryEntries().catch(() => []),
    getUserProfile().catch(() => null),
  ])

  const xpEarned = ACHIEVEMENTS.filter(a => a.earned).reduce((s, a) => s + a.xp, 0)

  // Pick best available source
  const primaryMemories = agentMemory ?? memories ?? (memoryEntries as any[]) ?? []
  const primarySource = agentMemory !== null ? 'agent_memory' : memories !== null ? 'memories' : 'memory_entries'
  const isLive = agentMemory !== null || memories !== null || (memoryEntries as any[]).length > 0

  const totalMemories = primaryMemories.length

  // This week's recalls
  const weekStart = new Date(Date.now() - 7 * 86400000).toISOString()
  const weekRecalls = primaryMemories.filter((m: any) => (m.last_recalled ?? m.recalled_at ?? '') >= weekStart).length

  // Categories breakdown
  const byCategory = primaryMemories.reduce<Record<string, any[]>>((m, entry: any) => {
    const cat = entry.category ?? entry.kind ?? entry.type ?? 'general'
    ;(m[cat] ??= []).push(entry)
    return m
  }, {})
  const categoryCount = Object.keys(byCategory).length

  // Top topic
  const topCat = Object.entries(byCategory).sort(([, a], [, b]) => b.length - a.length)[0]?.[0] ?? '—'

  const playerCard = profile ? {
    name: profile.full_name ?? 'CEO',
    role: profile.role ?? 'Chief Executive',
    level: profile.level ?? 1,
    xpCurrent: profile.xp ?? 0,
    xpNext: profile.xp_next ?? 1000,
    since: profile.since ?? profile.created_at?.slice(0, 7),
    stats: [
      { key: 'Memories',   value: String(totalMemories) },
      { key: 'Recalls/Wk', value: String(weekRecalls) },
      { key: 'Categories', value: String(categoryCount) },
      { key: 'Level',      value: String(profile.level ?? 1) },
    ],
  } : undefined

  return (
    <>
      <Hero
        label="🧠 MEMORY · AGENT KNOWLEDGE"
        greeting="Memories Stored"
        primaryMetric={String(totalMemories)}
        metricSubtitle="memories in knowledge base"
        kpiCards={[
          { label: 'Total',       value: String(totalMemories),  delta: 'stored',    deltaPositive: totalMemories > 0 },
          { label: 'Recalls/Wk', value: String(weekRecalls),    delta: 'this week',  deltaPositive: weekRecalls > 0  },
          { label: 'Categories',  value: String(categoryCount),  delta: 'categories'                                 },
          { label: 'Top Topic',   value: topCat.slice(0, 10),    delta: 'most common'                                },
        ]}
        playerCard={playerCard}
        animationSlot={<HeroCanvas />}
      />

      <Achievements items={ACHIEVEMENTS} xpEarned={xpEarned} />

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Memories', value: String(totalMemories),  color: 'var(--orange)' },
          { label: 'Recalls / Week', value: String(weekRecalls),    color: 'var(--green)'  },
          { label: 'Categories',     value: String(categoryCount),  color: 'var(--purple)' },
          { label: 'Top Topic',      value: topCat,                 color: 'var(--amber)'  },
        ].map(k => (
          <SpecCard key={k.label} accent dataSource={primarySource}>
            <div style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: k.label === 'Top Topic' ? 18 : 32, fontWeight: 700, fontFamily: 'var(--mo)', color: k.color }}>{k.value}</div>
          </SpecCard>
        ))}
      </div>

      {/* Memory Feed */}
      {isLive ? (
        <SpecCard accent dataSource={primarySource} style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dim)' }}>
            Memory Cards ({totalMemories})
          </div>
          {totalMemories === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--dim)' }}>No memories yet — they will appear here as agents learn your preferences and context.</p>
          ) : categoryCount > 1 ? (
            Object.entries(byCategory).map(([cat, items]) => (
              <div key={cat} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: CATEGORY_COLORS[cat] ?? 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                  {cat} ({items.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {items.slice(0, 8).map((e: any) => (
                    <div key={e.id} style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.025)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{e.title ?? e.key ?? e.content?.slice(0, 60) ?? 'Memory'}</div>
                      <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4, lineHeight: 1.5 }}>
                        {e.content ?? e.value ?? e.description ?? ''}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 6, fontFamily: 'var(--mo)' }}>
                        {e.created_at?.slice(0, 10) ?? '—'}
                        {e.recall_count ? ` · recalled ${e.recall_count}×` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {primaryMemories.slice(0, 20).map((e: any) => (
                <div key={e.id} style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.025)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{e.title ?? e.key ?? 'Memory'}</div>
                  <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4 }}>{e.content ?? e.value ?? ''}</div>
                  <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 4, fontFamily: 'var(--mo)' }}>
                    {e.category ?? e.kind ?? 'general'} · {e.created_at?.slice(0, 10) ?? '—'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SpecCard>
      ) : (
        <div style={{ marginBottom: 24 }}>
          <ComingSoon
            title="Memory Cards Feed"
            reason="Browse and search stored memories — facts, preferences, context, and feedback your agents carry across sessions."
            icon="🧠"
            dataSource="coming-soon:agent_memory"
            skeleton="table"
          />
        </div>
      )}

      {/* Client-side search */}
      <div style={{ marginBottom: 24 }}>
        <MemorySearch entries={primaryMemories} />
      </div>

      {/* Category Breakdown (real) */}
      <SpecCard accent dataSource={primarySource} style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Category Breakdown</div>
        {categoryCount === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--dim)' }}>No categories — add memories to see distribution.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(byCategory).sort(([, a], [, b]) => b.length - a.length).map(([cat, items]) => {
              const pct = (items.length / Math.max(1, totalMemories)) * 100
              const col = CATEGORY_COLORS[cat.toLowerCase()] ?? 'var(--dim)'
              return (
                <div key={cat}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                    <span style={{ textTransform: 'capitalize' }}>{cat}</span>
                    <span style={{ fontFamily: 'var(--mo)', color: col }}>{items.length} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: col, borderRadius: 2 }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </SpecCard>
    </>
  )
}
