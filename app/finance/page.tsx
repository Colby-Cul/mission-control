/**
 * Finance Dashboard — pixel-for-pixel port of finance-dashboard-v2.html
 * Accounts grid and recent transactions wired to Supabase; everything else
 * is byte-identical to the locked HTML design.
 */
import {
  getAccounts,
  accountSignedBalance,
  getRecentTransactions,
  getNetWorthFromGraph,
} from '../lib/queries'
import HeroCanvas from './HeroCanvas'
import Hero from '../_components/Hero'
import { SpecCard } from '../_components/SpecCard'
import ComingSoon from '../_components/ComingSoon'
import {
  currentCompanyKey,
  getQbBalanceSheet,
  parseBalanceSheet,
  type ParsedBS,
} from '../lib/quickbooks'

export const dynamic = 'force-dynamic'

// ─── helpers ──────────────────────────────────────────────────────────────────

const USD = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const USD2 = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

function catIcon(cat?: string | null): string {
  const c = (cat ?? '').toLowerCase()
  if (c.includes('food') || c.includes('restaurant') || c.includes('dining')) return '🍽️'
  if (c.includes('travel') || c.includes('hotel') || c.includes('flight')) return '✈️'
  if (c.includes('shop') || c.includes('retail')) return '🛍️'
  if (c.includes('tech') || c.includes('software') || c.includes('saas')) return '💻'
  if (c.includes('health') || c.includes('medical')) return '💊'
  if (c.includes('utility') || c.includes('electric')) return '⚡'
  if (c.includes('transfer')) return '🔄'
  if (c.includes('income') || c.includes('payroll')) return '💵'
  return '💳'
}

function catColor(cat?: string | null): { bg: string; text: string } {
  const c = (cat ?? '').toLowerCase()
  if (c.includes('food') || c.includes('dining')) return { bg: 'rgba(245,158,11,0.12)', text: '#fbbf24' }
  if (c.includes('travel')) return { bg: 'rgba(6,182,212,0.12)', text: '#67e8f9' }
  if (c.includes('tech') || c.includes('saas')) return { bg: 'rgba(139,92,246,0.12)', text: '#a78bfa' }
  if (c.includes('health')) return { bg: 'rgba(236,72,153,0.12)', text: '#f9a8d4' }
  if (c.includes('utility')) return { bg: 'rgba(239,68,68,0.12)', text: '#f87171' }
  return { bg: 'rgba(249,115,22,0.12)', text: '#fb923c' }
}

// ─── build accounts-grid HTML ────────────────────────────────────────────────

function buildAccountsGrid(accounts: any[]): string {
  if (!accounts.length) {
    // TODO: wire to financial_accounts table
    return `<div class="accounts-grid"><div class="account-group"><div class="account-group-title">No accounts found</div></div></div>`
  }

  const groups: Record<string, any[]> = {}
  for (const a of accounts) {
    const type = (a.subtype ?? a.type ?? 'other').toLowerCase()
    let label = 'Other'
    if (type.includes('checking')) label = 'Checking Accounts'
    else if (type.includes('savings')) label = 'Savings Accounts'
    else if (type.includes('credit')) label = 'Credit Cards'
    else if (type.includes('investment') || type.includes('brokerage')) label = 'Investment Accounts'
    else if (type.includes('loan') || type.includes('mortgage')) label = 'Loans & Mortgages'
    if (!groups[label]) groups[label] = []
    groups[label].push(a)
  }

  const groupHtml = Object.entries(groups).map(([title, items]) => {
    const itemsHtml = items.map(a => {
      const bal = accountSignedBalance(a)
      const isNeg = bal < 0
      const fmtBal = isNeg ? `-${USD2(Math.abs(bal))}` : USD2(bal)
      return `<div class="account-item">
              <div>
                <div class="account-name">${a.name ?? a.official_name ?? 'Account'}</div>
                <div class="account-number">•••• ${a.mask ?? '????'}</div>
              </div>
              <div class="account-balance ${isNeg ? 'negative' : 'positive'}">${fmtBal}</div>
            </div>`
    }).join('\n')
    return `<div class="account-group">
          <div class="account-group-title">${title}</div>
          ${itemsHtml}
        </div>`
  }).join('\n')

  return `<div class="accounts-grid">\n${groupHtml}\n      </div>`
}

// ─── build txn-list HTML ──────────────────────────────────────────────────────

function buildTxnList(transactions: any[]): string {
  if (!transactions.length) {
    // TODO: wire to financial_transactions table
    return `<div class="txn-list"><div class="txn-item" style="color:rgba(255,255,255,0.4);font-size:12px;">No recent transactions found</div></div>`
  }

  const items = transactions.slice(0, 8).map(t => {
    const amt = Number(t.amount ?? 0)
    const isDebit = amt > 0
    const cat = t.category ?? t.personal_finance_category_primary ?? ''
    const { bg, text } = catColor(cat)
    const icon = catIcon(cat)
    const fmtAmt = isDebit ? `-${USD2(amt)}` : `+${USD2(Math.abs(amt))}`
    const dateStr = t.date ? new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
    const catLabel = (cat.split('_')[0] ?? cat).substring(0, 12)
    return `<div class="txn-item">
              <div class="txn-icon" style="background:${bg};">${icon}</div>
              <div class="txn-details">
                <div class="txn-merchant">${t.merchant_name ?? t.name ?? 'Unknown'}</div>
                <div class="txn-date">${dateStr}</div>
              </div>
              <div class="txn-cat-tag" style="background:${bg};color:${text};">${catLabel}</div>
              <div class="txn-amount ${isDebit ? 'debit' : 'credit'}">${fmtAmt}</div>
            </div>`
  }).join('\n')

  return `<div class="txn-list">\n${items}\n          </div>`
}

// ─── page component ───────────────────────────────────────────────────────────

