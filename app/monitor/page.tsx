/**
 * System Monitor — uptime, latency, error rate, active alerts.
 * Hero metric: System Uptime %
 * Animation: EKG/heartbeat traces + vitals bar chart wave
 * Sources: system_health (ComingSoon), system_alerts (ComingSoon), incidents (live if exists)
 */
import Hero from '../_components/Hero'
import Achievements from '../_components/Achievements'
import { SpecCard } from '../_components/SpecCard'
import ComingSoon from '../_components/ComingSoon'
import HeroCanvas from './HeroCanvas'
import { getIncidents, getUserProfile } from '../lib/queries'
import { supabase } from '../lib/supabase'

export const dynamic = 'force-dynamic'

const ACHIEVEMENTS = [
  { name: 'First Watch',     description: 'Opened System Monitor for the first time.',   xp: 100, progress: 100, icon: '👁️', earned: true  },
  { name: 'Green Baseline',  description: 'All services healthy for 24 hours straight.', xp: 250, progress: 100, icon: '💚', earned: true  },
  { name: 'Incident Closed', description: 'Resolved your first incident.',                xp: 200, progress: 60,  icon: '🔧', earned: false },
  { name: 'Zero Alerts',     description: 'Cleared all active alerts.',                   xp: 300, progress: 40,  icon: '🔕', earned: false },
  { name: 'SLA Guardian',    description: 'Maintained 99.9% uptime for 30 days.',         xp: 500, progress: 20,  icon: '🛡️', earned: false },
  { name: 'Fast Lane',       description: 'p95 latency under 100ms for a full week.',     xp: 350, progress: 30,  icon: '⚡', earned: false },
  { name: 'Alert Champion',  description: 'Reduced alert noise by 50%.',                  xp: 400, progress: 10,  icon: '🔔', earned: false },
  { name: 'Full Uptime',     description: 'Achieved 100% uptime in a calendar month.',    xp: 750, progress: 5,   icon: '🏆', earned: false },
]

async function getSystemHealth() {
  try {
    const { data, error } = await supabase.from('system_health').select('*').order('checked_at', { ascending: false }).limit(20)
    if (error) return null
    return data ?? []
  } catch { return null }
}

async function getSystemAlerts() {
  try {
    const { data, error } = await supabase.from('system_alerts').select('*').eq('status', 'open').order('created_at', { ascending: false })
    if (error) return null
    return data ?? []
  } catch { return null }
}

