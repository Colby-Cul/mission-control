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

// Full 31-entry integration catalog — ported verbatim from IntegrationsHub.jsx INTEGRATION_META
// Excludes aliasOf entries (monday alias) — 31 canonical entries total
const KNOWN_INTEGRATIONS = [
  // AI Models
  { provider: 'anthropic',      name: 'Anthropic Claude',    category: 'AI Models',     knownStatus: 'active',          description: 'Primary AI — Sonnet 4.6, Haiku 4.5, Opus 4.6' },
  { provider: 'openai',         name: 'OpenAI',              category: 'AI Models',     knownStatus: 'active',          description: 'GPT-4o, GPT-5.4, Whisper, DALL-E' },
  { provider: 'ollama',         name: 'Ollama',              category: 'AI Models',     knownStatus: 'active',          description: 'Local inference — qwen2.5-coder:32b' },
  { provider: 'openai-codex',   name: 'OpenAI Codex',        category: 'AI Models',     knownStatus: 'active',          description: 'ACP coding delegation runtime' },
  { provider: 'exa',            name: 'Exa Search',          category: 'AI Models',     knownStatus: 'active',          description: 'Neural web search MCP server' },
  // Messaging
  { provider: 'telegram',       name: 'Telegram',            category: 'Messaging',     knownStatus: 'active',          description: 'Bot messaging — agent delivery channel' },
  { provider: 'slack',          name: 'Slack',               category: 'Messaging',     knownStatus: 'active',          description: 'Workspace messaging via MCP + Socket Mode' },
  { provider: 'discord',        name: 'Discord',             category: 'Messaging',     knownStatus: 'active',          description: 'Guild messaging — all channels' },
  // STR / Rentals
  { provider: 'lodgify',        name: 'Lodgify',             category: 'STR',           knownStatus: 'active',          description: 'PMS — property management + bookings' },
  { provider: 'pricelabs',      name: 'Price Labs',          category: 'STR',           knownStatus: 'active',          description: 'Dynamic pricing + revenue management' },
  // Business / Finance
  { provider: 'monday.com',     name: 'Monday.com',          category: 'Business',      knownStatus: 'active',          description: 'Connected — not used for task mgmt (Mission Control only)' },
  { provider: 'quickbooks',     name: 'QuickBooks',          category: 'Business',      knownStatus: 'not configured',  description: 'Accounting + financial management via OAuth' },
  { provider: 'plaid',          name: 'Plaid',               category: 'Business',      knownStatus: 'not configured',  description: 'Bank + brokerage account aggregation (read-only)' },
  { provider: 'coinbase',       name: 'Coinbase',            category: 'Business',      knownStatus: 'not configured',  description: 'Crypto portfolio + trading via OAuth API' },
  { provider: 'canva',          name: 'Canva',               category: 'Business',      knownStatus: 'active',          description: 'Design + marketing assets via MCP' },
  { provider: 'notion',         name: 'Notion',              category: 'Business',      knownStatus: 'active',          description: 'Knowledge base + docs via MCP' },
  // Google Workspace
  { provider: 'google',         name: 'Google Workspace',    category: 'Google',        knownStatus: 'active',          description: 'OAuth — Calendar, Gmail, Tasks, Drive' },
  { provider: 'gmail',          name: 'Gmail',               category: 'Google',        knownStatus: 'active',          description: 'Email management via MCP' },
  { provider: 'google-calendar',name: 'Google Calendar',     category: 'Google',        knownStatus: 'active',          description: 'Calendar management via MCP' },
  // Infrastructure
  { provider: 'supabase',       name: 'Supabase',            category: 'Infrastructure',knownStatus: 'active',          description: 'PostgreSQL database + auth via MCP' },
  { provider: 'vercel',         name: 'Vercel',              category: 'Infrastructure',knownStatus: 'active',          description: 'Production deployment platform via MCP' },
  { provider: 'grafana',        name: 'Grafana Cloud',       category: 'Infrastructure',knownStatus: 'active',          description: 'Monitoring + observability dashboards' },
  { provider: 'tailscale',      name: 'Tailscale',           category: 'Infrastructure',knownStatus: 'active',          description: 'Mesh VPN — Mac Mini cluster' },
  { provider: 'cloudflare',     name: 'Cloudflare',          category: 'Infrastructure',knownStatus: 'active',          description: 'DNS + CDN + security' },
  // Dev Tools
  { provider: 'github',         name: 'GitHub',              category: 'Dev Tools',     knownStatus: 'active',          description: 'Code repos, CI/CD, GitHub Pages' },
  { provider: 'brave',          name: 'Brave Search',        category: 'Dev Tools',     knownStatus: 'active',          description: 'Web search API for agents' },
  { provider: 'dropbox',        name: 'Dropbox',             category: 'Dev Tools',     knownStatus: 'active',          description: 'Cloud file storage (dbxcli)' },
  { provider: 'fast.io',        name: 'Fast.io',             category: 'Dev Tools',     knownStatus: 'active',          description: 'CDN file hosting from Google Drive' },
  // Automation / Monitoring
  { provider: 'n8n',            name: 'n8n',                 category: 'Automation',    knownStatus: 'active',          description: 'Workflow automation platform via MCP' },
  { provider: 'spike.sh',       name: 'Spike.sh',            category: 'Monitoring',    knownStatus: 'active',          description: 'Incident alerting + webhooks' },
  // System
  { provider: 'macos',          name: 'macOS',               category: 'System',        knownStatus: 'active',          description: 'System screen unlock credential' },
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

  // Merge known catalog with DB records — DB status overrides knownStatus if present
  const mergedIntegrations = KNOWN_INTEGRATIONS.map(known => {
    const dbRecord = intgList.find((i: any) =>
      (i.provider ?? i.name ?? '').toLowerCase() === known.provider.toLowerCase()
    )
    const resolvedStatus = dbRecord?.status ?? known.knownStatus ?? 'not configured'
    return {
      ...known,
      ...dbRecord,
      provider: known.provider,
      name: known.name,
      description: known.description,
      category: known.category,
      status: resolvedStatus,
    }
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

      {/* Category tabs — rendered server-side, all categories visible */}
      {(() => {
        const CATEGORY_ORDER = ['AI Models','Messaging','Google','System','Dev Tools','STR','Business','Infrastructure','Automation','Monitoring']
        const allCategories = CATEGORY_ORDER.filter(c => mergedIntegrations.some((i: any) => i.category === c))
        return (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
            {allCategories.map(cat => {
              const count = mergedIntegrations.filter((i: any) => i.category === cat).length
              return (
                <div key={cat} style={{
                  padding: '5px 12px', borderRadius: 8,
                  background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)',
                  fontSize: 11, fontWeight: 600, color: 'var(--orange)',
                  letterSpacing: '0.04em',
                }}>
                  {cat} <span style={{ opacity: 0.6 }}>({count})</span>
                </div>
              )
            })}
          </div>
        )
      })()}

      {/* Integration Cards Grid — all 31 entries */}
      <SpecCard accent dataSource="integrations" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dim)' }}>
          All Integrations ({mergedIntegrations.length})
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {mergedIntegrations.map((intg: any) => {
            const resolvedStatus = intg.status ?? intg.knownStatus ?? 'not configured'
            const isActive    = resolvedStatus === 'active'
            const isConnected = resolvedStatus === 'connected' || intg.connected || isActive
            const isPending   = resolvedStatus === 'pending'
            const isError     = resolvedStatus === 'error'
            // Prefer last_sync_at (new column) then last_sync (legacy)
            const lastSyncTs = intg.last_sync_at ?? intg.last_sync ?? null
            const stale = lastSyncTs ? staleness(lastSyncTs) : null

            const borderColor = isConnected ? 'rgba(16,185,129,0.2)' : isError ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)'
            const statusClr   = isConnected ? 'var(--green)' : isPending ? 'var(--amber)' : isError ? 'var(--red)' : 'var(--dim)'
            const statusText  = isConnected ? 'ACTIVE' : isPending ? 'PENDING' : isError ? 'ERROR' : (resolvedStatus ?? 'NOT CONFIGURED').toUpperCase()
            const monogram = (intg.name ?? intg.provider ?? '??').slice(0, 2).toUpperCase()

            // OAuth expiry warning
            const oauthExpires = intg.oauth_expires_at ?? null
            const oauthExpiresSoon = oauthExpires
              ? (new Date(oauthExpires).getTime() - Date.now()) < 7 * 24 * 3600 * 1000
              : false

            // Masked key last 4
            const maskedKey = intg.masked_key ?? intg.maskedKey ?? null

            // Record count
            const recordCount = intg.record_count ?? null

            // Monthly cost
            const monthlyCost = intg.monthly_cost != null ? Number(intg.monthly_cost) : null

            // Rate limit remaining
            const rateLimit = intg.rate_limit_remaining ?? null

            // Webhook health
            const webhookHealth = intg.webhook_health ?? null
            const whColor = webhookHealth === 'healthy' ? 'var(--green)' : webhookHealth === 'degraded' ? 'var(--amber)' : webhookHealth === 'down' ? 'var(--red)' : null

            return (
              <div key={intg.provider} style={{
                padding: 16, background: 'rgba(255,255,255,0.025)', borderRadius: 14,
                border: `1px solid ${borderColor}`,
                display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                {/* ── Header ── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: 'rgba(249,115,22,0.13)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700, color: 'var(--orange)', flexShrink: 0,
                    }}>
                      {monogram}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{intg.name ?? intg.provider}</div>
                      <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 1 }}>{intg.category}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: statusClr, background: statusClr + '18', padding: '3px 8px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                      {statusText}
                    </div>
                    {whColor && (
                      <div style={{ fontSize: 9, color: whColor, fontFamily: 'var(--mo)', letterSpacing: '0.04em' }}>
                        webhook {webhookHealth}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ fontSize: 11, color: 'var(--dim)', lineHeight: 1.4 }}>{intg.description}</div>

                {/* ── Stats row: last sync + cost + rate limit + record count ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, fontSize: 10 }}>
                  <div>
                    <span style={{ color: 'var(--dim)' }}>Last sync: </span>
                    <span style={{ color: stale && isConnected ? stale.color : 'var(--dim)', fontFamily: 'var(--mo)' }}>
                      {stale && isConnected ? stale.label : '—'}
                    </span>
                  </div>
                  {monthlyCost != null && monthlyCost > 0 && (
                    <div>
                      <span style={{ color: 'var(--dim)' }}>Cost: </span>
                      <span style={{ color: 'var(--amber)', fontFamily: 'var(--mo)' }}>${monthlyCost.toFixed(0)}/mo</span>
                    </div>
                  )}
                  {recordCount != null && (
                    <div>
                      <span style={{ color: 'var(--dim)' }}>Records: </span>
                      <span style={{ color: 'var(--t2)', fontFamily: 'var(--mo)' }}>{recordCount.toLocaleString()}</span>
                    </div>
                  )}
                  {rateLimit != null && (
                    <div>
                      <span style={{ color: 'var(--dim)' }}>Rate limit: </span>
                      <span style={{ color: rateLimit < 100 ? 'var(--red)' : 'var(--green)', fontFamily: 'var(--mo)' }}>{rateLimit}</span>
                    </div>
                  )}
                </div>

                {/* ── Credential info ── */}
                {(maskedKey ?? intg.credential_status ?? oauthExpiresSoon) && (
                  <div style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--mo)', padding: '5px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: 6, border: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {maskedKey && <span>Key: ···{String(maskedKey).slice(-4)}</span>}
                    {intg.credential_status && (
                      <span>Token: <span style={{ color: intg.credential_status === 'valid' ? 'var(--green)' : 'var(--red)' }}>{intg.credential_status}</span></span>
                    )}
                    {oauthExpiresSoon && oauthExpires && (
                      <span style={{ color: 'var(--amber)' }}>OAuth expires {new Date(oauthExpires).toLocaleDateString()}</span>
                    )}
                  </div>
                )}

                {/* ── Action buttons ── */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {intg.provider === 'quickbooks' && (
                    <a href="/api/qb/connect?returnTo=/integrations" style={{
                      fontSize: 10, fontWeight: 600, padding: '4px 12px', borderRadius: 6,
                      background: '#2ca01c', color: '#fff', textDecoration: 'none',
                      border: '1px solid rgba(44,160,28,0.5)',
                    }}>
                      {isConnected ? '+ Connect Company' : 'Connect QuickBooks'}
                    </a>
                  )}
                  {intg.provider === 'plaid' && (
                    <Link href="/accounts" style={{
                      fontSize: 10, fontWeight: 600, padding: '4px 12px', borderRadius: 6,
                      background: 'rgba(16,185,129,0.15)', color: 'var(--green)',
                      border: '1px solid rgba(16,185,129,0.3)', textDecoration: 'none',
                    }}>
                      {isConnected ? 'Manage Accounts' : 'Link Bank'}
                    </Link>
                  )}
                  {intg.provider === 'lodgify' && (
                    <a href="https://app.lodgify.com" target="_blank" rel="noopener noreferrer" style={{
                      fontSize: 10, fontWeight: 600, padding: '4px 12px', borderRadius: 6,
                      background: 'rgba(16,185,129,0.1)', color: 'var(--green)',
                      border: '1px solid rgba(16,185,129,0.2)', textDecoration: 'none',
                    }}>
                      Open Lodgify ↗
                    </a>
                  )}
                  {intg.provider !== 'quickbooks' && intg.provider !== 'plaid' && intg.provider !== 'lodgify' && (
                    <Link href={`/settings?tab=integrations&connect=${intg.provider.toLowerCase()}`} style={{
                      fontSize: 10, fontWeight: 600, padding: '4px 12px', borderRadius: 6,
                      background: isConnected ? 'rgba(16,185,129,0.1)' : 'rgba(249,115,22,0.15)',
                      color: isConnected ? 'var(--green)' : 'var(--orange)',
                      border: `1px solid ${isConnected ? 'rgba(16,185,129,0.2)' : 'rgba(249,115,22,0.3)'}`,
                      textDecoration: 'none',
                    }}>
                      {isConnected ? 'Manage' : 'Connect'}
                    </Link>
                  )}
                </div>
              </div>
            )
          })}

          {/* Any extra DB integrations not in the known catalog */}
          {unknownIntgs.map((i: any) => {
            const isConnected = i.status === 'connected' || i.connected
            const stale = staleness(i.last_sync)
            const monogram = (i.provider ?? i.name ?? '??').slice(0, 2).toUpperCase()
            return (
              <div key={i.id ?? i.provider} style={{
                padding: 16, background: 'rgba(255,255,255,0.025)', borderRadius: 14,
                border: `1px solid ${isConnected ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)'}`,
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(249,115,22,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--orange)' }}>
                    {monogram}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{i.provider ?? i.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 4 }}>{i.category ?? 'Integration'}</div>
                  </div>
                </div>
                {isConnected && (
                  <div style={{ fontSize: 10, color: stale.color, fontFamily: 'var(--mo)' }}>{stale.label}</div>
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
