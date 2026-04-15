/**
 * Integrations Hub — connected services, sync status, last sync, action buttons.
 * Hero metric: Connected services count
 * Animation: Hub-spoke network — MC node center + integration spokes + data packets
 * Sources: integrations (live)
 */
import Hero from '../_components/Hero'
import Achievements from '../_components/Achievements'
import { SpecCard } from '../_components/SpecCard'
import ComingSoon from '../_components/ComingSoon'
import HeroCanvas from './HeroCanvas'
import { getIntegrations, getUserProfile } from '../lib/queries'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const ACHIEVEMENTS = [
  { name: 'First Link',      description: 'Connected your first integration.',               xp: 150, progress: 100, icon: '🔗', earned: true  },
  { name: 'Bank Linked',     description: 'Plaid connected to at least one bank account.',   xp: 250, progress: 100, icon: '🏦', earned: true  },
  { name: 'Hub Master',      description: 'Connected 5+ integrations simultaneously.',       xp: 500, progress: 60,  icon: '⚡', earned: false },
  { name: 'Zero Errors',     description: 'All integrations synced without errors.',         xp: 300, progress: 70,  icon: '✅', earned: false },
  { name: 'Sync Streak',     description: 'All integrations synced successfully for 7 days.',xp: 350, progress: 40,  icon: '🔄', earned: false },
  { name: 'Full Stack',      description: 'Connected Plaid, Stripe, QuickBooks, and Gmail.', xp: 600, progress: 25,  icon: '🏗️', earned: false },
  { name: 'API Key Created', description: 'Generated your first Mission Control API key.',   xp: 200, progress: 10,  icon: '🔑', earned: false },
  { name: 'Fully Wired',     description: 'All recommended integrations connected.',         xp: 1000, progress: 5,  icon: '🌐', earned: false },
]

// Static catalog of known integrations to show even if not in DB
const KNOWN_INTEGRATIONS = [
  { provider: 'Plaid',      category: 'Banking',      icon: '🏦', description: 'Bank accounts & transactions' },
  { provider: 'Stripe',     category: 'Payments',     icon: '💳', description: 'Payments & subscriptions' },
  { provider: 'QuickBooks', category: 'Accounting',   icon: '📊', description: 'Accounting & tax filing' },
  { provider: 'Gmail',      category: 'Email',        icon: '📧', description: 'Email & calendar sync' },
  { provider: 'Lodgify',    category: 'Rentals',      icon: '🏡', description: 'STR property management' },
  { provider: 'Supabase',   category: 'Database',     icon: '🗄️', description: 'Live data & MCP server' },
  { provider: 'Notion',     category: 'Docs',         icon: '📝', description: 'Knowledge base & docs' },
  { provider: 'Slack',      category: 'Comms',        icon: '💬', description: 'Team communications' },
  { provider: 'AgentMail',  category: 'Email Agents', icon: '🤖', description: 'AI inbox handling' },
  { provider: 'n8n',        category: 'Automation',   icon: '⚙️', description: 'Workflow automation' },
  { provider: 'Vercel',     category: 'Deploy',       icon: '▲',  description: 'Deployments & previews' },
  { provider: 'GitHub',     category: 'Code',         icon: '🐙', description: 'Version control & PRs' },
]

function staleness(lastSync?: string | null): { label: string; color: string } {
  if (!lastSync) return { label: 'never synced', color: 'var(--dim)' }
  const hours = (Date.now() - new Date(lastSync).getTime()) / 3.6e6
  if (hours < 1)     return { label: `${Math.round(hours * 60)}m ago`, color: 'var(--green)' }
  if (hours < 24)    return { label: `${Math.round(hours)}h ago`,      color: 'var(--green)' }
  if (hours < 168)   return { label: `${Math.round(hours / 24)}d ago`, color: 'var(--amber)' }
  return { label: `${Math.round(hours / 24)}d ago`, color: 'var(--red)' }
}

