/**
 * Vision Board — pixel-for-pixel port of vision-board-v5-option-d-terrain.html
 * Vision cards wired to `visions` table; account chips wired to financial_accounts.
 * XP wired to `users_profile`. Falls back to hardcoded demo when tables are empty.
 */
import {
  getVisions,
  getUserProfile,
  getAccounts,
} from '../lib/queries'
import HeroCanvas from './HeroCanvas'
import Hero from '../_components/Hero'

export const dynamic = 'force-dynamic'

// ── helpers ──────────────────────────────────────────────────────────────────

const USD = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

function statusClass(status?: string | null): string {
  const s = (status ?? '').toLowerCase()
  if (s === 'active') return 'status-active'
  if (s === 'planning') return 'status-planning'
  if (s === 'completed' || s === 'done') return 'status-completed'
  return 'status-future'
}

function buildProgressSVG(pct: number): string {
  const r = 27, circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return `<svg width="64" height="64" viewBox="0 0 64 64">
    <circle cx="32" cy="32" r="${r}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="5"/>
    <circle cx="32" cy="32" r="${r}" fill="none" stroke="url(#progGrad)" stroke-width="5" stroke-dasharray="${circ.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}" stroke-linecap="round" transform="rotate(-90 32 32)"/>
    <defs><linearGradient id="progGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#f97316"/><stop offset="100%" stop-color="#8b5cf6"/></linearGradient></defs>
  </svg>`
}

// ── build vision-grid HTML ────────────────────────────────────────────────────

function buildVisionGrid(visions: any[]): string {
  if (!visions.length) {
    // TODO: wire to visions table
    return `<div class="vision-grid" id="visionGrid">
      <div class="vision-card" data-status="planning">
        <div class="card-content" style="padding:40px 24px;text-align:center;color:rgba(255,255,255,0.4);font-size:13px;">
          No visions found — add rows to the visions table to populate this board.
        </div>
      </div>
      <div class="add-card"><span class="add-icon">+</span><span>Add Vision</span></div>
    </div>`
  }

  const cardsHtml = visions.map(v => {
    const pct = Math.min(100, Math.max(0, Number(v.progress_pct ?? 0)))
    const stat = v.status ?? 'planning'
    const imgUrl = v.image_url ?? `https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80`
    const targetRange = v.target_amount
      ? USD(v.target_amount)
      : (v.target_range ?? '—')
    const note = v.description ?? v.note ?? ''
    const badgeClass = statusClass(stat)
    const badgeText = stat.toUpperCase()

    return `<div class="vision-card" data-status="${stat}">
        <div class="card-image-wrap">
          <img src="${imgUrl}" alt="${v.title ?? 'Vision'}" />
          <div class="card-image-overlay"></div>
          <span class="status-badge ${badgeClass}">${badgeText}</span>
        </div>
        <div class="card-content">
          <h3 class="card-title">${v.title ?? 'Untitled Vision'}</h3>
          <p class="card-target">${targetRange}</p>
          <p class="card-note">${note}</p>
          <div class="card-stats-row">
            <div class="progress-ring-wrap">
              ${buildProgressSVG(pct)}
              <span class="progress-pct">${pct}%</span>
            </div>
            <div class="card-stats-col">
              ${v.monthly_needed ? `<span class="card-stat-dim">${USD(v.monthly_needed)}/mo needed to save</span>` : ''}
              ${v.eta_months ? `<span class="card-stat-dim">${v.eta_months} mo at current pace</span>` : ''}
              ${v.target_date ? `<span class="card-stat-dim">Target: ${v.target_date}</span>` : ''}
            </div>
          </div>
          ${v.gap_alert ? `<div class="gap-alert">⚠ ${v.gap_alert}</div>` : ''}
        </div>
      </div>`
  }).join('\n')

  return `<div class="vision-grid" id="visionGrid">
      ${cardsHtml}
      <div class="add-card" onclick="openModal()">
        <span class="add-icon">+</span>
        <span>Add Vision</span>
      </div>
    </div>`
}

// ── build linked accounts section HTML (Finance-card style) ──────────────────

function buildAccountCardsSection(accounts: any[]): string {
  if (!accounts.length) {
    return `<section class="section linked-accounts-section">
      <div class="section-header">
        <div class="section-header-left">
          <span style="font-size:20px">🏦</span>
          <h2 class="section-title">Linked Accounts</h2>
        </div>
      </div>
      <div style="padding:32px;text-align:center;color:rgba(255,255,255,0.3);font-size:13px;">
        No accounts linked — connect a financial institution to get started.
      </div>
    </section>`
  }

  // Group accounts by type
  const groups: Record<string, any[]> = {}
  for (const a of accounts) {
    const type = (a.account_type ?? a.type ?? 'Other').replace(/_/g, ' ')
    const key = type.charAt(0).toUpperCase() + type.slice(1)
    if (!groups[key]) groups[key] = []
    groups[key].push(a)
  }

  const groupCards = Object.entries(groups).map(([groupName, items]) => {
    const rows = items.map(a => {
      const name = a.name ?? a.official_name ?? 'Account'
      const mask = a.mask ? '•••• ' + a.mask : '••••'
      const bal = typeof a.balance_current === 'number' ? a.balance_current : null
      const isNeg = bal !== null && bal < 0
      const balFmt = bal !== null
        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(bal)
        : '—'
      return `<div class="la-account-item">
          <div>
            <div class="la-account-name">${name}</div>
            <div class="la-account-number">${mask}</div>
          </div>
          <div class="la-account-balance${isNeg ? ' negative' : ' positive'}">${balFmt}</div>
        </div>`
    }).join('\n')

    return `<div class="la-account-group">
        <div class="la-group-title">${groupName}</div>
        ${rows}
      </div>`
  }).join('\n')

  const totalBal = accounts.reduce((s, a) => s + (typeof a.balance_current === 'number' ? a.balance_current : 0), 0)
  const totalFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalBal)

  return `<section class="section linked-accounts-section">
    <div class="section-header">
      <div class="section-header-left">
        <span style="font-size:20px">🏦</span>
        <h2 class="section-title">Linked Accounts</h2>
        <span class="achieve-count">${accounts.length} accounts</span>
        <span class="xp-earned">${totalFmt} total</span>
      </div>
    </div>
    <div class="la-accounts-grid">
      ${groupCards}
    </div>
  </section>`
}

// ── page ──────────────────────────────────────────────────────────────────────

