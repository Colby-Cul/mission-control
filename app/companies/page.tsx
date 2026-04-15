/**
 * Companies Index — portfolio mosaic of all entities.
 * Operational entities: full card with revenue KPI.
 * Legal-only entities (Alabama Shores, Black Lab Capital LLC): subdued card
 * with a "Legal Entity" tag; no full dashboard link.
 *
 * Hero animation: entity-mosaic — tiles pulsing at different rates.
 */
import { getEntities, getTransactions30d, getAchievements, getOwnershipEdges } from '../lib/queries'
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

  let edgeCount = 0
  try { edgeCount = (await getOwnershipEdges()).length } catch {}

  // Combined revenue from last 30d transactions (for KPI card)
  let txns: any[] = []
  try { txns = await getTransactions30d() } catch {}
  const combinedRevenue = txns
    .filter((t: any) => Number(t.amount) < 0)
    .reduce((sum: number, t: any) => sum + Math.abs(Number(t.amount)), 0)

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

    /* ── Entity cards ── */
    .entities-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; margin-bottom: 40px; }
    .entity-card { position: relative; background: var(--card); border: 1px solid var(--border); border-radius: 20px; padding: 24px; text-decoration: none; color: inherit; display: block; transition: all 0.25s cubic-bezier(0.22,1,0.36,1); overflow: hidden; }
    .entity-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; opacity: 0.7; border-radius: 20px 20px 0 0; }
    .entity-card:hover { transform: translateY(-3px); box-shadow: 0 16px 48px rgba(0,0,0,0.5); }
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
    .entity-pulse { width: 8px; height: 8px; border-radius: 50%; animation: pulse 2s ease-in-out infinite; }
    @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.3} }

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
              return `<a href="/companies/${e.slug ?? e.id ?? ''}" class="entity-card" style="--accent:${accent}" data-entity-id="${e.id}" data-entity-name="${(e.entity_name ?? '').replace(/"/g, '&quot;')}" data-entity-slug="${e.slug ?? ''}">
                <div style="position:absolute;top:0;left:0;right:0;height:3px;background:${accent};opacity:0.7;border-radius:20px 20px 0 0;"></div>
                <div class="entity-card-top">
                  <div class="entity-icon" style="background:${accent}18;border:1px solid ${accent}30;">${emoji}</div>
                  <div class="entity-badges">
                    <span class="badge badge-type">${e.entity_type ?? '—'}</span>
                    <span class="badge badge-operational">Operational</span>
                    ${e.ein ? `<span class="badge badge-type" style="font-size:9px;">EIN ${e.ein}</span>` : ''}
                    <span class="entity-pulse" style="background:${accent};margin-top:4px;"></span>
                  </div>
                </div>
                <div class="entity-name">${e.entity_name}</div>
                <div class="entity-type-state">${e.entity_type ?? '—'} · ${e.state ?? '—'}${e.fiscal_year_end ? ' · FY ' + e.fiscal_year_end : ''}</div>
                ${e.notes ? `<div class="entity-notes">${e.notes}</div>` : ''}
                ${(annualRev != null || pnlYtd != null || empCount != null || bankCount != null) ? `
                <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:10px 0;padding:8px;background:rgba(255,255,255,0.02);border-radius:8px;border:1px solid rgba(255,255,255,0.04);">
                  ${annualRev != null ? `<div><div style="font-size:9px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:2px;">Annual Rev</div><div style="font-size:12px;font-weight:600;font-family:'IBM Plex Mono',monospace;color:#f97316;">${fmtRev(annualRev)}</div></div>` : ''}
                  ${pnlYtd != null ? `<div><div style="font-size:9px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:2px;">P&amp;L YTD</div><div style="font-size:12px;font-weight:600;font-family:'IBM Plex Mono',monospace;color:${pnlYtd >= 0 ? '#10b981' : '#ef4444'};">${pnlYtd >= 0 ? '+' : ''}${fmtRev(pnlYtd)}</div></div>` : ''}
                  ${empCount != null ? `<div><div style="font-size:9px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:2px;">Employees</div><div style="font-size:12px;font-weight:600;font-family:'IBM Plex Mono',monospace;color:rgba(255,255,255,0.9);">${empCount}</div></div>` : ''}
                  ${bankCount != null && bankCount > 0 ? `<div><div style="font-size:9px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:2px;">Accounts</div><div style="font-size:12px;font-weight:600;font-family:'IBM Plex Mono',monospace;color:rgba(255,255,255,0.9);">${bankCount}</div></div>` : ''}
                </div>` : ''}
                ${e.filing_deadlines_next ? `<div style="font-size:10px;color:#f59e0b;margin-bottom:8px;">📅 Next filing: ${e.filing_deadlines_next}</div>` : ''}
                <div class="entity-footer">
                  <span class="entity-ownership">${e.ownership_pct != null ? e.ownership_pct + '% owned' : '100% owned'}</span>
                  <span class="entity-arrow">→</span>
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
          ${legalOnly.map((e: any) => `
            <div class="entity-card legal" data-entity-id="${e.id}" data-entity-name="${(e.entity_name ?? '').replace(/"/g, '&quot;')}" data-entity-slug="${e.slug ?? ''}">
              <div style="position:absolute;top:0;left:0;right:0;height:3px;background:#64748b;opacity:0.4;border-radius:20px 20px 0 0;"></div>
              <div class="entity-card-top">
                <div class="entity-icon" style="background:rgba(100,116,139,0.1);border:1px solid rgba(100,116,139,0.2);">⚖️</div>
                <div class="entity-badges">
                  <span class="badge badge-type">${e.entity_type ?? '—'}</span>
                  <span class="badge badge-legal">Legal Entity</span>
                </div>
              </div>
              <div class="entity-name">${e.entity_name}</div>
              <div class="entity-type-state">${e.entity_type ?? '—'} · ${e.state ?? '—'}</div>
              ${e.notes ? `<div class="entity-notes">${e.notes}</div>` : ''}
              <div class="entity-footer">
                <span class="entity-ownership">${e.ownership_pct != null ? e.ownership_pct + '% owned' : '100% owned'}</span>
                <a href="/companies/${e.slug ?? ''}" style="font-size:10px;color:var(--dim);text-decoration:none;">View entity info →</a>
              </div>
            </div>`).join('')}
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