export default async function FinancePage() {
  // Supabase queries
  let accounts: any[] = []
  try { accounts = await getAccounts() } catch {}

  let transactions: any[] = []
  try { transactions = await getRecentTransactions(20) } catch {}

  // Cascaded net worth from ownership graph
  let nwGraph: Awaited<ReturnType<typeof getNetWorthFromGraph>> | null = null
  try { nwGraph = await getNetWorthFromGraph() } catch {}

  // QuickBooks Balance Sheet — null when not connected or QB not configured.
  let qbBS: ParsedBS | null = null
  try {
    const raw = await getQbBalanceSheet(currentCompanyKey())
    qbBS = parseBalanceSheet(raw)
  } catch {
    qbBS = null
  }

  // TODO: wire achievements to achievements table with dashboard_key='finance'
  // let achievements: any[] = []
  // try { achievements = await getAchievements('finance') } catch {}

  // Build live HTML chunks
  const accountsGridHtml = buildAccountsGrid(accounts)
  const txnListHtml = buildTxnList(transactions)

  // Page-specific CSS (app shell conflict rules stripped)
  const pageCss = `
    

    

    

    /* Scrollbar styling */
    ::-webkit-scrollbar {
      width: 8px;
    }
    ::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.02);
    }
    ::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.15);
    }

    
    @media (max-width: 768px) {  }

    .mc-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      backdrop-filter: blur(20px);
      padding: 24px;
      position: relative;
      overflow: hidden;
    }

    .mc-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(90deg, var(--orange), var(--pink), transparent);
      opacity: 0.6;
    }

    /* === HERO SECTION === */
    .hero-banner {
      position:relative; border-radius:24px; overflow:hidden; margin-bottom:28px;
      border:1px solid rgba(249,115,22,0.12);
      background:#050510; min-height:480px;
    }
    #heroCanvas { position:absolute; inset:0; z-index:0; }
    .hero-scanline {
      position:absolute; top:0; left:0; right:0; height:2px; z-index:1;
      background:linear-gradient(90deg, transparent, rgba(249,115,22,0.4), rgba(139,92,246,0.3), transparent);
      animation:scanDown 4s ease-in-out infinite;
      filter:blur(1px);
    }
    @keyframes scanDown { 0%{top:0;opacity:0} 10%{opacity:1} 90%{opacity:1} 100%{top:100%;opacity:0} }
    .hud-corner { position:absolute; z-index:2; width:24px; height:24px; }
    .hud-corner.tl { top:12px; left:12px; border-top:2px solid rgba(249,115,22,0.3); border-left:2px solid rgba(249,115,22,0.3); }
    .hud-corner.tr { top:12px; right:12px; border-top:2px solid rgba(139,92,246,0.3); border-right:2px solid rgba(139,92,246,0.3); }
    .hud-corner.bl { bottom:12px; left:12px; border-bottom:2px solid rgba(249,115,22,0.3); border-left:2px solid rgba(249,115,22,0.3); }
    .hud-corner.br { bottom:12px; right:12px; border-bottom:2px solid rgba(139,92,246,0.3); border-right:2px solid rgba(139,92,246,0.3); }

    .hero-content { position:relative; z-index:3; display:flex; align-items:stretch; min-height:480px; }

    /* LEFT PANEL */
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

    /* KPI gauges */
    .hero-gauges { display:flex; gap:16px; margin-bottom:24px; }
    .hero-gauge-card {
      flex:1; padding:16px; border-radius:14px; position:relative; overflow:hidden;
      background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04);
      backdrop-filter:blur(8px);
    }
    .hero-gauge-card::after {
      content:''; position:absolute; bottom:0; left:0; right:0; height:40px; pointer-events:none;
    }
    .hero-gauge-card.gauge-green::after { background:linear-gradient(to top, rgba(16,185,129,0.06), transparent); }
    .hero-gauge-card.gauge-green { border-color:rgba(16,185,129,0.15); }
    .hero-gauge-card.gauge-red::after { background:linear-gradient(to top, rgba(239,68,68,0.06), transparent); }
    .hero-gauge-card.gauge-red { border-color:rgba(239,68,68,0.15); }
    .hero-gauge-card.gauge-amber::after { background:linear-gradient(to top, rgba(245,158,11,0.06), transparent); }
    .hero-gauge-card.gauge-amber { border-color:rgba(245,158,11,0.15); }

    .gauge-
    .gauge-num { font-size:28px; font-weight:700; letter-spacing:-0.03em; font-family:'IBM Plex Mono', monospace; }
    .hero-gauge-card.gauge-green .gauge-num { color:var(--green); }
    .hero-gauge-card.gauge-amber .gauge-num { color:var(--amber); }
    .hero-gauge-card.gauge-red .gauge-num { color:var(--red); }
    .gauge-indicator { width:10px; height:10px; border-radius:50%; position:relative; }
    .gauge-indicator::after { content:''; position:absolute; inset:-3px; border-radius:50%; animation:gaugePulse 2s ease-in-out infinite; }
    .hero-gauge-card.gauge-green .gauge-indicator { background:var(--green); }
    .hero-gauge-card.gauge-green .gauge-indicator::after { border:1px solid var(--green); }
    .hero-gauge-card.gauge-amber .gauge-indicator { background:var(--amber); }
    .hero-gauge-card.gauge-amber .gauge-indicator::after { border:1px solid var(--amber); }
    .hero-gauge-card.gauge-red .gauge-indicator { background:var(--red); }
    .hero-gauge-card.gauge-red .gauge-indicator::after { border:1px solid var(--red); }

    .gauge-label { font-size:9px; font-weight:600; letter-spacing:0.1em; color:var(--dim); margin-bottom:10px; text-transform:uppercase; }

    .gauge-bars { display:flex; align-items:flex-end; gap:3px; height:28px; }
    .gauge-bar {
      flex:1; border-radius:2px 2px 0 0; transition:height 1s cubic-bezier(0.22,1,0.36,1);
      min-width:0;
    }
    .hero-gauge-card.gauge-green .gauge-bar { background:linear-gradient(to top, rgba(16,185,129,0.15), rgba(16,185,129,0.5)); }
    .hero-gauge-card.gauge-amber .gauge-bar { background:linear-gradient(to top, rgba(245,158,11,0.15), rgba(245,158,11,0.5)); }
    .hero-gauge-card.gauge-red .gauge-bar { background:linear-gradient(to top, rgba(239,68,68,0.15), rgba(239,68,68,0.5)); }

    .hero-ticker {
      display:flex; align-items:center; gap:12px; padding:10px 16px;
      border:1px solid rgba(255,255,255,0.04); border-radius:10px;
      background:rgba(255,255,255,0.015); font-family:'IBM Plex Mono', monospace;
      margin-top:20px; font-size:12px; color:var(--dim);
    }
    .ticker-dot { width:6px; height:6px; border-radius:50%; background:var(--green); animation:gaugePulse 2s ease-in-out infinite; }
    .ticker-label { font-size:9px; letter-spacing:0.1em; font-weight:600; }
    .ticker-val { font-size:13px; font-weight:700; color:var(--green); }

    .ticker-bar {
      flex:1; height:4px; border-radius:2px; background:rgba(255,255,255,0.04); overflow:hidden; margin:8px 0;
    }

    .ticker-fill {
      height:100%; border-radius:2px; background:linear-gradient(90deg,var(--green),#34d399);
      width:23.2%; transition:width 2s cubic-bezier(0.22,1,0.36,1);
    }

    /* CENTER RADAR */
    .hero-orbital { flex:1; position:relative; display:flex; align-items:center; justify-content:center; padding:0 20px; }
    #orbitalCanvas { width:100%; max-width:500px; height:auto; }
    .orbital-center { position:absolute; text-align:center; }
    .orbital-amount { font-size:24px; font-weight:700; color:rgba(255,255,255,0.9); font-family:'IBM Plex Mono', monospace; }

    /* RIGHT PLAYER CARD */
    .hero-player { flex:1; padding:36px 40px 36px 0; display:flex; flex-direction:column; justify-content:center; align-items:flex-end; }
    .hero-player-card {
      width:100%; max-width:280px; padding:20px; border-radius:12px;
      background:rgba(139,92,246,0.06); border:1px solid rgba(139,92,246,0.15);
      backdrop-filter:blur(8px);
    }
    .hero-player-top { margin-bottom:20px; }
    .hero-player-identity { display:flex; gap:16px; margin-bottom:16px; }
    .hero-avatar {
      width:60px; height:60px; border-radius:50%; position:relative; overflow:hidden;
      background:linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.2));
      border:2px solid rgba(255,255,255,0.1); display:flex; align-items:center; justify-content:center;
      font-size:28px; font-weight:700;
    }
    .hero-avatar-ring {
      position:absolute; inset:0; border-radius:50%;
      background:conic-gradient(from 0deg, rgba(139,92,246,0.5), rgba(236,72,153,0.5), rgba(139,92,246,0.5));
      animation:rotateGradient 8s linear infinite;
      z-index:-1;
    }
    .hero-avatar-inner { position:relative; z-index:1; }
    @keyframes rotateGradient { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

    .hero-player-name { font-size:16px; font-weight:600; color:rgba(255,255,255,0.95); }
    .hero-player-role { font-size:10px; color:rgba(255,255,255,0.4); text-transform:uppercase; letter-spacing:0.5px; margin-top:2px; }
    .hero-player-level { font-size:11px; color:#a3e635; margin-top:6px; font-weight:600; }

    .xp-section { margin-bottom:16px; }
    .xp-
    .xp-label { text-transform:uppercase; letter-spacing:0.1em; }
    .xp-value { font-family:'IBM Plex Mono', monospace; }
    .xp-track { height:6px; border-radius:3px; background:rgba(255,255,255,0.04); overflow:hidden; }
    .xp-fill { height:100%; background:linear-gradient(90deg, #a3e635, #10b981); width:71%; border-radius:3px; }

    .hero-player-stats { display:flex; gap:12px; justify-content:space-around; }
    .player-stat { text-align:center; }
    .player-stat-num { font-size:18px; font-weight:700; font-family:'IBM Plex Mono', monospace; }
    .player-stat-label { font-size:8px; color:rgba(255,255,255,0.35); text-transform:uppercase; letter-spacing:0.05em; margin-top:4px; }

    /* === ACHIEVEMENTS SECTION === */
    .section {
      margin-bottom: 40px;
    }

    .section-

    .section-header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .section-title {
      font-size: 18px;
      font-weight: 600;
      letter-spacing: 0.02em;
      text-align: center;
    }

    .achieve-count {
      font-size: 12px;
      color: var(--dim);
      background: rgba(255, 255, 255, 0.04);
      padding: 3px 10px;
      border-radius: 6px;
    }

    .xp-earned {
      font-size: 12px;
      font-weight: 600;
      color: var(--orange);
      background: rgba(249, 115, 22, 0.1);
      padding: 3px 10px;
      border-radius: 6px;
    }

    .view-all-btn {
      font-size: 12px;
      color: var(--dim);
      background: none;
      border: 1px solid var(--border);
      padding: 6px 16px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      font-family: inherit;
    }

    .view-all-btn:hover {
      color: white;
      border-color: rgba(255, 255, 255, 0.2);
    }

    /* Achievements — Circular Badges */
    .achieve-grid {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
      justify-content: flex-start;
      padding: 8px 0;
    }

    .achieve-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      width: 110px;
      position: relative;
      cursor: pointer;
      transition: transform 0.2s;
    }

    .achieve-card:hover {
      transform: translateY(-4px);
    }

    .achieve-card.locked {
      opacity: 0.3;
    }

    .achieve-ring-wrap {
      position: relative;
      width: 88px;
      height: 88px;
      margin-bottom: 10px;
    }

    .achieve-ring-svg {
      width: 88px;
      height: 88px;
      transform: rotate(-90deg);
    }

    .achieve-ring-bg {
      fill: none;
      stroke: rgba(255, 255, 255, 0.06);
      stroke-width: 4;
    }

    .achieve-ring-fill {
      fill: none;
      stroke-width: 4;
      stroke-linecap: round;
      stroke: url(#achieveGrad);
      transition: stroke-dashoffset 1s cubic-bezier(0.22, 1, 0.36, 1);
    }

    .achieve-icon-center {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 30px;
      line-height: 1;
    }

    /* Glow behind ring for earned badges */
    .achieve-card.earned .achieve-ring-wrap::before {
      content: '';
      position: absolute;
      inset: -4px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(249, 115, 22, 0.12) 0%, transparent 70%);
      z-index: 0;
    }

    /* Completed check overlay */
    .achieve-check {
      position: absolute;
      bottom: 4px;
      right: 16px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: var(--green);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 700;
      border: 2px solid var(--bg);
      z-index: 2;
    }

    .achieve-name {
      font-size: 11px;
      font-weight: 600;
      margin-bottom: 2px;
      line-height: 1.3;
    }

    .achieve-xp {
      font-size: 10px;
      font-weight: 600;
      color: var(--orange);
    }

    /* Tooltip on hover */
    .achieve-card .achieve-tooltip {
      position: absolute;
      bottom: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
      background: rgba(12, 12, 26, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      padding: 10px 14px;
      min-width: 180px;
      max-width: 220px;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s;
      z-index: 50;
      backdrop-filter: blur(12px);
    }

    .achieve-card:hover .achieve-tooltip {
      opacity: 1;
    }

    .achieve-tooltip-name {
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .achieve-tooltip-desc {
      font-size: 11px;
      color: var(--dim);
      line-height: 1.4;
      margin-bottom: 4px;
    }

    .achieve-tooltip-xp {
      font-size: 11px;
      font-weight: 600;
      color: var(--orange);
    }

    /* === SECTIONS === */
    .section {
      margin-bottom: 40px;
    }

    .section-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 1px;
      text-align: center;
    }

    .section-subtitle {
      font-size: 13px;
      color: var(--dim);
      margin-bottom: 24px;
      text-align: center;
    }

    /* Net worth section */
    /* === PREMIUM NET WORTH REDESIGN === */
    .nw-card { padding:32px; }
    .nw-flex-wrap { display:flex; align-items:center; gap:48px; }
    @media (max-width: 1200px) { .nw-flex-wrap { flex-direction:column; gap:32px; } }

    .nw-donut-container { flex:0 0 320px; }
    .nw-donut-svg { width:100%; height:auto; filter:drop-shadow(0 0 30px rgba(249,115,22,0.15)); }
    .nw-segment { transition:opacity 0.3s ease; }
    .nw-segment:hover { opacity:0.8; }

    .nw-center-value {
      font-family:'IBM Plex Mono', monospace;
      font-size:42px; font-weight:700; fill:url(#nwCenterGrad);
      text-anchor:middle; letter-spacing:-1px;
      filter:drop-shadow(0 0 20px rgba(249,115,22,0.3));
    }

    .nw-center-label {
      font-family:'DM Sans', sans-serif;
      font-size:13px; font-weight:600; fill:rgba(255,255,255,0.5);
      text-anchor:middle; letter-spacing:0.05em; text-transform:uppercase;
    }

    .nw-breakdown { flex:1; display:grid; grid-template-columns:repeat(2, 1fr); gap:16px; }
    @media (max-width: 1200px) { .nw-breakdown { grid-template-columns:repeat(2, 1fr); } }
    @media (max-width: 640px) { .nw-breakdown { grid-template-columns:1fr; } }

    /* === PREMIUM NET WORTH BREAKDOWN CARDS === */
    .nw-breakdown-card {
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 20px;
      padding: 22px 22px 18px;
      position: relative;
      overflow: hidden;
      transition: all 0.4s cubic-bezier(0.22,1,0.36,1);
      display: flex;
      align-items: center;
      gap: 20px;
    }
    .nw-breakdown-card:hover {
      background: rgba(255,255,255,0.05);
      border-color: rgba(255,255,255,0.14);
      transform: translateY(-3px);
      box-shadow: 0 16px 48px rgba(0,0,0,0.5);
    }
    /* 3px gradient accent bar */
    .nw-breakdown-card::before {
      content:''; position:absolute; top:0; left:0; right:0; height:3px;
      border-radius:20px 20px 0 0;
    }
    .nw-orange::before { background:linear-gradient(90deg, #f97316, #ec4899, transparent); }
    .nw-green::before { background:linear-gradient(90deg, #10b981, #06b6d4, transparent); }
    .nw-amber::before { background:linear-gradient(90deg, #f59e0b, #f97316, transparent); }
    .nw-purple::before { background:linear-gradient(90deg, #8b5cf6, #ec4899, transparent); }

    /* Glowing orb behind each gauge */
    .nw-breakdown-card::after {
      content:''; position:absolute; top:10px; left:10px;
      width:90px; height:90px; border-radius:50%;
      opacity:0.15; filter:blur(30px); pointer-events:none;
    }
    .nw-orange::after { background:radial-gradient(circle, #f97316, transparent 70%); }
    .nw-green::after { background:radial-gradient(circle, #10b981, transparent 70%); }
    .nw-amber::after { background:radial-gradient(circle, #f59e0b, transparent 70%); }
    .nw-purple::after { background:radial-gradient(circle, #8b5cf6, transparent 70%); }

    /* Mini radial gauge */
    .nwb-gauge-wrap {
      position:relative; width:88px; height:88px; flex-shrink:0; z-index:1;
    }
    .nwb-gauge-svg {
      width:88px; height:88px; transform:rotate(-90deg); overflow:visible;
    }
    .nwb-gauge-bg { fill:none; stroke:rgba(255,255,255,0.06); stroke-width:7; }
    .nwb-gauge-fill {
      fill:none; stroke-width:7; stroke-linecap:round;
      transition: stroke-dashoffset 1.8s cubic-bezier(0.22,1,0.36,1);
    }
    .nwb-gauge-center {
      position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
      flex-direction:column;
    }
    .nwb-gauge-pct {
      font-family:'IBM Plex Mono', monospace; font-size:18px; font-weight:700;
      letter-spacing:-0.03em;
    }
    .nw-orange .nwb-gauge-pct { background:linear-gradient(135deg, #f97316, #ec4899); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
    .nw-green .nwb-gauge-pct { background:linear-gradient(135deg, #10b981, #06b6d4); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
    .nw-amber .nwb-gauge-pct { background:linear-gradient(135deg, #f59e0b, #f97316); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
    .nw-purple .nwb-gauge-pct { background:linear-gradient(135deg, #8b5cf6, #ec4899); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }

    .nwb-gauge-sub {
      font-size:8px; color:rgba(255,255,255,0.35); text-transform:uppercase;
      letter-spacing:0.06em; font-weight:600; margin-top:1px;
    }

    /* Card info right side */
    .nwb-info { flex:1; min-width:0; z-index:1; }
    .nwb-info-
    .nwb-label {
      font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.07em;
      color:rgba(255,255,255,0.5);
    }
    .nwb-badge {
      display:inline-flex; align-items:center; gap:3px; padding:3px 8px;
      border-radius:20px; font-size:10px; font-weight:700;
      font-family:'IBM Plex Mono', monospace;
    }
    .nwb-badge-up { background:rgba(16,185,129,0.12); color:#10b981; }
    .nwb-badge-down { background:rgba(239,68,68,0.12); color:#ef4444; }

    .nwb-value {
      font-family:'IBM Plex Mono', monospace; font-size:26px; font-weight:700;
      color:rgba(255,255,255,0.95); letter-spacing:-0.03em; margin-bottom:10px;
    }

    /* Stats row */
    .nwb-stats {
      display:grid; grid-template-columns:1fr 1fr; gap:8px 16px;
    }
    .nwb-stat-label {
      font-size:9px; text-transform:uppercase; letter-spacing:0.06em;
      color:rgba(255,255,255,0.3); font-weight:600; margin-bottom:1px;
    }
    .nwb-stat-val {
      font-family:'IBM Plex Mono', monospace; font-size:13px; font-weight:600;
      color:rgba(255,255,255,0.8);
    }
    .nwb-stat-val.up { color:#10b981; }
    .nwb-stat-val.down { color:#ef4444; }

    /* OLD NETWORTH STYLES (HIDDEN) */
    .networth-display { display:none; }
    .networth-gauge { display:none; }
    .gauge-center { display:none; }
    .gauge-center-value { display:none; }
    .gauge-center-label { display:none; }
    .networth-radials { display:none; }
    .radial-card { display:none; }
    .radial-label { display:none; }
    .radial-value { display:none; }

    /* Companies section */
    .companies-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 24px;
    }

    /* === ENTITY CARDS === */
    .milestone-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(520px, 1fr)); gap:20px; }
    @media (max-width: 1000px) { .milestone-grid { grid-template-columns:1fr; } }
    .ms-card {
      background:var(--card); border:1px solid var(--border);
      border-radius:20px; padding:0; overflow:hidden; position:relative;
      cursor:pointer; transition:transform 0.25s cubic-bezier(0.22,1,0.36,1), box-shadow 0.25s, border-color 0.25s;
    }
    .ms-card:hover {
      transform:translateY(-3px);
      box-shadow:0 16px 48px rgba(0,0,0,0.5);
      border-color:rgba(255,255,255,0.15);
    }
    .ms-card::after {
      content:'→'; position:absolute; top:18px; right:22px;
      font-family:'IBM Plex Mono',monospace; font-size:14px;
      color:rgba(255,255,255,0.3); opacity:0;
      transition:opacity 0.25s, transform 0.25s; z-index:5;
    }
    .ms-card:hover::after { opacity:1; transform:translateX(4px); }
    .ms-card::before {
      content:''; position:absolute; top:0; left:0; right:0; height:3px;
      border-radius:20px 20px 0 0;
    }
    .ms-card.orange::before { background:linear-gradient(90deg, var(--orange), #ec4899); }
    .ms-card.green::before { background:linear-gradient(90deg, var(--green), #84cc16); }
    .ms-card.amber::before { background:linear-gradient(90deg, var(--amber), var(--orange)); }
    .ms-card.purple::before { background:linear-gradient(90deg, var(--purple), var(--pink)); }

    .ms-body { padding: 20px 24px; }
    .ms-header { display:flex; align-items:center; justify-content:space-between; padding-bottom:16px; }
    .ms-header-left { display:flex; align-items:center; gap:14px; }
    .ms-icon-wrap {
      width:48px; height:48px; border-radius:14px; display:flex; align-items:center; justify-content:center;
      font-size:24px;
    }
    .ms-card.orange .ms-icon-wrap { background:rgba(249,115,22,0.12); }
    .ms-card.green .ms-icon-wrap { background:rgba(16,185,129,0.12); }
    .ms-card.amber .ms-icon-wrap { background:rgba(245,158,11,0.12); }
    .ms-card.purple .ms-icon-wrap { background:rgba(139,92,246,0.12); }
    .ms-title { font-size:17px; font-weight:600; margin-bottom:3px; letter-spacing:-0.01em; }
    .ms-target-val { font-size:14px; font-weight:700; }
    .ms-card.orange .ms-target-val { color:var(--orange); }
    .ms-card.green .ms-target-val { color:var(--green); }
    .ms-card.amber .ms-target-val { color:var(--amber); }
    .ms-card.purple .ms-target-val { color:var(--purple); }

    .ms-status-badge {
      font-size:10px; font-weight:600; letter-spacing:0.05em; padding:4px 12px;
      border-radius:6px; text-transform:uppercase; border:1px solid;
    }

    /* Center: Gauge + Chart side by side */
    .ms-viz { display:flex; align-items:center; gap:24px; margin-bottom:20px; padding:12px 24px; }

    /* Large Gauge Ring — 140px */
    .ms-gauge-wrap { position:relative; width:130px; height:130px; flex-shrink:0; }
    .ms-gauge-svg { width:130px; height:130px; transform:rotate(-90deg); overflow:visible; }
    .ms-gauge-bg { fill:none; stroke:rgba(255,255,255,0.06); stroke-width:10; }
    .ms-gauge-fill { fill:none; stroke-width:10; stroke-linecap:round; transition:stroke-dashoffset 1.5s cubic-bezier(0.22,1,0.36,1); }
    .ms-card.orange .ms-gauge-fill { stroke:url(#msGradOrange); }
    .ms-card.green .ms-gauge-fill { stroke:url(#msGradGreen); }
    .ms-card.amber .ms-gauge-fill { stroke:url(#msGradAmber); }
    .ms-card.purple .ms-gauge-fill { stroke:url(#msGradPurple); }
    .ms-gauge-center {
      position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
      text-align:center;
    }
    .ms-gauge-pct { font-size:28px; font-weight:700; display:block; letter-spacing:-0.02em; font-family:'IBM Plex Mono', monospace; }
    .ms-gauge-label { font-size:10px; color:var(--dim); font-weight:500; letter-spacing:0.05em; }

    /* Trajectory Chart */
    .ms-chart-area { flex:1; min-width:0; padding-right:4px; }
    .ms-chart-title { font-size:10px; font-weight:600; letter-spacing:0.1em; color:var(--dim); margin-bottom:8px; }
    .ms-chart-svg { width:100%; height:100px; overflow:visible; }
    .ms-chart-grid-line { stroke:rgba(255,255,255,0.04); stroke-width:1; }
    /* Area fill under the curve — prominent gradient */
    .ms-chart-area-fill { opacity:0.35; }
    .ms-card.orange .ms-chart-area-fill { fill:url(#msAreaOrange); }
    .ms-card.green .ms-chart-area-fill { fill:url(#msAreaGreen); }
    .ms-card.amber .ms-chart-area-fill { fill:url(#msAreaAmber); }
    .ms-card.purple .ms-chart-area-fill { fill:url(#msAreaPurple); }
    /* Bold gradient stroke line */
    .ms-chart-line { fill:none; stroke-width:3; stroke-linecap:round; stroke-linejoin:round; }
    .ms-card.orange .ms-chart-line { stroke:url(#msGradOrange); }
    .ms-card.green .ms-chart-line { stroke:url(#msGradGreen); }
    .ms-card.amber .ms-chart-line { stroke:url(#msGradAmber); }
    .ms-card.purple .ms-chart-line { stroke:url(#msGradPurple); }
    /* Endpoint dot with glow */
    .ms-chart-dot { r:5; filter:drop-shadow(0 0 4px currentColor); }
    .ms-card.orange .ms-chart-dot { fill:var(--orange); }
    .ms-card.green .ms-chart-dot { fill:var(--green); }
    .ms-card.amber .ms-chart-dot { fill:var(--amber); }
    .ms-card.purple .ms-chart-dot { fill:var(--purple); }
    .ms-chart-dot-glow { r:10; opacity:0.25; }
    .ms-card.orange .ms-chart-dot-glow { fill:var(--orange); }
    .ms-card.green .ms-chart-dot-glow { fill:var(--green); }
    .ms-card.amber .ms-chart-dot-glow { fill:var(--amber); }
    .ms-card.purple .ms-chart-dot-glow { fill:var(--purple); }
    .ms-chart-target-line { stroke:rgba(255,255,255,0.15); stroke-width:1; stroke-dasharray:4 4; }
    .ms-chart-target-label { font-size:9px; fill:var(--dim); font-family:'DM Sans', sans-serif; }
    .ms-chart-labels { display:flex; justify-content:space-between; margin-top:4px; }
    .ms-chart-label-text { font-size:9px; color:rgba(255,255,255,0.25); }

    /* Bottom Stats Row */
    .ms-stats { display:grid; grid-template-columns:repeat(3, 1fr); gap:0; border-top:1px solid var(--border); }
    .ms-stat {
      padding:18px 20px; text-align:center;
      border-right:1px solid var(--border);
    }
    .ms-stat:last-child { border-right:none; }
    .ms-stat-val { font-size:16px; font-weight:700; display:block; margin-bottom:2px; letter-spacing:-0.01em; font-family:'IBM Plex Mono', monospace; }
    .ms-stat-label { font-size:9px; font-weight:600; letter-spacing:0.08em; color:var(--dim); text-transform:uppercase; }
    .ms-stat-val.green { color:var(--green); }
    .ms-stat-val.amber-c { color:var(--amber); }
    .ms-stat-val.orange-c { color:var(--orange); }
    .ms-stat-val.purple-c { color:var(--purple); }

    /* Insight line at bottom */
    .ms-insight { padding:12px 24px; border-top:1px solid var(--border); font-size:11px; color:var(--dim); }
    .ms-insight::before { content:'💡 '; }

    /* Management Company Pills */
    .mgmt-chain {
      display:flex; align-items:center; gap:8px; margin-top:8px; padding:10px 24px 16px;
    }
    .mgmt-pill {
      display:inline-flex; align-items:center; gap:6px;
      padding:6px 14px; border-radius:8px;
      background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06);
      font-size:11px; color:var(--dim);
    }
    .mgmt-pill-name { font-weight:600; color:rgba(255,255,255,0.7); }
    .mgmt-pill-pct { font-family:'IBM Plex Mono', monospace; font-weight:600; font-size:10px; }
    .mgmt-arrow { color:rgba(255,255,255,0.15); font-size:14px; }

    /* === PROPERTY CARDS === */
    .properties-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(480px, 1fr));
      gap: 20px;
    }
    @media (max-width: 1000px) { .properties-grid { grid-template-columns:1fr; } }

    .prop-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 20px;
      overflow: hidden;
      position: relative;
    }
    .prop-card::before {
      content:''; position:absolute; top:0; left:0; right:0; height:3px;
      border-radius:20px 20px 0 0;
    }
    .prop-card.orange::before { background:linear-gradient(90deg, var(--orange), var(--pink)); }
    .prop-card.green::before { background:linear-gradient(90deg, var(--green), var(--lime)); }
    .prop-card.purple::before { background:linear-gradient(90deg, var(--purple), var(--pink)); }

    .prop-header { display:flex; align-items:center; justify-content:space-between; padding:22px 24px 16px; }
    .prop-header-left { display:flex; align-items:center; gap:14px; }
    .prop-icon {
      width:48px; height:48px; border-radius:14px; display:flex; align-items:center; justify-content:center;
      font-size:24px;
    }
    .prop-card.orange .prop-icon { background:rgba(249,115,22,0.12); }
    .prop-card.green .prop-icon { background:rgba(16,185,129,0.12); }
    .prop-card.purple .prop-icon { background:rgba(139,92,246,0.12); }
    .prop-name { font-size:17px; font-weight:600; letter-spacing:-0.01em; }
    .prop-type { font-size:11px; color:var(--dim); margin-top:2px; }
    .prop-value-badge {
      font-family:'IBM Plex Mono', monospace; font-size:13px; font-weight:600;
      padding:5px 14px; border-radius:8px; border:1px solid;
    }
    .prop-card.orange .prop-value-badge { color:var(--orange); border-color:rgba(249,115,22,0.25); background:rgba(249,115,22,0.08); }
    .prop-card.green .prop-value-badge { color:var(--green); border-color:rgba(16,185,129,0.25); background:rgba(16,185,129,0.08); }
    .prop-card.purple .prop-value-badge { color:var(--purple); border-color:rgba(139,92,246,0.25); background:rgba(139,92,246,0.08); }

    /* Occupancy arc gauge */
    .prop-viz {
      display:flex; align-items:center; gap:24px; padding:16px 24px 20px;
    }
    .prop-occ-wrap {
      position:relative; width:120px; height:120px; flex-shrink:0;
    }
    .prop-occ-svg {
      width:120px; height:120px; transform:rotate(-90deg);
    }
    .prop-occ-bg { fill:none; stroke:rgba(255,255,255,0.04); stroke-width:10; }
    .prop-occ-fill { fill:none; stroke-width:10; stroke-linecap:round; }
    .prop-card.orange .prop-occ-fill { stroke:url(#propGradOrange); }
    .prop-card.green .prop-occ-fill { stroke:url(#propGradGreen); }
    .prop-card.purple .prop-occ-fill { stroke:url(#propGradPurple); }
    .prop-occ-center {
      position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
      text-align:center;
    }
    .prop-occ-pct {
      font-family:'IBM Plex Mono', monospace; font-size:26px; font-weight:700;
      display:block; letter-spacing:-0.02em;
    }
    .prop-occ-label { font-size:9px; color:var(--dim); font-weight:600; letter-spacing:0.08em; text-transform:uppercase; }

    /* Trend indicators next to gauge */
    .prop-trends { flex:1; display:flex; flex-direction:column; gap:10px; }
    .prop-trend-row {
      display:flex; align-items:center; justify-content:space-between;
      padding:8px 14px; border-radius:10px;
      background:rgba(255,255,255,0.015); border:1px solid rgba(255,255,255,0.03);
    }
    .prop-trend-label { font-size:11px; color:var(--dim); font-weight:500; }
    .prop-trend-val {
      font-family:'IBM Plex Mono', monospace; font-size:13px; font-weight:600;
      display:flex; align-items:center; gap:6px;
    }
    .prop-trend-arrow { font-size:11px; font-weight:700; }
    .prop-trend-arrow.up { color:var(--green); }
    .prop-trend-arrow.down { color:var(--red); }
    .prop-trend-delta {
      font-size:10px; font-weight:600; padding:2px 6px; border-radius:4px;
    }
    .prop-trend-delta.up { color:var(--green); background:rgba(16,185,129,0.1); }
    .prop-trend-delta.down { color:var(--red); background:rgba(239,68,68,0.1); }

    /* Bottom stats row */
    .prop-stats {
      display:grid; grid-template-columns:repeat(4, 1fr); gap:0;
      border-top:1px solid var(--border);
    }
    .prop-stat {
      padding:16px 18px; text-align:center;
      border-right:1px solid var(--border);
    }
    .prop-stat:last-child { border-right:none; }
    .prop-stat-val {
      font-family:'IBM Plex Mono', monospace; font-size:15px; font-weight:700;
      display:block; margin-bottom:2px; letter-spacing:-0.01em;
    }
    .prop-stat-label {
      font-size:9px; font-weight:600; letter-spacing:0.08em; color:var(--dim); text-transform:uppercase;
    }

    /* Cash flow section */
    .cashflow-cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      margin-bottom: 24px;
    }

    .cashflow-card {
      background: rgba(255, 255, 255, 0.01);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      text-align: center;
    }

    .cashflow-label {
      font-size: 11px;
      color: var(--dim);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .cashflow-value {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 32px;
      font-weight: 600;
      margin-top: 12px;
      margin-bottom: 12px;
    }

    .cashflow-spark {
      height: 40px;
    }

    .cashflow-spark svg {
      width: 100%;
      height: 100%;
    }

    .cashflow-waterfall {
      width: 100%;
      height: 200px;
      background: rgba(255, 255, 255, 0.01);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
    }

    /* FLOW DASHBOARD STYLES */
    .cf-metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin-bottom: 32px;
    }
    @media (max-width: 1100px) { .cf-metrics-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 640px) { .cf-metrics-grid { grid-template-columns: 1fr; } }

    .cf-metric-tile {
      background: rgba(255,255,255,0.01);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 24px;
      backdrop-filter: blur(8px);
    }

    .cf-metric-

    .cf-metric-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--dim);
    }

    .cf-metric-trend {
      font-size: 11px;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 6px;
    }

    .cf-metric-trend.up {
      color: var(--green);
      background: rgba(16,185,129,0.1);
    }

    .cf-metric-trend.down {
      color: var(--red);
      background: rgba(239,68,68,0.1);
    }

    .cf-metric-value {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 16px;
      letter-spacing: -0.02em;
    }

    .cf-mini-chart {
      height: 50px;
      width: 100%;
    }

    .cf-area {
      opacity: 0.8;
    }

    .cf-line {
      opacity: 1;
    }

    .cf-chart-container {
      background: rgba(255,255,255,0.01);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 24px;
      margin-bottom: 32px;
      backdrop-filter: blur(8px);
    }

    .cf-chart-title {
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 16px;
      color: rgba(255,255,255,0.9);
    }

    .cf-stacked-chart {
      width: 100%;
      height: 250px;
      margin-bottom: 16px;
    }

    .cf-stack-area {
      opacity: 0.8;
    }

    .cf-chart-legend {
      display: flex;
      gap: 24px;
      justify-content: center;
    }

    .cf-legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--dim);
    }

    .cf-legend-dot {
      width: 12px;
      height: 12px;
      border-radius: 3px;
    }

    /* === PREMIUM EXPENSE BREAKDOWN === */
    .cf-expense-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    @media (min-width: 1100px) { .cf-expense-grid { grid-template-columns: repeat(4, 1fr); } }

    .cf-expense-card {
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 20px;
      padding: 24px 20px 20px;
      position: relative;
      overflow: hidden;
      transition: all 0.4s cubic-bezier(0.22,1,0.36,1);
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .cf-expense-card:hover {
      background: rgba(255,255,255,0.05);
      border-color: rgba(255,255,255,0.14);
      transform: translateY(-3px);
      box-shadow: 0 16px 48px rgba(0,0,0,0.5);
    }
    .cf-expense-card::before {
      content:''; position:absolute; top:0; left:0; right:0; height:3px;
      border-radius:20px 20px 0 0;
    }
    .cf-expense-card:nth-child(1)::before { background:linear-gradient(90deg, #f97316, #ec4899, transparent); }
    .cf-expense-card:nth-child(2)::before { background:linear-gradient(90deg, #8b5cf6, #ec4899, transparent); }
    .cf-expense-card:nth-child(3)::before { background:linear-gradient(90deg, #10b981, #06b6d4, transparent); }
    .cf-expense-card:nth-child(4)::before { background:linear-gradient(90deg, #f59e0b, #f97316, transparent); }

    /* Glowing orb */
    .cf-expense-card::after {
      content:''; position:absolute; top:20px; left:50%; transform:translateX(-50%);
      width:80px; height:80px; border-radius:50%;
      opacity:0.12; filter:blur(25px); pointer-events:none;
    }
    .cf-expense-card:nth-child(1)::after { background:#f97316; }
    .cf-expense-card:nth-child(2)::after { background:#8b5cf6; }
    .cf-expense-card:nth-child(3)::after { background:#10b981; }
    .cf-expense-card:nth-child(4)::after { background:#f59e0b; }

    .cfe-gauge-wrap {
      position:relative; width:100px; height:100px; margin-bottom:14px; z-index:1;
    }
    .cfe-gauge-svg {
      width:100px; height:100px; transform:rotate(-90deg); overflow:visible;
    }
    .cfe-gauge-bg { fill:none; stroke:rgba(255,255,255,0.06); stroke-width:8; }
    .cfe-gauge-fill {
      fill:none; stroke-width:8; stroke-linecap:round;
      transition: stroke-dashoffset 1.8s cubic-bezier(0.22,1,0.36,1);
    }
    .cfe-gauge-center {
      position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
      flex-direction:column;
    }
    .cfe-gauge-icon {
      font-size:24px; line-height:1; margin-bottom:2px;
    }
    .cfe-gauge-pct {
      font-family:'IBM Plex Mono', monospace; font-size:11px; font-weight:600;
      color:rgba(255,255,255,0.5);
    }

    .cf-expense-

    .cf-expense-amount {
      font-family:'IBM Plex Mono', monospace; font-size:28px; font-weight:700;
      letter-spacing:-0.03em; margin-bottom:12px; z-index:1;
    }
    .cf-expense-card:nth-child(1) .cf-expense-amount { background:linear-gradient(135deg, #f97316, #ec4899); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
    .cf-expense-card:nth-child(2) .cf-expense-amount { background:linear-gradient(135deg, #8b5cf6, #ec4899); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
    .cf-expense-card:nth-child(3) .cf-expense-amount { background:linear-gradient(135deg, #10b981, #06b6d4); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
    .cf-expense-card:nth-child(4) .cf-expense-amount { background:linear-gradient(135deg, #f59e0b, #f97316); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }

    .cfe-stats {
      display:flex; gap:16px; z-index:1; width:100%; justify-content:center;
    }
    .cfe-stat { text-align:center; }
    .cfe-stat-label {
      font-size:9px; text-transform:uppercase; letter-spacing:0.06em;
      color:rgba(255,255,255,0.25); font-weight:600; margin-bottom:2px;
    }
    .cfe-stat-val {
      font-family:'IBM Plex Mono', monospace; font-size:12px; font-weight:600;
      color:rgba(255,255,255,0.7);
    }
    .cfe-stat-val.up { color:#10b981; }
    .cfe-stat-val.down { color:#ef4444; }
    .cfe-stat-val.warn { color:#f59e0b; }

    /* Hide old progress bars */
    .cf-progress-wrap { display:none; }
    .cf-progress-bar { display:none; }
    .cf-expense-sub { display:none; }

    /* Linked accounts section */
    .accounts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
    }

    .account-group {
      background: linear-gradient(135deg, rgba(249, 115, 22, 0.1), rgba(236, 72, 153, 0.05));
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
    }

    .account-group-title {
      font-size: 11px;
      font-weight: 600;
      color: var(--orange);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
    }

    .account-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.03);
      font-size: 12px;
    }

    .account-item:last-child {
      border-bottom: none;
    }

    .account-name {
      color: rgba(255, 255, 255, 0.8);
    }

    .account-number {
      color: var(--dim);
      font-family: 'IBM Plex Mono', monospace;
      font-size: 11px;
    }

    .account-balance {
      font-family: 'IBM Plex Mono', monospace;
      font-weight: 600;
      text-align: right;
    }

    .account-balance.positive {
      color: var(--green);
    }

    .account-balance.negative {
      color: var(--red);
    }

    /* Responsive */
    @media (max-width: 1400px) {
      .hero-wrapper {
        grid-template-columns: 1fr;
        gap: 32px;
      }

      .waterfall-container {
        display: none;
      }

      .achieve-grid {
        grid-template-columns: repeat(4, 1fr);
      }
    }

    @media (max-width: 768px) {
      

      .hero-gauges {
        grid-template-columns: 1fr;
      }

      .stat-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .networth-display {
        grid-template-columns: 1fr;
      }

      .cashflow-cards {
        grid-template-columns: 1fr;
      }

      .cf-metrics-grid {
        grid-template-columns: 1fr;
      }

      .cf-expense-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .achieve-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .companies-grid,
      .properties-grid {
        grid-template-columns: 1fr;
      }
    }
  
  .arc-bg {
    fill: none;
    stroke: rgba(255,255,255,0.08);
    stroke-width: 10;
    stroke-linecap: round;
  }
  
  .arc-fill {
    fill: none;
    stroke-width: 10;
    stroke-linecap: round;
    transition: stroke-dashoffset 0.6s ease;
  }
    /* Arc Gauge Styling */
    .arc-bg {
      fill: none;
      stroke: rgba(255,255,255,0.08);
      stroke-width: 10;
      stroke-linecap: round;
    }
    
    .arc-fill {
      fill: none;
      stroke-width: 10;
      stroke-linecap: round;
      transition: stroke-dashoffset 0.6s ease;
    }
    
    /* (chart styles defined above — no duplicates) */

    /* === AI OPERATIONS INTELLIGENCE === */
    .ai-ops-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    @media (max-width: 1100px) { .ai-ops-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 600px) { .ai-ops-grid { grid-template-columns: 1fr; } }

    .ai-kpi-card {
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 20px;
      padding: 24px 20px 20px;
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      gap: 18px;
      transition: all 0.4s cubic-bezier(0.22,1,0.36,1);
    }
    .ai-kpi-card:hover {
      border-color: rgba(255,255,255,0.14);
      transform: translateY(-2px);
      box-shadow: 0 12px 40px rgba(0,0,0,0.3);
    }
    .ai-kpi-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 3px;
    }
    .ai-kpi-card::after {
      content: '';
      position: absolute;
      top: 10px; right: 10px;
      width: 60px; height: 60px;
      border-radius: 50%;
      filter: blur(25px);
      opacity: 0.15;
      pointer-events: none;
    }
    .ai-kpi-card.ai-purple::before { background: linear-gradient(90deg, #8b5cf6, #a78bfa, transparent); }
    .ai-kpi-card.ai-purple::after { background: #8b5cf6; }
    .ai-kpi-card.ai-green::before { background: linear-gradient(90deg, #10b981, #34d399, transparent); }
    .ai-kpi-card.ai-green::after { background: #10b981; }
    .ai-kpi-card.ai-red::before { background: linear-gradient(90deg, #ef4444, #f87171, transparent); }
    .ai-kpi-card.ai-red::after { background: #ef4444; }
    .ai-kpi-card.ai-amber::before { background: linear-gradient(90deg, #f59e0b, #fbbf24, transparent); }
    .ai-kpi-card.ai-amber::after { background: #f59e0b; }

    .ai-gauge-wrap {
      flex: 0 0 80px;
      width: 80px; height: 80px;
      position: relative;
    }
    .ai-gauge-svg {
      width: 100%; height: 100%;
      transform: rotate(-90deg);
    }
    .ai-gauge-bg {
      fill: none;
      stroke: rgba(255,255,255,0.06);
      stroke-width: 5;
    }
    .ai-gauge-fill {
      fill: none;
      stroke-width: 5;
      stroke-linecap: round;
      transition: stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1);
    }
    .ai-gauge-center {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
    }
    .ai-gauge-icon {
      font-size: 22px;
      line-height: 1;
    }
    .ai-kpi-info {
      flex: 1;
      min-width: 0;
    }
    .ai-kpi-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: rgba(255,255,255,0.4);
      font-weight: 600;
      margin-bottom: 4px;
    }
    .ai-kpi-value {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 26px;
      font-weight: 700;
      line-height: 1.1;
      margin-bottom: 6px;
    }
    .ai-kpi-sub {
      display: flex;
      gap: 12px;
    }
    .ai-kpi-sub-item {
      text-align: left;
    }
    .ai-kpi-sub-label {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: rgba(255,255,255,0.25);
      font-weight: 600;
      margin-bottom: 1px;
    }
    .ai-kpi-sub-val {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 13px;
      font-weight: 600;
    }

    /* AI Model Cost Cards */
    .ai-model-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 14px;
      margin-bottom: 24px;
    }
    @media (max-width: 1200px) { .ai-model-grid { grid-template-columns: repeat(3, 1fr); } }
    @media (max-width: 768px) { .ai-model-grid { grid-template-columns: repeat(2, 1fr); } }

    .ai-model-card {
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 18px;
      padding: 20px 16px 16px;
      text-align: center;
      position: relative;
      overflow: hidden;
      transition: all 0.4s cubic-bezier(0.22,1,0.36,1);
    }
    .ai-model-card:hover {
      border-color: rgba(255,255,255,0.14);
      transform: translateY(-2px);
    }
    .ai-model-gauge {
      width: 72px; height: 72px;
      margin: 0 auto 10px;
      position: relative;
    }
    .ai-model-gauge svg {
      width: 100%; height: 100%;
      transform: rotate(-90deg);
    }
    .ai-model-gauge .gauge-center {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      font-family: 'IBM Plex Mono', monospace;
      font-size: 13px;
      font-weight: 700;
    }
    .ai-model-name {
      font-size: 11px;
      font-weight: 600;
      color: rgba(255,255,255,0.7);
      margin-bottom: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .ai-model-cost {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 16px;
      font-weight: 700;
    }
    .ai-model-calls {
      font-size: 10px;
      color: rgba(255,255,255,0.3);
      margin-top: 2px;
    }

    /* Agent Cost Bars */
    .ai-agent-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .ai-agent-row {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .ai-agent-name {
      flex: 0 0 120px;
      font-size: 12px;
      font-weight: 500;
      color: rgba(255,255,255,0.6);
      text-align: right;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .ai-agent-bar-wrap {
      flex: 1;
      height: 24px;
      background: rgba(255,255,255,0.03);
      border-radius: 12px;
      overflow: hidden;
      position: relative;
    }
    .ai-agent-bar {
      height: 100%;
      border-radius: 12px;
      transition: width 1.5s cubic-bezier(0.22,1,0.36,1);
      position: relative;
    }
    .ai-agent-bar::after {
      content: '';
      position: absolute;
      top: 0; right: 0; bottom: 0;
      width: 30px;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15));
      border-radius: 0 12px 12px 0;
    }
    .ai-agent-val {
      flex: 0 0 70px;
      font-family: 'IBM Plex Mono', monospace;
      font-size: 13px;
      font-weight: 600;
      color: rgba(255,255,255,0.7);
    }

    .ai-two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    @media (max-width: 900px) { .ai-two-col { grid-template-columns: 1fr; } }
    .ai-col-title {
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: rgba(255,255,255,0.5);
      margin-bottom: 16px;
    }

    /* === SPENDING & TRANSACTIONS === */
    .spend-two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    @media (max-width: 900px) { .spend-two-col { grid-template-columns: 1fr; } }

    .spend-cat-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .spend-cat-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .spend-cat-icon {
      width: 32px; height: 32px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
      flex-shrink: 0;
    }
    .spend-cat-info {
      flex: 1;
      min-width: 0;
    }
    .spend-cat-top {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 5px;
    }
    .spend-cat-name {
      font-size: 13px;
      font-weight: 500;
      color: rgba(255,255,255,0.75);
    }
    .spend-cat-amt {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 14px;
      font-weight: 600;
      color: rgba(255,255,255,0.85);
    }
    .spend-cat-bar-bg {
      height: 6px;
      background: rgba(255,255,255,0.04);
      border-radius: 3px;
      overflow: hidden;
    }
    .spend-cat-bar-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 1.2s cubic-bezier(0.22,1,0.36,1);
    }

    /* Recent Transactions */
    .txn-list {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .txn-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 12px;
      background: rgba(255,255,255,0.015);
      border: 1px solid rgba(255,255,255,0.04);
      transition: all 0.3s ease;
    }
    .txn-item:hover {
      background: rgba(255,255,255,0.035);
      border-color: rgba(255,255,255,0.08);
    }
    .txn-icon {
      width: 36px; height: 36px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      flex-shrink: 0;
    }
    .txn-details {
      flex: 1;
      min-width: 0;
    }
    .txn-merchant {
      font-size: 13px;
      font-weight: 500;
      color: rgba(255,255,255,0.8);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .txn-date {
      font-size: 11px;
      color: rgba(255,255,255,0.3);
    }
    .txn-amount {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 14px;
      font-weight: 600;
      flex-shrink: 0;
    }
    .txn-amount.debit { color: var(--red); }
    .txn-amount.credit { color: var(--green); }
    .txn-cat-tag {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 2px 8px;
      border-radius: 6px;
      font-weight: 600;
      flex-shrink: 0;
    }

    /* === CREDIT & DEBT OVERVIEW === */
    .debt-overview-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    @media (max-width: 900px) { .debt-overview-grid { grid-template-columns: 1fr; } }

    .debt-card {
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 20px;
      padding: 24px;
      text-align: center;
      position: relative;
      overflow: hidden;
      transition: all 0.4s cubic-bezier(0.22,1,0.36,1);
    }
    .debt-card:hover {
      border-color: rgba(255,255,255,0.14);
      transform: translateY(-2px);
    }
    .debt-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 3px;
      background: linear-gradient(90deg, var(--red), var(--amber), transparent);
    }
    .debt-gauge-wrap {
      width: 100px; height: 100px;
      margin: 0 auto 12px;
      position: relative;
    }
    .debt-gauge-wrap svg {
      width: 100%; height: 100%;
      transform: rotate(-90deg);
    }
    .debt-gauge-center {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
    }
    .debt-gauge-pct {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 18px;
      font-weight: 700;
    }
    .debt-gauge-label-sm {
      font-size: 9px;
      text-transform: uppercase;
      color: rgba(255,255,255,0.3);
      letter-spacing: 0.05em;
    }
    .debt-card-title {
      font-size: 13px;
      font-weight: 600;
      color: rgba(255,255,255,0.6);
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .debt-card-value {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .debt-card-sub {
      display: flex;
      justify-content: center;
      gap: 16px;
    }
    .debt-sub-item {
      text-align: center;
    }
    .debt-sub-label {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: rgba(255,255,255,0.25);
      font-weight: 600;
      margin-bottom: 1px;
    }
    .debt-sub-val {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 13px;
      font-weight: 600;
    }

  `

  // Body content after hero (sections, scripts)
  const bodyContent = `

    <!-- GAMIFICATION BAR -->
    <!-- ACHIEVEMENTS SECTION -->
    <section class="section">
      <div class="section-header">
        <div class="section-header-left">
          <span style="font-size:20px">🏆</span>
          <h2 class="section-title">Achievements</h2>
          <span class="achieve-count">8 of 8 earned</span>
          <span class="xp-earned">+2,200 XP earned</span>
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
        <!-- First Budget -->
        <div class="achieve-card earned" data-progress="100">
          <div class="achieve-ring-wrap">
            <svg class="achieve-ring-svg" viewBox="0 0 88 88"><circle class="achieve-ring-bg" cx="44" cy="44" r="40"/><circle class="achieve-ring-fill" cx="44" cy="44" r="40"/></svg>
            <span class="achieve-icon-center">📊</span>
            <div class="achieve-check">✓</div>
          </div>
          <p class="achieve-name">First Budget</p>
          <p class="achieve-xp">+100 XP</p>
          <div class="achieve-tooltip"><p class="achieve-tooltip-name">First Budget</p><p class="achieve-tooltip-desc">Created your first financial budget</p><p class="achieve-tooltip-xp">+100 XP earned</p></div>
        </div>

        <!-- Bank Linked -->
        <div class="achieve-card earned" data-progress="100">
          <div class="achieve-ring-wrap">
            <svg class="achieve-ring-svg" viewBox="0 0 88 88"><circle class="achieve-ring-bg" cx="44" cy="44" r="40"/><circle class="achieve-ring-fill" cx="44" cy="44" r="40"/></svg>
            <span class="achieve-icon-center">🏦</span>
            <div class="achieve-check">✓</div>
          </div>
          <p class="achieve-name">Bank Linked</p>
          <p class="achieve-xp">+200 XP</p>
          <div class="achieve-tooltip"><p class="achieve-tooltip-name">Bank Linked</p><p class="achieve-tooltip-desc">Connected your first bank account</p><p class="achieve-tooltip-xp">+200 XP earned</p></div>
        </div>

        <!-- 7-Day Streak -->
        <div class="achieve-card earned" data-progress="100">
          <div class="achieve-ring-wrap">
            <svg class="achieve-ring-svg" viewBox="0 0 88 88"><circle class="achieve-ring-bg" cx="44" cy="44" r="40"/><circle class="achieve-ring-fill" cx="44" cy="44" r="40"/></svg>
            <span class="achieve-icon-center">🔥</span>
            <div class="achieve-check">✓</div>
          </div>
          <p class="achieve-name">7-Day Streak</p>
          <p class="achieve-xp">+300 XP</p>
          <div class="achieve-tooltip"><p class="achieve-tooltip-name">7-Day Streak</p><p class="achieve-tooltip-desc">Checked dashboard 7 days in a row</p><p class="achieve-tooltip-xp">+300 XP earned</p></div>
        </div>

        <!-- $5K Saved -->
        <div class="achieve-card earned" data-progress="100">
          <div class="achieve-ring-wrap">
            <svg class="achieve-ring-svg" viewBox="0 0 88 88"><circle class="achieve-ring-bg" cx="44" cy="44" r="40"/><circle class="achieve-ring-fill" cx="44" cy="44" r="40"/></svg>
            <span class="achieve-icon-center">💰</span>
            <div class="achieve-check">✓</div>
          </div>
          <p class="achieve-name">$5K Saved</p>
          <p class="achieve-xp">+250 XP</p>
          <div class="achieve-tooltip"><p class="achieve-tooltip-name">$5K Saved</p><p class="achieve-tooltip-desc">Accumulated $5K in net worth gains</p><p class="achieve-tooltip-xp">+250 XP earned</p></div>
        </div>

        <!-- Entity Builder -->
        <div class="achieve-card earned" data-progress="100">
          <div class="achieve-ring-wrap">
            <svg class="achieve-ring-svg" viewBox="0 0 88 88"><circle class="achieve-ring-bg" cx="44" cy="44" r="40"/><circle class="achieve-ring-fill" cx="44" cy="44" r="40"/></svg>
            <span class="achieve-icon-center">🏢</span>
            <div class="achieve-check">✓</div>
          </div>
          <p class="achieve-name">Entity Builder</p>
          <p class="achieve-xp">+350 XP</p>
          <div class="achieve-tooltip"><p class="achieve-tooltip-name">Entity Builder</p><p class="achieve-tooltip-desc">Created 5+ legal business entities</p><p class="achieve-tooltip-xp">+350 XP earned</p></div>
        </div>

        <!-- Data Driven -->
        <div class="achieve-card earned" data-progress="100">
          <div class="achieve-ring-wrap">
            <svg class="achieve-ring-svg" viewBox="0 0 88 88"><circle class="achieve-ring-bg" cx="44" cy="44" r="40"/><circle class="achieve-ring-fill" cx="44" cy="44" r="40"/></svg>
            <span class="achieve-icon-center">📈</span>
            <div class="achieve-check">✓</div>
          </div>
          <p class="achieve-name">Data Driven</p>
          <p class="achieve-xp">+200 XP</p>
          <div class="achieve-tooltip"><p class="achieve-tooltip-name">Data Driven</p><p class="achieve-tooltip-desc">Reviewed quarterly financial analytics</p><p class="achieve-tooltip-xp">+200 XP earned</p></div>
        </div>

        <!-- Empire Builder -->
        <div class="achieve-card earned" data-progress="100">
          <div class="achieve-ring-wrap">
            <svg class="achieve-ring-svg" viewBox="0 0 88 88"><circle class="achieve-ring-bg" cx="44" cy="44" r="40"/><circle class="achieve-ring-fill" cx="44" cy="44" r="40"/></svg>
            <span class="achieve-icon-center">👑</span>
            <div class="achieve-check">✓</div>
          </div>
          <p class="achieve-name">Empire Builder</p>
          <p class="achieve-xp">+500 XP</p>
          <div class="achieve-tooltip"><p class="achieve-tooltip-name">Empire Builder</p><p class="achieve-tooltip-desc">Reached $7M+ net worth across entities</p><p class="achieve-tooltip-xp">+500 XP earned</p></div>
        </div>

        <!-- Multi-Account -->
        <div class="achieve-card earned" data-progress="100">
          <div class="achieve-ring-wrap">
            <svg class="achieve-ring-svg" viewBox="0 0 88 88"><circle class="achieve-ring-bg" cx="44" cy="44" r="40"/><circle class="achieve-ring-fill" cx="44" cy="44" r="40"/></svg>
            <span class="achieve-icon-center">🔗</span>
            <div class="achieve-check">✓</div>
          </div>
          <p class="achieve-name">Multi-Account</p>
          <p class="achieve-xp">+300 XP</p>
          <div class="achieve-tooltip"><p class="achieve-tooltip-name">Multi-Account</p><p class="achieve-tooltip-desc">Linked 3+ financial accounts</p><p class="achieve-tooltip-xp">+300 XP earned</p></div>
        </div>
      </div>
    </section>

    


    <!-- NET WORTH SECTION -->
    <div class="section">
      <div class="section-title">TRUE NET WORTH</div>
      <div class="section-subtitle">$7,865,000 · Multi-Asset Allocation</div>

      <div class="mc-card nw-card">
        <div class="nw-flex-wrap">
          <!-- Left: Donut -->
          <div class="nw-donut-container">
            <div class="nw-donut-div" style="
              width: 260px;
              height: 260px;
              border-radius: 50%;
              background: conic-gradient(
                from 0deg,
                #f97316 0deg 220.3deg,
                transparent 220.3deg 222deg,
                #10b981 222deg 323.5deg,
                transparent 323.5deg 325.5deg,
                #f59e0b 325.5deg 341.3deg,
                transparent 341.3deg 343deg,
                #8b5cf6 343deg 347.9deg,
                transparent 347.9deg 360deg
              );
              position: relative;
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <div style="
                width: 190px;
                height: 190px;
                border-radius: 50%;
                background: linear-gradient(135deg, rgba(15,23,42,0.95), rgba(15,23,42,0.98));
                display: flex;
                align-items: center;
                justify-content: center;
                flex-direction: column;
              ">
                <div style="font-size: 36px; font-weight: 700; text-align: center; font-family:'IBM Plex Mono', monospace; letter-spacing:-0.03em; background:linear-gradient(135deg, #f59e0b, #a3e635, #10b981); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; filter:drop-shadow(0 0 12px rgba(245,158,11,0.3));">$7.86M</div>
                <div style="font-size: 10px; color: rgba(255,255,255,0.5); margin-top: 6px; letter-spacing:0.1em; font-weight:600; text-transform:uppercase;">NET WORTH</div>
              </div>
            </div>
          </div>

          <!-- Right: Breakdown cards -->
          <div class="nw-breakdown">

            <!-- BUSINESS EQUITY -->
            <div class="nw-breakdown-card nw-orange">
              <div class="nwb-gauge-wrap">
                <svg class="nwb-gauge-svg" viewBox="0 0 88 88">
                  <defs>
                    <linearGradient id="nwb-grad-orange" x1="0" y1="0" x2="88" y2="88" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stop-color="#f97316"/><stop offset="50%" stop-color="#ec4899"/><stop offset="100%" stop-color="#f97316"/>
                    </linearGradient>
                    <filter id="nwbGlow-orange"><feGaussianBlur stdDeviation="3" result="b"/><feFlood flood-color="#f97316" flood-opacity="0.5"/><feComposite in2="b" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                  </defs>
                  <circle cx="44" cy="44" r="36" class="nwb-gauge-bg"/>
                  <circle cx="44" cy="44" r="36" class="nwb-gauge-fill" stroke="url(#nwb-grad-orange)" stroke-dasharray="226.2" stroke-dashoffset="87.8" filter="url(#nwbGlow-orange)"/>
                </svg>
                <div class="nwb-gauge-center">
                  <div class="nwb-gauge-pct">61.2%</div>
                  <div class="nwb-gauge-sub">Share</div>
                </div>
              </div>
              <div class="nwb-info">
                <div class="nwb-info-header">
                  <span class="nwb-label">Business Equity</span>
                  <span class="nwb-badge nwb-badge-up">
                    <svg width="8" height="8" viewBox="0 0 10 10"><path d="M5 1L9 6H1Z" fill="#10b981"/></svg>
                    18.4% YoY
                  </span>
                </div>
                <div class="nwb-value">$4.81M</div>
                <div class="nwb-stats">
                  <div><div class="nwb-stat-label">Last Year</div><div class="nwb-stat-val">$4.06M</div></div>
                  <div><div class="nwb-stat-label">QoQ Growth</div><div class="nwb-stat-val up">+$184K</div></div>
                  <div><div class="nwb-stat-label">Target</div><div class="nwb-stat-val">$6.0M</div></div>
                  <div><div class="nwb-stat-label">Pace</div><div class="nwb-stat-val up">On Track</div></div>
                </div>
              </div>
            </div>

            <!-- REAL ESTATE -->
            <div class="nw-breakdown-card nw-green">
              <div class="nwb-gauge-wrap">
                <svg class="nwb-gauge-svg" viewBox="0 0 88 88">
                  <defs>
                    <linearGradient id="nwb-grad-green" x1="0" y1="0" x2="88" y2="88" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stop-color="#10b981"/><stop offset="50%" stop-color="#06b6d4"/><stop offset="100%" stop-color="#10b981"/>
                    </linearGradient>
                    <filter id="nwbGlow-green"><feGaussianBlur stdDeviation="3" result="b"/><feFlood flood-color="#10b981" flood-opacity="0.5"/><feComposite in2="b" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                  </defs>
                  <circle cx="44" cy="44" r="36" class="nwb-gauge-bg"/>
                  <circle cx="44" cy="44" r="36" class="nwb-gauge-fill" stroke="url(#nwb-grad-green)" stroke-dasharray="226.2" stroke-dashoffset="162.4" filter="url(#nwbGlow-green)"/>
                </svg>
                <div class="nwb-gauge-center">
                  <div class="nwb-gauge-pct">28.2%</div>
                  <div class="nwb-gauge-sub">Share</div>
                </div>
              </div>
              <div class="nwb-info">
                <div class="nwb-info-header">
                  <span class="nwb-label">Real Estate</span>
                  <span class="nwb-badge nwb-badge-up">
                    <svg width="8" height="8" viewBox="0 0 10 10"><path d="M5 1L9 6H1Z" fill="#10b981"/></svg>
                    12.1% YoY
                  </span>
                </div>
                <div class="nwb-value">$2.22M</div>
                <div class="nwb-stats">
                  <div><div class="nwb-stat-label">Last Year</div><div class="nwb-stat-val">$1.98M</div></div>
                  <div><div class="nwb-stat-label">Equity Gain</div><div class="nwb-stat-val up">+$240K</div></div>
                  <div><div class="nwb-stat-label">3 Properties</div><div class="nwb-stat-val">93% Occ.</div></div>
                  <div><div class="nwb-stat-label">Pace</div><div class="nwb-stat-val up">Ahead</div></div>
                </div>
              </div>
            </div>

            <!-- LIQUID ASSETS -->
            <div class="nw-breakdown-card nw-amber">
              <div class="nwb-gauge-wrap">
                <svg class="nwb-gauge-svg" viewBox="0 0 88 88">
                  <defs>
                    <linearGradient id="nwb-grad-amber" x1="0" y1="0" x2="88" y2="88" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stop-color="#f59e0b"/><stop offset="50%" stop-color="#f97316"/><stop offset="100%" stop-color="#f59e0b"/>
                    </linearGradient>
                    <filter id="nwbGlow-amber"><feGaussianBlur stdDeviation="3" result="b"/><feFlood flood-color="#f59e0b" flood-opacity="0.5"/><feComposite in2="b" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                  </defs>
                  <circle cx="44" cy="44" r="36" class="nwb-gauge-bg"/>
                  <circle cx="44" cy="44" r="36" class="nwb-gauge-fill" stroke="url(#nwb-grad-amber)" stroke-dasharray="226.2" stroke-dashoffset="216.3" filter="url(#nwbGlow-amber)"/>
                </svg>
                <div class="nwb-gauge-center">
                  <div class="nwb-gauge-pct">4.4%</div>
                  <div class="nwb-gauge-sub">Share</div>
                </div>
              </div>
              <div class="nwb-info">
                <div class="nwb-info-header">
                  <span class="nwb-label">Liquid Assets</span>
                  <span class="nwb-badge nwb-badge-down">
                    <svg width="8" height="8" viewBox="0 0 10 10"><path d="M5 9L1 4H9Z" fill="#ef4444"/></svg>
                    3.2% YoY
                  </span>
                </div>
                <div class="nwb-value">$345K</div>
                <div class="nwb-stats">
                  <div><div class="nwb-stat-label">Last Year</div><div class="nwb-stat-val">$356K</div></div>
                  <div><div class="nwb-stat-label">This Month</div><div class="nwb-stat-val down">-$11K</div></div>
                  <div><div class="nwb-stat-label">Reserve</div><div class="nwb-stat-val">6.2 Mo.</div></div>
                  <div><div class="nwb-stat-label">Pace</div><div class="nwb-stat-val down">Watch</div></div>
                </div>
              </div>
            </div>

            <!-- INVESTMENTS -->
            <div class="nw-breakdown-card nw-purple">
              <div class="nwb-gauge-wrap">
                <svg class="nwb-gauge-svg" viewBox="0 0 88 88">
                  <defs>
                    <linearGradient id="nwb-grad-purple" x1="0" y1="0" x2="88" y2="88" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stop-color="#8b5cf6"/><stop offset="50%" stop-color="#ec4899"/><stop offset="100%" stop-color="#8b5cf6"/>
                    </linearGradient>
                    <filter id="nwbGlow-purple"><feGaussianBlur stdDeviation="3" result="b"/><feFlood flood-color="#8b5cf6" flood-opacity="0.5"/><feComposite in2="b" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                  </defs>
                  <circle cx="44" cy="44" r="36" class="nwb-gauge-bg"/>
                  <circle cx="44" cy="44" r="36" class="nwb-gauge-fill" stroke="url(#nwb-grad-purple)" stroke-dasharray="226.2" stroke-dashoffset="222.1" filter="url(#nwbGlow-purple)"/>
                </svg>
                <div class="nwb-gauge-center">
                  <div class="nwb-gauge-pct">1.8%</div>
                  <div class="nwb-gauge-sub">Share</div>
                </div>
              </div>
              <div class="nwb-info">
                <div class="nwb-info-header">
                  <span class="nwb-label">Investments</span>
                  <span class="nwb-badge nwb-badge-up">
                    <svg width="8" height="8" viewBox="0 0 10 10"><path d="M5 1L9 6H1Z" fill="#10b981"/></svg>
                    24.7% YoY
                  </span>
                </div>
                <div class="nwb-value">$142K</div>
                <div class="nwb-stats">
                  <div><div class="nwb-stat-label">Last Year</div><div class="nwb-stat-val">$114K</div></div>
                  <div><div class="nwb-stat-label">Returns</div><div class="nwb-stat-val up">+$28K</div></div>
                  <div><div class="nwb-stat-label">Target</div><div class="nwb-stat-val">$500K</div></div>
                  <div><div class="nwb-stat-label">Pace</div><div class="nwb-stat-val up">Growing</div></div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>

    <!-- SPARKLINE GLOW FILTER -->
    <svg width="0" height="0" style="position:absolute">
      <defs>
        <filter id="sparkGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feFlood flood-color="white" flood-opacity="0.6" result="color"/>
          <feComposite in="color" in2="blur" operator="in" result="glow"/>
          <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
    </svg>

    <!-- MILESTONE & NET WORTH GRADIENT DEFS -->
    <svg width="0" height="0" style="position:absolute">
      <defs>
        <!-- NET WORTH CENTER GRADIENT -->
        <linearGradient id="nwCenterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f97316"/><stop offset="50%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#10b981"/>
        </linearGradient>

        <!-- NET WORTH SEGMENT GRADIENTS (bright, saturated for donut segments) -->
        <linearGradient id="nwSegOrange" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f97316"/><stop offset="100%" stop-color="#d97706"/>
        </linearGradient>
        <linearGradient id="nwSegGreen" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#10b981"/><stop offset="100%" stop-color="#059669"/>
        </linearGradient>
        <linearGradient id="nwSegAmber" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#d97706"/>
        </linearGradient>
        <linearGradient id="nwSegPurple" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#a855f7"/><stop offset="100%" stop-color="#7c3aed"/>
        </linearGradient>

        <!-- NET WORTH PROGRESS BAR GRADIENTS -->
        <linearGradient id="nwProgressOrange" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#f97316"/><stop offset="100%" stop-color="#ec4899"/>
        </linearGradient>
        <linearGradient id="nwProgressGreen" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#10b981"/><stop offset="100%" stop-color="#06b6d4"/>
        </linearGradient>
        <linearGradient id="nwProgressAmber" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#f97316"/>
        </linearGradient>
        <linearGradient id="nwProgressPurple" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#a855f7"/><stop offset="100%" stop-color="#ec4899"/>
        </linearGradient>

        <!-- Gauge fill gradients (wide color range for visible circle gradients) -->
        <linearGradient id="msGradOrange" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f97316"/><stop offset="50%" stop-color="#ec4899"/><stop offset="100%" stop-color="#f97316"/>
        </linearGradient>
        <linearGradient id="msGradGreen" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#10b981"/><stop offset="50%" stop-color="#06b6d4"/><stop offset="100%" stop-color="#10b981"/>
        </linearGradient>
        <linearGradient id="msGradAmber" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f59e0b"/><stop offset="50%" stop-color="#f97316"/><stop offset="100%" stop-color="#f59e0b"/>
        </linearGradient>
        <linearGradient id="msGradPurple" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#a855f7"/><stop offset="50%" stop-color="#ec4899"/><stop offset="100%" stop-color="#a855f7"/>
        </linearGradient>

        <!-- Chart area gradients -->
        <linearGradient id="msAreaOrange" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="rgba(249, 115, 22, 0.3)"/><stop offset="100%" stop-color="rgba(249, 115, 22, 0)"/>
        </linearGradient>
        <linearGradient id="msAreaGreen" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="rgba(16, 185, 129, 0.3)"/><stop offset="100%" stop-color="rgba(16, 185, 129, 0)"/>
        </linearGradient>
        <linearGradient id="msAreaAmber" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="rgba(245, 158, 11, 0.3)"/><stop offset="100%" stop-color="rgba(245, 158, 11, 0)"/>
        </linearGradient>
        <linearGradient id="msAreaPurple" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="rgba(168, 85, 247, 0.3)"/><stop offset="100%" stop-color="rgba(168, 85, 247, 0)"/>
        </linearGradient>
        <!-- Pink gradient for cash flow -->
        <linearGradient id="msGradPink" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ec4899"/><stop offset="100%" stop-color="#db2777"/>
        </linearGradient>
      </defs>
    </svg>

    <!-- COMPANIES SECTION -->
    <div class="section">
      <div class="section-title">Business Entities</div>
      <div class="section-count">6</div>

      <div class="milestone-grid">
        <!-- Cabo Tropic - REDESIGNED -->
        <div class="ms-card orange" data-entity="cabo-tropic">
          <div class="ms-body">
            <div class="ms-header">
              <div class="ms-icon-wrap">🏖️</div>
              <div class="ms-header-text">
                <div class="ms-title">Cabo Tropic</div>
                <div class="ms-status-badge">$1.05M</div>
              </div>
            </div>
          </div>

          <div class="ms-viz">
            <div class="ms-gauge-wrap">
              <svg class="ms-gauge-svg" viewBox="0 0 130 130">
                <defs>
                  <filter id="gaugeGlow-orange" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                  <linearGradient id="gauge-grad-orange" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="130" y2="130"><stop offset="0%" stop-color="#f97316"/><stop offset="100%" stop-color="#ec4899"/></linearGradient>
                </defs>
                <!-- Background circle -->
                <circle class="ms-gauge-bg" cx="65" cy="65" r="56"/>
                <!-- Filled circle with stroke-dasharray -->
                <circle class="ms-gauge-fill" cx="65" cy="65" r="56" fill="none" stroke="url(#gauge-grad-orange)" stroke-dasharray="351.9" stroke-dashoffset="80.9" stroke-linecap="round" filter="url(#gaugeGlow-orange)"/>
              </svg>
              <div class="ms-gauge-center">
                <div class="ms-gauge-pct">77%</div>
                <div class="ms-gauge-label">Growth</div>
              </div>
            </div>

            <div class="ms-chart-area">
              <div class="ms-chart-title">Quarterly Growth</div>
              <svg class="ms-chart-svg" viewBox="0 0 260 80" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chart-grad-cabo" x1="0" y1="80" x2="0" y2="0" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stop-color="rgba(249,115,22,0.15)"/>
                    <stop offset="100%" stop-color="rgba(249,115,22,0.4)"/>
                  </linearGradient>
                </defs>
                <!-- Grid lines -->
                <line class="ms-chart-grid-line" x1="0" y1="20" x2="260" y2="20"/>
                <line class="ms-chart-grid-line" x1="0" y1="40" x2="260" y2="40"/>
                <line class="ms-chart-grid-line" x1="0" y1="60" x2="260" y2="60"/>
                <!-- Gradient area fill with higher opacity -->
                <path class="ms-chart-area-fill" d="M0,65 L52,55 L104,48 L156,35 L208,22 L260,12 L260,80 L0,80 Z" fill="url(#chart-grad-cabo)" opacity="0.4"/>
                <!-- Bold gradient line with 3px stroke -->
                <polyline class="ms-chart-line" points="0,65 52,55 104,48 156,35" stroke="url(#chart-grad-cabo)" stroke-width="3" opacity="1"/>
                <!-- Projected line (dashed for future) -->
                <polyline class="ms-chart-line" points="156,35 208,22 260,12" stroke="url(#chart-grad-cabo)" stroke-width="3" stroke-dasharray="6 4" opacity="0.5"/>
                <!-- Endpoint glow rings -->
                <circle class="ms-chart-dot-glow" cx="156" cy="35" r="8" fill="none" stroke="rgba(249,115,22,0.3)" stroke-width="2"/>
                <circle class="ms-chart-dot-glow" cx="156" cy="35" r="5" fill="none" stroke="rgba(249,115,22,0.5)" stroke-width="1.5"/>
                <!-- Current position dot -->
                <circle class="ms-chart-dot" cx="156" cy="35" r="3.5" fill="#f97316"/>
              </svg>
            </div>
          </div>

          <div class="ms-stats">
            <div class="ms-stat">
              <div class="ms-stat-label">4.2x</div>
              <div class="ms-stat-val">Multiplier</div>
            </div>
            <div class="ms-stat">
              <div class="ms-stat-label">$42K</div>
              <div class="ms-stat-val">Monthly Rev</div>
            </div>
            <div class="ms-stat">
              <div class="ms-stat-label">100%</div>
              <div class="ms-stat-val">Owned</div>
            </div>
          </div>

          <div class="mgmt-chain">
            <span class="mgmt-pill">
              <span class="mgmt-pill-name">Direct</span>
              <span class="mgmt-pill-pct">100%</span>
            </span>
          </div>

          <div class="ms-insight">Revenue up 18% QoQ, outpacing sector. Premium beachfront positioning strong.</div>
        </div>

        <!-- Culbertson & Co -->
        <div class="ms-card green" data-entity="culbertson">
          <div class="ms-body">
            <div class="ms-header">
              <div class="ms-icon-wrap">🏢</div>
              <div class="ms-header-text">
                <div class="ms-title">Culbertson & Co</div>
                <div class="ms-status-badge">$892K</div>
              </div>
            </div>
          </div>

          <div class="ms-viz">
            <div class="ms-gauge-wrap">
              <svg class="ms-gauge-svg" viewBox="0 0 130 130">
                <defs>
                  <filter id="gaugeGlow-green" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                  <linearGradient id="gauge-grad-green" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="130" y2="130"><stop offset="0%" stop-color="#10b981"/><stop offset="100%" stop-color="#06b6d4"/></linearGradient>
                </defs>
                <!-- Background circle -->
                <circle class="ms-gauge-bg" cx="65" cy="65" r="56"/>
                <!-- Filled circle with stroke-dasharray -->
                <circle class="ms-gauge-fill" cx="65" cy="65" r="56" fill="none" stroke="url(#gauge-grad-green)" stroke-dasharray="351.9" stroke-dashoffset="63.3" stroke-linecap="round" filter="url(#gaugeGlow-green)"/>
              </svg>
              <div class="ms-gauge-center">
                <div class="ms-gauge-pct">82%</div>
                <div class="ms-gauge-label">Growth</div>
              </div>
            </div>

            <div class="ms-chart-area">
              <div class="ms-chart-title">Quarterly Growth</div>
              <svg class="ms-chart-svg" viewBox="0 0 260 80" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chart-grad-culb" x1="0" y1="80" x2="0" y2="0" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stop-color="rgba(16,185,129,0.15)"/>
                    <stop offset="100%" stop-color="rgba(16,185,129,0.4)"/>
                  </linearGradient>
                </defs>
                <!-- Grid lines -->
                <line class="ms-chart-grid-line" x1="0" y1="20" x2="260" y2="20"/>
                <line class="ms-chart-grid-line" x1="0" y1="40" x2="260" y2="40"/>
                <line class="ms-chart-grid-line" x1="0" y1="60" x2="260" y2="60"/>
                <!-- Gradient area fill with higher opacity -->
                <path class="ms-chart-area-fill" d="M0,62 L52,52 L104,45 L156,32 L208,20 L260,10 L260,80 L0,80 Z" fill="url(#chart-grad-culb)" opacity="0.4"/>
                <!-- Bold gradient line with 3px stroke -->
                <polyline class="ms-chart-line" points="0,62 52,52 104,45 156,32" stroke="url(#chart-grad-culb)" stroke-width="3" opacity="1"/>
                <!-- Projected line (dashed for future) -->
                <polyline class="ms-chart-line" points="156,32 208,20 260,10" stroke="url(#chart-grad-culb)" stroke-width="3" stroke-dasharray="6 4" opacity="0.5"/>
                <!-- Endpoint glow rings -->
                <circle class="ms-chart-dot-glow" cx="156" cy="32" r="8" fill="none" stroke="rgba(16,185,129,0.3)" stroke-width="2"/>
                <circle class="ms-chart-dot-glow" cx="156" cy="32" r="5" fill="none" stroke="rgba(16,185,129,0.5)" stroke-width="1.5"/>
                <!-- Current position dot -->
                <circle class="ms-chart-dot" cx="156" cy="32" r="3.5" fill="#10b981"/>
              </svg>
            </div>
          </div>

          <div class="ms-stats">
            <div class="ms-stat">
              <div class="ms-stat-label">3.8x</div>
              <div class="ms-stat-val">Multiplier</div>
            </div>
            <div class="ms-stat">
              <div class="ms-stat-label">$28K</div>
              <div class="ms-stat-val">Monthly Rev</div>
            </div>
            <div class="ms-stat">
              <div class="ms-stat-label">100%</div>
              <div class="ms-stat-val">Owned</div>
            </div>
          </div>

          <div class="mgmt-chain">
            <span class="mgmt-pill">
              <span class="mgmt-pill-name">Direct</span>
              <span class="mgmt-pill-pct">100%</span>
            </span>
          </div>

          <div class="ms-insight">Consulting revenue stable. Client retention at 94% with expansion ops underway.</div>
        </div>

        <!-- Xome Home -->
        <div class="ms-card amber" data-entity="xome-home">
          <div class="ms-body">
            <div class="ms-header">
              <div class="ms-icon-wrap">🏠</div>
              <div class="ms-header-text">
                <div class="ms-title">Xome Home</div>
                <div class="ms-status-badge">$756K</div>
              </div>
            </div>
          </div>

          <div class="ms-viz">
            <div class="ms-gauge-wrap">
              <svg class="ms-gauge-svg" viewBox="0 0 130 130">
                <defs>
                  <linearGradient id="gauge-grad-amber" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="130" y2="130"><stop offset="0%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#f97316"/></linearGradient>
                  <filter id="gaugeGlow-amber" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <!-- Background circle -->
                <circle class="ms-gauge-bg" cx="65" cy="65" r="56"/>
                <!-- Filled circle with progress -->
                <circle class="ms-gauge-fill" cx="65" cy="65" r="56" fill="none" stroke="url(#gauge-grad-amber)" stroke-dasharray="351.9" stroke-dashoffset="112.6" filter="url(#gaugeGlow-amber)"/>
              </svg>
              <div class="ms-gauge-center">
                <div class="ms-gauge-pct">68%</div>
                <div class="ms-gauge-label">Growth</div>
              </div>
            </div>

            <div class="ms-chart-area">
              <div class="ms-chart-title">Quarterly Growth</div>
              <svg class="ms-chart-svg" viewBox="0 0 260 80" preserveAspectRatio="none">
                <!-- Grid lines -->
                <line class="ms-chart-grid-line" x1="0" y1="20" x2="260" y2="20"/>
                <line class="ms-chart-grid-line" x1="0" y1="40" x2="260" y2="40"/>
                <line class="ms-chart-grid-line" x1="0" y1="60" x2="260" y2="60"/>
                <!-- Gradient area fill with 0.4 opacity -->
                <defs>
                  <linearGradient id="chart-grad-amber" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#f97316" stop-opacity="0.4"/>
                    <stop offset="100%" stop-color="#f97316" stop-opacity="0"/>
                  </linearGradient>
                </defs>
                <path class="ms-chart-area-fill" d="M0,68 L52,62 L104,55 L156,45 L208,35 L260,22 L260,80 L0,80 Z" fill="url(#chart-grad-amber)"/>
                <!-- Bold gradient line with 3px stroke -->
                <polyline class="ms-chart-line" points="0,68 52,62 104,55 156,45" stroke="#f97316" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="1"/>
                <!-- Projected line with 3px stroke -->
                <polyline class="ms-chart-line" points="156,45 208,35 260,22" stroke="#f97316" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="6 4" opacity="0.5"/>
                <!-- Glow ring + dot at endpoint -->
                <circle class="ms-chart-dot-glow" cx="156" cy="45" r="8" fill="none" stroke="#f97316" stroke-width="2" opacity="0.3"/>
                <circle class="ms-chart-dot" cx="156" cy="45" r="4" fill="#f97316"/>
              </svg>
            </div>
          </div>

          <div class="ms-stats">
            <div class="ms-stat">
              <div class="ms-stat-label">3.2x</div>
              <div class="ms-stat-val">Multiplier</div>
            </div>
            <div class="ms-stat">
              <div class="ms-stat-label">$31K</div>
              <div class="ms-stat-val">Monthly Rev</div>
            </div>
            <div class="ms-stat">
              <div class="ms-stat-label">100%</div>
              <div class="ms-stat-val">Owned</div>
            </div>
          </div>

          <div class="mgmt-chain">
            <span class="mgmt-pill">
              <span class="mgmt-pill-name">Direct</span>
              <span class="mgmt-pill-pct">100%</span>
            </span>
          </div>

          <div class="ms-insight">Real estate tech platform scaling well. Platform efficiency improvements driving margin gains.</div>
        </div>

        <!-- CA Stays -->
        <div class="ms-card purple" data-entity="ca-stays">
          <div class="ms-body">
            <div class="ms-header">
              <div class="ms-icon-wrap">🏡</div>
              <div class="ms-header-text">
                <div class="ms-title">CA Stays</div>
                <div class="ms-status-badge">$624K</div>
              </div>
            </div>
          </div>

          <div class="ms-viz">
            <div class="ms-gauge-wrap">
              <svg class="ms-gauge-svg" viewBox="0 0 130 130">
                <defs>
                  <linearGradient id="gauge-grad-purple" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="130" y2="130"><stop offset="0%" stop-color="#a855f7"/><stop offset="100%" stop-color="#ec4899"/></linearGradient>
                  <filter id="gaugeGlow-purple" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <!-- Background circle -->
                <circle class="ms-gauge-bg" cx="65" cy="65" r="56"/>
                <!-- Filled circle with progress -->
                <circle class="ms-gauge-fill" cx="65" cy="65" r="56" fill="none" stroke="url(#gauge-grad-purple)" stroke-dasharray="351.9" stroke-dashoffset="102.0" filter="url(#gaugeGlow-purple)"/>
              </svg>
              <div class="ms-gauge-center">
                <div class="ms-gauge-pct">71%</div>
                <div class="ms-gauge-label">Growth</div>
              </div>
            </div>

            <div class="ms-chart-area">
              <div class="ms-chart-title">Quarterly Growth</div>
              <svg class="ms-chart-svg" viewBox="0 0 260 80" preserveAspectRatio="none">
                <!-- Grid lines -->
                <line class="ms-chart-grid-line" x1="0" y1="20" x2="260" y2="20"/>
                <line class="ms-chart-grid-line" x1="0" y1="40" x2="260" y2="40"/>
                <line class="ms-chart-grid-line" x1="0" y1="60" x2="260" y2="60"/>
                <!-- Gradient area fill with 0.4 opacity -->
                <defs>
                  <linearGradient id="chart-grad-purple" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#a855f7" stop-opacity="0.4"/>
                    <stop offset="100%" stop-color="#a855f7" stop-opacity="0"/>
                  </linearGradient>
                </defs>
                <path class="ms-chart-area-fill" d="M0,70 L52,58 L104,42 L156,25 L208,14 L260,6 L260,80 L0,80 Z" fill="url(#chart-grad-purple)"/>
                <!-- Bold gradient line with 3px stroke -->
                <polyline class="ms-chart-line" points="0,70 52,58 104,42 156,25" stroke="#a855f7" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="1"/>
                <!-- Projected line with 3px stroke -->
                <polyline class="ms-chart-line" points="156,25 208,14 260,6" stroke="#a855f7" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="6 4" opacity="0.5"/>
                <!-- Glow ring + dot at endpoint -->
                <circle class="ms-chart-dot-glow" cx="156" cy="25" r="8" fill="none" stroke="#a855f7" stroke-width="2" opacity="0.3"/>
                <circle class="ms-chart-dot" cx="156" cy="25" r="4" fill="#a855f7"/>
              </svg>
            </div>
          </div>

          <div class="ms-stats">
            <div class="ms-stat">
              <div class="ms-stat-label">2.9x</div>
              <div class="ms-stat-val">Multiplier</div>
            </div>
            <div class="ms-stat">
              <div class="ms-stat-label">$19K</div>
              <div class="ms-stat-val">Monthly Rev</div>
            </div>
            <div class="ms-stat">
              <div class="ms-stat-label">100%</div>
              <div class="ms-stat-val">Owned</div>
            </div>
          </div>

          <div class="mgmt-chain">
            <span class="mgmt-pill">
              <span class="mgmt-pill-name">Direct</span>
              <span class="mgmt-pill-pct">100%</span>
            </span>
          </div>

          <div class="ms-insight">Vacation rental platform performing steadily. Seasonal bookings building strong Q2 pipeline.</div>
        </div>

        <!-- BLC CA Props -->
        <div class="ms-card orange" data-entity="blc-ca">
          <div class="ms-body">
            <div class="ms-header">
              <div class="ms-icon-wrap">🏘️</div>
              <div class="ms-header-text">
                <div class="ms-title">BLC CA Props</div>
                <div class="ms-status-badge">$487K</div>
              </div>
            </div>
          </div>

          <div class="ms-viz">
            <div class="ms-gauge-wrap">
              <svg class="ms-gauge-svg" viewBox="0 0 130 130">
                <defs>
                  <linearGradient id="gauge-grad-orange-blc" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="130" y2="130"><stop offset="0%" stop-color="#f97316"/><stop offset="100%" stop-color="#ec4899"/></linearGradient>
                  <filter id="gaugeGlow-orange-blc" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <!-- Background circle -->
                <circle class="ms-gauge-bg" cx="65" cy="65" r="56"/>
                <!-- Filled circle with progress -->
                <circle class="ms-gauge-fill" cx="65" cy="65" r="56" fill="none" stroke="url(#gauge-grad-orange-blc)" stroke-dasharray="351.9" stroke-dashoffset="144.3" filter="url(#gaugeGlow-orange-blc)"/>
              </svg>
              <div class="ms-gauge-center">
                <div class="ms-gauge-pct">59%</div>
                <div class="ms-gauge-label">Growth</div>
              </div>
            </div>

            <div class="ms-chart-area">
              <div class="ms-chart-title">Quarterly Growth</div>
              <svg class="ms-chart-svg" viewBox="0 0 260 80" preserveAspectRatio="none">
                <!-- Grid lines -->
                <line class="ms-chart-grid-line" x1="0" y1="20" x2="260" y2="20"/>
                <line class="ms-chart-grid-line" x1="0" y1="40" x2="260" y2="40"/>
                <line class="ms-chart-grid-line" x1="0" y1="60" x2="260" y2="60"/>
                <!-- Gradient area fill with 0.4 opacity -->
                <defs>
                  <linearGradient id="chart-grad-orange-blc" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#f97316" stop-opacity="0.4"/>
                    <stop offset="100%" stop-color="#f97316" stop-opacity="0"/>
                  </linearGradient>
                </defs>
                <path class="ms-chart-area-fill" d="M0,55 L52,52 L104,48 L156,44 L208,38 L260,30 L260,80 L0,80 Z" fill="url(#chart-grad-orange-blc)"/>
                <!-- Bold gradient line with 3px stroke -->
                <polyline class="ms-chart-line" points="0,55 52,52 104,48 156,44" stroke="#f97316" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="1"/>
                <!-- Projected line with 3px stroke -->
                <polyline class="ms-chart-line" points="156,44 208,38 260,30" stroke="#f97316" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="6 4" opacity="0.5"/>
                <!-- Glow ring + dot at endpoint -->
                <circle class="ms-chart-dot-glow" cx="156" cy="44" r="8" fill="none" stroke="#f97316" stroke-width="2" opacity="0.3"/>
                <circle class="ms-chart-dot" cx="156" cy="44" r="4" fill="#f97316"/>
              </svg>
            </div>
          </div>

          <div class="ms-stats">
            <div class="ms-stat">
              <div class="ms-stat-label">2.6x</div>
              <div class="ms-stat-val">Multiplier</div>
            </div>
            <div class="ms-stat">
              <div class="ms-stat-label">$12K</div>
              <div class="ms-stat-val">Monthly Rev</div>
            </div>
            <div class="ms-stat">
              <div class="ms-stat-label">100%</div>
              <div class="ms-stat-val">Owned</div>
            </div>
          </div>

          <div class="mgmt-chain">
            <span class="mgmt-pill">
              <span class="mgmt-pill-name">Direct</span>
              <span class="mgmt-pill-pct">100%</span>
            </span>
          </div>

          <div class="ms-insight">Residential property portfolio stabilizing. Market conditions improving into spring selling season.</div>
        </div>

        <!-- Lincoln Hodl -->
        <div class="ms-card green" data-entity="lincoln-hodl">
          <div class="ms-body">
            <div class="ms-header">
              <div class="ms-icon-wrap">💰</div>
              <div class="ms-header-text">
                <div class="ms-title">Lincoln Hodl</div>
                <div class="ms-status-badge">$312K</div>
              </div>
            </div>
          </div>

          <div class="ms-viz">
            <div class="ms-gauge-wrap">
              <svg class="ms-gauge-svg" viewBox="0 0 130 130">
                <defs>
                  <linearGradient id="gauge-grad-green-lincoln" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="130" y2="130"><stop offset="0%" stop-color="#10b981"/><stop offset="100%" stop-color="#06b6d4"/></linearGradient>
                  <filter id="gaugeGlow-green-lincoln" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <!-- Background circle -->
                <circle class="ms-gauge-bg" cx="65" cy="65" r="56"/>
                <!-- Filled circle with progress -->
                <circle class="ms-gauge-fill" cx="65" cy="65" r="56" fill="none" stroke="url(#gauge-grad-green-lincoln)" stroke-dasharray="351.9" stroke-dashoffset="126.7" filter="url(#gaugeGlow-green-lincoln)"/>
              </svg>
              <div class="ms-gauge-center">
                <div class="ms-gauge-pct">64%</div>
                <div class="ms-gauge-label">Growth</div>
              </div>
            </div>

            <div class="ms-chart-area">
              <div class="ms-chart-title">Quarterly Growth</div>
              <svg class="ms-chart-svg" viewBox="0 0 260 80" preserveAspectRatio="none">
                <!-- Grid lines -->
                <line class="ms-chart-grid-line" x1="0" y1="20" x2="260" y2="20"/>
                <line class="ms-chart-grid-line" x1="0" y1="40" x2="260" y2="40"/>
                <line class="ms-chart-grid-line" x1="0" y1="60" x2="260" y2="60"/>
                <!-- Gradient area fill with 0.4 opacity -->
                <defs>
                  <linearGradient id="chart-grad-green-lincoln" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#10b981" stop-opacity="0.4"/>
                    <stop offset="100%" stop-color="#10b981" stop-opacity="0"/>
                  </linearGradient>
                </defs>
                <path class="ms-chart-area-fill" d="M0,72 L52,68 L104,65 L156,45 L208,18 L260,4 L260,80 L0,80 Z" fill="url(#chart-grad-green-lincoln)"/>
                <!-- Bold gradient line with 3px stroke -->
                <polyline class="ms-chart-line" points="0,72 52,68 104,65 156,45" stroke="#10b981" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="1"/>
                <!-- Projected line with 3px stroke -->
                <polyline class="ms-chart-line" points="156,45 208,18 260,4" stroke="#10b981" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="6 4" opacity="0.5"/>
                <!-- Glow ring + dot at endpoint -->
                <circle class="ms-chart-dot-glow" cx="156" cy="45" r="8" fill="none" stroke="#10b981" stroke-width="2" opacity="0.3"/>
                <circle class="ms-chart-dot" cx="156" cy="45" r="4" fill="#10b981"/>
              </svg>
            </div>
          </div>

          <div class="ms-stats">
            <div class="ms-stat">
              <div class="ms-stat-label">2.1x</div>
              <div class="ms-stat-val">Multiplier</div>
            </div>
            <div class="ms-stat">
              <div class="ms-stat-label">$2.1K</div>
              <div class="ms-stat-val">Monthly Rev</div>
            </div>
            <div class="ms-stat">
              <div class="ms-stat-label">100%</div>
              <div class="ms-stat-val">Owned</div>
            </div>
          </div>

          <div class="mgmt-chain">
            <span class="mgmt-pill">
              <span class="mgmt-pill-name">Direct</span>
              <span class="mgmt-pill-pct">100%</span>
            </span>
          </div>

          <div class="ms-insight">Startup phase with explosive growth potential. Early-stage monitoring and mentorship active.</div>
        </div>

      </div><!-- /milestone-grid -->
    </div><!-- /companies section -->

    <!-- PROPERTIES SECTION -->
    <div class="section">
      <div class="section-title">Real Estate Portfolio</div>
      <div class="section-subtitle">3 Properties · $3.836M Total Value</div>

      <!-- Property gradient defs -->
      <svg width="0" height="0" style="position:absolute">
        <defs>
          <linearGradient id="propGradOrange" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#f97316"/><stop offset="100%" stop-color="#ec4899"/>
          </linearGradient>
          <linearGradient id="propGradGreen" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#10b981"/><stop offset="100%" stop-color="#06b6d4"/>
          </linearGradient>
          <linearGradient id="propGradPurple" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#a855f7"/><stop offset="100%" stop-color="#ec4899"/>
          </linearGradient>
        </defs>
      </svg>

      <div class="properties-grid">

        <!-- ═══ PENRYN ═══ -->
        <div class="prop-card orange">
          <div class="prop-header">
            <div class="prop-header-left">
              <div class="prop-icon">🏠</div>
              <div>
                <div class="prop-name">Penryn</div>
                <div class="prop-type">Primary Residence · 100% Owned</div>
              </div>
            </div>
            <div class="prop-value-badge">$607K</div>
          </div>

          <div class="prop-viz">
            <!-- Occupancy gauge -->
            <div class="prop-occ-wrap">
              <svg class="prop-occ-svg" viewBox="0 0 120 120">
                <circle class="prop-occ-bg" cx="60" cy="60" r="50"/>
                <circle class="prop-occ-fill" cx="60" cy="60" r="50" data-pct="100"
                  stroke-dasharray="314.2 314.2" stroke-dashoffset="0"/>
              </svg>
              <div class="prop-occ-center">
                <span class="prop-occ-pct">100%</span>
                <span class="prop-occ-label">Occupied</span>
              </div>
            </div>

            <!-- Trend rows -->
            <div class="prop-trends">
              <div class="prop-trend-row">
                <span class="prop-trend-label">Occ. vs Last Month</span>
                <span class="prop-trend-val">100% <span class="prop-trend-delta up">— Same</span></span>
              </div>
              <div class="prop-trend-row">
                <span class="prop-trend-label">Occ. vs Last Year</span>
                <span class="prop-trend-val">100% <span class="prop-trend-delta up">— Same</span></span>
              </div>
              <div class="prop-trend-row">
                <span class="prop-trend-label">Revenue YTD</span>
                <span class="prop-trend-val">N/A <span class="prop-trend-delta" style="color:var(--dim);background:rgba(255,255,255,0.04);">Primary</span></span>
              </div>
            </div>
          </div>

          <div class="prop-stats">
            <div class="prop-stat">
              <span class="prop-stat-val" style="color:var(--orange);">N/A</span>
              <span class="prop-stat-label">Cash Flow YTD</span>
            </div>
            <div class="prop-stat">
              <span class="prop-stat-val">$4,217</span>
              <span class="prop-stat-label">Bank Balance</span>
            </div>
            <div class="prop-stat">
              <span class="prop-stat-val">$607K</span>
              <span class="prop-stat-label">Appraised</span>
            </div>
            <div class="prop-stat">
              <span class="prop-stat-val" style="color:var(--green);">$312K</span>
              <span class="prop-stat-label">Equity</span>
            </div>
          </div>
        </div>

        <!-- ═══ GRAEAGLE ═══ -->
        <div class="prop-card green">
          <div class="prop-header">
            <div class="prop-header-left">
              <div class="prop-icon">🏡</div>
              <div>
                <div class="prop-name">Graeagle</div>
                <div class="prop-type">Rental Property · 50% Owned</div>
              </div>
            </div>
            <div class="prop-value-badge">$685K</div>
          </div>

          <div class="prop-viz">
            <div class="prop-occ-wrap">
              <svg class="prop-occ-svg" viewBox="0 0 120 120">
                <circle class="prop-occ-bg" cx="60" cy="60" r="50"/>
                <circle class="prop-occ-fill" cx="60" cy="60" r="50" data-pct="78"
                  stroke-dasharray="245.1 314.2" stroke-dashoffset="0"/>
              </svg>
              <div class="prop-occ-center">
                <span class="prop-occ-pct">78%</span>
                <span class="prop-occ-label">Occupied</span>
              </div>
            </div>

            <div class="prop-trends">
              <div class="prop-trend-row">
                <span class="prop-trend-label">Occ. vs Last Month</span>
                <span class="prop-trend-val">72% <span class="prop-trend-arrow up">↑</span> <span class="prop-trend-delta up">+6%</span></span>
              </div>
              <div class="prop-trend-row">
                <span class="prop-trend-label">Occ. vs Last Year</span>
                <span class="prop-trend-val">81% <span class="prop-trend-arrow down">↓</span> <span class="prop-trend-delta down">-3%</span></span>
              </div>
              <div class="prop-trend-row">
                <span class="prop-trend-label">Revenue YTD</span>
                <span class="prop-trend-val">$18.4K <span class="prop-trend-arrow up">↑</span> <span class="prop-trend-delta up">+12%</span></span>
              </div>
            </div>
          </div>

          <div class="prop-stats">
            <div class="prop-stat">
              <span class="prop-stat-val" style="color:var(--green);">+$6.2K</span>
              <span class="prop-stat-label">Cash Flow YTD</span>
            </div>
            <div class="prop-stat">
              <span class="prop-stat-val">$11,340</span>
              <span class="prop-stat-label">Bank Balance</span>
            </div>
            <div class="prop-stat">
              <span class="prop-stat-val">$1.37M</span>
              <span class="prop-stat-label">Appraised</span>
            </div>
            <div class="prop-stat">
              <span class="prop-stat-val" style="color:var(--green);">$685K</span>
              <span class="prop-stat-label">Equity</span>
            </div>
          </div>
        </div>

        <!-- ═══ TRUCKEE ═══ -->
        <div class="prop-card purple">
          <div class="prop-header">
            <div class="prop-header-left">
              <div class="prop-icon">🏔️</div>
              <div>
                <div class="prop-name">Truckee</div>
                <div class="prop-type">Vacation Home · 50% Owned</div>
              </div>
            </div>
            <div class="prop-value-badge">$1.27M</div>
          </div>

          <div class="prop-viz">
            <div class="prop-occ-wrap">
              <svg class="prop-occ-svg" viewBox="0 0 120 120">
                <circle class="prop-occ-bg" cx="60" cy="60" r="50"/>
                <circle class="prop-occ-fill" cx="60" cy="60" r="50" data-pct="42"
                  stroke-dasharray="132.0 314.2" stroke-dashoffset="0"/>
              </svg>
              <div class="prop-occ-center">
                <span class="prop-occ-pct">42%</span>
                <span class="prop-occ-label">Occupied</span>
              </div>
            </div>

            <div class="prop-trends">
              <div class="prop-trend-row">
                <span class="prop-trend-label">Occ. vs Last Month</span>
                <span class="prop-trend-val">38% <span class="prop-trend-arrow up">↑</span> <span class="prop-trend-delta up">+4%</span></span>
              </div>
              <div class="prop-trend-row">
                <span class="prop-trend-label">Occ. vs Last Year</span>
                <span class="prop-trend-val">45% <span class="prop-trend-arrow down">↓</span> <span class="prop-trend-delta down">-3%</span></span>
              </div>
              <div class="prop-trend-row">
                <span class="prop-trend-label">Revenue YTD</span>
                <span class="prop-trend-val">$24.8K <span class="prop-trend-arrow up">↑</span> <span class="prop-trend-delta up">+8%</span></span>
              </div>
            </div>
          </div>

          <div class="prop-stats">
            <div class="prop-stat">
              <span class="prop-stat-val" style="color:var(--green);">+$9.1K</span>
              <span class="prop-stat-label">Cash Flow YTD</span>
            </div>
            <div class="prop-stat">
              <span class="prop-stat-val">$22,840</span>
              <span class="prop-stat-label">Bank Balance</span>
            </div>
            <div class="prop-stat">
              <span class="prop-stat-val">$2.54M</span>
              <span class="prop-stat-label">Appraised</span>
            </div>
            <div class="prop-stat">
              <span class="prop-stat-val" style="color:var(--green);">$1.27M</span>
              <span class="prop-stat-label">Equity</span>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- CASH FLOW SECTION - FLOW DASHBOARD -->
    <div class="section">
      <div class="section-title">Flow Dashboard</div>
      <div class="section-subtitle">Monthly Movement & Trends</div>

      <!-- Top 3 Metric Tiles -->
      <div class="cf-metrics-grid">
        <div class="cf-metric-tile">
          <div class="cf-metric-header">
            <div class="cf-metric-label">Total Income</div>
            <div class="cf-metric-trend up">+12%</div>
          </div>
          <div class="cf-metric-value" style="color: var(--green);">$30.2K</div>
          <svg class="cf-mini-chart" viewBox="0 0 100 40" preserveAspectRatio="none">
            <defs>
              <linearGradient id="cfGradIncome" x1="0" y1="40" x2="0" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="rgba(16,185,129,0.2)"/>
                <stop offset="100%" stop-color="rgba(16,185,129,0.6)"/>
              </linearGradient>
            </defs>
            <path class="cf-area" d="M0,30 L15,25 L30,22 L45,18 L60,15 L75,12 L90,10 L100,8 L100,40 L0,40 Z" fill="url(#cfGradIncome)"/>
            <polyline class="cf-line" points="0,30 15,25 30,22 45,18 60,15 75,12 90,10 100,8" fill="none" stroke="var(--green)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>

        <div class="cf-metric-tile">
          <div class="cf-metric-header">
            <div class="cf-metric-label">Total Expenses</div>
            <div class="cf-metric-trend down">-8%</div>
          </div>
          <div class="cf-metric-value" style="color: var(--amber);">$23.2K</div>
          <svg class="cf-mini-chart" viewBox="0 0 100 40" preserveAspectRatio="none">
            <defs>
              <linearGradient id="cfGradExpense" x1="0" y1="40" x2="0" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="rgba(217,119,6,0.2)"/>
                <stop offset="100%" stop-color="rgba(217,119,6,0.6)"/>
              </linearGradient>
            </defs>
            <path class="cf-area" d="M0,15 L15,18 L30,16 L45,22 L60,20 L75,25 L90,23 L100,32 L100,40 L0,40 Z" fill="url(#cfGradExpense)"/>
            <polyline class="cf-line" points="0,15 15,18 30,16 45,22 60,20 75,25 90,23 100,32" fill="none" stroke="var(--amber)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>

        <div class="cf-metric-tile">
          <div class="cf-metric-header">
            <div class="cf-metric-label">Net Cash Flow</div>
            <div class="cf-metric-trend up">+24%</div>
          </div>
          <div class="cf-metric-value" style="color: var(--pink);">+$7.0K</div>
          <svg class="cf-mini-chart" viewBox="0 0 100 40" preserveAspectRatio="none">
            <defs>
              <linearGradient id="cfGradNet" x1="0" y1="40" x2="0" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="rgba(236,72,153,0.2)"/>
                <stop offset="100%" stop-color="rgba(236,72,153,0.6)"/>
              </linearGradient>
            </defs>
            <path class="cf-area" d="M0,25 L15,24 L30,23 L45,20 L60,18 L75,15 L90,12 L100,10 L100,40 L0,40 Z" fill="url(#cfGradNet)"/>
            <polyline class="cf-line" points="0,25 15,24 30,23 45,20 60,18 75,15 90,12 100,10" fill="none" stroke="var(--pink)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>

        <!-- AVG MONTHLY BURN RATE -->
        <div class="cf-metric-tile" style="position:relative;">
          <div style="position:absolute; top:16px; left:50%; transform:translateX(-50%); width:70px; height:70px; border-radius:50%; background:radial-gradient(circle, rgba(239,68,68,0.15), transparent 70%); filter:blur(15px); pointer-events:none;"></div>
          <div class="cf-metric-header">
            <div class="cf-metric-label">Avg. Burn Rate</div>
            <div class="cf-metric-trend down" style="background:rgba(239,68,68,0.12); color:#ef4444;">6.2 mo.</div>
          </div>
          <div class="cf-metric-value" style="color: var(--red);">$21.8K</div>
          <div style="display:flex; gap:16px; margin-top:8px;">
            <div style="text-align:center; flex:1;">
              <div style="font-size:9px; text-transform:uppercase; letter-spacing:0.06em; color:rgba(255,255,255,0.25); font-weight:600; margin-bottom:2px;">Runway</div>
              <div style="font-family:'IBM Plex Mono',monospace; font-size:14px; font-weight:700; color:#f59e0b;">6.2 Mo.</div>
            </div>
            <div style="text-align:center; flex:1;">
              <div style="font-size:9px; text-transform:uppercase; letter-spacing:0.06em; color:rgba(255,255,255,0.25); font-weight:600; margin-bottom:2px;">3mo Trend</div>
              <div style="font-family:'IBM Plex Mono',monospace; font-size:14px; font-weight:700; color:#10b981;">-3.4%</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 12-Month Stacked Area Chart -->
      <div class="cf-chart-container">
        <div class="cf-chart-title">12-Month Cash Flow Projection</div>
        <svg class="cf-stacked-chart" viewBox="0 0 1000 300" preserveAspectRatio="none">
          <defs>
            <linearGradient id="cfStackIncome" x1="0" y1="300" x2="0" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="rgba(16,185,129,0.15)"/>
              <stop offset="100%" stop-color="rgba(16,185,129,0.4)"/>
            </linearGradient>
            <linearGradient id="cfStackExpense" x1="0" y1="300" x2="0" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="rgba(217,119,6,0.15)"/>
              <stop offset="100%" stop-color="rgba(217,119,6,0.4)"/>
            </linearGradient>
          </defs>
          <!-- Income area (bottom) -->
          <path class="cf-stack-area" d="M0,250 L83,240 L167,235 L250,225 L333,230 L417,220 L500,215 L583,225 L667,220 L750,210 L833,200 L917,190 L1000,185 L1000,300 L0,300 Z" fill="url(#cfStackIncome)" opacity="0.8"/>
          <!-- Expense area (top) -->
          <path class="cf-stack-area" d="M0,220 L83,210 L167,205 L250,195 L333,200 L417,190 L500,185 L583,195 L667,190 L750,180 L833,170 L917,160 L1000,155 L1000,250 L0,250 Z" fill="url(#cfStackExpense)" opacity="0.8"/>
          <!-- Grid lines -->
          <line x1="0" y1="100" x2="1000" y2="100" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
          <line x1="0" y1="150" x2="1000" y2="150" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
          <line x1="0" y1="200" x2="1000" y2="200" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
          <!-- Month labels -->
          <text x="42" y="285" text-anchor="middle" font-size="11" fill="rgba(255,255,255,0.5)">Jan</text>
          <text x="125" y="285" text-anchor="middle" font-size="11" fill="rgba(255,255,255,0.5)">Feb</text>
          <text x="208" y="285" text-anchor="middle" font-size="11" fill="rgba(255,255,255,0.5)">Mar</text>
          <text x="292" y="285" text-anchor="middle" font-size="11" fill="rgba(255,255,255,0.5)">Apr</text>
          <text x="375" y="285" text-anchor="middle" font-size="11" fill="rgba(255,255,255,0.5)">May</text>
          <text x="458" y="285" text-anchor="middle" font-size="11" fill="rgba(255,255,255,0.5)">Jun</text>
          <text x="542" y="285" text-anchor="middle" font-size="11" fill="rgba(255,255,255,0.5)">Jul</text>
          <text x="625" y="285" text-anchor="middle" font-size="11" fill="rgba(255,255,255,0.5)">Aug</text>
          <text x="708" y="285" text-anchor="middle" font-size="11" fill="rgba(255,255,255,0.5)">Sep</text>
          <text x="792" y="285" text-anchor="middle" font-size="11" fill="rgba(255,255,255,0.5)">Oct</text>
          <text x="875" y="285" text-anchor="middle" font-size="11" fill="rgba(255,255,255,0.5)">Nov</text>
          <text x="958" y="285" text-anchor="middle" font-size="11" fill="rgba(255,255,255,0.5)">Dec</text>
        </svg>
        <div class="cf-chart-legend">
          <div class="cf-legend-item">
            <div class="cf-legend-dot" style="background: var(--green);"></div>
            <span>Income</span>
          </div>
          <div class="cf-legend-item">
            <div class="cf-legend-dot" style="background: var(--amber);"></div>
            <span>Expenses</span>
          </div>
        </div>
      </div>

      <!-- Expense Breakdown Cards -->
      <div class="cf-expense-grid">

        <!-- OPERATIONS -->
        <div class="cf-expense-card">
          <div class="cfe-gauge-wrap">
            <svg class="cfe-gauge-svg" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="cfe-grad-ops" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stop-color="#f97316"/><stop offset="50%" stop-color="#ec4899"/><stop offset="100%" stop-color="#f97316"/>
                </linearGradient>
                <filter id="cfeGlow-ops"><feGaussianBlur stdDeviation="3" result="b"/><feFlood flood-color="#f97316" flood-opacity="0.5"/><feComposite in2="b" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              </defs>
              <circle cx="50" cy="50" r="40" class="cfe-gauge-bg"/>
              <circle cx="50" cy="50" r="40" class="cfe-gauge-fill" stroke="url(#cfe-grad-ops)" stroke-dasharray="251.3" stroke-dashoffset="88" filter="url(#cfeGlow-ops)"/>
            </svg>
            <div class="cfe-gauge-center">
              <div class="cfe-gauge-icon">⚙️</div>
              <div class="cfe-gauge-pct">65%</div>
            </div>
          </div>
          <div class="cf-expense-header">Operations</div>
          <div class="cf-expense-amount">$8.2K</div>
          <div class="cfe-stats">
            <div class="cfe-stat"><div class="cfe-stat-label">Budget</div><div class="cfe-stat-val">$12.6K</div></div>
            <div class="cfe-stat"><div class="cfe-stat-label">MoM</div><div class="cfe-stat-val down">+4.2%</div></div>
            <div class="cfe-stat"><div class="cfe-stat-label">Left</div><div class="cfe-stat-val up">$4.4K</div></div>
          </div>
        </div>

        <!-- PERSONNEL -->
        <div class="cf-expense-card">
          <div class="cfe-gauge-wrap">
            <svg class="cfe-gauge-svg" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="cfe-grad-ppl" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stop-color="#8b5cf6"/><stop offset="50%" stop-color="#ec4899"/><stop offset="100%" stop-color="#8b5cf6"/>
                </linearGradient>
                <filter id="cfeGlow-ppl"><feGaussianBlur stdDeviation="3" result="b"/><feFlood flood-color="#8b5cf6" flood-opacity="0.5"/><feComposite in2="b" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              </defs>
              <circle cx="50" cy="50" r="40" class="cfe-gauge-bg"/>
              <circle cx="50" cy="50" r="40" class="cfe-gauge-fill" stroke="url(#cfe-grad-ppl)" stroke-dasharray="251.3" stroke-dashoffset="100.5" filter="url(#cfeGlow-ppl)"/>
            </svg>
            <div class="cfe-gauge-center">
              <div class="cfe-gauge-icon">👥</div>
              <div class="cfe-gauge-pct">60%</div>
            </div>
          </div>
          <div class="cf-expense-header">Personnel</div>
          <div class="cf-expense-amount">$7.5K</div>
          <div class="cfe-stats">
            <div class="cfe-stat"><div class="cfe-stat-label">Budget</div><div class="cfe-stat-val">$12.5K</div></div>
            <div class="cfe-stat"><div class="cfe-stat-label">MoM</div><div class="cfe-stat-val up">-1.8%</div></div>
            <div class="cfe-stat"><div class="cfe-stat-label">Left</div><div class="cfe-stat-val up">$5.0K</div></div>
          </div>
        </div>

        <!-- INFRASTRUCTURE -->
        <div class="cf-expense-card">
          <div class="cfe-gauge-wrap">
            <svg class="cfe-gauge-svg" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="cfe-grad-inf" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stop-color="#10b981"/><stop offset="50%" stop-color="#06b6d4"/><stop offset="100%" stop-color="#10b981"/>
                </linearGradient>
                <filter id="cfeGlow-inf"><feGaussianBlur stdDeviation="3" result="b"/><feFlood flood-color="#10b981" flood-opacity="0.5"/><feComposite in2="b" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              </defs>
              <circle cx="50" cy="50" r="40" class="cfe-gauge-bg"/>
              <circle cx="50" cy="50" r="40" class="cfe-gauge-fill" stroke="url(#cfe-grad-inf)" stroke-dasharray="251.3" stroke-dashoffset="168.4" filter="url(#cfeGlow-inf)"/>
            </svg>
            <div class="cfe-gauge-center">
              <div class="cfe-gauge-icon">🖥️</div>
              <div class="cfe-gauge-pct">33%</div>
            </div>
          </div>
          <div class="cf-expense-header">Infrastructure</div>
          <div class="cf-expense-amount">$4.1K</div>
          <div class="cfe-stats">
            <div class="cfe-stat"><div class="cfe-stat-label">Budget</div><div class="cfe-stat-val">$12.4K</div></div>
            <div class="cfe-stat"><div class="cfe-stat-label">MoM</div><div class="cfe-stat-val up">-6.1%</div></div>
            <div class="cfe-stat"><div class="cfe-stat-label">Left</div><div class="cfe-stat-val up">$8.3K</div></div>
          </div>
        </div>

        <!-- MARKETING -->
        <div class="cf-expense-card">
          <div class="cfe-gauge-wrap">
            <svg class="cfe-gauge-svg" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="cfe-grad-mkt" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stop-color="#f59e0b"/><stop offset="50%" stop-color="#f97316"/><stop offset="100%" stop-color="#f59e0b"/>
                </linearGradient>
                <filter id="cfeGlow-mkt"><feGaussianBlur stdDeviation="3" result="b"/><feFlood flood-color="#f59e0b" flood-opacity="0.5"/><feComposite in2="b" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              </defs>
              <circle cx="50" cy="50" r="40" class="cfe-gauge-bg"/>
              <circle cx="50" cy="50" r="40" class="cfe-gauge-fill" stroke="url(#cfe-grad-mkt)" stroke-dasharray="251.3" stroke-dashoffset="183.4" filter="url(#cfeGlow-mkt)"/>
            </svg>
            <div class="cfe-gauge-center">
              <div class="cfe-gauge-icon">📣</div>
              <div class="cfe-gauge-pct">27%</div>
            </div>
          </div>
          <div class="cf-expense-header">Marketing</div>
          <div class="cf-expense-amount">$3.4K</div>
          <div class="cfe-stats">
            <div class="cfe-stat"><div class="cfe-stat-label">Budget</div><div class="cfe-stat-val">$12.6K</div></div>
            <div class="cfe-stat"><div class="cfe-stat-label">MoM</div><div class="cfe-stat-val warn">+12%</div></div>
            <div class="cfe-stat"><div class="cfe-stat-label">Left</div><div class="cfe-stat-val up">$9.2K</div></div>
          </div>
        </div>

      </div>
    </div>

    <!-- AI OPERATIONS INTELLIGENCE -->
    <div class="section">
      <div class="section-title">AI Operations Intelligence</div>
      <div class="section-subtitle">Cost Tracking · Model Performance · Agent Efficiency</div>

      <!-- 4 AI KPI Cards -->
      <div class="ai-ops-grid">

        <!-- AI SPEND -->
        <div class="ai-kpi-card ai-purple">
          <div class="ai-gauge-wrap">
            <svg class="ai-gauge-svg" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="aiGrad-spend" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stop-color="#8b5cf6"/><stop offset="100%" stop-color="#a78bfa"/>
                </linearGradient>
                <filter id="aiGlow-spend"><feGaussianBlur stdDeviation="3" result="b"/><feFlood flood-color="#8b5cf6" flood-opacity="0.5"/><feComposite in2="b" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              </defs>
              <circle cx="50" cy="50" r="34" class="ai-gauge-bg"/>
              <circle cx="50" cy="50" r="34" class="ai-gauge-fill" stroke="url(#aiGrad-spend)" stroke-dasharray="213.6" stroke-dashoffset="113.2" filter="url(#aiGlow-spend)"/>
            </svg>
            <div class="ai-gauge-center"><div class="ai-gauge-icon">🤖</div></div>
          </div>
          <div class="ai-kpi-info">
            <div class="ai-kpi-label">AI Spend</div>
            <div class="ai-kpi-value" style="background:linear-gradient(135deg,#8b5cf6,#c4b5fd);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">$2,367</div>
            <div class="ai-kpi-sub">
              <div class="ai-kpi-sub-item"><div class="ai-kpi-sub-label">Daily Avg</div><div class="ai-kpi-sub-val" style="color:#a78bfa;">$78.89</div></div>
              <div class="ai-kpi-sub-item"><div class="ai-kpi-sub-label">Budget</div><div class="ai-kpi-sub-val" style="color:#f59e0b;">$5,000</div></div>
            </div>
          </div>
        </div>

        <!-- HUMAN EQUIVALENT -->
        <div class="ai-kpi-card ai-green">
          <div class="ai-gauge-wrap">
            <svg class="ai-gauge-svg" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="aiGrad-human" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stop-color="#10b981"/><stop offset="100%" stop-color="#34d399"/>
                </linearGradient>
                <filter id="aiGlow-human"><feGaussianBlur stdDeviation="3" result="b"/><feFlood flood-color="#10b981" flood-opacity="0.5"/><feComposite in2="b" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              </defs>
              <circle cx="50" cy="50" r="34" class="ai-gauge-bg"/>
              <circle cx="50" cy="50" r="34" class="ai-gauge-fill" stroke="url(#aiGrad-human)" stroke-dasharray="213.6" stroke-dashoffset="42.7" filter="url(#aiGlow-human)"/>
            </svg>
            <div class="ai-gauge-center"><div class="ai-gauge-icon">👤</div></div>
          </div>
          <div class="ai-kpi-info">
            <div class="ai-kpi-label">Human Equivalent</div>
            <div class="ai-kpi-value" style="background:linear-gradient(135deg,#10b981,#6ee7b7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">$18,400</div>
            <div class="ai-kpi-sub">
              <div class="ai-kpi-sub-item"><div class="ai-kpi-sub-label">Hours Saved</div><div class="ai-kpi-sub-val" style="color:#34d399;">312h</div></div>
              <div class="ai-kpi-sub-item"><div class="ai-kpi-sub-label">FTE Equiv</div><div class="ai-kpi-sub-val" style="color:#6ee7b7;">1.8</div></div>
            </div>
          </div>
        </div>

        <!-- ROI -->
        <div class="ai-kpi-card ai-amber">
          <div class="ai-gauge-wrap">
            <svg class="ai-gauge-svg" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="aiGrad-roi" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#fbbf24"/>
                </linearGradient>
                <filter id="aiGlow-roi"><feGaussianBlur stdDeviation="3" result="b"/><feFlood flood-color="#f59e0b" flood-opacity="0.5"/><feComposite in2="b" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              </defs>
              <circle cx="50" cy="50" r="34" class="ai-gauge-bg"/>
              <circle cx="50" cy="50" r="34" class="ai-gauge-fill" stroke="url(#aiGrad-roi)" stroke-dasharray="213.6" stroke-dashoffset="21.4" filter="url(#aiGlow-roi)"/>
            </svg>
            <div class="ai-gauge-center"><div class="ai-gauge-icon">📈</div></div>
          </div>
          <div class="ai-kpi-info">
            <div class="ai-kpi-label">AI Return on Investment</div>
            <div class="ai-kpi-value" style="background:linear-gradient(135deg,#f59e0b,#fde68a);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">677%</div>
            <div class="ai-kpi-sub">
              <div class="ai-kpi-sub-item"><div class="ai-kpi-sub-label">Savings</div><div class="ai-kpi-sub-val" style="color:#fbbf24;">$16,033</div></div>
              <div class="ai-kpi-sub-item"><div class="ai-kpi-sub-label">vs Last Mo</div><div class="ai-kpi-sub-val" style="color:#10b981;">+12%</div></div>
            </div>
          </div>
        </div>

        <!-- BUDGET USED -->
        <div class="ai-kpi-card ai-red">
          <div class="ai-gauge-wrap">
            <svg class="ai-gauge-svg" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="aiGrad-budget" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stop-color="#ef4444"/><stop offset="100%" stop-color="#f87171"/>
                </linearGradient>
                <filter id="aiGlow-budget"><feGaussianBlur stdDeviation="3" result="b"/><feFlood flood-color="#ef4444" flood-opacity="0.5"/><feComposite in2="b" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              </defs>
              <circle cx="50" cy="50" r="34" class="ai-gauge-bg"/>
              <circle cx="50" cy="50" r="34" class="ai-gauge-fill" stroke="url(#aiGrad-budget)" stroke-dasharray="213.6" stroke-dashoffset="113.2" filter="url(#aiGlow-budget)"/>
            </svg>
            <div class="ai-gauge-center"><div class="ai-gauge-icon">🎯</div></div>
          </div>
          <div class="ai-kpi-info">
            <div class="ai-kpi-label">Budget Used</div>
            <div class="ai-kpi-value" style="background:linear-gradient(135deg,#ef4444,#fca5a5);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">47%</div>
            <div class="ai-kpi-sub">
              <div class="ai-kpi-sub-item"><div class="ai-kpi-sub-label">Remaining</div><div class="ai-kpi-sub-val" style="color:#10b981;">$2,633</div></div>
              <div class="ai-kpi-sub-item"><div class="ai-kpi-sub-label">Days Left</div><div class="ai-kpi-sub-val" style="color:#f59e0b;">17</div></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Model Costs + Agent Costs Two Column -->
      <div class="ai-two-col">
        <!-- Cost by Model -->
        <div class="mc-card">
          <div class="ai-col-title">Cost by Model</div>
          <div class="ai-model-grid" style="grid-template-columns: repeat(3, 1fr);">
            <div class="ai-model-card">
              <div class="ai-model-gauge">
                <svg viewBox="0 0 100 100">
                  <defs><linearGradient id="mg1" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#8b5cf6"/><stop offset="100%" stop-color="#c4b5fd"/></linearGradient></defs>
                  <circle cx="50" cy="50" r="32" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="5"/>
                  <circle cx="50" cy="50" r="32" fill="none" stroke="url(#mg1)" stroke-width="5" stroke-linecap="round" stroke-dasharray="201.1" stroke-dashoffset="60.3" style="transform:rotate(-90deg);transform-origin:center;"/>
                </svg>
                <div class="gauge-center" style="color:#a78bfa;">70%</div>
              </div>
              <div class="ai-model-name">GPT-4o</div>
              <div class="ai-model-cost" style="background:linear-gradient(135deg,#8b5cf6,#c4b5fd);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">$1,247</div>
              <div class="ai-model-calls">4,821 calls</div>
            </div>
            <div class="ai-model-card">
              <div class="ai-model-gauge">
                <svg viewBox="0 0 100 100">
                  <defs><linearGradient id="mg2" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#10b981"/><stop offset="100%" stop-color="#6ee7b7"/></linearGradient></defs>
                  <circle cx="50" cy="50" r="32" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="5"/>
                  <circle cx="50" cy="50" r="32" fill="none" stroke="url(#mg2)" stroke-width="5" stroke-linecap="round" stroke-dasharray="201.1" stroke-dashoffset="140.8" style="transform:rotate(-90deg);transform-origin:center;"/>
                </svg>
                <div class="gauge-center" style="color:#34d399;">30%</div>
              </div>
              <div class="ai-model-name">Claude Sonnet</div>
              <div class="ai-model-cost" style="background:linear-gradient(135deg,#10b981,#6ee7b7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">$614</div>
              <div class="ai-model-calls">2,105 calls</div>
            </div>
            <div class="ai-model-card">
              <div class="ai-model-gauge">
                <svg viewBox="0 0 100 100">
                  <defs><linearGradient id="mg3" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#f97316"/><stop offset="100%" stop-color="#fb923c"/></linearGradient></defs>
                  <circle cx="50" cy="50" r="32" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="5"/>
                  <circle cx="50" cy="50" r="32" fill="none" stroke="url(#mg3)" stroke-width="5" stroke-linecap="round" stroke-dasharray="201.1" stroke-dashoffset="161" style="transform:rotate(-90deg);transform-origin:center;"/>
                </svg>
                <div class="gauge-center" style="color:#fb923c;">20%</div>
              </div>
              <div class="ai-model-name">GPT-4o Mini</div>
              <div class="ai-model-cost" style="background:linear-gradient(135deg,#f97316,#fb923c);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">$312</div>
              <div class="ai-model-calls">8,940 calls</div>
            </div>
            <div class="ai-model-card">
              <div class="ai-model-gauge">
                <svg viewBox="0 0 100 100">
                  <defs><linearGradient id="mg4" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#ec4899"/><stop offset="100%" stop-color="#f9a8d4"/></linearGradient></defs>
                  <circle cx="50" cy="50" r="32" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="5"/>
                  <circle cx="50" cy="50" r="32" fill="none" stroke="url(#mg4)" stroke-width="5" stroke-linecap="round" stroke-dasharray="201.1" stroke-dashoffset="175" style="transform:rotate(-90deg);transform-origin:center;"/>
                </svg>
                <div class="gauge-center" style="color:#f9a8d4;">13%</div>
              </div>
              <div class="ai-model-name">Claude Haiku</div>
              <div class="ai-model-cost" style="background:linear-gradient(135deg,#ec4899,#f9a8d4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">$142</div>
              <div class="ai-model-calls">6,312 calls</div>
            </div>
            <div class="ai-model-card">
              <div class="ai-model-gauge">
                <svg viewBox="0 0 100 100">
                  <defs><linearGradient id="mg5" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#fde68a"/></linearGradient></defs>
                  <circle cx="50" cy="50" r="32" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="5"/>
                  <circle cx="50" cy="50" r="32" fill="none" stroke="url(#mg5)" stroke-width="5" stroke-linecap="round" stroke-dasharray="201.1" stroke-dashoffset="185" style="transform:rotate(-90deg);transform-origin:center;"/>
                </svg>
                <div class="gauge-center" style="color:#fde68a;">8%</div>
              </div>
              <div class="ai-model-name">GPT-5.4</div>
              <div class="ai-model-cost" style="background:linear-gradient(135deg,#f59e0b,#fde68a);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">$52</div>
              <div class="ai-model-calls">189 calls</div>
            </div>
          </div>
        </div>

        <!-- Cost by Agent -->
        <div class="mc-card">
          <div class="ai-col-title">Cost by Agent</div>
          <div class="ai-agent-list">
            <div class="ai-agent-row">
              <div class="ai-agent-name">Bookkeeper</div>
              <div class="ai-agent-bar-wrap"><div class="ai-agent-bar" style="width:85%; background:linear-gradient(90deg,#8b5cf6,#a78bfa);"></div></div>
              <div class="ai-agent-val">$1,012</div>
            </div>
            <div class="ai-agent-row">
              <div class="ai-agent-name">Fin Researcher</div>
              <div class="ai-agent-bar-wrap"><div class="ai-agent-bar" style="width:62%; background:linear-gradient(90deg,#10b981,#34d399);"></div></div>
              <div class="ai-agent-val">$438</div>
            </div>
            <div class="ai-agent-row">
              <div class="ai-agent-name">Crypto Analyst</div>
              <div class="ai-agent-bar-wrap"><div class="ai-agent-bar" style="width:45%; background:linear-gradient(90deg,#f97316,#fb923c);"></div></div>
              <div class="ai-agent-val">$312</div>
            </div>
            <div class="ai-agent-row">
              <div class="ai-agent-name">Tax Advisor</div>
              <div class="ai-agent-bar-wrap"><div class="ai-agent-bar" style="width:38%; background:linear-gradient(90deg,#ec4899,#f9a8d4);"></div></div>
              <div class="ai-agent-val">$245</div>
            </div>
            <div class="ai-agent-row">
              <div class="ai-agent-name">Validation</div>
              <div class="ai-agent-bar-wrap"><div class="ai-agent-bar" style="width:22%; background:linear-gradient(90deg,#f59e0b,#fbbf24);"></div></div>
              <div class="ai-agent-val">$168</div>
            </div>
            <div class="ai-agent-row">
              <div class="ai-agent-name">Stock Analyst</div>
              <div class="ai-agent-bar-wrap"><div class="ai-agent-bar" style="width:15%; background:linear-gradient(90deg,#06b6d4,#67e8f9);"></div></div>
              <div class="ai-agent-val">$112</div>
            </div>
            <div class="ai-agent-row">
              <div class="ai-agent-name">Herald</div>
              <div class="ai-agent-bar-wrap"><div class="ai-agent-bar" style="width:8%; background:linear-gradient(90deg,#84cc16,#bef264);"></div></div>
              <div class="ai-agent-val">$52</div>
            </div>
            <div class="ai-agent-row">
              <div class="ai-agent-name">Scribe</div>
              <div class="ai-agent-bar-wrap"><div class="ai-agent-bar" style="width:4%; background:linear-gradient(90deg,#a855f7,#d8b4fe);"></div></div>
              <div class="ai-agent-val">$28</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- SPENDING & TRANSACTIONS INTELLIGENCE -->
    <div class="section">
      <div class="section-title">Spending Intelligence</div>
      <div class="section-subtitle">Category Analysis · Recent Activity</div>

      <div class="spend-two-col">
        <!-- Spending by Category -->
        <div class="mc-card">
          <div class="ai-col-title">Spending by Category</div>
          <div class="spend-cat-list">
            <div class="spend-cat-row">
              <div class="spend-cat-icon" style="background:rgba(139,92,246,0.15);">🏢</div>
              <div class="spend-cat-info">
                <div class="spend-cat-top"><span class="spend-cat-name">Operations & Services</span><span class="spend-cat-amt">$4,821</span></div>
                <div class="spend-cat-bar-bg"><div class="spend-cat-bar-fill" style="width:100%; background:linear-gradient(90deg,#8b5cf6,#a78bfa);"></div></div>
              </div>
            </div>
            <div class="spend-cat-row">
              <div class="spend-cat-icon" style="background:rgba(16,185,129,0.15);">🛒</div>
              <div class="spend-cat-info">
                <div class="spend-cat-top"><span class="spend-cat-name">General Merchandise</span><span class="spend-cat-amt">$3,240</span></div>
                <div class="spend-cat-bar-bg"><div class="spend-cat-bar-fill" style="width:67%; background:linear-gradient(90deg,#10b981,#34d399);"></div></div>
              </div>
            </div>
            <div class="spend-cat-row">
              <div class="spend-cat-icon" style="background:rgba(249,115,22,0.15);">🚗</div>
              <div class="spend-cat-info">
                <div class="spend-cat-top"><span class="spend-cat-name">Transportation</span><span class="spend-cat-amt">$1,890</span></div>
                <div class="spend-cat-bar-bg"><div class="spend-cat-bar-fill" style="width:39%; background:linear-gradient(90deg,#f97316,#fb923c);"></div></div>
              </div>
            </div>
            <div class="spend-cat-row">
              <div class="spend-cat-icon" style="background:rgba(236,72,153,0.15);">🍔</div>
              <div class="spend-cat-info">
                <div class="spend-cat-top"><span class="spend-cat-name">Food & Dining</span><span class="spend-cat-amt">$1,456</span></div>
                <div class="spend-cat-bar-bg"><div class="spend-cat-bar-fill" style="width:30%; background:linear-gradient(90deg,#ec4899,#f9a8d4);"></div></div>
              </div>
            </div>
            <div class="spend-cat-row">
              <div class="spend-cat-icon" style="background:rgba(245,158,11,0.15);">💅</div>
              <div class="spend-cat-info">
                <div class="spend-cat-top"><span class="spend-cat-name">Personal Care</span><span class="spend-cat-amt">$1,102</span></div>
                <div class="spend-cat-bar-bg"><div class="spend-cat-bar-fill" style="width:23%; background:linear-gradient(90deg,#f59e0b,#fbbf24);"></div></div>
              </div>
            </div>
            <div class="spend-cat-row">
              <div class="spend-cat-icon" style="background:rgba(6,182,212,0.15);">🎬</div>
              <div class="spend-cat-info">
                <div class="spend-cat-top"><span class="spend-cat-name">Entertainment</span><span class="spend-cat-amt">$842</span></div>
                <div class="spend-cat-bar-bg"><div class="spend-cat-bar-fill" style="width:17%; background:linear-gradient(90deg,#06b6d4,#67e8f9);"></div></div>
              </div>
            </div>
            <div class="spend-cat-row">
              <div class="spend-cat-icon" style="background:rgba(239,68,68,0.15);">🏦</div>
              <div class="spend-cat-info">
                <div class="spend-cat-top"><span class="spend-cat-name">Bank Fees & Interest</span><span class="spend-cat-amt">$710</span></div>
                <div class="spend-cat-bar-bg"><div class="spend-cat-bar-fill" style="width:15%; background:linear-gradient(90deg,#ef4444,#f87171);"></div></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Transactions -->
        <div class="mc-card">
          <div class="ai-col-title">Recent Transactions</div>
___TXN_LIST___
        </div>
      </div>
    </div>

    <!-- CREDIT & DEBT OVERVIEW -->
    <div class="section">
      <div class="section-title">Credit & Debt Overview</div>
      <div class="section-subtitle">Utilization · Balances · Health Score</div>

      <div class="debt-overview-grid">
        <!-- Total Credit Utilization -->
        <div class="debt-card">
          <div class="debt-gauge-wrap">
            <svg viewBox="0 0 100 100">
              <defs>
                <linearGradient id="debtGrad1" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stop-color="#ef4444"/><stop offset="100%" stop-color="#f97316"/>
                </linearGradient>
                <filter id="debtGlow1"><feGaussianBlur stdDeviation="3" result="b"/><feFlood flood-color="#ef4444" flood-opacity="0.5"/><feComposite in2="b" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              </defs>
              <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="6"/>
              <circle cx="50" cy="50" r="40" fill="none" stroke="url(#debtGrad1)" stroke-width="6" stroke-linecap="round" stroke-dasharray="251.3" stroke-dashoffset="68.9" filter="url(#debtGlow1)" style="transform:rotate(-90deg);transform-origin:center;"/>
            </svg>
            <div class="debt-gauge-center">
              <div class="debt-gauge-pct" style="background:linear-gradient(135deg,#ef4444,#f97316);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">127%</div>
              <div class="debt-gauge-label-sm">utilized</div>
            </div>
          </div>
          <div class="debt-card-title">Credit Utilization</div>
          <div class="debt-card-value" style="background:linear-gradient(135deg,#ef4444,#fca5a5);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">$137.7K</div>
          <div class="debt-card-sub">
            <div class="debt-sub-item"><div class="debt-sub-label">Limit</div><div class="debt-sub-val" style="color:#f59e0b;">$108.4K</div></div>
            <div class="debt-sub-item"><div class="debt-sub-label">Over Limit</div><div class="debt-sub-val" style="color:#ef4444;">$29.3K</div></div>
          </div>
        </div>

        <!-- Debt-to-Asset Ratio -->
        <div class="debt-card">
          <div class="debt-gauge-wrap">
            <svg viewBox="0 0 100 100">
              <defs>
                <linearGradient id="debtGrad2" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#10b981"/>
                </linearGradient>
                <filter id="debtGlow2"><feGaussianBlur stdDeviation="3" result="b"/><feFlood flood-color="#f59e0b" flood-opacity="0.5"/><feComposite in2="b" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              </defs>
              <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="6"/>
              <circle cx="50" cy="50" r="40" fill="none" stroke="url(#debtGrad2)" stroke-width="6" stroke-linecap="round" stroke-dasharray="251.3" stroke-dashoffset="238.7" filter="url(#debtGlow2)" style="transform:rotate(-90deg);transform-origin:center;"/>
            </svg>
            <div class="debt-gauge-center">
              <div class="debt-gauge-pct" style="background:linear-gradient(135deg,#10b981,#34d399);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">5.1%</div>
              <div class="debt-gauge-label-sm">ratio</div>
            </div>
          </div>
          <div class="debt-card-title">Debt-to-Asset Ratio</div>
          <div class="debt-card-value" style="background:linear-gradient(135deg,#10b981,#6ee7b7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">$137.7K</div>
          <div class="debt-card-sub">
            <div class="debt-sub-item"><div class="debt-sub-label">Total Assets</div><div class="debt-sub-val" style="color:#10b981;">$2.71M</div></div>
            <div class="debt-sub-item"><div class="debt-sub-label">Health</div><div class="debt-sub-val" style="color:#10b981;">Excellent</div></div>
          </div>
        </div>

        <!-- Monthly Minimum Payments -->
        <div class="debt-card">
          <div class="debt-gauge-wrap">
            <svg viewBox="0 0 100 100">
              <defs>
                <linearGradient id="debtGrad3" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stop-color="#8b5cf6"/><stop offset="100%" stop-color="#ec4899"/>
                </linearGradient>
                <filter id="debtGlow3"><feGaussianBlur stdDeviation="3" result="b"/><feFlood flood-color="#8b5cf6" flood-opacity="0.5"/><feComposite in2="b" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              </defs>
              <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="6"/>
              <circle cx="50" cy="50" r="40" fill="none" stroke="url(#debtGrad3)" stroke-width="6" stroke-linecap="round" stroke-dasharray="251.3" stroke-dashoffset="175.9" filter="url(#debtGlow3)" style="transform:rotate(-90deg);transform-origin:center;"/>
            </svg>
            <div class="debt-gauge-center">
              <div class="debt-gauge-pct" style="background:linear-gradient(135deg,#8b5cf6,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">30%</div>
              <div class="debt-gauge-label-sm">of income</div>
            </div>
          </div>
          <div class="debt-card-title">Monthly Minimums</div>
          <div class="debt-card-value" style="background:linear-gradient(135deg,#8b5cf6,#c4b5fd);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">$4,120</div>
          <div class="debt-card-sub">
            <div class="debt-sub-item"><div class="debt-sub-label">Cards</div><div class="debt-sub-val" style="color:#a78bfa;">3 active</div></div>
            <div class="debt-sub-item"><div class="debt-sub-label">Payoff Est</div><div class="debt-sub-val" style="color:#f59e0b;">14 mo.</div></div>
          </div>
        </div>
      </div>
    </div>

    <!-- LINKED ACCOUNTS SECTION -->
    <div class="section">
      <div class="section-title">Connected Accounts</div>
      <div class="section-subtitle">18 Accounts · Fully Synced</div>
      
___ACCOUNTS_GRID___
    </div>

  <script>
    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', () => {
      initHeroCanvas();
      initWaterfallCanvas();
      animateNetWorth();
      animateXPCounter();

      // Wire entity cards → company detail dashboard
      document.querySelectorAll('.ms-card[data-entity]').forEach(card => {
        card.addEventListener('click', () => {
          const entity = card.getAttribute('data-entity');
          window.location.href = 'company-dashboard-template.html?entity=' + entity;
        });
      });
    });

    // ═══ FINANCIAL NETWORK — Hero Canvas Animation ═══
    (function() {
      var canvas = document.getElementById('heroCanvas');
      if (!canvas) return;
      var ctx = canvas.getContext('2d'), w, h, dpr, time = 0;

      // Network nodes representing financial entities
      var nodes = [
        { label:'CABO TROPIC', x:0.15, y:0.3, size:8, color:[249,115,22], value:'$1.05M' },
        { label:'CULBERTSON', x:0.35, y:0.65, size:7, color:[16,185,129], value:'$836K' },
        { label:'XOME HOME', x:0.55, y:0.25, size:9, color:[139,92,246], value:'$812K' },
        { label:'CA STAYS', x:0.75, y:0.55, size:6, color:[236,72,153], value:'$245K' },
        { label:'BLC CA', x:0.85, y:0.3, size:5, color:[245,158,11], value:'$685K' },
        { label:'REAL ESTATE', x:0.25, y:0.5, size:10, color:[99,102,241], value:'$2.2M' },
        { label:'LIQUID', x:0.65, y:0.7, size:5, color:[52,211,153], value:'$345K' }
      ];

      // Connections between nodes
      var connections = [
        [0,1],[0,2],[1,5],[2,3],[2,4],[3,6],[4,5],[5,6],[0,5],[1,6],[2,6],[3,4]
      ];

      // Flowing particles on connections
      var particles = [];
      for (var i = 0; i < 80; i++) {
        var connIdx = Math.floor(Math.random() * connections.length);
        particles.push({
          conn: connIdx,
          t: Math.random(),
          speed: 0.002 + Math.random() * 0.004,
          size: 1 + Math.random() * 2,
          alpha: 0.3 + Math.random() * 0.5
        });
      }

      // Background floating symbols
      var symbols = [];
      var symbolChars = ['$','₿','€','¥','£','%','↗','◆'];
      for (var i = 0; i < 40; i++) {
        symbols.push({
          char: symbolChars[Math.floor(Math.random() * symbolChars.length)],
          x: Math.random(),
          y: Math.random(),
          speed: 0.0002 + Math.random() * 0.0005,
          size: 8 + Math.random() * 14,
          alpha: 0.02 + Math.random() * 0.04,
          phase: Math.random() * Math.PI * 2
        });
      }

      function resize() {
        var rect = canvas.parentElement.getBoundingClientRect();
        dpr = window.devicePixelRatio || 1;
        w = rect.width; h = rect.height;
        canvas.width = w * dpr; canvas.height = h * dpr;
        canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      resize(); window.addEventListener('resize', resize);

      function draw() {
        time += 0.016; ctx.clearRect(0, 0, w, h);

        // Subtle grid
        ctx.strokeStyle = 'rgba(249,115,22,0.015)'; ctx.lineWidth = 0.5;
        for (var x = 0; x < w; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
        for (var y = 0; y < h; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

        // Floating currency symbols
        symbols.forEach(function(s) {
          s.y -= s.speed;
          if (s.y < -0.05) { s.y = 1.05; s.x = Math.random(); }
          var pulse = 0.5 + 0.5 * Math.sin(time * 0.5 + s.phase);
          ctx.font = s.size + "px 'IBM Plex Mono', monospace";
          ctx.fillStyle = 'rgba(249,115,22,' + (s.alpha * pulse) + ')';
          ctx.textAlign = 'center';
          ctx.fillText(s.char, s.x * w, s.y * h);
        });

        // Draw connections with flowing gradient
        connections.forEach(function(c, ci) {
          var n1 = nodes[c[0]], n2 = nodes[c[1]];
          var x1 = n1.x * w + Math.sin(time * 0.3 + ci) * 3;
          var y1 = n1.y * h + Math.cos(time * 0.4 + ci) * 3;
          var x2 = n2.x * w + Math.sin(time * 0.3 + ci + 2) * 3;
          var y2 = n2.y * h + Math.cos(time * 0.4 + ci + 2) * 3;
          var pulse = 0.3 + 0.2 * Math.sin(time * 0.8 + ci * 0.5);
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
          ctx.strokeStyle = 'rgba(249,115,22,' + (0.04 + pulse * 0.03) + ')';
          ctx.lineWidth = 1; ctx.stroke();
        });

        // Draw flowing particles along connections
        particles.forEach(function(p) {
          p.t += p.speed;
          if (p.t > 1) { p.t = 0; p.conn = Math.floor(Math.random() * connections.length); }
          var c = connections[p.conn], n1 = nodes[c[0]], n2 = nodes[c[1]];
          var x1 = n1.x * w + Math.sin(time * 0.3 + p.conn) * 3;
          var y1 = n1.y * h + Math.cos(time * 0.4 + p.conn) * 3;
          var x2 = n2.x * w + Math.sin(time * 0.3 + p.conn + 2) * 3;
          var y2 = n2.y * h + Math.cos(time * 0.4 + p.conn + 2) * 3;
          var px = x1 + (x2 - x1) * p.t, py = y1 + (y2 - y1) * p.t;
          // Color interpolation between connected nodes
          var cr = n1.color[0] + (n2.color[0] - n1.color[0]) * p.t;
          var cg = n1.color[1] + (n2.color[1] - n1.color[1]) * p.t;
          var cb = n1.color[2] + (n2.color[2] - n1.color[2]) * p.t;
          // Glow
          var glow = ctx.createRadialGradient(px, py, 0, px, py, p.size * 4);
          glow.addColorStop(0, 'rgba(' + Math.round(cr) + ',' + Math.round(cg) + ',' + Math.round(cb) + ',' + (p.alpha * 0.3) + ')');
          glow.addColorStop(1, 'transparent');
          ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(px, py, p.size * 4, 0, Math.PI*2); ctx.fill();
          // Core
          ctx.beginPath(); ctx.arc(px, py, p.size, 0, Math.PI*2);
          ctx.fillStyle = 'rgba(' + Math.round(cr) + ',' + Math.round(cg) + ',' + Math.round(cb) + ',' + p.alpha + ')';
          ctx.fill();
        });

        // Draw nodes
        nodes.forEach(function(n, ni) {
          var nx = n.x * w + Math.sin(time * 0.3 + ni) * 3;
          var ny = n.y * h + Math.cos(time * 0.4 + ni) * 3;
          var pulse = 0.6 + 0.4 * Math.sin(time * 1.2 + ni * 0.7);
          var cr = n.color[0], cg = n.color[1], cb = n.color[2];

          // Outer glow
          var glow = ctx.createRadialGradient(nx, ny, 0, nx, ny, n.size * 6);
          glow.addColorStop(0, 'rgba(' + cr + ',' + cg + ',' + cb + ',' + (0.08 * pulse) + ')');
          glow.addColorStop(1, 'transparent');
          ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(nx, ny, n.size * 6, 0, Math.PI*2); ctx.fill();

          // Ring
          ctx.beginPath(); ctx.arc(nx, ny, n.size + 4, 0, Math.PI*2);
          ctx.strokeStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + (0.2 + 0.15 * pulse) + ')';
          ctx.lineWidth = 1.5; ctx.stroke();

          // Pulsing outer ring
          var ringR = n.size + 8 + pulse * 6;
          ctx.beginPath(); ctx.arc(nx, ny, ringR, 0, Math.PI*2);
          ctx.strokeStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + (0.05 * (1 - pulse)) + ')';
          ctx.lineWidth = 1; ctx.stroke();

          // Core
          var core = ctx.createRadialGradient(nx, ny, 0, nx, ny, n.size);
          core.addColorStop(0, 'rgba(255,255,255,' + (0.8 * pulse) + ')');
          core.addColorStop(0.4, 'rgba(' + cr + ',' + cg + ',' + cb + ',' + (0.9 * pulse) + ')');
          core.addColorStop(1, 'rgba(' + cr + ',' + cg + ',' + cb + ',' + (0.3 * pulse) + ')');
          ctx.fillStyle = core; ctx.beginPath(); ctx.arc(nx, ny, n.size, 0, Math.PI*2); ctx.fill();

          // Labels
          ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 6;
          ctx.font = "600 7px 'IBM Plex Mono', monospace";
          ctx.fillStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + (0.6 * pulse) + ')';
          ctx.textAlign = 'center';
          ctx.fillText(n.label, nx, ny - n.size - 10);
          ctx.font = "700 9px 'DM Sans', sans-serif";
          ctx.fillStyle = 'rgba(255,255,255,' + (0.5 * pulse) + ')';
          ctx.fillText(n.value, nx, ny + n.size + 14);
          ctx.shadowBlur = 0;
        });

        // Ambient glows
        var g1x = w * 0.2 + Math.sin(time * 0.08) * w * 0.05;
        var g1 = ctx.createRadialGradient(g1x, h * 0.3, 0, g1x, h * 0.3, w * 0.25);
        g1.addColorStop(0, 'rgba(249,115,22,0.03)'); g1.addColorStop(1, 'transparent');
        ctx.fillStyle = g1; ctx.fillRect(0, 0, w, h);
        var g2x = w * 0.8 + Math.cos(time * 0.06) * w * 0.05;
        var g2 = ctx.createRadialGradient(g2x, h * 0.6, 0, g2x, h * 0.6, w * 0.25);
        g2.addColorStop(0, 'rgba(139,92,246,0.025)'); g2.addColorStop(1, 'transparent');
        ctx.fillStyle = g2; ctx.fillRect(0, 0, w, h);

        requestAnimationFrame(draw);
      }
      requestAnimationFrame(draw);
    })();

    // === WATERFALL CANVAS ===
    function initWaterfallCanvas() {
      const canvas = document.getElementById('waterfallCanvas');
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      
      const streams = [
        { color: '#f97316', label: 'Property', value: 2200000 },
        { color: '#10b981', label: 'Business', value: 4800000 },
        { color: '#8b5cf6', label: 'Savings', value: 345000 },
        { color: '#ec4899', label: 'Invested', value: 142000 }
      ];
      
      let time = 0;
      
      function draw() {
        ctx.clearRect(0, 0, width, height);
        
        // Draw concentric rings
        for (let i = 0; i < 4; i++) {
          const radius = 30 + i * 25;
          ctx.strokeStyle = \`rgba(255, 255, 255, \${0.1 - i * 0.02})\`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.stroke();
        }
        
        // Draw streams
        streams.forEach((stream, idx) => {
          const angle = (Math.PI * 2 / streams.length) * idx;
          const sourceRadius = 80;
          const sourceX = centerX + Math.cos(angle) * sourceRadius;
          const sourceY = centerY + Math.sin(angle) * sourceRadius;
          
          // Source node
          ctx.fillStyle = stream.color;
          ctx.beginPath();
          ctx.arc(sourceX, sourceY, 8, 0, Math.PI * 2);
          ctx.fill();
          
          // Stream line
          ctx.strokeStyle = stream.color;
          ctx.globalAlpha = 0.4;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(sourceX, sourceY);
          ctx.quadraticCurveTo(centerX + Math.cos(angle) * 20, centerY + Math.sin(angle) * 20, centerX, centerY);
          ctx.stroke();
          ctx.globalAlpha = 1;
          
          // Stream particles
          for (let p = 0; p < 3; p++) {
            const progress = (time * 0.01 + p * 0.33) % 1;
            const px = sourceX + (centerX - sourceX) * progress;
            const py = sourceY + (centerY - sourceY) * progress;
            ctx.fillStyle = stream.color;
            ctx.globalAlpha = Math.max(0, 1 - progress);
            ctx.beginPath();
            ctx.arc(px, py, 4, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        });
        
        // Center collector with ripple
        const rippleRadius = 15 + Math.sin(time * 0.05) * 3;
        ctx.strokeStyle = 'rgba(249, 115, 22, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, rippleRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(249, 115, 22, 0.6)';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
        ctx.fill();
        
        time++;
        requestAnimationFrame(draw);
      }
      
      draw();
    }

    // === NET WORTH ANIMATION ===
    function animateNetWorth() {
      const target = 7865000;
      const duration = 2000;
      const startTime = Date.now();
      
      function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const current = Math.floor(target * progress);
        
        const display = document.getElementById('netWorthDisplay');
        if (display) {
          const millions = (current / 1000000).toFixed(2);
          display.textContent = '$' + millions + 'M';
        }
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      }
      
      animate();
    }

    // === XP COUNTER ANIMATION ===
    function animateXPCounter() {
      const target = 3850;
      const duration = 2000;
      const startTime = Date.now();
      
      function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const current = Math.floor(target * progress);
        
        const display = document.getElementById('xpCounter');
        if (display) {
          display.textContent = current.toLocaleString();
        }
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      }
      
      animate();
    }

    // === LOGO UPLOAD HANDLER ===
    function handleLogoUpload(input) {
      if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = document.createElement('img');
          img.src = e.target.result;
          const container = input.parentElement;
          container.innerHTML = '';
          container.appendChild(img);
        };
        reader.readAsDataURL(input.files[0]);
      }
    }

    // Handle responsive canvas resizing
    window.addEventListener('resize', () => {
      const heroCanvas = document.getElementById('heroCanvas');
      if (heroCanvas) {
        const dpr = window.devicePixelRatio || 1;
        heroCanvas.width = heroCanvas.offsetWidth * dpr;
        heroCanvas.height = heroCanvas.offsetHeight * dpr;
      }
    });

    // === GAUGE BAR ANIMATION ===
    document.querySelectorAll('.gauge-bars').forEach(container => {
      const values = container.dataset.values.split(',').map(Number);
      const max = Math.max(...values);
      const bars = [];
      values.forEach((v, i) => {
        const bar = document.createElement('div');
        bar.className = 'gauge-bar';
        bar.style.height = '0%';
        container.appendChild(bar);
        bars.push({ el: bar, val: v });
      });
      bars.forEach((b, i) => {
        setTimeout(() => {
          b.el.style.height = ((b.val / max) * 100) + '%';
        }, 300 + i * 60);
      });
    });

    // === TICKER FILL ANIMATION ===
    setTimeout(() => {
      const fill = document.querySelector('.ticker-fill');
      if (fill) fill.style.width = '65%';
    }, 600);

    // === ACHIEVEMENT RING ANIMATION ===
    (function() {
      // Animate milestone gauge fills
      const msRadius = 56;
      const msCircumference = 2 * Math.PI * msRadius;
      document.querySelectorAll(".ms-gauge-fill").forEach(circle => {
        const pct = parseInt(circle.dataset.pct) || 0;
        circle.style.strokeDasharray = msCircumference;
        circle.style.strokeDashoffset = msCircumference;
        setTimeout(() => {
          const offset = msCircumference - (pct / 100) * msCircumference;
          circle.style.transition = "stroke-dashoffset 1.2s ease-out";
          circle.style.strokeDashoffset = offset;
        }, 100);
      });

      const circumference = 2 * Math.PI * 40; // r=40
      document.querySelectorAll('.achieve-card').forEach(card => {
        const progress = parseInt(card.dataset.progress) || 0;
        const ring = card.querySelector('.achieve-ring-fill');
        if (!ring) return;
        ring.style.strokeDasharray = circumference;
        ring.style.strokeDashoffset = circumference;
        setTimeout(() => {
          const offset = circumference - (progress / 100) * circumference;
          ring.style.strokeDashoffset = offset;
        }, 300);
      });
    })();

  </script>
`
    .replace('___ACCOUNTS_GRID___', accountsGridHtml)
    .replace('___TXN_LIST___', txnListHtml)

  // Compute net worth — prefer graph-cascaded, fall back to raw account sum
  const rawNetWorth = accounts.reduce((s: number, a: any) => {
    const b = typeof a.current_balance === 'number' ? a.current_balance : parseFloat(a.current_balance ?? '0') || 0
    if ((a.type ?? '').toLowerCase().includes('credit') || (a.type ?? '').toLowerCase().includes('loan')) return s - Math.abs(b)
    return s + b
  }, 0)
  const netWorth = nwGraph?.total ?? rawNetWorth
  const netWorthFmt = netWorth >= 1e6 ? `$${(netWorth / 1e6).toFixed(3)}M` : `$${Math.round(netWorth).toLocaleString()}`
  // Build breakdown string for subtitle
  const nwBreakdownParts: string[] = []
  if (nwGraph) {
    if (nwGraph.direct !== 0) nwBreakdownParts.push(`direct: $${Math.round(nwGraph.direct).toLocaleString()}`)
    nwGraph.byEntity.slice(0, 3).forEach(b => {
      nwBreakdownParts.push(`${b.entityName.split(' ').slice(0,2).join(' ')}: $${Math.round(b.amount).toLocaleString()}`)
    })
  }
  const nwSubtitle = nwBreakdownParts.length > 0
    ? nwBreakdownParts.join(' · ')
    : `${accounts.length} accounts linked`

  const totalIncome = 30200
  const totalExpenses = 23200
  const netCashFlow = totalIncome - totalExpenses

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: pageCss }} />
      <Hero
        label="FINANCIAL COMMAND CENTER — LIVE"
        greeting="Total Net Worth Across All Entities"
        primaryMetric={netWorthFmt}
        metricSubtitle={nwBreakdownParts.length > 0 ? nwSubtitle : `▲ +$142K this quarter · ${accounts.length} accounts`}
        kpiCards={[
          { label: 'MONTHLY INCOME', value: `$${(totalIncome / 1000).toFixed(1)}K`, delta: 'live', deltaPositive: true },
          { label: 'MONTHLY EXPENSES', value: `$${(totalExpenses / 1000).toFixed(1)}K`, delta: 'live' },
          { label: 'NET CASH FLOW', value: `$${(netCashFlow / 1000).toFixed(1)}K`, delta: '+cash', deltaPositive: true },
          { label: 'SAVINGS RATE', value: `${Math.round((netCashFlow / totalIncome) * 100)}%` },
        ]}
        playerCard={{
          name: 'Colby Culbertson',
          role: 'CEO · Multi-Entity Operator',
          level: 14,
          xpCurrent: 8500,
          xpNext: 10000,
          initials: 'CC',
          stats: [
            { key: 'NET WORTH', value: netWorthFmt },
            { key: 'ACCOUNTS', value: String(accounts.length) },
            { key: 'ENTITIES', value: '7' },
            { key: 'LEVEL', value: '14' },
          ],
        }}
        animationSlot={<HeroCanvas />}
      />

      {/* QuickBooks Balance Sheet — live when connected */}
      <section style={{ marginBottom: 28 }}>
        <div className="section-header">
          <div className="section-header-left">
            <h2 className="section-title">QuickBooks Balance Sheet</h2>
            {qbBS && <span className="achieve-count">live · as of {qbBS.asOf}</span>}
          </div>
        </div>
        {qbBS ? (
          <SpecCard accent dataSource="quickbooks:BalanceSheet">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {([
                ['Total Assets',      USD(qbBS.totalAssets),      'var(--green)'],
                ['Total Liabilities', USD(qbBS.totalLiabilities), 'var(--red)'],
                ['Total Equity',      USD(qbBS.totalEquity),      'var(--orange)'],
              ] as [string, string, string][]).map(([label, val, color]) => (
                <div
                  key={label}
                  style={{
                    padding: '14px 16px',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ fontSize: 10, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', color }}>{val}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 12, lineHeight: 1.5 }}>
              Pulled live from QuickBooks Online · {qbBS.currency} · cached 60s
            </div>
          </SpecCard>
        ) : (
          <ComingSoon
            title="QuickBooks Balance Sheet"
            reason="Connect QuickBooks on the Integrations page to pull live Assets, Liabilities, and Equity directly from QBO."
            icon="📒"
            connect="qb"
            dataSource="coming-soon:quickbooks_balance_sheet"
            skeleton="kpi"
          />
        )}
      </section>

      <div dangerouslySetInnerHTML={{ __html: bodyContent }} />
    </>
  )
}
