/**
 * Incidents — incident room, things on fire.
 * Hero metric: open incidents count
 * Animation: alert-pulse rings fading outward + glitch scan lines
 * Sources: incidents
 */
import Hero from '../_components/Hero'
import Achievements from '../_components/Achievements'
import { SpecCard } from '../_components/SpecCard'
import HeroCanvas from './HeroCanvas'
import { getIncidents, getAchievements } from '../lib/queries'

export const dynamic = 'force-dynamic'

const DEFAULT_ACHIEVEMENTS = [
  { name: 'First Incident',   description: 'Logged and tracked your first incident.',       xp: 100, progress: 100, icon: '🚨', earned: true  },
  { name: 'Quick Resolve',    description: 'Resolved an incident within 2 hours.',          xp: 200, progress: 100, icon: '⚡', earned: true  },
  { name: 'All Clear',        description: 'Zero open incidents for 7 consecutive days.',   xp: 400, progress: 30,  icon: '✅', earned: false },
  { name: 'Post-Mortem',      description: 'Completed a post-mortem on a major incident.',  xp: 300, progress: 10,  icon: '📋', earned: false },
]

const SEVERITY_COLOR: Record<string, string> = {
  critical: 'var(--red)',
  high:     '#3b82f6',
  medium:   'var(--amber)',
  low:      'var(--green)',
  info:     'var(--dim)',
}

export default async function IncidentsPage() {
  const [incidents, dbAchievements] = await Promise.allSettled([
    getIncidents(),
    getAchievements('incidents'),
  ]).then(results => results.map(r => (r.status === 'fulfilled' ? r.value : [])))

  const incidentList = (incidents as any[])
  const open     = incidentList.filter((i: any) => i.status !== 'resolved' && i.status !== 'closed')
  const resolved = incidentList.filter((i: any) => i.status === 'resolved' || i.status === 'closed')

  const achievements = (dbAchievements as any[]).length > 0
    ? (dbAchievements as any[]).map((a: any) => ({
        name:        a.name ?? '',
        description: a.description ?? '',
        xp:          Number(a.xp ?? 0),
        progress:    Number(a.progress ?? (a.earned_at ? 100 : 0)),
        icon:        a.icon ?? '🏆',
        earned:      !!a.earned_at,
      }))
    : DEFAULT_ACHIEVEMENTS

  const xpEarned = achievements.filter((a: any) => a.earned).reduce((s: number, a: any) => s + a.xp, 0)

  const critical = open.filter((i: any) => i.severity === 'critical')
  const high     = open.filter((i: any) => i.severity === 'high')

  return (
    <>
      <Hero
        label="≈ INCIDENT ROOM · THINGS ON FIRE"
        greeting="Current system status."
        primaryMetric={`${open.length}`}
        metricSubtitle={`open incidents · ${resolved.length} resolved`}
        kpiCards={[
          { label: 'Open',       value: String(open.length),       delta: 'unresolved',        deltaPositive: open.length === 0 },
          { label: 'Critical',   value: String(critical.length),   delta: 'severity:critical', deltaPositive: critical.length === 0 },
          { label: 'High',       value: String(high.length),       delta: 'severity:high',     deltaPositive: high.length === 0 },
          { label: 'Resolved',   value: String(resolved.length),   delta: 'total closed',      deltaPositive: true },
        ]}
        animationSlot={<HeroCanvas />}
      />

      <Achievements items={achievements} xpEarned={xpEarned} />

      {/* Open Incidents */}
      <section style={{ marginBottom: 28 }}>
        <div className="section-header">
          <div className="section-header-left">
            <h2 className="section-title" style={{ color: open.length > 0 ? 'var(--red)' : 'var(--green)' }}>
              {open.length > 0 ? 'Open Incidents' : 'All Clear'}
            </h2>
            <span className="achieve-count">{open.length} open</span>
          </div>
        </div>
        <SpecCard accent dataSource="incidents">
          {open.length === 0 ? (
            <div style={{ color: 'var(--green)', fontSize: 13, padding: '12px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>✅</span> All clear — nothing on fire.
            </div>
          ) : (
            open.map((i: any) => (
              <div key={i.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{i.title ?? i.summary}</div>
                    {i.description && (
                      <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 3, lineHeight: 1.5 }}>{i.description}</div>
                    )}
                    <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 6, fontFamily: 'var(--mo)' }}>
                      {i.status ?? 'open'} · opened {i.created_at ? new Date(i.created_at).toLocaleDateString() : '—'}
                    </div>
                  </div>
                  <div style={{
                    fontSize: 10, fontFamily: 'var(--mo)', padding: '3px 10px',
                    borderRadius: 6, flexShrink: 0,
                    color: SEVERITY_COLOR[i.severity ?? 'low'] ?? 'var(--dim)',
                    border: `1px solid ${SEVERITY_COLOR[i.severity ?? 'low'] ?? 'var(--dim)'}50`,
                    background: (SEVERITY_COLOR[i.severity ?? 'low'] ?? 'transparent') + '15',
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                  }}>
                    {i.severity ?? 'low'}
                  </div>
                </div>
              </div>
            ))
          )}
        </SpecCard>
      </section>

      {/* Resolved Incidents */}
      {resolved.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <div className="section-header">
            <div className="section-header-left">
              <h2 className="section-title">Resolved</h2>
              <span className="achieve-count">{resolved.length} closed</span>
            </div>
          </div>
          <SpecCard accent dataSource="incidents">
            {resolved.slice(0, 20).map((i: any) => (
              <div key={i.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--dim)' }}>
                <span style={{ color: 'var(--green)', marginRight: 8 }}>✓</span>
                {i.title ?? i.summary}
                <span style={{ fontSize: 10, marginLeft: 8, fontFamily: 'var(--mo)' }}>
                  {i.resolved_at ? new Date(i.resolved_at).toLocaleDateString() : ''}
                </span>
              </div>
            ))}
          </SpecCard>
        </section>
      )}
    </>
  )
}
