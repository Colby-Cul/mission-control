/**
 * Skills Lab — skill tree, XP, practice sessions, next milestones.
 * Hero metric: Skills practiced (unlocked count)
 * Animation: Constellation/skill-tree nodes lighting up sequentially
 * Sources: skills (live), skill_progress (ComingSoon)
 */
import Hero from '../_components/Hero'
import Achievements from '../_components/Achievements'
import { SpecCard } from '../_components/SpecCard'
import ComingSoon from '../_components/ComingSoon'
import HeroCanvas from './HeroCanvas'
import { getSkills, getUserProfile } from '../lib/queries'
import { supabase } from '../lib/supabase'

export const dynamic = 'force-dynamic'

const ACHIEVEMENTS = [
  { name: 'First Skill',   description: 'Unlocked your first skill.',                   xp: 100, progress: 100, icon: '⚡', earned: true  },
  { name: 'Skill Builder', description: 'Unlocked 5 skills in the registry.',            xp: 250, progress: 100, icon: '🏗️', earned: true  },
  { name: 'Week Streak',   description: 'Practiced skills 7 days in a row.',             xp: 350, progress: 60,  icon: '🔥', earned: false },
  { name: 'Specialist',    description: 'Mastered a full skill category.',               xp: 500, progress: 30,  icon: '🎯', earned: false },
  { name: 'XP Hoarder',   description: 'Earned 5,000 XP from skill practice.',          xp: 400, progress: 20,  icon: '💎', earned: false },
  { name: 'Next Level',    description: 'Reached Level 10 in the skill system.',         xp: 600, progress: 10,  icon: '🚀', earned: false },
  { name: 'Full Roster',   description: 'All 12 core skills unlocked.',                  xp: 750, progress: 8,   icon: '🌟', earned: false },
  { name: 'Constellation', description: 'Completed the entire skill constellation.',    xp: 1000, progress: 2,  icon: '✨', earned: false },
]

async function getSkillProgress() {
  try {
    const { data, error } = await supabase.from('skill_progress').select('*').order('updated_at', { ascending: false }).limit(30)
    if (error) return null
    return data ?? []
  } catch { return null }
}

const CATEGORY_COLORS: Record<string, string> = {
  finance: 'var(--green)', strategy: 'var(--pink)', agents: 'var(--purple)',
  tax: 'var(--amber)', invest: 'var(--orange)', systems: 'var(--purple)',
  automation: 'var(--green)', legal: 'var(--amber)', marketing: 'var(--pink)',
}

