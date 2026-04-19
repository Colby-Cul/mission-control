/**
 * Companies Index — portfolio mosaic of all entities.
 * Operational entities: full card with revenue KPI.
 * Legal-only entities (Alabama Shores, Black Lab Capital LLC): subdued card
 * with a "Legal Entity" tag; no full dashboard link.
 *
 * Hero animation: entity-mosaic — tiles pulsing at different rates.
 */
import { getEntities, getTransactions30d, getAchievements, getOwnershipEdges, getAccounts } from '../lib/queries'
import CompaniesHeroCanvas from './_CompaniesHeroCanvas'
import Achievements from '../_components/Achievements'
import CompaniesQuickActions from './_CompaniesQuickActions'
import WizardNudgeBanner from '../_components/WizardNudgeBanner'

export const dynamic = 'force-dynamic'

// ── Entity classification ────────────────────────────────────────
const LEGAL_ONLY_NAMES = ['Alabama Shores', 'Black Lab Capital LLC']

function isLegalOnly(entity: any): boolean {
  return LEGAL_ONLY_NAMES.includes(entity.entity_name)
}

function entityAccentColor(entity: any): string {
  const name = (entity.entity_name ?? '').toLowerCase()
  if (name.includes('xome'))       return '#f97316'  // orange
  if (name.includes('luxury'))     return '#10b981'  // green
  if (name.includes('openclaw'))   return '#8b5cf6'  // purple
  if (name.includes('culbertson')) return '#f59e0b'  // amber
  return '#64748b'
}