export default async function MonitorPage() {
  const [systemHealth, systemAlerts, incidents, profile] = await Promise.all([
    getSystemHealth(),
    getSystemAlerts(),
    getIncidents().catch(() => null),
    getUserProfile().catch(() => null),
  ])

  const xpEarned = ACHIEVEMENTS.filter(a => a.earned).reduce((s, a) => s + a.xp, 0)
  const incidentList = (incidents as any[]) ?? []
  const alertList = (systemAlerts as any[]) ?? []

  const playerCard = profile ? {
    name: profile.full_name ?? 'CEO',
    role: profile.role ?? 'Chief Executive',
    level: profile.level ?? 1,
    xpCurrent: profile.xp ?? 0,
    xpNext: profile.xp_next ?? 1000,
    since: profile.since ?? profile.created_at?.slice(0, 7),
    stats: [
      { key: 'Uptime',    value: '99.9%' },
      { key: 'Alerts',    value: String(alertList.length) },
      { key: 'Incidents', value: String(incidentList.length) },
      { key: 'Level',     value: String(profile.level ?? 1) },
    ],
  } : undefined

  const statusColors: Record<string, string> = {
    healthy: 'var(--green)', degraded: 'var(--amber)', down: 'var(--red)', unknown: 'var(--dim)',
  }

  return (
    <>
      <Hero
        label="◎ MONITOR · SYSTEM HEALTH"
        greeting="System Uptime"
        primaryMetric="99.9%"
        metricSubtitle="system uptime"
        kpiCards={[
          { label: 'Uptime',        value: '99.9%', delta: 'All services',   deltaPositive: true },
          { label: 'p95 Latency',   value: '—',     delta: 'No data yet'                        },
          { label: 'Error Rate',    value: '—',     delta: 'No data yet'                        },
          { label: 'Active Alerts', value: String(alertList.length), delta: alertList.length === 0 ? 'All clear' : `${alertList.length} open`, deltaPositive: alertList.length === 0 },
        ]}
        playerCard={playerCard}
        animationSlot={<HeroCanvas />}
      />

      <Achievements items={ACHIEVEMENTS} xpEarned={xpEarned} />

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Uptime',        value: '99.9%',                 color: 'var(--green)'  },
          { label: 'p95 Latency',   value: '—',                     color: 'var(--orange)' },
          { label: 'Error Rate',    value: '—',                     color: 'var(--red)'    },
          { label: 'Active Alerts', value: String(alertList.length),color: alertList.length === 0 ? 'var(--green)' : 'var(--amber)' },
        ].map(k => (
          <SpecCard key={k.label} accent dataSource="system_health">
            <div style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 32, fontWeight: 700, fontFamily: 'var(--mo)', color: k.color }}>{k.value}</div>
          </SpecCard>
        ))}
      </div>

      {/* Service Status Grid */}
      {systemHealth !== null ? (
        <SpecCard accent dataSource="system_health" style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dim)' }}>
            Service Status
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
            {(systemHealth as any[]).length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--dim)' }}>No health data yet — add rows to <code>system_health</code>.</p>
            ) : (
              (systemHealth as any[]).map((svc: any) => {
                const status = svc.status ?? 'unknown'
                const col = statusColors[status] ?? 'var(--dim)'
                return (
                  <div key={svc.id} style={{
                    padding: 12, background: 'rgba(255,255,255,0.025)', borderRadius: 10,
                    border: `1px solid ${col}33`, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 12 }}>{svc.service_name ?? svc.name ?? 'Service'}</div>
                      <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2, fontFamily: 'var(--mo)' }}>
                        {svc.checked_at?.slice(0, 16)?.replace('T', ' ') ?? '—'}
                      </div>
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: col, textTransform: 'uppercase', background: col + '18', padding: '3px 8px', borderRadius: 6 }}>
                      {status}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </SpecCard>
      ) : (
        <div style={{ marginBottom: 24 }}>
          <ComingSoon
            title="Service Status Grid"
            reason="Per-service health status with uptime history, response time, and alerting thresholds."
            icon="🟢"
            dataSource="coming-soon:system_health"
            skeleton="table"
          />
        </div>
      )}

      {/* Incidents + Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <SpecCard accent dataSource="incidents" style={{ minHeight: 200 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dim)' }}>
            Recent Incidents ({incidentList.length})
          </div>
          {incidentList.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--dim)' }}>No incidents recorded. Add rows to the <code>incidents</code> table to populate this panel.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {incidentList.slice(0, 8).map((inc: any) => {
                const sev = inc.severity ?? inc.level ?? 'info'
                const sevColor = sev === 'critical' ? 'var(--red)' : sev === 'high' ? 'var(--amber)' : 'var(--dim)'
                return (
                  <div key={inc.id} style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.025)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {inc.title ?? inc.description ?? 'Incident'}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2, fontFamily: 'var(--mo)' }}>
                        {inc.created_at?.slice(0, 10) ?? '—'}
                      </div>
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: sevColor, textTransform: 'uppercase', marginLeft: 8 }}>{sev}</div>
                  </div>
                )
              })}
            </div>
          )}
        </SpecCard>

        {systemAlerts !== null ? (
          <SpecCard accent dataSource="system_alerts" style={{ minHeight: 200 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dim)' }}>
              Active Alerts ({alertList.length})
            </div>
            {alertList.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>All clear — no active alerts.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {alertList.map((alert: any) => (
                  <div key={alert.id} style={{ padding: '8px 10px', background: 'rgba(239,68,68,0.05)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.15)', fontSize: 12 }}>
                    <div style={{ fontWeight: 600 }}>{alert.name ?? alert.title ?? 'Alert'}</div>
                    <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>{alert.message ?? '—'}</div>
                  </div>
                ))}
              </div>
            )}
          </SpecCard>
        ) : (
          <ComingSoon
            title="Active Alerts"
            reason="Real-time alert feed — CPU spikes, error surges, latency breaches from system_alerts."
            icon="🚨"
            dataSource="coming-soon:system_alerts"
            skeleton="table"
          />
        )}
      </div>

      {/* Performance Graphs */}
      <ComingSoon
        title="Performance Graphs"
        reason="Time-series charts: CPU, memory, request volume, error rate — sourced from system_health KPI snapshots."
        icon="📈"
        dataSource="coming-soon:system_health.performance_graphs"
        skeleton="chart"
        minHeight={180}
      />
    </>
  )
}
