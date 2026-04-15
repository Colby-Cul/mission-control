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
                const skills = Array.isArray(m.skills) ? m.skills as string[] : []
                const directReports = Number(m.direct_reports_count ?? 0)
                const activeProjects = Number(m.active_projects_count ?? 0)
                const startDate = m.start_date ?? m.joined_date ?? null
                const isActive = (m.status ?? 'active') !== 'inactive'
                return (
                  <div key={m.id} style={{
                    padding: 14, background: 'rgba(255,255,255,0.03)', borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.07)',
                    display: 'flex', flexDirection: 'column', gap: 10,
                  }}>
                    {/* ── Avatar + name row ── */}
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      {m.avatar_url
                        ? <img src={m.avatar_url} alt={initials} style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, objectFit: 'cover', border: '2px solid rgba(249,115,22,0.3)' }} />
                        : (
                          <div style={{
                            width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                            background: 'linear-gradient(135deg, var(--orange), var(--purple))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: 14, color: '#fff',
                          }}>{initials}</div>
                        )
                      }
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {m.full_name ?? m.name ?? 'Unknown'}
                          </div>
                          <div style={{
                            fontSize: 9, padding: '1px 6px', borderRadius: 5, flexShrink: 0, marginLeft: 6,
                            background: isActive ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)',
                            color: isActive ? 'var(--green)' : 'var(--dim)', fontFamily: 'var(--mo)',
                            textTransform: 'uppercase', letterSpacing: '0.06em',
                          }}>{m.status ?? 'active'}</div>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--orange)', marginTop: 1, fontWeight: 500 }}>
                          {m.title ?? m.role ?? '—'}
                        </div>
                        {m.email && (
                          <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {m.email}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── Bio ── */}
                    {m.bio && (
                      <div style={{ fontSize: 11, color: 'var(--dim)', lineHeight: 1.5 }}>
                        {String(m.bio).slice(0, 80)}{String(m.bio).length > 80 ? '…' : ''}
                      </div>
                    )}

                    {/* ── Stats row ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, fontSize: 10 }}>
                      <div>
                        <div style={{ color: 'var(--dim)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Projects</div>
                        <div style={{ color: 'var(--t2)', fontFamily: 'var(--mo)', marginTop: 1 }}>{activeProjects > 0 ? activeProjects : '—'}</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--dim)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Reports</div>
                        <div style={{ color: 'var(--t2)', fontFamily: 'var(--mo)', marginTop: 1 }}>{directReports > 0 ? directReports : '—'}</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--dim)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Since</div>
                        <div style={{ color: 'var(--t2)', fontFamily: 'var(--mo)', marginTop: 1, fontSize: 9 }}>
                          {startDate ? String(startDate).slice(0, 10) : '—'}
                        </div>
                      </div>
                    </div>

                    {/* ── Timezone + entity ── */}
                    <div style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--mo)', display: 'flex', gap: 10 }}>
                      {m.entity?.entity_name ?? m.entity_id ? (
                        <span style={{ color: 'var(--purple)' }}>{m.entity?.entity_name ?? m.entity_id}</span>
                      ) : null}
                      {m.timezone && <span>{m.timezone}</span>}
                    </div>

                    {/* ── Skills pills ── */}
                    {skills.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {skills.slice(0, 5).map((s: string) => (
                          <span key={s} style={{
                            fontSize: 9, padding: '2px 6px', borderRadius: 4, fontFamily: 'var(--mo)',
                            background: 'rgba(249,115,22,0.08)', color: 'var(--orange)',
                            textTransform: 'uppercase', letterSpacing: '0.05em',
                          }}>{s}</span>
                        ))}
                      </div>
                    )}
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
        {/* Org Chart — AI fleet + Human team members from available data */}
        <SpecCard accent dataSource="agents,team_members">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Org Hierarchy</div>
          <div style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 14 }}>AI fleet + human team</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {tableExists && members.length > 0 && (
              <div style={{ fontSize: 10, fontFamily: 'var(--mo)', color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 8 }}>Humans ({members.length})</div>
            )}
            {members.slice(0, 6).map((m: any) => (
              <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 11 }}>
                <span style={{ fontWeight: 600 }}>{m.full_name ?? m.name}</span>
                <span style={{ color: 'var(--dim)', fontFamily: 'var(--mo)' }}>{m.role ?? m.title ?? '—'}</span>
              </div>
            ))}
            {(!tableExists || members.length === 0) && (
              <div style={{ fontSize: 11, color: 'var(--dim)', padding: '8px 0' }}>
                team_members table empty. Add rows to start tracking.
              </div>
            )}
          </div>
        </SpecCard>

        {/* Open Roles — honest, no hiring table yet */}
        <ComingSoon
          title="Open Roles"
          reason="Requires job_listings table (not yet created). Alternative: add hiring tasks to the tasks page."
          icon="📋"
          dataSource="coming-soon:open_roles"
          skeleton="table"
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