export default async function VisionPage() {
  // Supabase queries
  let visions: any[] = []
  try { visions = await getVisions() } catch {}

  let userProfile: any = null
  try { userProfile = await getUserProfile() } catch {}

  // TODO: wire to users_profile xp fields
  const xp = userProfile?.xp_current ?? 4850
  const xpMax = userProfile?.xp_next_level ?? 7500
  const level = userProfile?.level ?? 8
  const userName = userProfile?.display_name ?? 'Colby Culbertson'

  let accounts: any[] = []
  try { accounts = await getAccounts() } catch {}

  // Build live HTML chunks
  const visionGridHtml = buildVisionGrid(visions)
  const linkedAccountsHtml = buildAccountCardsSection(accounts)

  // Page-specific CSS (app shell reset rules stripped)
  const pageCss = `




/* Ambient glows */



/* Header */







.search-bar kbd {
  font-size:11px; padding:2px 6px; border-radius:4px;
  background:rgba(255,255,255,0.08); color:var(--dim); font-family:'IBM Plex Mono', monospace;
}




/* Main */


/* ═══ JARVIS HERO — Holographic Command Interface ═══ */
.hero-banner {
  position:relative; border-radius:24px; overflow:hidden; margin-bottom:28px;
  border:1px solid rgba(249,115,22,0.12);
  background:#050510; min-height:460px;
}
/* Canvas particle field */
#heroCanvas { position:absolute; inset:0; z-index:0; }
/* Scan line animation */
.hero-scanline {
  position:absolute; top:0; left:0; right:0; height:2px; z-index:1;
  background:linear-gradient(90deg, transparent, rgba(249,115,22,0.4), rgba(139,92,246,0.3), transparent);
  animation:scanDown 4s ease-in-out infinite;
  filter:blur(1px);
}
@keyframes scanDown { 0%{top:0;opacity:0} 10%{opacity:1} 90%{opacity:1} 100%{top:100%;opacity:0} }

/* HUD corner brackets */
.hud-corner { position:absolute; z-index:2; width:24px; height:24px; }
.hud-corner.tl { top:12px; left:12px; border-top:2px solid rgba(249,115,22,0.3); border-left:2px solid rgba(249,115,22,0.3); }
.hud-corner.tr { top:12px; right:12px; border-top:2px solid rgba(139,92,246,0.3); border-right:2px solid rgba(139,92,246,0.3); }
.hud-corner.bl { bottom:12px; left:12px; border-bottom:2px solid rgba(249,115,22,0.3); border-left:2px solid rgba(249,115,22,0.3); }
.hud-corner.br { bottom:12px; right:12px; border-bottom:2px solid rgba(139,92,246,0.3); border-right:2px solid rgba(139,92,246,0.3); }

.hero-content { position:relative; z-index:3; display:flex; align-items:stretch; min-height:460px; }

/* === LEFT PANEL: Data readout === */
.hero-left { flex:1; padding:36px 0 36px 40px; display:flex; flex-direction:column; justify-content:center; }
.hero-sys-label {
  font-size:10px; font-weight:600; letter-spacing:0.15em; color:rgba(16,185,129,0.7);
  margin-bottom:6px; font-family:'IBM Plex Mono', monospace;
}
.hero-sys-label::before { content:'› '; }
.hero-greeting { font-size:13px; color:rgba(255,255,255,0.45); margin-bottom:16px; font-weight:400; }
.hero-value {
  font-size:56px; font-weight:700; letter-spacing:-0.04em; line-height:1; margin-bottom:4px;
  background:linear-gradient(135deg, #f59e0b 0%, #a3e635 40%, #10b981 100%);
  -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
  filter:drop-shadow(0 0 20px rgba(245,158,11,0.3));
}
.hero-value .sep { -webkit-text-fill-color:rgba(16,185,129,0.2); font-weight:200; font-size:42px; }
.hero-value-sub {
  font-size:11px; color:rgba(16,185,129,0.45); font-family:'IBM Plex Mono', monospace;
  margin-bottom:28px; letter-spacing:0.02em;
}
.hero-value-sub span { color:#a3e635; }

/* KPI gauges row */
.hero-gauges { display:flex; gap:16px; margin-bottom:24px; }
.hero-gauge-card {
  flex:1; padding:16px; border-radius:14px; position:relative; overflow:hidden;
  background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04);
  backdrop-filter:blur(8px);
}
.hero-gauge-card::after {
  content:''; position:absolute; bottom:0; left:0; right:0; height:40px;
  pointer-events:none;
}
.gauge-green::after { background:linear-gradient(to top, rgba(16,185,129,0.06), transparent); }
.gauge-amber::after { background:linear-gradient(to top, rgba(245,158,11,0.06), transparent); }
.gauge-purple::after { background:linear-gradient(to top, rgba(139,92,246,0.06), transparent); }
.gauge-
.gauge-num { font-size:32px; font-weight:700; letter-spacing:-0.03em; font-family:'IBM Plex Mono','DM Sans',sans-serif; }
.gauge-green .gauge-num { color:var(--green); }
.gauge-amber .gauge-num { color:var(--amber); }
.gauge-purple .gauge-num { color:var(--purple); }
.gauge-indicator { width:10px; height:10px; border-radius:50%; position:relative; }
.gauge-indicator::after { content:''; position:absolute; inset:-3px; border-radius:50%; animation:gaugePulse 2s ease-in-out infinite; }
.gauge-green .gauge-indicator { background:var(--green); }
.gauge-green .gauge-indicator::after { border:1px solid var(--green); }
.gauge-amber .gauge-indicator { background:var(--amber); }
.gauge-amber .gauge-indicator::after { border:1px solid var(--amber); }
.gauge-purple .gauge-indicator { background:var(--purple); }
.gauge-purple .gauge-indicator::after { border:1px solid var(--purple); }
@keyframes gaugePulse { 0%,100%{opacity:0.6;transform:scale(1)} 50%{opacity:0;transform:scale(1.8)} }
.gauge-label { font-size:9px; font-weight:600; letter-spacing:0.1em; color:var(--dim); margin-bottom:10px; }
/* Mini bar chart in gauge */
.gauge-bars { display:flex; align-items:flex-end; gap:3px; height:28px; }
.gauge-bar {
  flex:1; border-radius:2px 2px 0 0; transition:height 1s cubic-bezier(0.22,1,0.36,1);
  min-width:0;
}
.gauge-green .gauge-bar { background:linear-gradient(to top, rgba(16,185,129,0.15), rgba(16,185,129,0.5)); }
.gauge-amber .gauge-bar { background:linear-gradient(to top, rgba(245,158,11,0.15), rgba(245,158,11,0.5)); }
.gauge-purple .gauge-bar { background:linear-gradient(to top, rgba(139,92,246,0.15), rgba(139,92,246,0.5)); }

/* Savings ticker */
.hero-ticker {
  display:flex; align-items:center; gap:12px; padding:10px 16px;
  border:1px solid rgba(255,255,255,0.04); border-radius:10px;
  background:rgba(255,255,255,0.015); font-family:'IBM Plex Mono', monospace;
}
.ticker-dot { width:6px; height:6px; border-radius:50%; background:var(--green); animation:gaugePulse 2s ease-in-out infinite; position:relative; }
.ticker-dot::after { content:''; position:absolute; inset:-3px; border-radius:50%; border:1px solid var(--green); animation:gaugePulse 2s ease-in-out infinite; }
.ticker-label { font-size:9px; letter-spacing:0.1em; color:var(--dim); font-weight:600; }
.ticker-bar { flex:1; height:4px; border-radius:2px; background:rgba(255,255,255,0.04); overflow:hidden; }
.ticker-fill { height:100%; border-radius:2px; background:linear-gradient(90deg,var(--green),#34d399); transition:width 2s cubic-bezier(0.22,1,0.36,1); }
.ticker-val { font-size:13px; font-weight:700; color:var(--green); }

/* === CENTER: Orbital Visualization === */
.hero-orbital { width:340px; position:relative; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
#orbitalCanvas { width:340px; height:340px; }
/* Central BHAG number overlay */
.orbital-center {
  position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
  text-align:center; pointer-events:none;
}
.orbital-amount {
  font-size:28px; font-weight:800; color:#fff; display:block; letter-spacing:-0.03em;
  text-shadow:0 0 30px rgba(245,158,11,0.5), 0 0 60px rgba(16,185,129,0.3), 0 2px 4px rgba(0,0,0,0.9);
  background:linear-gradient(135deg, #f59e0b 0%, #a3e635 40%, #10b981 100%);
  -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
  filter:drop-shadow(0 0 16px rgba(245,158,11,0.4)) drop-shadow(0 2px 6px rgba(0,0,0,0.9));
}
.orbital-label { display:none; }
.orbital-center::before {
  content:''; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
  width:140px; height:80px; border-radius:50%;
  background:radial-gradient(ellipse, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 40%, transparent 75%);
  z-index:-1;
}

/* === RIGHT: Player Card (kept) === */
.hero-player {
  width:280px; flex-shrink:0; padding:36px 32px 36px 0;
  display:flex; flex-direction:column; justify-content:center;
}
.hero-player-card {
  background:rgba(255,255,255,0.02); backdrop-filter:blur(16px);
  border:1px solid rgba(255,255,255,0.06); border-radius:18px;
  overflow:hidden;
}
.hero-player-top { padding:20px 22px 16px; }
.hero-player-identity { display:flex; align-items:center; gap:14px; margin-bottom:16px; }
.hero-avatar {
  width:56px; height:56px; border-radius:50%; position:relative;
  display:flex; align-items:center; justify-content:center;
}
.hero-avatar-ring {
  position:absolute; inset:-3px; border-radius:50%;
  border:2px solid transparent;
  background:conic-gradient(from 0deg, var(--orange), var(--pink), var(--purple), var(--orange)) border-box;
  -webkit-mask:linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite:xor; mask-composite:exclude;
  animation:ringRotate 6s linear infinite;
}
@keyframes ringRotate { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
.hero-avatar-inner {
  width:50px; height:50px; border-radius:50%; background:#0a0a18;
  display:flex; align-items:center; justify-content:center;
  font-size:18px; font-weight:700; letter-spacing:0.04em;
}
.hero-level-badge {
  position:absolute; bottom:-2px; right:-2px; width:22px; height:22px;
  border-radius:50%; background:var(--purple); display:flex; align-items:center;
  justify-content:center; font-size:11px; font-weight:700;
  border:2px solid #0a0a18; box-shadow:0 0 10px rgba(139,92,246,0.5);
}
.hero-player-name { font-size:15px; font-weight:600; margin-bottom:2px; }
.hero-player-title {
  font-size:10px; font-weight:600; letter-spacing:0.08em;
  background:linear-gradient(90deg, var(--orange), var(--pink));
  -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
}
.hero-xp-wrap { margin-bottom:4px; }
.hero-xp-bar-outer { height:6px; border-radius:3px; background:rgba(255,255,255,0.06); overflow:hidden; position:relative; }
.hero-xp-bar-inner {
  height:100%; border-radius:3px;
  background:linear-gradient(90deg, var(--orange), var(--pink), var(--purple));
  transition:width 1.2s cubic-bezier(0.22,1,0.36,1); position:relative;
}
.hero-xp-bar-inner::after {
  content:''; position:absolute; inset:0;
  background:linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%);
  animation:xpShimmer 2s ease-in-out infinite;
}
@keyframes xpShimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
.hero-xp-meta { display:flex; justify-content:space-between; margin-top:5px; }
.hero-xp-text { font-size:9px; color:rgba(255,255,255,0.35); font-weight:500; font-family:'IBM Plex Mono',monospace; }
.hero-xp-level { font-size:9px; color:var(--purple); font-weight:600; }
.hero-player-stats {
  display:grid; grid-template-columns:repeat(4,1fr);
  border-top:1px solid rgba(255,255,255,0.05);
}
.hero-p-stat { text-align:center; padding:11px 6px; border-right:1px solid rgba(255,255,255,0.03); }
.hero-p-stat:last-child { border-right:none; }
.hero-p-stat-icon { font-size:14px; display:block; margin-bottom:1px; }
.hero-p-stat-num { font-size:16px; font-weight:700; display:block; line-height:1.2; }
.hero-p-stat-label { font-size:7px; font-weight:600; letter-spacing:0.1em; color:rgba(255,255,255,0.25); }

/* Linked Accounts section */
.linked-accounts-section .section-
.la-accounts-grid {
  display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:16px;
}
.la-account-group {
  background:linear-gradient(135deg, rgba(249,115,22,0.08), rgba(139,92,246,0.04));
  border:1px solid rgba(255,255,255,0.06); border-radius:12px; padding:16px;
}
.la-group-title {
  font-size:10px; font-weight:600; color:var(--orange); text-transform:uppercase;
  letter-spacing:0.1em; margin-bottom:12px; font-family:'IBM Plex Mono',monospace;
}
.la-account-item {
  display:flex; justify-content:space-between; align-items:center;
  padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.03); font-size:12px;
}
.la-account-item:last-child { border-bottom:none; }
.la-account-name { color:rgba(255,255,255,0.8); font-size:13px; }
.la-account-number { color:rgba(255,255,255,0.3); font-family:'IBM Plex Mono',monospace; font-size:10px; margin-top:2px; }
.la-account-balance { font-family:'IBM Plex Mono',monospace; font-weight:600; font-size:13px; }
.la-account-balance.positive { color:var(--green); }
.la-account-balance.negative { color:#f87171; }

/* Section */
.section { margin-bottom:36px; }
.section-
.section-title { font-size:20px; font-weight:600; letter-spacing:-0.01em; }
.section-header-left { display:flex; align-items:center; gap:10px; }
.achieve-count { font-size:13px; color:var(--dim); background:rgba(255,255,255,0.04); padding:3px 10px; border-radius:6px; }
.xp-earned { font-size:12px; font-weight:600; color:var(--orange); background:rgba(249,115,22,0.1); padding:3px 10px; border-radius:6px; }
.view-all-btn { background:none; border:none; color:var(--dim); font-size:13px; cursor:pointer; font-family:inherit; }
.view-all-btn:hover { color:rgba(255,255,255,0.6); }
.add-milestone-btn {
  display:flex; align-items:center; gap:6px; padding:8px 16px;
  border-radius:10px; border:1px dashed rgba(249,115,22,0.3);
  background:rgba(249,115,22,0.05); color:var(--orange);
  font-size:13px; font-weight:500; cursor:pointer; font-family:inherit;
  transition:all 0.2s;
}
.add-milestone-btn:hover { background:rgba(249,115,22,0.12); border-color:var(--orange); }

/* Achievements — Circular Badges */
.achieve-grid { display:flex; gap:20px; flex-wrap:wrap; justify-content:flex-start; padding:8px 0; }
.achieve-card {
  display:flex; flex-direction:column; align-items:center; text-align:center;
  width:110px; position:relative; cursor:pointer; transition:transform 0.2s;
}
.achieve-card:hover { transform:translateY(-4px); }
.achieve-card.locked { opacity:0.3; }
.achieve-card.locked .achieve-ring-bg { stroke:rgba(255,255,255,0.04); }
.achieve-card.locked .achieve-ring-fill { stroke:transparent; }

/* Ring container */
.achieve-ring-wrap {
  position:relative; width:88px; height:88px; margin-bottom:10px;
}
.achieve-ring-svg {
  width:88px; height:88px; transform:rotate(-90deg);
}
.achieve-ring-bg {
  fill:none; stroke:rgba(255,255,255,0.06); stroke-width:4;
}
.achieve-ring-fill {
  fill:none; stroke-width:4; stroke-linecap:round;
  stroke:url(#achieveGrad);
  transition:stroke-dashoffset 1s cubic-bezier(0.22,1,0.36,1);
}
.achieve-icon-center {
  position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
  font-size:30px; line-height:1;
}
/* Glow behind ring for earned badges */
.achieve-card.earned .achieve-ring-wrap::before {
  content:''; position:absolute; inset:-4px; border-radius:50%;
  background:radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 70%);
  z-index:0;
}
/* Completed check overlay */
.achieve-check {
  position:absolute; bottom:4px; right:16px; width:20px; height:20px; border-radius:50%;
  background:var(--green); display:flex; align-items:center; justify-content:center;
  font-size:10px; font-weight:700; border:2px solid var(--bg); z-index:2;
}

.achieve-name { font-size:11px; font-weight:600; margin-bottom:2px; line-height:1.3; }
.achieve-xp { font-size:10px; font-weight:600; color:var(--orange); }
.achieve-desc { display:none; } /* hidden on badges, shown on hover tooltip */

/* Tooltip on hover */
.achieve-card .achieve-tooltip {
  position:absolute; bottom:calc(100% + 8px); left:50%; transform:translateX(-50%);
  background:rgba(12,12,26,0.95); border:1px solid rgba(255,255,255,0.1);
  border-radius:10px; padding:10px 14px; min-width:180px; max-width:220px;
  opacity:0; pointer-events:none; transition:opacity 0.2s; z-index:50;
  backdrop-filter:blur(12px);
}
.achieve-card:hover .achieve-tooltip { opacity:1; }
.achieve-tooltip-name { font-size:12px; font-weight:600; margin-bottom:4px; }
.achieve-tooltip-desc { font-size:11px; color:var(--dim); line-height:1.4; margin-bottom:4px; }
.achieve-tooltip-xp { font-size:11px; font-weight:600; color:var(--orange); }

/* Filter */
.filter-row { display:flex; gap:8px; }
.filter-pill {
  padding:6px 16px; border-radius:8px; border:1px solid rgba(255,255,255,0.08);
  background:transparent; color:var(--dim); font-size:13px;
  cursor:pointer; transition:all 0.2s; font-family:inherit;
}
.filter-pill:hover { border-color:rgba(255,255,255,0.15); color:rgba(255,255,255,0.6); }
.filter-pill.active {
  background:rgba(249,115,22,0.12); color:var(--orange);
  border-color:rgba(249,115,22,0.3);
}

/* Vision Cards Grid */
.vision-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(340px, 1fr)); gap:20px; }
.vision-card {
  background:var(--card); border:1px solid var(--border);
  border-radius:16px; overflow:hidden; transition:all 0.3s ease; cursor:pointer;
}
.vision-card:hover { transform:translateY(-4px); box-shadow:0 20px 60px rgba(0,0,0,0.5); }

.card-image-wrap { position:relative; height:180px; overflow:hidden; }
.card-image-wrap img { width:100%; height:100%; object-fit:cover; transition:transform 0.4s ease; }
.vision-card:hover .card-image-wrap img { transform:scale(1.05); }
.card-image-overlay {
  position:absolute; inset:0;
  background:linear-gradient(to top, rgba(6,6,16,0.95) 0%, rgba(6,6,16,0.2) 60%, transparent 100%);
}
.status-badge {
  position:absolute; top:12px; right:12px; padding:4px 10px;
  border-radius:6px; font-size:10px; font-weight:700; letter-spacing:0.08em;
  border:1px solid;
}
.status-planning { background:rgba(249,115,22,0.15); color:var(--orange); border-color:var(--orange); }
.status-future { background:rgba(139,92,246,0.15); color:var(--purple); border-color:var(--purple); }
.status-active { background:rgba(16,185,129,0.15); color:var(--green); border-color:var(--green); }

.card-content { padding:20px 24px 24px; }
.card-title { font-size:18px; font-weight:600; margin-bottom:4px; letter-spacing:-0.01em; }
.card-target {
  font-size:14px; font-weight:600; margin-bottom:8px;
  background:linear-gradient(90deg, var(--orange), var(--pink));
  -webkit-background-clip:text; -webkit-text-fill-color:transparent;
  background-clip:text;
}
.card-note { font-size:13px; color:var(--dim); margin-bottom:20px; line-height:1.5; }

.card-stats-row { display:flex; align-items:center; gap:16px; margin-bottom:20px; }
.progress-ring-wrap { position:relative; width:64px; height:64px; flex-shrink:0; }
.progress-pct {
  position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
  font-size:14px; font-weight:700;
}
.card-stats-col { flex:1; }
.card-stat-dim { font-size:12px; color:var(--dim); display:block; margin-bottom:6px; }

.card-bottom { border-top:1px solid rgba(255,255,255,0.04); padding-top:14px; margin-bottom:12px; }
.card-bottom-row { display:flex; justify-content:space-between; margin-bottom:6px; }
.card-bottom-label { font-size:12px; color:rgba(255,255,255,0.35); }
.card-bottom-val { font-size:13px; font-weight:600; }
.card-bottom-val.green { color:var(--green); }
.card-bottom-val.amber { color:var(--amber); }

.gap-alert {
  padding:10px 14px; border-radius:10px; font-size:12px; font-weight:500;
  background:rgba(245,158,11,0.08); color:var(--amber);
  border:1px solid rgba(245,158,11,0.15);
}

/* Add Card */
.add-card {
  border:2px dashed rgba(255,255,255,0.08); border-radius:16px;
  display:flex; align-items:center; justify-content:center;
  min-height:400px; cursor:pointer; transition:all 0.3s;
}
.add-card:hover { border-color:rgba(255,255,255,0.15); background:rgba(255,255,255,0.01); }
.add-card-inner { text-align:center; padding:32px; }
.add-icon {
  width:56px; height:56px; border-radius:50%;
  background:linear-gradient(135deg, rgba(249,115,22,0.15), rgba(139,92,246,0.15));
  display:flex; align-items:center; justify-content:center;
  font-size:28px; color:var(--dim); margin:0 auto 16px;
  border:1px solid rgba(255,255,255,0.08);
}
.add-title { font-size:16px; font-weight:600; margin-bottom:8px; color:rgba(255,255,255,0.5); }
.add-desc { font-size:13px; color:var(--dim2); line-height:1.6; }

/* Milestones — Premium Widgets */
.milestone-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(480px, 1fr)); gap:20px; }
@media (max-width: 1000px) { .milestone-grid { grid-template-columns:1fr; } }
.ms-card {
  background:var(--card); border:1px solid var(--border);
  border-radius:20px; padding:0; overflow:hidden; position:relative;
}
.ms-card::before {
  content:''; position:absolute; top:0; left:0; right:0; height:3px;
  border-radius:20px 20px 0 0;
}
.ms-card.amber::before { background:linear-gradient(90deg, var(--amber), var(--orange)); }
.ms-card.purple::before { background:linear-gradient(90deg, var(--purple), var(--pink)); }

.ms-
.ms-
.ms-header-left { display:flex; align-items:center; gap:14px; }
.ms-icon-wrap {
  width:48px; height:48px; border-radius:14px; display:flex; align-items:center; justify-content:center;
  font-size:24px;
}
.ms-card.amber .ms-icon-wrap { background:rgba(245,158,11,0.12); }
.ms-card.purple .ms-icon-wrap { background:rgba(139,92,246,0.12); }
.ms-title { font-size:17px; font-weight:600; margin-bottom:3px; letter-spacing:-0.01em; }
.ms-target-val { font-size:14px; font-weight:700; }
.ms-card.amber .ms-target-val { color:var(--amber); }
.ms-card.purple .ms-target-val { color:var(--purple); }

/* Center: Gauge + Chart side by side */
.ms-viz { display:flex; align-items:center; gap:24px; margin-bottom:24px; }

/* Large Gauge Ring */
.ms-gauge-wrap { position:relative; width:130px; height:130px; flex-shrink:0; }
.ms-gauge-svg { width:130px; height:130px; transform:rotate(-90deg); }
.ms-gauge-bg { fill:none; stroke:rgba(255,255,255,0.04); stroke-width:8; }
.ms-gauge-fill { fill:none; stroke-width:8; stroke-linecap:round; transition:stroke-dashoffset 1.5s cubic-bezier(0.22,1,0.36,1); }
.ms-card.amber .ms-gauge-fill { stroke:url(#msGradAmber); }
.ms-card.purple .ms-gauge-fill { stroke:url(#msGradPurple); }
.ms-gauge-center {
  position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
  text-align:center;
}
.ms-gauge-pct { font-size:28px; font-weight:700; display:block; letter-spacing:-0.02em; }
.ms-gauge-label { font-size:10px; color:var(--dim); font-weight:500; letter-spacing:0.05em; }

/* Trajectory Chart Area */
.ms-chart-area { flex:1; min-width:0; }
.ms-chart-title { font-size:10px; font-weight:600; letter-spacing:0.1em; color:var(--dim); margin-bottom:8px; }
.ms-chart-svg { width:100%; height:80px; overflow:visible; }
.ms-chart-grid-line { stroke:rgba(255,255,255,0.04); stroke-width:1; }
.ms-chart-area-fill { opacity:0.15; }
.ms-card.amber .ms-chart-area-fill { fill:url(#msAreaAmber); }
.ms-card.purple .ms-chart-area-fill { fill:url(#msAreaPurple); }
.ms-chart-line { fill:none; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }
.ms-card.amber .ms-chart-line { stroke:var(--amber); }
.ms-card.purple .ms-chart-line { stroke:var(--purple); }
.ms-chart-dot { r:3; }
.ms-card.amber .ms-chart-dot { fill:var(--amber); }
.ms-card.purple .ms-chart-dot { fill:var(--purple); }
.ms-chart-dot-glow { r:6; opacity:0.3; }
.ms-card.amber .ms-chart-dot-glow { fill:var(--amber); }
.ms-card.purple .ms-chart-dot-glow { fill:var(--purple); }
.ms-chart-target-line { stroke:rgba(255,255,255,0.15); stroke-width:1; stroke-dasharray:4 4; }
.ms-chart-target-label { font-size:9px; fill:var(--dim); font-family:'DM Sans', sans-serif; }
.ms-chart-labels { display:flex; justify-content:space-between; margin-top:4px; }
.ms-chart-label-text { font-size:9px; color:rgba(255,255,255,0.25); }

/* Bottom Stats Row */
.ms-stats { display:grid; grid-template-columns:repeat(4, 1fr); gap:0; border-top:1px solid var(--border); }
.ms-stat {
  padding:16px 20px; text-align:center;
  border-right:1px solid var(--border);
}
.ms-stat:last-child { border-right:none; }
.ms-stat-val { font-size:16px; font-weight:700; display:block; margin-bottom:2px; letter-spacing:-0.01em; }
.ms-stat-label { font-size:9px; font-weight:600; letter-spacing:0.08em; color:var(--dim); }
.ms-stat-val.green { color:var(--green); }
.ms-stat-val.amber-c { color:var(--amber); }
.ms-stat-val.purple-c { color:var(--purple); }
.ms-stat-val.red { color:#ef4444; }

/* Note bar at bottom */
.ms-note-bar {
  padding:12px 28px; background:rgba(255,255,255,0.015);
  border-top:1px solid var(--border); font-size:12px; color:var(--dim);
  display:flex; align-items:center; gap:8px;
}

/* Modal */
.modal-overlay {
  position:fixed; inset:0; background:rgba(0,0,0,0.7); backdrop-filter:blur(8px);
  display:flex; align-items:center; justify-content:center; z-index:1000;
  opacity:0; pointer-events:none; transition:opacity 0.3s;
}
.modal-overlay.open { opacity:1; pointer-events:auto; }
.modal {
  background:#0c0c1a; border:1px solid rgba(255,255,255,0.08);
  border-radius:20px; width:100%; max-width:560px; max-height:90vh; overflow:auto;
  transform:translateY(20px); transition:transform 0.3s;
}
.modal-overlay.open .modal { transform:translateY(0); }
.modal-
.modal-title { font-size:18px; font-weight:600; }
.modal-close { background:none; border:none; color:var(--dim); font-size:18px; cursor:pointer; }
.modal-
.modal-label { font-size:13px; font-weight:600; color:rgba(255,255,255,0.5); margin-bottom:10px; display:block; }
.link-input-wrap { display:flex; gap:10px; margin-bottom:8px; }
.link-input {
  flex:1; padding:12px 16px; border-radius:10px;
  background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);
  color:#fff; font-size:14px; outline:none; font-family:inherit;
}
.link-input::placeholder { color:rgba(255,255,255,0.25); }
.link-fetch-btn {
  padding:12px 20px; border-radius:10px;
  background:linear-gradient(135deg, var(--orange), var(--pink));
  border:none; color:#fff; font-weight:600; font-size:13px; cursor:pointer;
  white-space:nowrap; font-family:inherit;
}
.link-hint { font-size:12px; color:var(--dim2); margin-bottom:20px; }
.modal-divider { height:1px; background:rgba(255,255,255,0.06); margin:20px 0; }
.form-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:14px; }
.form-group { margin-bottom:0; }
.form-label { display:block; font-size:11px; font-weight:600; color:rgba(255,255,255,0.35); margin-bottom:6px; letter-spacing:0.05em; }
.form-input {
  width:100%; padding:10px 14px; border-radius:8px;
  background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);
  color:#fff; font-size:13px; outline:none; font-family:inherit;
}
.form-input::placeholder { color:rgba(255,255,255,0.2); }
.form-input:focus { border-color:rgba(249,115,22,0.3); }
select.form-input { appearance:none; cursor:pointer; }
textarea.form-input { height:72px; resize:vertical; }
.add-vision-btn {
  width:100%; padding:14px 24px; border-radius:12px; border:none;
  background:linear-gradient(135deg, var(--orange), var(--pink), var(--purple));
  color:#fff; font-size:15px; font-weight:600; cursor:pointer; margin-top:20px;
  letter-spacing:-0.01em; font-family:inherit; transition:opacity 0.2s;
}
.add-vision-btn:hover { opacity:0.9; }
`

  // Body content after hero (modals, sections, scripts)
  const bodyContent = `

  <!-- ACHIEVEMENTS -->
  <section class="section">
    <div class="section-header">
      <div class="section-header-left">
        <span style="font-size:20px">🏆</span>
        <h2 class="section-title">Achievements</h2>
        <span class="achieve-count">12 of 24 earned</span>
        <span class="xp-earned">+2,400 XP earned</span>
      </div>
      <button class="view-all-btn" id="viewAllBtn">View All →</button>
    </div>
    <!-- Shared SVG gradient definition -->
    <svg width="0" height="0" style="position:absolute">
      <defs>
        <linearGradient id="achieveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f97316"/>
          <stop offset="50%" stop-color="#ec4899"/>
          <stop offset="100%" stop-color="#8b5cf6"/>
        </linearGradient>
      </defs>
    </svg>
    <div class="achieve-grid" id="achieveGrid">
      <!-- data-progress: 0-100 for ring fill. Earned = 100, locked = partial -->
      <div class="achieve-card earned" data-progress="100">
        <div class="achieve-ring-wrap">
          <svg class="achieve-ring-svg" viewBox="0 0 88 88"><circle class="achieve-ring-bg" cx="44" cy="44" r="40"/><circle class="achieve-ring-fill" cx="44" cy="44" r="40"/></svg>
          <span class="achieve-icon-center">🎯</span>
          <div class="achieve-check">✓</div>
        </div>
        <p class="achieve-name">First Vision</p>
        <p class="achieve-xp">+100 XP</p>
        <div class="achieve-tooltip"><p class="achieve-tooltip-name">First Vision</p><p class="achieve-tooltip-desc">Added your first item to the vision board</p><p class="achieve-tooltip-xp">+100 XP earned</p></div>
      </div>

      <div class="achieve-card earned" data-progress="100">
        <div class="achieve-ring-wrap">
          <svg class="achieve-ring-svg" viewBox="0 0 88 88"><circle class="achieve-ring-bg" cx="44" cy="44" r="40"/><circle class="achieve-ring-fill" cx="44" cy="44" r="40"/></svg>
          <span class="achieve-icon-center">🏦</span>
          <div class="achieve-check">✓</div>
        </div>
        <p class="achieve-name">Bank Linked</p>
        <p class="achieve-xp">+200 XP</p>
        <div class="achieve-tooltip"><p class="achieve-tooltip-name">Bank Linked</p><p class="achieve-tooltip-desc">Connected your first financial account</p><p class="achieve-tooltip-xp">+200 XP earned</p></div>
      </div>

      <div class="achieve-card earned" data-progress="100">
        <div class="achieve-ring-wrap">
          <svg class="achieve-ring-svg" viewBox="0 0 88 88"><circle class="achieve-ring-bg" cx="44" cy="44" r="40"/><circle class="achieve-ring-fill" cx="44" cy="44" r="40"/></svg>
          <span class="achieve-icon-center">🔥</span>
          <div class="achieve-check">✓</div>
        </div>
        <p class="achieve-name">7-Day Streak</p>
        <p class="achieve-xp">+300 XP</p>
        <div class="achieve-tooltip"><p class="achieve-tooltip-name">7-Day Streak</p><p class="achieve-tooltip-desc">Checked your board 7 days in a row</p><p class="achieve-tooltip-xp">+300 XP earned</p></div>
      </div>

      <div class="achieve-card earned" data-progress="100">
        <div class="achieve-ring-wrap">
          <svg class="achieve-ring-svg" viewBox="0 0 88 88"><circle class="achieve-ring-bg" cx="44" cy="44" r="40"/><circle class="achieve-ring-fill" cx="44" cy="44" r="40"/></svg>
          <span class="achieve-icon-center">🚗</span>
          <div class="achieve-check">✓</div>
        </div>
        <p class="achieve-name">Halfway There</p>
        <p class="achieve-xp">+500 XP</p>
        <div class="achieve-tooltip"><p class="achieve-tooltip-name">Halfway There</p><p class="achieve-tooltip-desc">Reached 46% on Tesla Model X goal</p><p class="achieve-tooltip-xp">+500 XP earned</p></div>
      </div>

      <div class="achieve-card earned" data-progress="100">
        <div class="achieve-ring-wrap">
          <svg class="achieve-ring-svg" viewBox="0 0 88 88"><circle class="achieve-ring-bg" cx="44" cy="44" r="40"/><circle class="achieve-ring-fill" cx="44" cy="44" r="40"/></svg>
          <span class="achieve-icon-center">💰</span>
          <div class="achieve-check">✓</div>
        </div>
        <p class="achieve-name">$5K Saved</p>
        <p class="achieve-xp">+250 XP</p>
        <div class="achieve-tooltip"><p class="achieve-tooltip-name">$5K Saved</p><p class="achieve-tooltip-desc">Saved $5,000 toward any vision</p><p class="achieve-tooltip-xp">+250 XP earned</p></div>
      </div>

      <div class="achieve-card earned" data-progress="100">
        <div class="achieve-ring-wrap">
          <svg class="achieve-ring-svg" viewBox="0 0 88 88"><circle class="achieve-ring-bg" cx="44" cy="44" r="40"/><circle class="achieve-ring-fill" cx="44" cy="44" r="40"/></svg>
          <span class="achieve-icon-center">🏗️</span>
          <div class="achieve-check">✓</div>
        </div>
        <p class="achieve-name">Portfolio Builder</p>
        <p class="achieve-xp">+350 XP</p>
        <div class="achieve-tooltip"><p class="achieve-tooltip-name">Portfolio Builder</p><p class="achieve-tooltip-desc">Added 5+ visions to your board</p><p class="achieve-tooltip-xp">+350 XP earned</p></div>
      </div>

      <div class="achieve-card earned" data-progress="100">
        <div class="achieve-ring-wrap">
          <svg class="achieve-ring-svg" viewBox="0 0 88 88"><circle class="achieve-ring-bg" cx="44" cy="44" r="40"/><circle class="achieve-ring-fill" cx="44" cy="44" r="40"/></svg>
          <span class="achieve-icon-center">🌴</span>
          <div class="achieve-check">✓</div>
        </div>
        <p class="achieve-name">Dream Big</p>
        <p class="achieve-xp">+200 XP</p>
        <div class="achieve-tooltip"><p class="achieve-tooltip-name">Dream Big</p><p class="achieve-tooltip-desc">Added a vision worth $1M+</p><p class="achieve-tooltip-xp">+200 XP earned</p></div>
      </div>

      <div class="achieve-card earned" data-progress="100">
        <div class="achieve-ring-wrap">
          <svg class="achieve-ring-svg" viewBox="0 0 88 88"><circle class="achieve-ring-bg" cx="44" cy="44" r="40"/><circle class="achieve-ring-fill" cx="44" cy="44" r="40"/></svg>
          <span class="achieve-icon-center">🔗</span>
          <div class="achieve-check">✓</div>
        </div>
        <p class="achieve-name">Multi-Account</p>
        <p class="achieve-xp">+300 XP</p>
        <div class="achieve-tooltip"><p class="achieve-tooltip-name">Multi-Account</p><p class="achieve-tooltip-desc">Linked 3+ financial institutions</p><p class="achieve-tooltip-xp">+300 XP earned</p></div>
      </div>

      <!-- LOCKED — partial progress -->
      <div class="achieve-card locked" data-progress="47" style="display:none">
        <div class="achieve-ring-wrap">
          <svg class="achieve-ring-svg" viewBox="0 0 88 88"><circle class="achieve-ring-bg" cx="44" cy="44" r="40"/><circle class="achieve-ring-fill" cx="44" cy="44" r="40"/></svg>
          <span class="achieve-icon-center">⚡</span>
        </div>
        <p class="achieve-name">30-Day Streak</p>
        <p class="achieve-xp">+750 XP</p>
        <div class="achieve-tooltip"><p class="achieve-tooltip-name">30-Day Streak</p><p class="achieve-tooltip-desc">Check your board 30 days in a row (14/30)</p><p class="achieve-tooltip-xp">47% complete</p></div>
      </div>

      <div class="achieve-card locked" data-progress="44" style="display:none">
        <div class="achieve-ring-wrap">
          <svg class="achieve-ring-svg" viewBox="0 0 88 88"><circle class="achieve-ring-bg" cx="44" cy="44" r="40"/><circle class="achieve-ring-fill" cx="44" cy="44" r="40"/></svg>
          <span class="achieve-icon-center">💎</span>
        </div>
        <p class="achieve-name">First $100K</p>
        <p class="achieve-xp">+1,000 XP</p>
        <div class="achieve-tooltip"><p class="achieve-tooltip-name">First $100K</p><p class="achieve-tooltip-desc">Save $100K toward a single vision ($43.7K/$100K)</p><p class="achieve-tooltip-xp">44% complete</p></div>
      </div>

      <div class="achieve-card locked" data-progress="0" style="display:none">
        <div class="achieve-ring-wrap">
          <svg class="achieve-ring-svg" viewBox="0 0 88 88"><circle class="achieve-ring-bg" cx="44" cy="44" r="40"/><circle class="achieve-ring-fill" cx="44" cy="44" r="40"/></svg>
          <span class="achieve-icon-center">🏆</span>
        </div>
        <p class="achieve-name">Vision Complete</p>
        <p class="achieve-xp">+2,000 XP</p>
        <div class="achieve-tooltip"><p class="achieve-tooltip-name">Vision Complete</p><p class="achieve-tooltip-desc">Fully fund and acquire a vision item</p><p class="achieve-tooltip-xp">Not started</p></div>
      </div>

      <div class="achieve-card earned" data-progress="100" style="display:none">
        <div class="achieve-ring-wrap">
          <svg class="achieve-ring-svg" viewBox="0 0 88 88"><circle class="achieve-ring-bg" cx="44" cy="44" r="40"/><circle class="achieve-ring-fill" cx="44" cy="44" r="40"/></svg>
          <span class="achieve-icon-center">👑</span>
          <div class="achieve-check">✓</div>
        </div>
        <p class="achieve-name">Millionaire</p>
        <p class="achieve-xp">+1,500 XP</p>
        <div class="achieve-tooltip"><p class="achieve-tooltip-name">Millionaire</p><p class="achieve-tooltip-desc">Reach $1M net worth</p><p class="achieve-tooltip-xp">+1,500 XP earned</p></div>
      </div>
    </div>
  </section>

  <!-- ASSETS & PURCHASES -->
  <section class="section">
    <div class="section-header">
      <h2 class="section-title">Assets & Purchases</h2>
      <div class="filter-row">
        <button class="filter-pill active" onclick="filterCards('all', this)">All</button>
        <button class="filter-pill" onclick="filterCards('active', this)">Active</button>
        <button class="filter-pill" onclick="filterCards('planning', this)">Planning</button>
        <button class="filter-pill" onclick="filterCards('future', this)">Future</button>
      </div>
    </div>
___VISION_GRID___
  </section>

  <!-- FINANCIAL MILESTONES — Premium Widgets -->
  <!-- SVG gradient defs for milestones -->
  <svg width="0" height="0" style="position:absolute">
    <defs>
      <linearGradient id="msGradAmber" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#f97316"/>
      </linearGradient>
      <linearGradient id="msGradPurple" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#8b5cf6"/><stop offset="100%" stop-color="#ec4899"/>
      </linearGradient>
      <linearGradient id="msAreaAmber" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#f59e0b"/><stop offset="100%" stop-color="transparent"/>
      </linearGradient>
      <linearGradient id="msAreaPurple" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#8b5cf6"/><stop offset="100%" stop-color="transparent"/>
      </linearGradient>
    </defs>
  </svg>

  <section class="section">
    <div class="section-header">
      <div class="section-header-left">
        <h2 class="section-title">Financial Milestones</h2>
        <span class="achieve-count">2 goals</span>
      </div>
      <button class="add-milestone-btn" onclick="openModal()">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M7 4v6M4 7h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        Add Milestone
      </button>
    </div>
    <div class="milestone-grid">

      <!-- ═══ $10M NET WORTH ═══ -->
      <div class="ms-card amber" data-gauge-pct="25.7">
        <div class="ms-body">
          <div class="ms-header">
            <div class="ms-header-left">
              <div class="ms-icon-wrap">💎</div>
              <div>
                <h3 class="ms-title">$10M Net Worth Milestone</h3>
                <p class="ms-target-val">$10,000,000</p>
              </div>
            </div>
            <span class="status-badge" style="background:rgba(234,179,8,0.15);color:var(--amber);border-color:var(--amber);position:static">TRACKING</span>
          </div>

          <div class="ms-viz">
            <!-- Large Gauge -->
            <div class="ms-gauge-wrap">
              <svg class="ms-gauge-svg" viewBox="0 0 130 130">
                <circle class="ms-gauge-bg" cx="65" cy="65" r="56"/>
                <circle class="ms-gauge-fill" cx="65" cy="65" r="56" data-pct="25.7"/>
              </svg>
              <div class="ms-gauge-center">
                <span class="ms-gauge-pct">25.7%</span>
                <span class="ms-gauge-label">COMPLETE</span>
              </div>
            </div>

            <!-- Trajectory Chart -->
            <div class="ms-chart-area">
              <p class="ms-chart-title">WEALTH TRAJECTORY</p>
              <svg class="ms-chart-svg" viewBox="0 0 260 80" preserveAspectRatio="none">
                <!-- Grid lines -->
                <line class="ms-chart-grid-line" x1="0" y1="20" x2="260" y2="20"/>
                <line class="ms-chart-grid-line" x1="0" y1="40" x2="260" y2="40"/>
                <line class="ms-chart-grid-line" x1="0" y1="60" x2="260" y2="60"/>
                <!-- Target line -->
                <line class="ms-chart-target-line" x1="0" y1="8" x2="260" y2="8"/>
                <text class="ms-chart-target-label" x="262" y="11">$10M</text>
                <!-- Area fill -->
                <path class="ms-chart-area-fill" d="M0,70 L37,68 L74,65 L111,60 L148,52 L185,40 L222,25 L260,8 L260,80 L0,80 Z"/>
                <!-- Actual line (past data - solid) -->
                <polyline class="ms-chart-line" points="0,70 37,68 74,66 111,64" style="opacity:1"/>
                <!-- Projected line (future - dashed) -->
                <polyline class="ms-chart-line" points="111,64 148,52 185,40 222,25 260,8" style="stroke-dasharray:6 4; opacity:0.5"/>
                <!-- Current position dot -->
                <circle class="ms-chart-dot-glow" cx="111" cy="64"/>
                <circle class="ms-chart-dot" cx="111" cy="64"/>
              </svg>
              <div class="ms-chart-labels">
                <span class="ms-chart-label-text">2024</span>
                <span class="ms-chart-label-text">2026</span>
                <span class="ms-chart-label-text" style="color:var(--amber)">NOW</span>
                <span class="ms-chart-label-text">2028</span>
                <span class="ms-chart-label-text">2030</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Bottom Stats -->
        <div class="ms-stats">
          <div class="ms-stat">
            <span class="ms-stat-val amber-c">$2.57M</span>
            <span class="ms-stat-label">CURRENT</span>
          </div>
          <div class="ms-stat">
            <span class="ms-stat-val">2030</span>
            <span class="ms-stat-label">TARGET YEAR</span>
          </div>
          <div class="ms-stat">
            <span class="ms-stat-val red">$208K/mo</span>
            <span class="ms-stat-label">NEEDED</span>
          </div>
          <div class="ms-stat">
            <span class="ms-stat-val" style="color:var(--dim)">1,439 mo</span>
            <span class="ms-stat-label">AT PACE</span>
          </div>
        </div>
        <div class="ms-note-bar">
          <span style="opacity:0.5">💡</span>
          First major wealth milestone — accelerate with business exits & real estate appreciation
        </div>
      </div>

      <!-- ═══ PASSIVE INCOME > $50K/mo ═══ -->
      <div class="ms-card purple" data-gauge-pct="16.4">
        <div class="ms-body">
          <div class="ms-header">
            <div class="ms-header-left">
              <div class="ms-icon-wrap">📈</div>
              <div>
                <h3 class="ms-title">Passive Income > $50K/mo</h3>
                <p class="ms-target-val">$50,000/mo</p>
              </div>
            </div>
            <span class="status-badge" style="background:rgba(234,179,8,0.15);color:var(--amber);border-color:var(--amber);position:static">TRACKING</span>
          </div>

          <div class="ms-viz">
            <!-- Large Gauge -->
            <div class="ms-gauge-wrap">
              <svg class="ms-gauge-svg" viewBox="0 0 130 130">
                <circle class="ms-gauge-bg" cx="65" cy="65" r="56"/>
                <circle class="ms-gauge-fill" cx="65" cy="65" r="56" data-pct="16.4"/>
              </svg>
              <div class="ms-gauge-center">
                <span class="ms-gauge-pct">16.4%</span>
                <span class="ms-gauge-label">COMPLETE</span>
              </div>
            </div>

            <!-- Income Growth Chart -->
            <div class="ms-chart-area">
              <p class="ms-chart-title">INCOME TRAJECTORY</p>
              <svg class="ms-chart-svg" viewBox="0 0 260 80" preserveAspectRatio="none">
                <line class="ms-chart-grid-line" x1="0" y1="20" x2="260" y2="20"/>
                <line class="ms-chart-grid-line" x1="0" y1="40" x2="260" y2="40"/>
                <line class="ms-chart-grid-line" x1="0" y1="60" x2="260" y2="60"/>
                <!-- Target line -->
                <line class="ms-chart-target-line" x1="0" y1="8" x2="260" y2="8"/>
                <text class="ms-chart-target-label" x="262" y="11">$50K</text>
                <!-- Area fill -->
                <path class="ms-chart-area-fill" d="M0,75 L43,72 L87,67 L130,58 L173,42 L216,24 L260,8 L260,80 L0,80 Z"/>
                <!-- Actual (past) -->
                <polyline class="ms-chart-line" points="0,75 43,72 87,67" style="opacity:1"/>
                <!-- Projected (future) -->
                <polyline class="ms-chart-line" points="87,67 130,58 173,42 216,24 260,8" style="stroke-dasharray:6 4; opacity:0.5"/>
                <!-- Current dot -->
                <circle class="ms-chart-dot-glow" cx="87" cy="67"/>
                <circle class="ms-chart-dot" cx="87" cy="67"/>
              </svg>
              <div class="ms-chart-labels">
                <span class="ms-chart-label-text">2024</span>
                <span class="ms-chart-label-text" style="color:var(--purple)">NOW</span>
                <span class="ms-chart-label-text">2026</span>
                <span class="ms-chart-label-text">2028</span>
                <span class="ms-chart-label-text">2029</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Bottom Stats -->
        <div class="ms-stats">
          <div class="ms-stat">
            <span class="ms-stat-val purple-c">$8.2K/mo</span>
            <span class="ms-stat-label">CURRENT</span>
          </div>
          <div class="ms-stat">
            <span class="ms-stat-val">2029</span>
            <span class="ms-stat-label">TARGET YEAR</span>
          </div>
          <div class="ms-stat">
            <span class="ms-stat-val amber-c">$17K/mo</span>
            <span class="ms-stat-label">NEEDED</span>
          </div>
          <div class="ms-stat">
            <span class="ms-stat-val" style="color:var(--dim)">86 mo</span>
            <span class="ms-stat-label">AT PACE</span>
          </div>
        </div>
        <div class="ms-note-bar">
          <span style="opacity:0.5">💡</span>
          Rental + business dividends + investments — add 2 more STR properties to accelerate
        </div>
      </div>

    </div>
  </section>
</main>

<!-- ADD VISION MODAL -->
<div class="modal-overlay" id="modalOverlay" onclick="closeModal()">
  <div class="modal" onclick="event.stopPropagation()">
    <div class="modal-header">
      <h2 class="modal-title">Add New Vision</h2>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <label class="modal-label">Paste a link</label>
      <div class="link-input-wrap">
        <input type="text" class="link-input" placeholder="https://zillow.com/... or https://tesla.com/..." />
        <button class="link-fetch-btn">Fetch →</button>
      </div>
      <p class="link-hint">We'll auto-pull the image, name, and price from the URL</p>

      <div class="modal-divider"></div>

      <label class="modal-label">Or add manually</label>
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">VISION NAME</label>
          <input class="form-input" placeholder="e.g., Dream Beach House" />
        </div>
        <div class="form-group">
          <label class="form-label">CATEGORY</label>
          <select class="form-input">
            <option>Real Estate</option>
            <option>Vehicle</option>
            <option>Luxury</option>
            <option>Travel</option>
            <option>Business</option>
            <option>Other</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">ESTIMATED COST (LOW)</label>
          <input class="form-input" placeholder="$0" />
        </div>
        <div class="form-group">
          <label class="form-label">ESTIMATED COST (HIGH)</label>
          <input class="form-input" placeholder="$0" />
        </div>
        <div class="form-group">
          <label class="form-label">TARGET DATE</label>
          <input class="form-input" type="month" />
        </div>
        <div class="form-group">
          <label class="form-label">STATUS</label>
          <select class="form-input">
            <option>Planning</option>
            <option>Active</option>
            <option>Future</option>
          </select>
        </div>
      </div>
      <div class="form-group" style="margin-bottom:0">
        <label class="form-label">NOTES</label>
        <textarea class="form-input" style="height:72px" placeholder="Any details about this vision..."></textarea>
      </div>
      <button class="add-vision-btn">Add to Vision Board  ✦  +100 XP</button>
    </div>
  </div>
</div>

<script>
// XP animation
(function() {
  const target = 4850;
  const max = 7500;
  const duration = 1200;
  const start = Date.now();
  function animate() {
    const elapsed = Date.now() - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(eased * target);
    document.getElementById('xpCount').textContent = current.toLocaleString();
    document.getElementById('xpBar').style.width = ((current / max) * 100) + '%';
    if (progress < 1) requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
})();

// Filter
function filterCards(status, btn) {
  document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.vision-card').forEach(card => {
    if (status === 'all' || card.dataset.status === status) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
  document.querySelector('.add-card').style.display = '';
}

// Modal
function openModal() { document.getElementById('modalOverlay').classList.add('open'); }
function closeModal() { document.getElementById('modalOverlay').classList.remove('open'); }

// ═══ TOPOGRAPHIC TERRAIN — Flowing Contour Lines ═══
(function() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h, dpr;
  let time = 0;

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    dpr = window.devicePixelRatio || 1;
    w = rect.width; h = rect.height;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  function draw() {
    time += 0.016;
    ctx.clearRect(0, 0, w, h);

    // === Faint grid overlay ===
    ctx.strokeStyle = 'rgba(249,115,22,0.025)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < w; x += 50) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 50) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // === Contour lines — 30 layers flowing across the full hero ===
    const totalLines = 30;
    for (let i = 0; i < totalLines; i++) {
      const t = i / totalLines;
      const baseY = t * h * 1.2 - h * 0.1; // spread beyond edges

      // Color: orange → pink → purple gradient
      let r, g, b;
      if (t < 0.33) {
        const m = t / 0.33;
        r = Math.round(249 + (236-249)*m); g = Math.round(115 + (72-115)*m); b = Math.round(22 + (153-22)*m);
      } else if (t < 0.66) {
        const m = (t-0.33)/0.33;
        r = Math.round(236 + (139-236)*m); g = Math.round(72 + (92-72)*m); b = Math.round(153 + (246-153)*m);
      } else {
        const m = (t-0.66)/0.34;
        r = Math.round(139 + (80-139)*m); g = Math.round(92 + (40-92)*m); b = Math.round(246 + (200-246)*m);
      }

      // Pulsing opacity per line
      const pulse = 0.5 + 0.5 * Math.sin(time * 0.4 + i * 0.3);
      const alpha = 0.04 + 0.10 * pulse;

      ctx.beginPath();
      ctx.strokeStyle = \`rgba(\${r},\${g},\${b},\${alpha})\`;
      ctx.lineWidth = 1.2 + pulse * 0.8;

      for (let x = 0; x <= w; x += 3) {
        const nx = x / w; // normalized 0-1

        // Layered sine waves for organic terrain shape
        const wave1 = Math.sin(nx * Math.PI * 3 + time * 0.2 + i * 0.15) * 18;
        const wave2 = Math.sin(nx * Math.PI * 5.3 + time * 0.15 + i * 0.08) * 10;
        const wave3 = Math.sin(nx * Math.PI * 1.7 + time * 0.3 + i * 0.25) * 14;
        const wave4 = Math.cos(nx * Math.PI * 7.1 + time * 0.1 + i * 0.12) * 6;

        // Elevation peaks at certain positions
        const peak1 = Math.exp(-Math.pow((nx - 0.25) * 6, 2)) * 40 * (1 - t * 0.6);
        const peak2 = Math.exp(-Math.pow((nx - 0.55) * 5, 2)) * 60 * (1 - t * 0.5);
        const peak3 = Math.exp(-Math.pow((nx - 0.80) * 7, 2)) * 50 * (1 - t * 0.7);

        const y = baseY + wave1 + wave2 + wave3 + wave4 - peak1 - peak2 - peak3;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Glow fill below brighter lines
      if (alpha > 0.08) {
        ctx.beginPath();
        for (let x = 0; x <= w; x += 3) {
          const nx = x / w;
          const wave1 = Math.sin(nx * Math.PI * 3 + time * 0.2 + i * 0.15) * 18;
          const wave2 = Math.sin(nx * Math.PI * 5.3 + time * 0.15 + i * 0.08) * 10;
          const wave3 = Math.sin(nx * Math.PI * 1.7 + time * 0.3 + i * 0.25) * 14;
          const wave4 = Math.cos(nx * Math.PI * 7.1 + time * 0.1 + i * 0.12) * 6;
          const peak1 = Math.exp(-Math.pow((nx - 0.25) * 6, 2)) * 40 * (1 - t * 0.6);
          const peak2 = Math.exp(-Math.pow((nx - 0.55) * 5, 2)) * 60 * (1 - t * 0.5);
          const peak3 = Math.exp(-Math.pow((nx - 0.80) * 7, 2)) * 50 * (1 - t * 0.7);
          const y = baseY + wave1 + wave2 + wave3 + wave4 - peak1 - peak2 - peak3;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.lineTo(w, baseY + 30);
        ctx.lineTo(0, baseY + 30);
        ctx.closePath();
        ctx.fillStyle = \`rgba(\${r},\${g},\${b},\${alpha * 0.15})\`;
        ctx.fill();
      }
    }

    // === Drifting ambient glow zones ===
    const g1x = w * 0.25 + Math.sin(time * 0.08) * w * 0.05;
    const g1 = ctx.createRadialGradient(g1x, h * 0.3, 0, g1x, h * 0.3, w * 0.2);
    g1.addColorStop(0, 'rgba(249,115,22,0.04)'); g1.addColorStop(1, 'transparent');
    ctx.fillStyle = g1; ctx.fillRect(0, 0, w, h);

    const g2x = w * 0.75 + Math.cos(time * 0.06) * w * 0.05;
    const g2 = ctx.createRadialGradient(g2x, h * 0.5, 0, g2x, h * 0.5, w * 0.2);
    g2.addColorStop(0, 'rgba(139,92,246,0.03)'); g2.addColorStop(1, 'transparent');
    ctx.fillStyle = g2; ctx.fillRect(0, 0, w, h);

    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();

// ═══ RADAR SWEEP — Vision Item Detection ═══
(function() {
  const canvas = document.getElementById('orbitalCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const size = 340;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  ctx.scale(dpr, dpr);

  const cx = size / 2, cy = size / 2;
  const maxR = 140;
  let time = 0;

  const blips = [
    { label: 'INCOME', value: '$50K/mo', angle: 0.5, dist: 0.35, sz: 6,
      color: [16,185,129], progress: 0.35 },
    { label: 'RANCH', value: '$4.5M', angle: 1.3, dist: 0.6, sz: 9,
      color: [249,115,22], progress: 0.18 },
    { label: 'G-WAGON', value: '$250K', angle: 2.5, dist: 0.30, sz: 5,
      color: [236,72,153], progress: 0.65 },
    { label: 'NET WORTH', value: '$10M', angle: 3.8, dist: 0.5, sz: 11,
      color: [139,92,246], progress: 0.26 },
    { label: 'CABO', value: '$2.8M', angle: 5.2, dist: 0.72, sz: 7,
      color: [249,115,22], progress: 0.12 },
  ];

  function draw() {
    time += 0.016;
    ctx.clearRect(0, 0, size, size);

    // Concentric range rings
    for (let i = 1; i <= 5; i++) {
      const r = (maxR / 5) * i;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = \`rgba(249,115,22,\${i === 5 ? 0.12 : 0.05})\`;
      ctx.lineWidth = i === 5 ? 1.5 : 0.8;
      ctx.stroke();
    }

    // Crosshairs
    ctx.strokeStyle = 'rgba(249,115,22,0.06)'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(cx - maxR, cy); ctx.lineTo(cx + maxR, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - maxR); ctx.lineTo(cx, cy + maxR); ctx.stroke();

    // === Sweep line + trailing glow ===
    const sweepAngle = time * 0.8;
    // Trail (fading arc behind sweep)
    for (let i = 0; i < 30; i++) {
      const a = sweepAngle - i * 0.02;
      const trailAlpha = (1 - i / 30) * 0.06;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, maxR, a - 0.02, a + 0.02);
      ctx.closePath();
      ctx.fillStyle = \`rgba(249,115,22,\${trailAlpha})\`;
      ctx.fill();
    }
    // Sweep line itself
    const sx = cx + Math.cos(sweepAngle) * maxR;
    const sy = cy + Math.sin(sweepAngle) * maxR;
    const sweepGrad = ctx.createLinearGradient(cx, cy, sx, sy);
    sweepGrad.addColorStop(0, 'rgba(249,115,22,0.6)');
    sweepGrad.addColorStop(1, 'rgba(249,115,22,0.05)');
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(sx, sy);
    ctx.strokeStyle = sweepGrad; ctx.lineWidth = 2; ctx.stroke();

    // === Blips ===
    blips.forEach(b => {
      const bx = cx + Math.cos(b.angle) * b.dist * maxR;
      const by = cy + Math.sin(b.angle) * b.dist * maxR;
      const [cr, cg, cb] = b.color;

      // Detect sweep proximity for pulse
      let angleDiff = ((sweepAngle % (Math.PI*2)) - b.angle + Math.PI*3) % (Math.PI*2) - Math.PI;
      const nearSweep = Math.abs(angleDiff) < 0.3;
      const intensity = nearSweep ? 0.9 : (0.3 + 0.15 * Math.sin(time * 2));

      // Glow
      const glow = ctx.createRadialGradient(bx, by, 0, bx, by, b.sz * 3);
      glow.addColorStop(0, \`rgba(\${cr},\${cg},\${cb},\${0.3 * intensity})\`);
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(bx, by, b.sz * 3, 0, Math.PI * 2); ctx.fill();

      // Progress arc
      ctx.beginPath();
      ctx.arc(bx, by, b.sz + 4, -Math.PI/2, -Math.PI/2 + Math.PI * 2 * b.progress);
      ctx.strokeStyle = \`rgba(\${cr},\${cg},\${cb},\${0.5 * intensity})\`;
      ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineCap = 'butt';

      // Ring background
      ctx.beginPath(); ctx.arc(bx, by, b.sz + 4, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 2; ctx.stroke();

      // Core
      const coreGrad = ctx.createRadialGradient(bx, by, 0, bx, by, b.sz);
      coreGrad.addColorStop(0, \`rgba(255,255,255,\${0.8 * intensity})\`);
      coreGrad.addColorStop(0.4, \`rgba(\${cr},\${cg},\${cb},\${0.9 * intensity})\`);
      coreGrad.addColorStop(1, \`rgba(\${cr},\${cg},\${cb},\${0.3 * intensity})\`);
      ctx.fillStyle = coreGrad;
      ctx.beginPath(); ctx.arc(bx, by, b.sz, 0, Math.PI * 2); ctx.fill();

      // Labels
      ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 4;
      ctx.font = "600 7px 'IBM Plex Mono', monospace";
      ctx.fillStyle = \`rgba(\${cr},\${cg},\${cb},\${0.8 * intensity})\`;
      ctx.textAlign = 'center';
      ctx.fillText(b.label, bx, by - b.sz - 8);
      ctx.font = "700 9px 'DM Sans', sans-serif";
      ctx.fillStyle = \`rgba(255,255,255,\${0.7 * intensity})\`;
      ctx.fillText(b.value, bx, by + b.sz + 14);
      ctx.shadowBlur = 0;
    });

    // Center ping
    const pingPulse = 0.5 + 0.5 * Math.sin(time * 2);
    ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fillStyle = \`rgba(249,115,22,\${0.5 + 0.3 * pingPulse})\`; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, 6 + pingPulse * 4, 0, Math.PI * 2);
    ctx.strokeStyle = \`rgba(249,115,22,\${0.15 * (1 - pingPulse)})\`; ctx.lineWidth = 1; ctx.stroke();

    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();

// ═══ GAUGE BAR CHARTS — Animate mini bars in hero gauges ═══
(function() {
  document.querySelectorAll('.gauge-bars').forEach(container => {
    const values = container.dataset.values.split(',').map(Number);
    const max = Math.max(...values);
    values.forEach((v, i) => {
      const bar = document.createElement('div');
      bar.className = 'gauge-bar';
      bar.style.height = '0%';
      container.appendChild(bar);
      setTimeout(() => {
        bar.style.height = ((v / max) * 100) + '%';
      }, 300 + i * 60);
    });
  });
})();

// ═══ TICKER FILL — Savings rate animation ═══
setTimeout(() => {
  const fill = document.getElementById('tickerFill');
  if (fill) fill.style.width = '68%';
}, 600);

// Animate milestone gauge rings on load
(function() {
  const circumference = 2 * Math.PI * 56; // r=56
  document.querySelectorAll('.ms-gauge-fill').forEach(ring => {
    const pct = parseFloat(ring.dataset.pct) || 0;
    ring.style.strokeDasharray = circumference;
    ring.style.strokeDashoffset = circumference;
    setTimeout(() => {
      ring.style.strokeDashoffset = circumference - (pct / 100) * circumference;
    }, 500);
  });
})();

// Animate achievement rings on load
(function() {
  const circumference = 2 * Math.PI * 40; // r=40
  document.querySelectorAll('.achieve-card').forEach(card => {
    const progress = parseInt(card.dataset.progress) || 0;
    const ring = card.querySelector('.achieve-ring-fill');
    if (!ring) return;
    // Set initial state (fully hidden)
    ring.style.strokeDasharray = circumference;
    ring.style.strokeDashoffset = circumference;
    // Animate after a short delay
    setTimeout(() => {
      const offset = circumference - (progress / 100) * circumference;
      ring.style.strokeDashoffset = offset;
    }, 300);
  });
})();

// View All achievements
let showAll = false;
document.getElementById('viewAllBtn').addEventListener('click', function() {
  showAll = !showAll;
  if (showAll) {
    document.querySelectorAll('.achieve-card').forEach(c => {
      c.style.display = '';
      // Re-trigger ring animation for newly revealed cards
      const ring = c.querySelector('.achieve-ring-fill');
      const progress = parseInt(c.dataset.progress) || 0;
      const circumference = 2 * Math.PI * 40;
      if (ring) {
        ring.style.strokeDashoffset = circumference;
        setTimeout(() => {
          ring.style.strokeDashoffset = circumference - (progress / 100) * circumference;
        }, 100);
      }
    });
    this.textContent = 'Show Less';
  } else {
    document.querySelectorAll('.achieve-card').forEach((c, i) => {
      c.style.display = i >= 8 ? 'none' : '';
    });
    this.textContent = 'View All →';
  }
});
</script>
___LINKED_ACCOUNTS___
`
    .replace('___VISION_GRID___', visionGridHtml)
    .replace('___LINKED_ACCOUNTS___', linkedAccountsHtml)

  const netWorth = accounts.reduce((s: number, a: any) => {
    const b = typeof a.current_balance === 'number' ? a.current_balance : parseFloat(a.current_balance ?? '0') || 0
    if ((a.type ?? '').toLowerCase().includes('credit') || (a.type ?? '').toLowerCase().includes('loan')) return s - Math.abs(b)
    return s + b
  }, 0)
  const activeVisionCount = visions.filter((v: any) => v.status === 'active').length
  const planningCount = visions.filter((v: any) => v.status === 'planning').length

  // Vision portfolio range = sum of target_low..target_high across all visions
  const visionLow  = visions.reduce((s: number, v: any) => s + Number(v.target_low ?? 0), 0)
  const visionHigh = visions.reduce((s: number, v: any) => s + Number(v.target_high ?? v.target_low ?? 0), 0)
  const fmtM = (n: number) => n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(0)}K` : `$${Math.round(n)}`
  const portfolioRange = visionHigh > 0
    ? (visionLow === visionHigh ? fmtM(visionHigh) : `${fmtM(visionLow)} — ${fmtM(visionHigh)}`)
    : '$0'

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: pageCss }} />
      <Hero
        label="VISION CONTROL SYSTEM v5.0"
        greeting={`Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, ${userName} — scanning your financial universe`}
        primaryMetric={portfolioRange}
        metricSubtitle={`TOTAL VISION PORTFOLIO · ${activeVisionCount} active · ${visions.length} total`}
        kpiCards={[
          { label: 'ON TRACK', value: String(activeVisionCount), delta: '+active', deltaPositive: true },
          { label: 'PLANNING', value: String(planningCount) },
          { label: 'TOTAL', value: String(visions.length) },
          { label: 'NET WORTH', value: `$${(netWorth / 1e6).toFixed(1)}M` },
        ]}
        playerCard={{
          name: userName,
          role: 'CEO · Multi-Entity Operator',
          level,
          xpCurrent: xp,
          xpNext: xpMax,
          initials: 'CC',
          stats: [
            { key: 'VISIONS', value: String(visions.length) },
            { key: 'ACTIVE', value: String(activeVisionCount) },
            { key: 'XP', value: xp.toLocaleString() },
            { key: 'LEVEL', value: String(level) },
          ],
        }}
        animationSlot={<HeroCanvas />}
      />
      <div dangerouslySetInnerHTML={{ __html: bodyContent }} />
    </>
  )
}
