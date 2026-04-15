/**
 * Team — human + agent team roster.
 * Hero metric: Active Team Members
 * Animation: network graph of team nodes with role-colored pulses
 * Sources: team_members (or falls back to ComingSoon), users_profile, entities
 */
import Hero from '../_components/Hero'
import Achievements from '../_components/Achievements'
import { SpecCard } from '../_components/SpecCard'
import ComingSoon from '../_components/ComingSoon'
import HeroCanvas from './HeroCanvas'
import { getEntities, getUserProfile } from '../lib/queries'
import { supabase } from '../lib/supabase'

export const dynamic = 'force-dynamic'

const ACHIEVEMENTS = [
  { name: 'First Hire',       description: 'Added the first team member.',              xp: 150, progress: 100, icon: '👋', earned: true  },
  { name: 'Dream Team',       description: 'Assembled a team of 5+ members.',           xp: 300, progress: 100, icon: '🏆', earned: true  },
  { name: 'Multi-Role',       description: 'Team spans 3+ distinct roles.',             xp: 200, progress: 100, icon: '🎭', earned: true  },
  { name: 'Agent Army',       description: 'Deployed 5+ AI agents on the team.',        xp: 400, progress: 80,  icon: '🤖', earned: false },
  { name: 'Full Org',         description: 'Every department has at least one member.', xp: 500, progress: 40,  icon: '🏛️', earned: false },
  { name: 'Retention King',   description: 'Average tenure exceeds 12 months.',         xp: 350, progress: 30,  icon: '⏳', earned: false },
  { name: 'Happy Team',       description: 'Team satisfaction score above 90%.',        xp: 300, progress: 60,  icon: '😊', earned: false },
  { name: 'Open Roles Filled','description': 'Closed all open role listings.',          xp: 250, progress: 10,  icon: '✅', earned: false },
]

async function getTeamMembers() {
  try {
    const { data, error } = await supabase
      .from('team_members')
      .select('*, entity:entity_ownership(entity_name)')
      .order('joined_date', { ascending: false })
    if (error) return null          // table missing → ComingSoon
    return data ?? []
  } catch { return null }
}