export default async function SkillsPage() {
  const [skills, skillProgress, profile] = await Promise.all([
    getSkills().catch(() => []),
    getSkillProgress(),
    getUserProfile().catch(() => null),
  ])

  const xpEarned = ACHIEVEMENTS.filter(a => a.earned).reduce((s, a) => s + a.xp, 0)
  const skillList = (skills as any[]) ?? []
  const progressList = (skillProgress as any[]) ?? []

  const unlockedCount = skillList.filter((s: any) => s.unlocked || s.status === 'active').length || skillList.length

  // This week's XP from skill_progress (if available)
  const weekStart = new Date(Date.now() - 7 * 86400000).toISOString()
  const weekXP = progressList
    .filter((p: any) => (p.created_at ?? '') >= weekStart)
    .reduce((sum: number, p: any) => sum + Number(p.xp_earned ?? 0), 0)

  // Streak from profile
  const streak = profile?.streak ?? 0

  // Next milestone skill
  const lockedSkills = skillList.filter((s: any) => !s.unlocked && s.status !== 'active')
  const nextSkill = lockedSkills[0]

  // Group skills by category
  const byCategory = skillList.reduce<Record<string, any[]>>((m, s: any) => {
    const cat = s.category ?? 'Uncategorized'
    ;(m[cat] ??= []).push(s)
    return m
  }, {})

  const playerCard = profile ? {
    name: profile.full_name ?? 'CEO',
    role: profile.role ?? 'Chief Executive',
    level: profile.level ?? 1,
    xpCurrent: profile.xp ?? 0,
    xpNext: profile.xp_next ?? 1000,
    since: profile.since ?? profile.created_at?.slice(0, 7),
    stats: [
      { key: 'Skills',   value: String(unlockedCount) },
      { key: 'XP/Week',  value: weekXP > 0 ? String(weekXP) : '—' },
      { key: 'Streak',   value: `${streak}d` },
      { key: 'Level',    value: String(profile.level ?? 1) },
    ],
  } : undefined

  return (
    <>
      <Hero
        label="⚡ SKILLS LAB · CAPABILITY TREE"
        greeting="Skills Practiced"
        primaryMetric={String(unlockedCount)}
        metricSubtitle="skills unlocked"
        kpiCards={[
          { label: 'Unlocked',    value: String(unlockedCount),           delta: `of ${skillList.length}`,   deltaPositive: unlockedCount > 0 },
          { label: 'XP This Week',value: weekXP > 0 ? String(weekXP) : '—',  delta: 'skill practice'                                        },
          { label: 'Streak',      value: `${streak}d`,                   delta: streak > 0 ? 'keep it up' : 'start today', deltaPositive: streak > 0 },
          { label: 'Next',        value: nextSkill?.name?.slice(0, 10) ?? '—', delta: nextSkill ? 'next unlock' : 'all done'                },
        ]}
        playerCard={playerCard}
        animationSlot={<HeroCanvas />}
      />

      <Achievements items={ACHIEVEMENTS} xpEarned={xpEarned} />

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Skills Unlocked', value: String(unlockedCount),              color: 'var(--orange)' },
          { label: 'XP This Week',    value: weekXP > 0 ? String(weekXP) : '—', color: 'var(--purple)' },
          { label: 'Current Streak',  value: `${streak}d`,                       color: 'var(--green)'  },
          { label: 'Next Milestone',  value: nextSkill?.name?.slice(0, 10) ?? '—', color: 'var(--amber)' },
        ].map(k => (
          <SpecCard key={k.label} accent dataSource="skills">
            <div style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: k.label === 'Next Milestone' ? 18 : 32, fontWeight: 700, fontFamily: 'var(--mo)', color: k.color }}>{k.value}</div>
          </SpecCard>
        ))}
      </div>

      {/* Skill Tree Grid — live from skills table */}
      <SpecCard accent dataSource="skills" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dim)' }}>
          Skill Registry ({skillList.length})
        </div>
        {skillList.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--dim)' }}>No skills in registry yet — add rows to the <code>skills</code> table.</p>
        ) : Object.keys(byCategory).length > 0 ? (
          Object.entries(byCategory).map(([cat, catSkills]) => (
            <div key={cat} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: CATEGORY_COLORS[cat.toLowerCase()] ?? 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                {cat}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                {catSkills.map((s: any) => {
                  const isUnlocked = s.unlocked || s.status === 'active'
                  const catColor = CATEGORY_COLORS[cat.toLowerCase()] ?? 'var(--orange)'
                  return (
                    <div key={s.id} style={{
                      padding: 12, background: 'rgba(255,255,255,0.025)', borderRadius: 10,
                      border: `1px solid ${isUnlocked ? catColor + '33' : 'rgba(255,255,255,0.05)'}`,
                      opacity: isUnlocked ? 1 : 0.6,
                    }}>
                      <div style={{ fontWeight: 600, fontSize: 12, color: isUnlocked ? '#fff' : 'var(--dim)' }}>{s.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 4, lineHeight: 1.4 }}>{s.description ?? '—'}</div>
                      <div style={{ fontSize: 10, fontFamily: 'var(--mo)', marginTop: 6, color: isUnlocked ? catColor : 'var(--dim)' }}>
                        {isUnlocked ? '✓ UNLOCKED' : '⟳ LOCKED'}{s.version ? ` · v${s.version}` : ''}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            {skillList.map((s: any) => (
              <div key={s.id} style={{ padding: 12, background: 'rgba(255,255,255,0.025)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontWeight: 600, fontSize: 12 }}>{s.name}</div>
                <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 4 }}>{s.description ?? '—'}</div>
                <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 4, fontFamily: 'var(--mo)' }}>{s.category ?? '—'}</div>
              </div>
            ))}
          </div>
        )}
      </SpecCard>

      {/* Recent Practice Sessions */}
      {skillProgress !== null ? (
        <SpecCard accent dataSource="skill_progress" style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dim)' }}>
            Practice Sessions ({progressList.length})
          </div>
          {progressList.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--dim)' }}>No practice sessions yet — add rows to <code>skill_progress</code>.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {progressList.slice(0, 10).map((p: any) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, fontSize: 12 }}>
                  <span style={{ fontWeight: 600 }}>{p.skill_name ?? p.skill_id ?? 'Skill'}</span>
                  <div style={{ display: 'flex', gap: 16, fontFamily: 'var(--mo)', fontSize: 10 }}>
                    {p.xp_earned && <span style={{ color: 'var(--orange)' }}>+{p.xp_earned} XP</span>}
                    <span style={{ color: 'var(--dim)' }}>{p.created_at?.slice(0, 10) ?? '—'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SpecCard>
      ) : (
        <div style={{ marginBottom: 24 }}>
          <ComingSoon
            title="Practice Sessions"
            reason="skill_progress table not yet created. Tracks every practice session with XP earned."
            icon="🏋️"
            dataSource="coming-soon:skill_progress"
            skeleton="table"
          />
        </div>
      )}

      {/* Recommended Next Skills — derived from locked skills, not duplicative of unlocked */}
      <SpecCard accent dataSource="skills" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Recommended Next</div>
        {lockedSkills.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--green)', padding: '12px 0' }}>All skills in the registry are unlocked.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
            {lockedSkills.slice(0, 6).map((s: any) => {
              const catColor = CATEGORY_COLORS[String(s.category ?? '').toLowerCase()] ?? 'var(--orange)'
              return (
                <div key={s.id} style={{ padding: 12, background: 'rgba(255,255,255,0.025)', borderRadius: 10, border: `1px solid ${catColor}33` }}>
                  <div style={{ fontWeight: 600, fontSize: 12 }}>{s.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 4, lineHeight: 1.4 }}>{s.description ?? '—'}</div>
                  <div style={{ fontSize: 10, fontFamily: 'var(--mo)', marginTop: 6, color: catColor }}>⟳ UNLOCK THIS SKILL</div>
                </div>
              )
            })}
          </div>
        )}
      </SpecCard>
    </>
  )
}
