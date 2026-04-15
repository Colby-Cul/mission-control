/**
 * Companies Index — portfolio mosaic of all entities.
 * Operational entities: full card with revenue KPI.
 * Legal-only entities (Alabama Shores, Black Lab Capital LLC): subdued card
 * with a "Legal Entity" tag; no full dashboard link.
 *
 * Hero animation: entity-mosaic — tiles pulsing at different rates.
 */
import { getEntities, getTransactions30d } from '../lib/queries'
import CompaniesHeroCanvas from './_CompaniesHeroCanvas'

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

  // Combined revenue from last 30d transactions (for KPI card)
  let txns: any[] = []
  try { txns = await getTransactions30d() } catch {}
  const combinedRevenue = txns
    .filter((t: any) => Number(t.amount) < 0)
    .reduce((sum: number, t: any) => sum + Math.abs(Number(t.amount)), 0)

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
    .hero-banner { position: relative; border-radius: 24px; overflow: hidden; margin-bottom: 32px; border: 1px solid rgba(249,115,22,0.12); background: #050510; min-height: 380px; }
    #mosaicCanvas { position: absolute; inset: 0; z-index: 0; width: 100%; height: 100%; }
    .hero-scanline { position: absolute; top: 0; left: 0; right: 0; height: 2px; z-index: 1; background: linear-gradient(90deg, transparent, rgba(249,115,22,0.4), rgba(139,92,246,0.3), transparent); animation: scanDown 4s ease-in-out infinite; filter: blur(1px); }
    @keyframes scanDown { 0% { top: 0; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
    .hud-corner { position: absolute; z-index: 2; width: 24px; height: 24px; }
    .hud-corner.tl { top:12px;left:12px;border-top:2px solid rgba(249,115,22,0.3);border-left:2px solid rgba(249,115,22,0.3); }
    .hud-corner.tr { top:12px;right:12px;border-top:2px solid rgba(139,92,246,0.3);border-right:2px solid rgba(139,92,246,0.3); }
    .hud-corner.bl { bottom:12px;left:12px;border-bottom:2px solid rgba(249,115,22,0.3);border-left:2px solid rgba(249,115,22,0.3); }
    .hud-corner.br { bottom:12px;right:12px;border-bottom:2px solid rgba(139,92,246,0.3);border-right:2px solid rgba(139,92,246,0.3); }
    .hero-content { position: relative; z-index: 3; padding: 48px 48px; display: flex; align-items: center; justify-content: space-between; min-height: 380px; }
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
              return `<a href="/companies/${e.slug ?? ''}" class="entity-card" style="--accent:${accent}">
                <div style="position:absolute;top:0;left:0;right:0;height:3px;background:${accent};opacity:0.7;border-radius:20px 20px 0 0;"></div>
                <div class="entity-card-top">
                  <div class="entity-icon" style="background:${accent}18;border:1px solid ${accent}30;">${emoji}</div>
                  <div class="entity-badges">
                    <span class="badge badge-type">${e.entity_type ?? '—'}</span>
                    <span class="badge badge-operational">Operational</span>
                    <span class="entity-pulse" style="background:${accent};margin-top:4px;"></span>
                  </div>
                </div>
                <div class="entity-name">${e.entity_name}</div>
                <div class="entity-type-state">${e.entity_type ?? '—'} · ${e.state ?? '—'}</div>
                ${e.notes ? `<div class="entity-notes">${e.notes}</div>` : ''}
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
            <div class="entity-card legal">
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
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <CompaniesHeroCanvas entityCount={entities.length} operationalCount={operational.length} />
    </>
  )
}