export default async function TeamPage() {
  const [teamMembers, entities, profile] = await Promise.all([
    getTeamMembers(),
    getEntities().catch(() => []),
    getUserProfile().catch(() => null),
  ])

  const tableExists = teamMembers !== null
  const members = (teamMembers ?? []) as any[]
  const activeCount = tableExists ? members.filter((m: any) => m.status !== 'inactive').length : 0

  const xpEarned = ACHIEVEMENTS.filter(a => a.earned).reduce((s, a) => s + a.xp, 0)

  const kpiCards = tableExists
    ? [
        { label: 'Total Members',  value: String(members.length) },
        { label: 'Active',         value: String(activeCount) },
        { label: 'Entities',       value: String(entities.length) },
        { label: 'Open Roles',     value: '—', delta: 'View Board' },
      ]
    : [
        { label: 'Entities',       value: String(entities.length) },
        { label: 'Status',         value: 'Configuring' },
      ]

  const playerCard = profile ? {
    name: profile.full_name ?? 'CEO',
    role: profile.role ?? 'Chief Executive',
    level: profile.level ?? 1,
    xpCurrent: profile.xp ?? 0,
    xpNext: profile.xp_next ?? 1000,
    since: profile.since ?? profile.created_at?.slice(0, 7),
    stats: [
      { key: 'Members', value: tableExists ? String(members.length) : '—' },
      { key: 'Entities', value: String(entities.length) },
      { key: 'XP', value: (profile.xp ?? 0).toLocaleString() },
      { key: 'Level', value: String(profile.level ?? 1) },
    ],
  } : undefined

  // Group members by role
  const byRole = members.reduce<Record<string, any[]>>((m, tm: any) => {
    const role = tm.role ?? 'Other'
    ;(m[role] ??= []).push(tm)
    return m
  }, {})

  return (
    <>
      <Hero
        label="◎ TEAM · YOUR EMPIRE ROSTER"
        greeting="People &amp; Agents"
        primaryMetric={tableExists ? String(activeCount) : '—'}
        metricSubtitle="active team members"
        kpiCards={kpiCards}
        playerCard={playerCard}
        animationSlot={<HeroCanvas />}
      />

      <Achievements items={ACHIEVEMENTS} xpEarned={xpEarned} />

      {/* KPI summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Members',     value: tableExists ? String(members.length) : '—',    color: 'var(--orange)' },
          { label: 'Open Roles',         value: '—',                                             color: 'var(--amber)'  },
          { label: 'Avg Tenure',         value: '—',                                             color: 'var(--green)'  },
          { label: 'Satisfaction',       value: '—',                                             color: 'var(--purple)' },
        ].map(k => (
          <SpecCard key={k.label} accent dataSource="team_members">
            <div style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 32, fontWeight: 700, fontFamily: 'var(--mo)', color: k.color }}>{k.value}</div>
          </SpecCard>
        ))}
      </div>

      {/* Team Member Grid — live if table exists */}
      {tableExists ? (
        <SpecCard accent dataSource="team_members" style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dim)' }}>
            Team Members
          </div>
          {members.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--dim)' }}>No team members yet — add rows to the <code>team_members</code> table.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
              {members.map((m: any) => {
                const initials = (m.full_name ?? m.name ?? '?')
                  .split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase()
                return (
                  <div key={m.id} style={{
                    padding: 14, background: 'rgba(255,255,255,0.03)', borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 12, alignItems: 'center',
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg, var(--orange), var(--purple))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 14, color: '#fff',
                    }}>{initials}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {m.full_name ?? m.name ?? 'Unknown'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 2 }}>{m.role ?? '—'}</div>
                      <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2, fontFamily: 'var(--mo)' }}>
                        {m.entity?.entity_name ?? m.entity_id ?? '—'} · {m.joined_date?.slice(0,10) ?? '—'}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </SpecCard>
      ) : (
        <div style={{ marginBottom: 24 }}>
          <ComingSoon
            title="Team Members"
            reason="Track your human team alongside AI agents — roles, entities, tenure, and satisfaction."
            icon="👥"
            dataSource="coming-soon:team_members"
            skeleton="table"
          />
        </div>
      )}

      {/* Role breakdown by entity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Open Roles */}
        <ComingSoon
          title="Open Roles"
          reason="Active job listings and hiring pipeline across all entities."
          icon="📋"
          dataSource="coming-soon:open_roles"
          skeleton="table"
        />
        {/* Org Chart */}
        <ComingSoon
          title="Org Chart"
          reason="Visual hierarchy of your full team — human and AI."
          icon="🗂️"
          dataSource="coming-soon:org_chart"
          skeleton="chart"
        />
      </div>

      {/* Recent Hires */}
      {tableExists && members.length > 0 && (
        <SpecCard accent dataSource="team_members" style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dim)' }}>
            Recent Hires
          </div>
          {members.slice(0, 5).map((m: any) => (
            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
              <div style={{ fontWeight: 500 }}>{m.full_name ?? m.name}</div>
              <div style={{ fontFamily: 'var(--mo)', fontSize: 11, color: 'var(--dim)' }}>{m.joined_date?.slice(0,10) ?? '—'}</div>
            </div>
          ))}
        </SpecCard>
      )}

      {/* Entities summary */}
      <SpecCard accent dataSource="entity_ownership" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dim)' }}>
          Entities ({entities.length})
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          {entities.map((e: any) => (
            <div key={e.id} style={{ padding: 10, background: 'rgba(255,255,255,0.025)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 600, fontSize: 12 }}>{e.entity_name}</div>
              <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 3, fontFamily: 'var(--mo)' }}>{e.entity_type} · {e.state ?? '—'}</div>
            </div>
          ))}
        </div>
      </SpecCard>
    </>
  )
}