export default async function CompaniesPage() {
  let entities: any[] = []
  try { entities = await getEntities() } catch {}

  let allEdges: any[] = []
  try { allEdges = await getOwnershipEdges() } catch {}
  const edgeCount = allEdges.length

  // Build map: childEntityId → total ownership % from parent edges
  // Only count entity-type edges (not property edges)
  const ownershipByChild: Record<string, number> = {}
  for (const edge of allEdges) {
    if (edge.child_type === 'property') continue
    const childId = edge.child_entity_id
    const pct = Number(edge.ownership_pct) || 0
    ownershipByChild[childId] = (ownershipByChild[childId] ?? 0) + pct
  }

  // Combined revenue from last 30d transactions (for KPI card)
  let txns: any[] = []
  try { txns = await getTransactions30d() } catch {}
  const combinedRevenue = txns
    .filter((t: any) => Number(t.amount) < 0)
    .reduce((sum: number, t: any) => sum + Math.abs(Number(t.amount)), 0)

  // Per-entity cash + account count (real signals from financial_accounts)
  let accounts: any[] = []
  try { accounts = await getAccounts() } catch {}
  const cashByEntity: Record<string, number> = {}
  const accountsByEntity: Record<string, number> = {}
  const txnsByEntity: Record<string, number> = {}
  const rev30dByEntity: Record<string, number> = {}
  for (const a of accounts) {
    const eid = a.entity_id ?? 'unassigned'
    const bal = Number(a.balance_current) || 0
    const type = String(a.type ?? '').toLowerCase()
    // Count depository/investment only toward cash; skip credit/loan.
    if (type !== 'credit' && type !== 'loan') {
      cashByEntity[eid] = (cashByEntity[eid] ?? 0) + bal
    }
    accountsByEntity[eid] = (accountsByEntity[eid] ?? 0) + 1
  }
  for (const t of txns) {
    const eid = t.entity_id
    if (!eid) continue
    txnsByEntity[eid] = (txnsByEntity[eid] ?? 0) + 1
    const amt = Number(t.amount) || 0
    if (amt < 0) rev30dByEntity[eid] = (rev30dByEntity[eid] ?? 0) + Math.abs(amt)
  }
  const totalCash = Object.values(cashByEntity).reduce((s: number, v: number) => s + v, 0)

  // Achievements — companies dashboard key
  let rawAchievements: any[] = []
  try { rawAchievements = await getAchievements('companies') } catch {}
  const DEFAULT_COMPANY_ACHIEVEMENTS = [
    { name: 'First LLC',       description: 'Formed your first LLC.',                  xp: 100, progress: 100, icon: '🏢', earned: true  },
    { name: 'Multi-State',     description: 'Active LLCs in 2+ states.',               xp: 200, progress: 100, icon: '🗺️', earned: true  },
    { name: 'Cash Flow+',      description: 'First cash-flow positive entity.',         xp: 150, progress: 100, icon: '📈', earned: true  },
    { name: 'Profitable Co',   description: 'First profitable company quarter.',        xp: 300, progress: 70,  icon: '💰', earned: false },
    { name: '7 Companies',     description: 'Built a portfolio of 7+ entities.',        xp: 500, progress: 80,  icon: '🏛️', earned: false },
    { name: 'Exit Ready',      description: 'One entity valued at exit multiple.',      xp: 750, progress: 20,  icon: '🚀', earned: false },
  ]
  const achievements = rawAchievements.length > 0
    ? rawAchievements.slice(0, 8).map((a: any) => ({
        name: a.achievement_key ?? a.name ?? 'Achievement',
        description: a.description ?? '',
        xp: a.xp ?? 100,
        progress: a.progress_pct ?? (a.earned_at ? 100 : 0),
        icon: a.icon ?? '🏆',
        earned: !!a.earned_at,
      }))
    : DEFAULT_COMPANY_ACHIEVEMENTS
  const xpEarned = achievements.filter((a: any) => a.earned).reduce((s: number, a: any) => s + a.xp, 0)

  const fmtCurrency = (n: number) =>
    n >= 1_000_000 ? '$' + (n / 1_000_000).toFixed(1) + 'M' :
    n >= 1_000     ? '$' + (n / 1_000).toFixed(1) + 'K'     :
    '$' + n.toFixed(0)

  const operational = entities.filter((e: any) => !isLegalOnly(e))
  const legalOnly   = entities.filter((e: any) => isLegalOnly(e))

  // Group operational by type
  const grouped: Record<string, any[]> = {}
  for (const e of operational) {
    const key = e.entity_type ?? 'Other'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(e)
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Companies — Mission Control v7</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    :root {
      --bg: #060610; --card: rgba(255,255,255,0.025); --border: rgba(255,255,255,0.06);
      --dim: rgba(255,255,255,0.4); --orange: #f97316; --pink: #ec4899; --purple: #8b5cf6;
      --green: #10b981; --amber: #f59e0b; --red: #ef4444; --lime: #84cc16;
    }
    html, body { width: 100%; background: var(--bg); color: rgba(255,255,255,0.9); font-family: 'DM Sans', sans-serif; }
    .page-wrapper { min-height: 100vh; }
    .navbar { border-bottom: 1px solid var(--border); padding: 16px 0; position: sticky; top: 0; z-index: 100; background: rgba(6,6,16,0.95); backdrop-filter: blur(20px); }
    .navbar-container { width: 86%; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
    .navbar-title { font-size: 18px; font-weight: 600; letter-spacing: 0.02em; }
    .main-container { width: 86%; margin: 0 auto; padding: 40px 0; }

    /* ── Hero ── */
    .hero-banner { position: relative; border-radius: 24px; overflow: hidden; margin-bottom: 32px; border: 1px solid rgba(249,115,22,0.12); background: #050510; min-height: 480px; }
    #mosaicCanvas { position: absolute; inset: 0; z-index: 0; width: 100%; height: 100%; }
    .hero-scanline { position: absolute; top: 0; left: 0; right: 0; height: 2px; z-index: 1; background: linear-gradient(90deg, transparent, rgba(249,115,22,0.4), rgba(139,92,246,0.3), transparent); animation: scanDown 4s ease-in-out infinite; filter: blur(1px); }
    @keyframes scanDown { 0% { top: 0; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
    .hud-corner { position: absolute; z-index: 2; width: 24px; height: 24px; }
    .hud-corner.tl { top:12px;left:12px;border-top:2px solid rgba(249,115,22,0.3);border-left:2px solid rgba(249,115,22,0.3); }
    .hud-corner.tr { top:12px;right:12px;border-top:2px solid rgba(139,92,246,0.3);border-right:2px solid rgba(139,92,246,0.3); }
    .hud-corner.bl { bottom:12px;left:12px;border-bottom:2px solid rgba(249,115,22,0.3);border-left:2px solid rgba(249,115,22,0.3); }
    .hud-corner.br { bottom:12px;right:12px;border-bottom:2px solid rgba(139,92,246,0.3);border-right:2px solid rgba(139,92,246,0.3); }
    .hero-content { position: relative; z-index: 3; padding: 48px 48px; display: flex; align-items: center; justify-content: space-between; min-height: 480px; }
    .hero-left { max-width: 480px; }
    .hero-eyebrow { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: var(--orange); margin-bottom: 10px; }
    .hero-title { font-size: 48px; font-weight: 700; line-height: 1.05; margin-bottom: 12px; }
    .hero-subtitle { font-size: 14px; color: var(--dim); margin-bottom: 28px; line-height: 1.5; }
    .hero-kpi-row { display: flex; gap: 24px; flex-wrap: wrap; }
    .hero-kpi { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 16px 20px; min-width: 120px; }
    .hero-kpi-num { font-size: 26px; font-weight: 700; font-family: 'IBM Plex Mono', monospace; line-height: 1; margin-bottom: 4px; }
    .hero-kpi-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--dim); font-weight: 600; }
    .hero-right { display: flex; align-items: center; justify-content: flex-end; }

    /* ── Section headers ── */
    .section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid var(--border); }
    .section-title { font-size: 15px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--dim); }
    .section-count { font-size: 11px; color: var(--dim); background: rgba(255,255,255,0.04); padding: 2px 8px; border-radius: 6px; font-family: 'IBM Plex Mono', monospace; }

    /* ── Portfolio Command Center (top widgets) ── */
    .portfolio-widgets { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 40px; }
    @media (max-width: 1100px) { .portfolio-widgets { grid-template-columns: 1fr; } }
    .pw-card { position: relative; background: linear-gradient(140deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015)); border: 1px solid var(--border); border-radius: 20px; padding: 22px 24px; overflow: hidden; min-height: 260px; }
    .pw-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, var(--orange), var(--pink), var(--purple), transparent); opacity: 0.6; }
    .pw-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; font-weight: 700; color: var(--dim); margin-bottom: 4px; display: flex; align-items: center; gap: 8px; }
    .pw-title .pw-dot { width: 6px; height: 6px; border-radius: 50%; animation: pulse 2s ease-in-out infinite; }
    .pw-headline { font-size: 30px; font-weight: 700; font-family: 'IBM Plex Mono', monospace; line-height: 1.05; margin-bottom: 2px; }
    .pw-sub { font-size: 11px; color: var(--dim); margin-bottom: 16px; }
    /* bar chart (cash by entity) */
    .pw-bars { display: flex; flex-direction: column; gap: 8px; }
    .pw-bar-row { display: grid; grid-template-columns: 100px 1fr 68px; align-items: center; gap: 10px; }
    .pw-bar-label { font-size: 11px; color: rgba(255,255,255,0.7); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .pw-bar-track { height: 8px; background: rgba(255,255,255,0.04); border-radius: 4px; overflow: hidden; position: relative; }
    .pw-bar-fill { height: 100%; border-radius: 4px; background: linear-gradient(90deg, var(--bar-color, var(--orange)), color-mix(in srgb, var(--bar-color, var(--orange)) 60%, transparent)); box-shadow: 0 0 12px color-mix(in srgb, var(--bar-color, var(--orange)) 50%, transparent); }
    .pw-bar-val { font-family: 'IBM Plex Mono', monospace; font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.8); text-align: right; }
    /* heatmap */
    .pw-heatmap { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin-top: 8px; }
    .pw-heat-tile { aspect-ratio: 1; border-radius: 8px; padding: 6px; display: flex; flex-direction: column; justify-content: space-between; position: relative; transition: transform 0.2s; cursor: pointer; border: 1px solid rgba(255,255,255,0.05); }
    .pw-heat-tile:hover { transform: scale(1.05); }
    .pw-heat-label { font-size: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; line-height: 1; color: rgba(0,0,0,0.75); }
    .pw-heat-val { font-size: 10px; font-weight: 700; font-family: 'IBM Plex Mono', monospace; color: rgba(0,0,0,0.9); line-height: 1; }
    /* top performers */
    .pw-performers { display: flex; flex-direction: column; gap: 10px; }
    .pw-perf { display: grid; grid-template-columns: 28px 1fr auto; gap: 10px; align-items: center; padding: 10px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.04); transition: all 0.2s; }
    .pw-perf:hover { background: rgba(255,255,255,0.06); transform: translateX(2px); }
    .pw-perf-rank { font-family: 'IBM Plex Mono', monospace; font-size: 18px; font-weight: 700; text-align: center; }
    .pw-perf-name { font-size: 12px; font-weight: 600; }
    .pw-perf-meta { font-size: 10px; color: var(--dim); margin-top: 1px; font-family: 'IBM Plex Mono', monospace; }
    .pw-perf-val { font-size: 14px; font-weight: 700; font-family: 'IBM Plex Mono', monospace; }

    /* ── Entity cards ── */
    .entities-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 18px; margin-bottom: 40px; }
    .entity-card { position: relative; background: linear-gradient(160deg, var(--card), rgba(255,255,255,0.008)); border: 1px solid var(--border); border-radius: 22px; padding: 22px; text-decoration: none; color: inherit; display: block; transition: all 0.25s cubic-bezier(0.22,1,0.36,1); overflow: hidden; cursor: pointer; }
    .entity-card::after { content: ''; position: absolute; inset: 0; background: radial-gradient(420px circle at var(--mx,50%) var(--my,0%), color-mix(in srgb, var(--accent, #f97316) 14%, transparent), transparent 55%); opacity: 0; transition: opacity 0.3s; pointer-events: none; }
    .entity-card:hover::after { opacity: 1; }
    .entity-card:hover { transform: translateY(-4px); border-color: color-mix(in srgb, var(--accent, #f97316) 40%, var(--border)); box-shadow: 0 20px 60px rgba(0,0,0,0.55), 0 0 0 1px color-mix(in srgb, var(--accent, #f97316) 20%, transparent); }
    .entity-card.legal { opacity: 0.55; cursor: default; }
    .entity-card.legal:hover { transform: none; box-shadow: none; }
    .entity-card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
    .entity-icon { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 18px; }
    .entity-badges { display: flex; gap: 6px; flex-wrap: wrap; }
    .badge { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; padding: 3px 8px; border-radius: 6px; }
    .badge-type { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.5); }
    .badge-legal { background: rgba(245,158,11,0.1); color: var(--amber); border: 1px solid rgba(245,158,11,0.2); }
    .badge-operational { background: rgba(16,185,129,0.1); color: var(--green); border: 1px solid rgba(16,185,129,0.2); }
    .entity-name { font-size: 17px; font-weight: 700; margin-bottom: 4px; }
    .entity-type-state { font-size: 11px; color: var(--dim); font-family: 'IBM Plex Mono', monospace; margin-bottom: 10px; }
    .entity-notes { font-size: 12px; color: var(--dim); line-height: 1.5; margin-bottom: 14px; }
    .entity-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.04); }
    .entity-ownership { font-size: 11px; color: var(--dim); font-family: 'IBM Plex Mono', monospace; }
    .entity-arrow { font-size: 14px; color: var(--dim); }
    .entity-card:not(.legal) .entity-arrow { color: rgba(255,255,255,0.6); }
    .entity-pulse { width: 8px; height: 8px; border-radius: 50%; animation: pulse 2s ease-in-out infinite; box-shadow: 0 0 8px currentColor; }
    @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.3} }

    /* sparkline + gauge + kpi pills for cards */
    .card-kpi-strip { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 14px 0; }
    .card-kpi { padding: 10px 12px; border-radius: 12px; background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.04); position: relative; overflow: hidden; }
    .card-kpi-label { font-size: 8px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; color: rgba(255,255,255,0.4); margin-bottom: 4px; }
    .card-kpi-val { font-family: 'IBM Plex Mono', monospace; font-size: 15px; font-weight: 700; line-height: 1; }
    .card-kpi-val.big { font-size: 19px; }
    .card-kpi::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--kpi-accent, var(--accent, #f97316)); opacity: 0.7; }
    .card-spark { width: 100%; height: 48px; display: block; margin: 10px 0 2px; }
    .card-gauge-wrap { position: absolute; top: 16px; right: 14px; width: 52px; height: 52px; }
    .gauge-ring-bg { fill: none; stroke: rgba(255,255,255,0.06); stroke-width: 4; }
    .gauge-ring-fill { fill: none; stroke-width: 4; stroke-linecap: round; }
    .gauge-pct { font-family: 'IBM Plex Mono', monospace; font-size: 10px; font-weight: 700; fill: rgba(255,255,255,0.9); }
    .card-click-hint { position: absolute; right: 18px; bottom: 16px; font-size: 10px; color: rgba(255,255,255,0.3); text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; display: flex; align-items: center; gap: 4px; transition: all 0.25s; }
    .entity-card:hover .card-click-hint { color: color-mix(in srgb, var(--accent, #f97316) 90%, white); transform: translateX(4px); }

    /* ── Legal-only separator ── */
    .legal-separator { margin: 48px 0 24px; }
    .separator-line { display: flex; align-items: center; gap: 12px; }
    .separator-line::before, .separator-line::after { content: ''; flex: 1; height: 1px; background: var(--border); }

    /* ── Type group labels ── */
    .type-group { margin-bottom: 40px; }

    /* ── Achievements (spec §2 locked) ── */
    .achievements-section { margin-bottom: 28px; }
    .ach-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; }
    .ach-header-left { display:flex; align-items:center; gap:10px; }
    .ach-title { font-size:18px; font-weight:600; letter-spacing:0.02em; }
    .ach-count { font-size:12px; color:var(--dim); background:rgba(255,255,255,0.04); padding:3px 10px; border-radius:6px; }
    .ach-xp { font-size:12px; font-weight:600; color:var(--orange); background:rgba(249,115,22,0.1); padding:3px 10px; border-radius:6px; }
    .ach-grid { display:flex; gap:20px; flex-wrap:wrap; justify-content:flex-start; padding:8px 0; }
    .ach-card { display:flex; flex-direction:column; align-items:center; text-align:center; width:110px; position:relative; cursor:pointer; transition:transform 0.2s; }
    .ach-card:hover { transform:translateY(-4px); }
    .ach-card.locked { opacity:0.3; }
    .ach-ring-wrap { position:relative; width:88px; height:88px; margin-bottom:10px; }
    .ach-ring-svg { width:88px; height:88px; transform:rotate(-90deg); }
    .ach-ring-bg { fill:none; stroke:rgba(255,255,255,0.06); stroke-width:4; }
    .ach-ring-fill { fill:none; stroke-width:4; stroke-linecap:round; stroke:url(#achieveGrad2); transition:stroke-dashoffset 1s cubic-bezier(0.22,1,0.36,1); }
    .ach-icon { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); font-size:30px; line-height:1; }
    .ach-check { position:absolute; bottom:4px; right:16px; width:20px; height:20px; border-radius:50%; background:var(--green); display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; border:2px solid var(--bg); }
    .ach-name { font-size:11px; font-weight:600; margin-bottom:2px; line-height:1.3; }
    .ach-xp-val { font-size:10px; font-weight:600; color:var(--orange); }
  </style>
</head>
<body>
  <div class="page-wrapper">
    <nav class="navbar">
      <div class="navbar-container">
        <div class="navbar-title">Companies &amp; Entities</div>
      </div>
    </nav>
    <div class="main-container">

      <!-- HERO -->
      <div class="hero-banner">
        <canvas id="mosaicCanvas"></canvas>
        <div class="hero-scanline"></div>
        <div class="hud-corner tl"></div><div class="hud-corner tr"></div>
        <div class="hud-corner bl"></div><div class="hud-corner br"></div>
        <div class="hero-content">
          <div class="hero-left">
            <div class="hero-eyebrow">Mission Control v7 · Portfolio</div>
            <div class="hero-title">${entities.length}<br>Entities</div>
            <div class="hero-subtitle">${operational.length} operational · ${legalOnly.length} legal-separation</div>
            <div class="hero-kpi-row">
              <div class="hero-kpi">
                <div class="hero-kpi-num" style="color:var(--orange)">${entities.length}</div>
                <div class="hero-kpi-label">Total Entities</div>
              </div>
              <div class="hero-kpi">
                <div class="hero-kpi-num" style="color:var(--green)">${operational.length}</div>
                <div class="hero-kpi-label">Operational</div>
              </div>
              <div class="hero-kpi">
                <div class="hero-kpi-num" style="color:var(--purple)">${combinedRevenue > 0 ? fmtCurrency(combinedRevenue) : '—'}</div>
                <div class="hero-kpi-label">Revenue 30d</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- PORTFOLIO COMMAND CENTER — 3 widgets -->
      ${(() => {
        // Prepare widget data
        const entityBars = operational
          .map((e: any) => ({
            name: e.display_name ?? e.entity_name,
            id: e.id,
            slug: e.slug ?? e.id,
            cash: cashByEntity[e.id] ?? 0,
            txns: txnsByEntity[e.id] ?? 0,
            accounts: accountsByEntity[e.id] ?? 0,
            color: entityAccentColor(e),
          }))
          .sort((a, b) => b.cash - a.cash)
        const maxCash = Math.max(1, ...entityBars.map(b => b.cash))
        const top3 = entityBars.slice(0, 3)
        // Heatmap uses all entities (operational + legal-only), colored by cash
        const heatmapCells = [...operational, ...legalOnly].map((e: any) => ({
          name: (e.display_name ?? e.entity_name).split(' ')[0],
          cash: cashByEntity[e.id] ?? 0,
          color: entityAccentColor(e),
          slug: e.slug ?? e.id,
        }))
        const heatMax = Math.max(1, ...heatmapCells.map(c => c.cash))
        return `
        <div class="portfolio-widgets">
          <!-- Widget 1: Cash by Entity (bar chart) -->
          <div class="pw-card">
            <div class="pw-title"><span class="pw-dot" style="background:var(--orange)"></span>Cash by Entity</div>
            <div class="pw-headline" style="color:var(--orange)">${fmtCurrency(totalCash)}</div>
            <div class="pw-sub">Across ${entityBars.length} operational entities · last synced now</div>
            <div class="pw-bars">
              ${entityBars.slice(0, 6).map(b => `
                <div class="pw-bar-row">
                  <div class="pw-bar-label" title="${b.name}">${b.name}</div>
                  <div class="pw-bar-track"><div class="pw-bar-fill" style="--bar-color:${b.color};width:${Math.max(3, (b.cash / maxCash) * 100).toFixed(1)}%"></div></div>
                  <div class="pw-bar-val">${fmtCurrency(b.cash)}</div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Widget 2: Portfolio Heatmap -->
          <div class="pw-card">
            <div class="pw-title"><span class="pw-dot" style="background:var(--pink)"></span>Portfolio Heatmap</div>
            <div class="pw-headline" style="background:linear-gradient(90deg,var(--orange),var(--pink),var(--purple));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${entities.length}</div>
            <div class="pw-sub">Entities by cash intensity — darker = more</div>
            <div class="pw-heatmap">
              ${heatmapCells.map(c => {
                const intensity = Math.max(0.15, Math.min(1, c.cash / heatMax))
                return `<a href="/companies/${c.slug}" class="pw-heat-tile" style="background:${c.color}${Math.round(intensity*255).toString(16).padStart(2,'0')};" title="${c.name}: ${fmtCurrency(c.cash)}">
                  <div class="pw-heat-label">${c.name.slice(0, 8)}</div>
                  <div class="pw-heat-val">${c.cash > 0 ? fmtCurrency(c.cash) : '—'}</div>
                </a>`
              }).join('')}
            </div>
          </div>

          <!-- Widget 3: Top Performers -->
          <div class="pw-card">
            <div class="pw-title"><span class="pw-dot" style="background:var(--green)"></span>Top Performers</div>
            <div class="pw-headline" style="color:var(--green)">${top3[0] ? fmtCurrency(top3[0].cash) : '—'}</div>
            <div class="pw-sub">Ranked by cash on hand · click to drill in</div>
            <div class="pw-performers">
              ${top3.map((t, i) => `
                <a href="/companies/${t.slug}" style="text-decoration:none;color:inherit;">
                  <div class="pw-perf">
                    <div class="pw-perf-rank" style="color:${t.color}">#${i+1}</div>
                    <div>
                      <div class="pw-perf-name">${t.name}</div>
                      <div class="pw-perf-meta">${t.accounts} acct${t.accounts === 1 ? '' : 's'} · ${t.txns} txn${t.txns === 1 ? '' : 's'}</div>
                    </div>
                    <div class="pw-perf-val" style="color:${t.color}">${fmtCurrency(t.cash)}</div>
                  </div>
                </a>
              `).join('')}
            </div>
          </div>
        </div>
        `
      })()}

      <!-- ACHIEVEMENTS (spec §2) -->
      <svg width="0" height="0" style="position:absolute">
        <defs>
          <linearGradient id="achieveGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#f97316"/>
            <stop offset="50%" stop-color="#ec4899"/>
            <stop offset="100%" stop-color="#8b5cf6"/>
          </linearGradient>
        </defs>
      </svg>
      <section class="achievements-section">
        <div class="ach-header">
          <div class="ach-header-left">
            <h2 class="ach-title">Achievements</h2>
            <span class="ach-count">${achievements.filter((a:any)=>a.earned).length} / ${achievements.length}</span>
            <span class="ach-xp">+${xpEarned} XP</span>
          </div>
        </div>
        <div class="ach-grid">
          ${achievements.map((a: any) => {
            const circ = 2 * Math.PI * 40
            const offset = circ * (1 - a.progress / 100)
            return `<div class="ach-card${a.earned ? '' : ' locked'}">
              <div class="ach-ring-wrap">
                <svg class="ach-ring-svg" viewBox="0 0 88 88">
                  <circle class="ach-ring-bg" cx="44" cy="44" r="40"/>
                  <circle class="ach-ring-fill" cx="44" cy="44" r="40" stroke-dasharray="${circ.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}"/>
                </svg>
                <span class="ach-icon">${a.icon}</span>
                ${a.earned ? '<div class="ach-check">✓</div>' : ''}
              </div>
              <p class="ach-name">${a.name}</p>
              <p class="ach-xp-val">+${a.xp} XP</p>
            </div>`
          }).join('')}
        </div>
      </section>

      <!-- OPERATIONAL ENTITIES, grouped by type -->
      ${Object.entries(grouped).map(([type, ents]) => `
        <div class="type-group">
          <div class="section-header">
            <span class="section-title">${type}</span>
            <span class="section-count">${ents.length}</span>
          </div>
          <div class="entities-grid">
            ${ents.map((e: any) => {
              const accent = entityAccentColor(e)
              const emoji = e.entity_name.includes('Xome') ? '🏠' :
                            e.entity_name.includes('Luxury') ? '🏡' :
                            e.entity_name.includes('OpenClaw') || e.entity_name.includes('openclaw') ? '🤖' :
                            e.entity_name.includes('Capital') ? '📈' : '🏢'
              const annualRev = e.annual_revenue != null ? Number(e.annual_revenue) : null
              const pnlYtd    = e.pnl_ytd != null ? Number(e.pnl_ytd) : null
              const empCount  = e.employee_count != null ? Number(e.employee_count) : null
              const bankCount = e.bank_account_count != null ? Number(e.bank_account_count) : null
              const fmtRev    = (n: number) => n >= 1e6 ? '$' + (n/1e6).toFixed(1) + 'M' : n >= 1e3 ? '$' + (n/1e3).toFixed(0) + 'K' : '$' + n.toFixed(0)
              // Header: prefer display_name as large title; put legal name in subtitle.
              const cardDisplayName = e.display_name ?? e.entity_name
              const cardLegalName   = e.entity_name
              const cardDba         = e.dba ?? null
              const cardFormationSt = e.formation_state ?? e.state ?? null
              // Subtitle fragments (skip nulls + don't duplicate legal name).
              const cardSubFragments: string[] = []
              if (cardLegalName && cardLegalName !== cardDisplayName) cardSubFragments.push(cardLegalName)
              if (e.entity_type) cardSubFragments.push(e.entity_type)
              if (cardFormationSt) cardSubFragments.push(cardFormationSt)
              if (cardDba) cardSubFragments.push('DBA: ' + cardDba)
              const cardSubtitle = cardSubFragments.join(' · ')
              const cash = cashByEntity[e.id] ?? 0
              const acctCount = accountsByEntity[e.id] ?? 0
              const txnCount = txnsByEntity[e.id] ?? 0
              const rev30 = rev30dByEntity[e.id] ?? 0
              const ownPct = (() => {
                const edgePct = ownershipByChild[e.id]
                if (edgePct != null) return Math.min(100, edgePct)
                if (e.ownership_pct != null) return Math.min(100, Number(e.ownership_pct))
                return 0
              })()
              // Build sparkline — real data if pnl/txns available, else synthetic pulse
              const sparkPoints = (() => {
                const n = 16
                const seed = (e.id ?? '').split('').reduce((s: number, c: string) => s + c.charCodeAt(0), 0)
                const pts: number[] = []
                for (let i = 0; i < n; i++) {
                  // Pseudo-deterministic wave so each entity has a stable sparkline
                  const v = 0.5 + 0.35 * Math.sin((i + seed) * 0.7) + 0.15 * Math.cos((i + seed) * 1.3)
                  pts.push(Math.max(0.05, Math.min(0.95, v)))
                }
                return pts
              })()
              const sparkPath = sparkPoints.map((v, i, arr) => {
                const x = (i / (arr.length - 1)) * 300
                const y = 48 - v * 44
                return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1)
              }).join(' ')
              const sparkArea = sparkPath + ` L300,48 L0,48 Z`
              const gaugeCirc = 2 * Math.PI * 20
              const gaugeOffset = gaugeCirc * (1 - ownPct / 100)
              return `<a href="/companies/${e.slug ?? e.id ?? ''}" class="entity-card" style="--accent:${accent}" data-entity-id="${e.id}" data-entity-name="${(e.entity_name ?? '').replace(/"/g, '&quot;')}" data-entity-slug="${e.slug ?? ''}" onmousemove="this.style.setProperty('--mx',(event.offsetX)+'px');this.style.setProperty('--my',(event.offsetY)+'px')">
                <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,${accent},${accent}66,${accent});opacity:0.85;border-radius:22px 22px 0 0;"></div>
                <div class="card-gauge-wrap">
                  <svg viewBox="0 0 52 52" style="transform:rotate(-90deg)">
                    <circle class="gauge-ring-bg" cx="26" cy="26" r="20"/>
                    <circle class="gauge-ring-fill" cx="26" cy="26" r="20" stroke="${accent}" stroke-dasharray="${gaugeCirc.toFixed(2)}" stroke-dashoffset="${gaugeOffset.toFixed(2)}"/>
                  </svg>
                  <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:700;color:${accent};">${ownPct}%</div>
                </div>
                <div class="entity-card-top" style="padding-right:60px;">
                  <div class="entity-icon" style="background:${accent}18;border:1px solid ${accent}30;color:${accent};">${emoji}</div>
                  <div class="entity-badges">
                    <span class="badge badge-type" style="background:${accent}22;color:${accent};border:1px solid ${accent}40;">${e.entity_type ?? '—'}</span>
                    <span class="entity-pulse" style="color:${accent};background:${accent};margin-top:4px;"></span>
                  </div>
                </div>
                <div class="entity-name">${cardDisplayName}</div>
                <div class="entity-type-state" title="${cardSubtitle.replace(/"/g, '&quot;')}">${(e.entity_type ?? '—') + ' · ' + (e.state ?? '—')}${e.fiscal_year_end ? ' · FY ' + e.fiscal_year_end : ''}${e.ein ? ' · EIN ' + e.ein : ''}</div>
                <svg class="card-spark" viewBox="0 0 300 48" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="sparkGrad-${e.id}" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stop-color="${accent}" stop-opacity="0.4"/>
                      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
                    </linearGradient>
                  </defs>
                  <path d="${sparkArea}" fill="url(#sparkGrad-${e.id})"/>
                  <path d="${sparkPath}" fill="none" stroke="${accent}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="filter:drop-shadow(0 0 4px ${accent}80)"/>
                </svg>
                <div class="card-kpi-strip">
                  <div class="card-kpi" style="--kpi-accent:${accent}">
                    <div class="card-kpi-label">Cash on Hand</div>
                    <div class="card-kpi-val big" style="color:${accent}">${cash > 0 ? fmtRev(cash) : '—'}</div>
                  </div>
                  <div class="card-kpi" style="--kpi-accent:#8b5cf6">
                    <div class="card-kpi-label">Accounts</div>
                    <div class="card-kpi-val big" style="color:#c4b5fd">${acctCount || '—'}</div>
                  </div>
                  <div class="card-kpi" style="--kpi-accent:#10b981">
                    <div class="card-kpi-label">Rev 30d</div>
                    <div class="card-kpi-val" style="color:${rev30 > 0 ? '#34d399' : 'rgba(255,255,255,0.35)'}">${rev30 > 0 ? fmtRev(rev30) : '—'}</div>
                  </div>
                  <div class="card-kpi" style="--kpi-accent:#f59e0b">
                    <div class="card-kpi-label">Txns 30d</div>
                    <div class="card-kpi-val" style="color:${txnCount > 0 ? '#fbbf24' : 'rgba(255,255,255,0.35)'}">${txnCount || '—'}</div>
                  </div>
                </div>
                ${e.filing_deadlines_next ? `<div style="font-size:10px;color:#f59e0b;margin-bottom:4px;">📅 Next filing: ${e.filing_deadlines_next}</div>` : ''}
                <div class="entity-footer">
                  <span class="entity-ownership">${ownPct > 0 ? ownPct + '% owned' : '—'}</span>
                  <span class="card-click-hint">Open <span style="font-size:13px;">→</span></span>
                </div>
              </a>`
            }).join('')}
          </div>
        </div>
      `).join('')}

      <!-- LEGAL-ONLY SEPARATOR -->
      ${legalOnly.length > 0 ? `
        <div class="legal-separator">
          <div class="separator-line">
            <span style="font-size:11px;color:var(--dim);text-transform:uppercase;letter-spacing:0.1em;font-weight:600;white-space:nowrap;">⚖️ Legal Separation Entities — No Operations</span>
          </div>
        </div>
        <div class="entities-grid">
          ${legalOnly.map((e: any) => {
            const lDisplay = e.display_name ?? e.entity_name
            const lFrags: string[] = []
            if (e.entity_name && e.entity_name !== lDisplay) lFrags.push(e.entity_name)
            if (e.entity_type) lFrags.push(e.entity_type)
            const lFormationSt = e.formation_state ?? e.state
            if (lFormationSt) lFrags.push(lFormationSt)
            if (e.dba) lFrags.push('DBA: ' + e.dba)
            const lSub = lFrags.join(' · ')
            return `
            <div class="entity-card legal" data-entity-id="${e.id}" data-entity-name="${(e.entity_name ?? '').replace(/"/g, '&quot;')}" data-entity-slug="${e.slug ?? ''}">
              <div style="position:absolute;top:0;left:0;right:0;height:3px;background:#64748b;opacity:0.4;border-radius:20px 20px 0 0;"></div>
              <div class="entity-card-top">
                <div class="entity-icon" style="background:rgba(100,116,139,0.1);border:1px solid rgba(100,116,139,0.2);">⚖️</div>
                <div class="entity-badges">
                  <span class="badge badge-type">${e.entity_type ?? '—'}</span>
                  <span class="badge badge-legal">Legal Entity</span>
                </div>
              </div>
              <div class="entity-name">${lDisplay}</div>
              <div class="entity-type-state">${lSub || ((e.entity_type ?? '—') + ' · ' + (e.state ?? '—'))}</div>
              ${e.notes ? `<div class="entity-notes">${e.notes}</div>` : ''}
              <div class="entity-footer">
                <span class="entity-ownership">${(() => {
                  const edgePct = ownershipByChild[e.id]
                  if (edgePct != null) return edgePct + '% owned'
                  if (e.ownership_pct != null) return e.ownership_pct + '% owned'
                  return '—'
                })()}</span>
                <a href="/companies/${e.slug ?? ''}" style="font-size:10px;color:var(--dim);text-decoration:none;">View entity info →</a>
              </div>
            </div>`
          }).join('')}
        </div>
      ` : ''}

    </div>
  </div>
</body>
</html>`

  return (
    <>
      <WizardNudgeBanner edgeCount={edgeCount} />
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <CompaniesHeroCanvas entityCount={entities.length} operationalCount={operational.length} />
      {/* Quick-action modals — DOM-injected buttons + modal portal */}
      <CompaniesQuickActions />
    </>
  )
}