export default async function IntegrationsPage() {
  const [integrations, profile] = await Promise.all([
    getIntegrations().catch(() => []),
    getUserProfile().catch(() => null),
  ])

  const xpEarned = ACHIEVEMENTS.filter(a => a.earned).reduce((s, a) => s + a.xp, 0)
  const intgList = (integrations as any[]) ?? []

  const connected = intgList.filter((i: any) => i.status === 'connected' || i.connected)
  const pending   = intgList.filter((i: any) => i.status === 'pending')
  const errors    = intgList.filter((i: any) => i.status === 'error')

  const todaySyncs = intgList.filter((i: any) => {
    if (!i.last_sync) return false
    return (Date.now() - new Date(i.last_sync).getTime()) < 86400000
  }).length

  // Merge known catalog with DB records
  const mergedIntegrations = KNOWN_INTEGRATIONS.map(known => {
    const dbRecord = intgList.find((i: any) =>
      (i.provider ?? i.name ?? '').toLowerCase() === known.provider.toLowerCase()
    )
    return { ...known, ...dbRecord, provider: known.provider, icon: known.icon, description: known.description }
  })

  // Also include any DB integrations not in known catalog
  const unknownIntgs = intgList.filter((i: any) =>
    !KNOWN_INTEGRATIONS.find(k => k.provider.toLowerCase() === (i.provider ?? i.name ?? '').toLowerCase())
  )

  const playerCard = profile ? {
    name: profile.full_name ?? 'CEO',
    role: profile.role ?? 'Chief Executive',
    level: profile.level ?? 1,
    xpCurrent: profile.xp ?? 0,
    xpNext: profile.xp_next ?? 1000,
    since: profile.since ?? profile.created_at?.slice(0, 7),
    stats: [
      { key: 'Connected', value: String(connected.length) },
      { key: 'Pending',   value: String(pending.length) },
      { key: 'Syncs Today', value: String(todaySyncs) },
      { key: 'Errors',    value: String(errors.length) },
    ],
  } : undefined

  return (
    <>
      <Hero
        label="◈ INTEGRATIONS · CONNECTED SERVICES"
        greeting="Connected Services"
        primaryMetric={String(connected.length)}
        metricSubtitle="integrations connected"
        kpiCards={[
          { label: 'Connected',   value: String(connected.length),   delta: `of ${KNOWN_INTEGRATIONS.length}`, deltaPositive: connected.length > 0 },
          { label: 'Pending',     value: String(pending.length),     delta: pending.length > 0 ? 'awaiting' : 'none'                              },
          { label: 'Syncs Today', value: String(todaySyncs),         delta: 'last 24h',                        deltaPositive: todaySyncs > 0      },
          { label: 'Errors',      value: String(errors.length),      delta: errors.length === 0 ? 'all clear' : 'needs attention', deltaPositive: errors.length === 0 },
        ]}
        playerCard={playerCard}
        animationSlot={<HeroCanvas />}
      />

      <Achievements items={ACHIEVEMENTS} xpEarned={xpEarned} />

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Connected',   value: String(connected.length),   color: 'var(--green)'  },
          { label: 'Pending',     value: String(pending.length),     color: 'var(--amber)'  },
          { label: 'Syncs Today', value: String(todaySyncs),         color: 'var(--orange)' },
          { label: 'Errors',      value: String(errors.length),      color: errors.length === 0 ? 'var(--green)' : 'var(--red)' },
        ].map(k => (
          <SpecCard key={k.label} accent dataSource="integrations">
            <div style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 32, fontWeight: 700, fontFamily: 'var(--mo)', color: k.color }}>{k.value}</div>
          </SpecCard>
        ))}
      </div>

      {/* Integration Cards Grid */}
      <SpecCard accent dataSource="integrations" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dim)' }}>
          All Integrations
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {mergedIntegrations.map((intg: any) => {
            const isConnected = intg.status === 'connected' || intg.connected
            const isPending   = intg.status === 'pending'
            const isError     = intg.status === 'error'
            const stale = intg.last_sync ? staleness(intg.last_sync) : { label: 'never synced', color: 'var(--dim)' }

            const borderColor = isConnected ? 'rgba(16,185,129,0.2)' : isError ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)'
            const statusColor = isConnected ? 'var(--green)' : isPending ? 'var(--amber)' : isError ? 'var(--red)' : 'var(--dim)'
            const statusText  = isConnected ? 'CONNECTED' : isPending ? 'PENDING' : isError ? 'ERROR' : 'DISCONNECTED'

            return (
              <div key={intg.provider} style={{
                padding: 16, background: 'rgba(255,255,255,0.025)', borderRadius: 14,
                border: `1px solid ${borderColor}`,
                display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontSize: 22 }}>{intg.icon}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{intg.provider}</div>
                      <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 1 }}>{intg.category}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: statusColor, background: statusColor + '18', padding: '3px 8px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {statusText}
                  </div>
                </div>

                <div style={{ fontSize: 11, color: 'var(--dim)', lineHeight: 1.4 }}>{intg.description}</div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 10, color: stale.color, fontFamily: 'var(--mo)' }}>
                    {isConnected ? stale.label : '—'}
                  </div>
                  <Link href={`/settings?tab=integrations&connect=${intg.provider.toLowerCase()}`} style={{
                    fontSize: 10, fontWeight: 600, padding: '4px 12px', borderRadius: 6,
                    background: isConnected ? 'rgba(16,185,129,0.1)' : 'rgba(249,115,22,0.15)',
                    color: isConnected ? 'var(--green)' : 'var(--orange)',
                    border: `1px solid ${isConnected ? 'rgba(16,185,129,0.2)' : 'rgba(249,115,22,0.3)'}`,
                    textDecoration: 'none',
                  }}>
                    {isConnected ? 'Manage' : 'Connect'}
                  </Link>
                </div>
              </div>
            )
          })}

          {/* Unknown integrations from DB */}
          {unknownIntgs.map((i: any) => {
            const isConnected = i.status === 'connected' || i.connected
            const stale = staleness(i.last_sync)
            return (
              <div key={i.id ?? i.provider} style={{
                padding: 16, background: 'rgba(255,255,255,0.025)', borderRadius: 14,
                border: `1px solid ${isConnected ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)'}`,
              }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{i.provider ?? i.name}</div>
                <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 4 }}>{i.category ?? 'Integration'}</div>
                {isConnected && (
                  <div style={{ fontSize: 10, color: stale.color, fontFamily: 'var(--mo)', marginTop: 8 }}>
                    {stale.label}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </SpecCard>

      {/* Sync Health panel */}
      {errors.length > 0 && (
        <SpecCard accent dataSource="integrations" style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--red)' }}>
            Integration Errors ({errors.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {errors.map((e: any) => (
              <div key={e.id} style={{ padding: '10px 12px', background: 'rgba(239,68,68,0.05)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)', fontSize: 12 }}>
                <div style={{ fontWeight: 600 }}>{e.provider ?? e.name}</div>
                <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 4 }}>{e.error_message ?? 'Unknown error — check connection settings.'}</div>
              </div>
            ))}
          </div>
        </SpecCard>
      )}

      {/* Webhook / Event Log ComingSoon */}
      <ComingSoon
        title="Webhook & Event Log"
        reason="Real-time log of all integration events, webhook deliveries, and sync failures."
        icon="📬"
        dataSource="coming-soon:integrations.webhook_log"
        skeleton="table"
        minHeight={160}
      />
    </>
  )
}
