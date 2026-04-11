import { useState, useEffect, useRef, useCallback } from "react";

/* ───────────────── DATA ───────────────── */
const ACHIEVEMENTS = [
  { icon: "🎯", name: "First Vision", xp: 100, desc: "Added your first item to the vision board", earned: true, progress: 100 },
  { icon: "🏦", name: "Bank Linked", xp: 200, desc: "Connected your first financial account", earned: true, progress: 100 },
  { icon: "🔥", name: "7-Day Streak", xp: 300, desc: "Checked your board 7 days in a row", earned: true, progress: 100 },
  { icon: "🚗", name: "Halfway There", xp: 500, desc: "Reached 46% on Tesla Model X goal", earned: true, progress: 100 },
  { icon: "💰", name: "$5K Saved", xp: 250, desc: "Saved $5,000 toward any vision", earned: true, progress: 100 },
  { icon: "🏗️", name: "Portfolio Builder", xp: 350, desc: "Added 5+ visions to your board", earned: true, progress: 100 },
  { icon: "🌴", name: "Dream Big", xp: 200, desc: "Added a vision worth $1M+", earned: true, progress: 100 },
  { icon: "🔗", name: "Multi-Account", xp: 300, desc: "Linked 3+ financial institutions", earned: true, progress: 100 },
  // Hidden by default (view all)
  { icon: "⚡", name: "30-Day Streak", xp: 750, desc: "Check your board 30 days in a row (14/30)", earned: false, progress: 47, hiddenDefault: true },
  { icon: "💎", name: "First $100K", xp: 1000, desc: "Save $100K toward a single vision ($43.7K/$100K)", earned: false, progress: 44, hiddenDefault: true },
  { icon: "🏆", name: "Vision Complete", xp: 2000, desc: "Fully fund and acquire a vision item", earned: false, progress: 0, hiddenDefault: true },
  { icon: "👑", name: "Millionaire", xp: 1500, desc: "Reach $1M net worth", earned: true, progress: 100, hiddenDefault: true },
];

const VISION_CARDS = [
  {
    id: 1, title: "New Family Home", target: "$2.5M — $3.5M", status: "planning",
    note: "Primary residence upgrade — need 20% down ($500k–$700k)",
    img: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80",
    pct: 2, dashoffset: 166.25,
    needPerMo: "$292K", paceMonths: "504", targetDate: "Apr 2027 (12 months)",
    paceColor: "amber", gapAlert: "Gap: Need +$285K/mo more cash flow to hit timeline",
  },
  {
    id: 2, title: "Beachfront Cabo Property", target: "$1.8M — $2.4M", status: "future",
    note: "Investment property / personal retreat in Cabo San Lucas",
    img: "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800&q=80",
    pct: 7, dashoffset: 157.77,
    needPerMo: "$100K", paceMonths: "345", targetDate: "2028 (24 months)",
    paceColor: "amber", gapAlert: "Gap: Need +$93K/mo more cash flow to hit timeline",
  },
  {
    id: 3, title: "Tesla Model X Plaid", target: "$95K — $120K", status: "active",
    note: "Family vehicle upgrade",
    img: "https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800&q=80",
    pct: 46, dashoffset: 91.61,
    needPerMo: "$15K", paceMonths: "17", targetDate: "Dec 2026 (8 months)",
    paceColor: "green", gapAlert: null,
  },
];

const GAUGE_DATA = [
  { cls: "green", num: "1", label: "ON TRACK", color: "#10b981", values: [40,55,45,65,50,72,60,80,68,85,75,92] },
  { cls: "amber", num: "2", label: "NEEDS ATTENTION", color: "#f59e0b", values: [70,65,72,58,60,52,55,48,50,45,42,38] },
  { cls: "purple", num: "2", label: "PLANNING", color: "#8b5cf6", values: [20,28,25,35,32,40,38,48,45,55,52,60] },
];

const ACCOUNTS = [
  { name: "Business Checking", mask: "••6502", logo: "chase", syncing: false },
  { name: "Business Checking", mask: "••9165", logo: "chase", syncing: false },
  { name: "Investing", mask: "••6adc", logo: "acorns", syncing: false },
  { name: "Business Gold", mask: "••3009", logo: "amex", syncing: false },
  { name: "CA Stays", mask: "••7281", logo: "chase", syncing: true },
];

const RADAR_BLIPS = [
  { label: "INCOME", value: "$50K/mo", angle: 0.5, dist: 0.35, sz: 6, color: [16,185,129], progress: 0.35 },
  { label: "RANCH", value: "$4.5M", angle: 1.3, dist: 0.6, sz: 9, color: [249,115,22], progress: 0.18 },
  { label: "G-WAGON", value: "$250K", angle: 2.5, dist: 0.30, sz: 5, color: [236,72,153], progress: 0.65 },
  { label: "NET WORTH", value: "$10M", angle: 3.8, dist: 0.5, sz: 11, color: [139,92,246], progress: 0.26 },
  { label: "CABO", value: "$2.8M", angle: 5.2, dist: 0.72, sz: 7, color: [249,115,22], progress: 0.12 },
];

/* ───────────────── CSS (injected via style tag) ───────────────── */
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

.vb-root {
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  color: #fff;
  position: relative;
}

/* Ambient glows */
.vb-glow-1 { position:fixed; top:-30%; left:-10%; width:60%; height:60%; background:radial-gradient(ellipse, rgba(249,115,22,0.06) 0%, transparent 70%); pointer-events:none; z-index:0; }
.vb-glow-2 { position:fixed; bottom:-20%; right:-10%; width:50%; height:50%; background:radial-gradient(ellipse, rgba(139,92,246,0.05) 0%, transparent 70%); pointer-events:none; z-index:0; }

/* Hero */
.vb-hero {
  position:relative; border-radius:24px; overflow:hidden; margin-bottom:28px;
  border:1px solid rgba(249,115,22,0.12);
  background:#050510; min-height:460px;
}
.vb-hero canvas.hero-canvas { position:absolute; inset:0; z-index:0; }
.vb-hero-scanline {
  position:absolute; top:0; left:0; right:0; height:2px; z-index:1;
  background:linear-gradient(90deg, transparent, rgba(249,115,22,0.4), rgba(139,92,246,0.3), transparent);
  animation: vbScanDown 4s ease-in-out infinite;
  filter:blur(1px);
}
@keyframes vbScanDown { 0%{top:0;opacity:0} 10%{opacity:1} 90%{opacity:1} 100%{top:100%;opacity:0} }

.vb-hud-corner { position:absolute; z-index:2; width:24px; height:24px; }
.vb-hud-corner.tl { top:12px; left:12px; border-top:2px solid rgba(249,115,22,0.3); border-left:2px solid rgba(249,115,22,0.3); }
.vb-hud-corner.tr { top:12px; right:12px; border-top:2px solid rgba(139,92,246,0.3); border-right:2px solid rgba(139,92,246,0.3); }
.vb-hud-corner.bl { bottom:12px; left:12px; border-bottom:2px solid rgba(249,115,22,0.3); border-left:2px solid rgba(249,115,22,0.3); }
.vb-hud-corner.br { bottom:12px; right:12px; border-bottom:2px solid rgba(139,92,246,0.3); border-right:2px solid rgba(139,92,246,0.3); }

.vb-hero-content { position:relative; z-index:3; display:flex; align-items:stretch; min-height:460px; }

/* LEFT PANEL */
.vb-hero-left { flex:1; padding:36px 0 36px 40px; display:flex; flex-direction:column; justify-content:center; }
.vb-sys-label {
  font-size:10px; font-weight:600; letter-spacing:0.15em; color:rgba(16,185,129,0.7);
  margin-bottom:6px; font-family:'IBM Plex Mono', monospace;
}
.vb-sys-label::before { content:'› '; }
.vb-greeting { font-size:13px; color:rgba(255,255,255,0.45); margin-bottom:16px; font-weight:400; }
.vb-value {
  font-size:56px; font-weight:700; letter-spacing:-0.04em; line-height:1; margin-bottom:4px;
  background:linear-gradient(135deg, #f59e0b 0%, #a3e635 40%, #10b981 100%);
  -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
  filter:drop-shadow(0 0 20px rgba(245,158,11,0.3));
}
.vb-value .sep { -webkit-text-fill-color:rgba(16,185,129,0.2); font-weight:200; font-size:42px; }
.vb-value-sub {
  font-size:11px; color:rgba(16,185,129,0.45); font-family:'IBM Plex Mono', monospace;
  margin-bottom:28px; letter-spacing:0.02em;
}
.vb-value-sub span { color:#a3e635; }

/* Gauge cards */
.vb-gauges { display:flex; gap:16px; margin-bottom:24px; }
.vb-gauge-card {
  flex:1; padding:16px; border-radius:14px; position:relative; overflow:hidden;
  background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04);
  backdrop-filter:blur(8px);
}
.vb-gauge-card::after {
  content:''; position:absolute; bottom:0; left:0; right:0; height:40px; pointer-events:none;
}
.vb-gauge-card.green::after { background:linear-gradient(to top, rgba(16,185,129,0.06), transparent); }
.vb-gauge-card.amber::after { background:linear-gradient(to top, rgba(245,158,11,0.06), transparent); }
.vb-gauge-card.purple::after { background:linear-gradient(to top, rgba(139,92,246,0.06), transparent); }
.vb-gauge-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
.vb-gauge-num { font-size:32px; font-weight:700; letter-spacing:-0.03em; font-family:'IBM Plex Mono','DM Sans',sans-serif; }
.vb-gauge-card.green .vb-gauge-num { color:#10b981; }
.vb-gauge-card.amber .vb-gauge-num { color:#f59e0b; }
.vb-gauge-card.purple .vb-gauge-num { color:#8b5cf6; }
.vb-gauge-indicator { width:10px; height:10px; border-radius:50%; position:relative; }
.vb-gauge-indicator::after { content:''; position:absolute; inset:-3px; border-radius:50%; animation:vbGaugePulse 2s ease-in-out infinite; }
.vb-gauge-card.green .vb-gauge-indicator { background:#10b981; }
.vb-gauge-card.green .vb-gauge-indicator::after { border:1px solid #10b981; }
.vb-gauge-card.amber .vb-gauge-indicator { background:#f59e0b; }
.vb-gauge-card.amber .vb-gauge-indicator::after { border:1px solid #f59e0b; }
.vb-gauge-card.purple .vb-gauge-indicator { background:#8b5cf6; }
.vb-gauge-card.purple .vb-gauge-indicator::after { border:1px solid #8b5cf6; }
@keyframes vbGaugePulse { 0%,100%{opacity:0.6;transform:scale(1)} 50%{opacity:0;transform:scale(1.8)} }
.vb-gauge-label { font-size:9px; font-weight:600; letter-spacing:0.1em; color:rgba(255,255,255,0.4); margin-bottom:10px; }
.vb-gauge-bars { display:flex; align-items:flex-end; gap:3px; height:28px; }
.vb-gauge-bar {
  flex:1; border-radius:2px 2px 0 0; transition:height 1s cubic-bezier(0.22,1,0.36,1); min-width:0;
}
.vb-gauge-card.green .vb-gauge-bar { background:linear-gradient(to top, rgba(16,185,129,0.15), rgba(16,185,129,0.5)); }
.vb-gauge-card.amber .vb-gauge-bar { background:linear-gradient(to top, rgba(245,158,11,0.15), rgba(245,158,11,0.5)); }
.vb-gauge-card.purple .vb-gauge-bar { background:linear-gradient(to top, rgba(139,92,246,0.15), rgba(139,92,246,0.5)); }

/* Ticker */
.vb-ticker {
  display:flex; align-items:center; gap:12px; padding:10px 16px;
  border:1px solid rgba(255,255,255,0.04); border-radius:10px;
  background:rgba(255,255,255,0.015); font-family:'IBM Plex Mono', monospace;
}
.vb-ticker-dot { width:6px; height:6px; border-radius:50%; background:#10b981; animation:vbGaugePulse 2s ease-in-out infinite; position:relative; }
.vb-ticker-dot::after { content:''; position:absolute; inset:-3px; border-radius:50%; border:1px solid #10b981; animation:vbGaugePulse 2s ease-in-out infinite; }
.vb-ticker-label { font-size:9px; letter-spacing:0.1em; color:rgba(255,255,255,0.4); font-weight:600; }
.vb-ticker-bar { flex:1; height:4px; border-radius:2px; background:rgba(255,255,255,0.04); overflow:hidden; }
.vb-ticker-fill { height:100%; border-radius:2px; background:linear-gradient(90deg,#10b981,#34d399); transition:width 2s cubic-bezier(0.22,1,0.36,1); }
.vb-ticker-val { font-size:13px; font-weight:700; color:#10b981; }

/* ORBITAL CENTER */
.vb-hero-orbital { width:340px; position:relative; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.vb-hero-orbital canvas { width:340px; height:340px; }

/* PLAYER CARD */
.vb-hero-player { width:280px; flex-shrink:0; padding:36px 32px 36px 0; display:flex; flex-direction:column; justify-content:center; }
.vb-player-card {
  background:rgba(255,255,255,0.02); backdrop-filter:blur(16px);
  border:1px solid rgba(255,255,255,0.06); border-radius:18px; overflow:hidden;
}
.vb-player-top { padding:20px 22px 16px; }
.vb-player-identity { display:flex; align-items:center; gap:14px; margin-bottom:16px; }
.vb-avatar {
  width:56px; height:56px; border-radius:50%; position:relative;
  display:flex; align-items:center; justify-content:center;
}
.vb-avatar-ring {
  position:absolute; inset:-3px; border-radius:50%;
  border:2px solid transparent;
  background:conic-gradient(from 0deg, #f97316, #ec4899, #8b5cf6, #f97316) border-box;
  -webkit-mask:linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite:xor; mask-composite:exclude;
  animation:vbRingRotate 6s linear infinite;
}
@keyframes vbRingRotate { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
.vb-avatar-inner {
  width:50px; height:50px; border-radius:50%; background:#0a0a18;
  display:flex; align-items:center; justify-content:center;
  font-size:18px; font-weight:700; letter-spacing:0.04em;
}
.vb-level-badge {
  position:absolute; bottom:-2px; right:-2px; width:22px; height:22px;
  border-radius:50%; background:#8b5cf6; display:flex; align-items:center;
  justify-content:center; font-size:11px; font-weight:700;
  border:2px solid #0a0a18; box-shadow:0 0 10px rgba(139,92,246,0.5);
}
.vb-player-name { font-size:15px; font-weight:600; margin-bottom:2px; }
.vb-player-title {
  font-size:10px; font-weight:600; letter-spacing:0.08em;
  background:linear-gradient(90deg, #f97316, #ec4899);
  -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
}
.vb-xp-bar-outer { height:6px; border-radius:3px; background:rgba(255,255,255,0.06); overflow:hidden; position:relative; }
.vb-xp-bar-inner {
  height:100%; border-radius:3px;
  background:linear-gradient(90deg, #f97316, #ec4899, #8b5cf6);
  transition:width 1.2s cubic-bezier(0.22,1,0.36,1); position:relative;
}
.vb-xp-bar-inner::after {
  content:''; position:absolute; inset:0;
  background:linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%);
  animation:vbXpShimmer 2s ease-in-out infinite;
}
@keyframes vbXpShimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
.vb-xp-meta { display:flex; justify-content:space-between; margin-top:5px; }
.vb-xp-text { font-size:9px; color:rgba(255,255,255,0.35); font-weight:500; font-family:'IBM Plex Mono',monospace; }
.vb-xp-level { font-size:9px; color:#8b5cf6; font-weight:600; }
.vb-player-stats {
  display:grid; grid-template-columns:repeat(4,1fr);
  border-top:1px solid rgba(255,255,255,0.05);
}
.vb-p-stat { text-align:center; padding:11px 6px; border-right:1px solid rgba(255,255,255,0.03); }
.vb-p-stat:last-child { border-right:none; }
.vb-p-stat-icon { font-size:14px; display:block; margin-bottom:1px; }
.vb-p-stat-num { font-size:16px; font-weight:700; display:block; line-height:1.2; }
.vb-p-stat-label { font-size:7px; font-weight:600; letter-spacing:0.1em; color:rgba(255,255,255,0.25); }

/* Accounts bar */
.vb-accounts {
  display:flex; align-items:center; gap:14px; padding:14px 40px;
  border-top:1px solid rgba(255,255,255,0.04);
  position:relative; z-index:3; background:rgba(0,0,0,0.3);
  backdrop-filter:blur(8px);
}
.vb-accounts-label { font-size:8px; font-weight:600; letter-spacing:0.14em; color:rgba(255,255,255,0.2); white-space:nowrap; font-family:'IBM Plex Mono',monospace; }
.vb-account-chips { display:flex; gap:8px; flex-wrap:wrap; flex:1; }
.vb-account-chip {
  display:flex; align-items:center; gap:8px; padding:5px 12px 5px 7px;
  background:rgba(255,255,255,0.03); border-radius:8px;
  border:1px solid rgba(255,255,255,0.05); font-size:11px; color:rgba(255,255,255,0.45);
  transition:all 0.2s;
}
.vb-account-chip:hover { background:rgba(255,255,255,0.06); border-color:rgba(255,255,255,0.1); color:rgba(255,255,255,0.6); }
.vb-acct-logo { width:22px; height:22px; border-radius:5px; flex-shrink:0; overflow:hidden; display:flex; align-items:center; justify-content:center; }
.vb-acct-logo.chase { background:#117ACA; }
.vb-acct-logo.acorns { background:#72C472; }
.vb-acct-logo.amex { background:#006FCF; }
.vb-acct-status { width:5px; height:5px; border-radius:50%; background:#10b981; flex-shrink:0; }
.vb-acct-status.syncing { background:#f59e0b; animation:vbPulse 2s infinite; }
@keyframes vbPulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
.vb-acct-mask { font-family:'IBM Plex Mono',monospace; font-size:10px; color:rgba(255,255,255,0.2); }
.vb-link-btn {
  padding:5px 12px; border-radius:8px; border:1px dashed rgba(245,158,11,0.4);
  background:rgba(245,158,11,0.06); color:#f59e0b; font-size:11px; cursor:pointer;
  font-family:inherit; transition:all 0.2s; display:flex; align-items:center; gap:5px; font-weight:500;
}
.vb-link-btn:hover { border-color:#f59e0b; background:rgba(245,158,11,0.12); color:#fbbf24; }

/* Section */
.vb-section { margin-bottom:36px; }
.vb-section-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:10px; }
.vb-section-title { font-size:20px; font-weight:600; letter-spacing:-0.01em; }
.vb-section-header-left { display:flex; align-items:center; gap:10px; }
.vb-achieve-count { font-size:13px; color:rgba(255,255,255,0.4); background:rgba(255,255,255,0.04); padding:3px 10px; border-radius:6px; }
.vb-xp-earned { font-size:12px; font-weight:600; color:#f97316; background:rgba(249,115,22,0.1); padding:3px 10px; border-radius:6px; }
.vb-view-all-btn { background:none; border:none; color:rgba(255,255,255,0.4); font-size:13px; cursor:pointer; font-family:inherit; }
.vb-view-all-btn:hover { color:rgba(255,255,255,0.6); }

/* Achievements */
.vb-achieve-grid { display:flex; gap:20px; flex-wrap:wrap; justify-content:flex-start; padding:8px 0; }
.vb-achieve-card {
  display:flex; flex-direction:column; align-items:center; text-align:center;
  width:110px; position:relative; cursor:pointer; transition:transform 0.2s;
}
.vb-achieve-card:hover { transform:translateY(-4px); }
.vb-achieve-card.locked { opacity:0.3; }
.vb-achieve-card.locked .vb-achieve-ring-bg { stroke:rgba(255,255,255,0.04); }
.vb-achieve-card.locked .vb-achieve-ring-fill { stroke:transparent !important; }
.vb-achieve-ring-wrap { position:relative; width:88px; height:88px; margin-bottom:10px; }
.vb-achieve-ring-svg { width:88px; height:88px; transform:rotate(-90deg); }
.vb-achieve-ring-bg { fill:none; stroke:rgba(255,255,255,0.06); stroke-width:4; }
.vb-achieve-ring-fill {
  fill:none; stroke-width:4; stroke-linecap:round;
  stroke:url(#vbAchieveGrad);
  transition:stroke-dashoffset 1s cubic-bezier(0.22,1,0.36,1);
}
.vb-achieve-icon-center {
  position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
  font-size:30px; line-height:1;
}
.vb-achieve-card.earned .vb-achieve-ring-wrap::before {
  content:''; position:absolute; inset:-4px; border-radius:50%;
  background:radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 70%); z-index:0;
}
.vb-achieve-check {
  position:absolute; bottom:4px; right:16px; width:20px; height:20px; border-radius:50%;
  background:#10b981; display:flex; align-items:center; justify-content:center;
  font-size:10px; font-weight:700; border:2px solid #060610; z-index:2;
}
.vb-achieve-name { font-size:11px; font-weight:600; margin-bottom:2px; line-height:1.3; }
.vb-achieve-xp { font-size:10px; font-weight:600; color:#f97316; }
.vb-achieve-tooltip {
  position:absolute; bottom:calc(100% + 8px); left:50%; transform:translateX(-50%);
  background:rgba(12,12,26,0.95); border:1px solid rgba(255,255,255,0.1);
  border-radius:10px; padding:10px 14px; min-width:180px; max-width:220px;
  opacity:0; pointer-events:none; transition:opacity 0.2s; z-index:50;
  backdrop-filter:blur(12px);
}
.vb-achieve-card:hover .vb-achieve-tooltip { opacity:1; }
.vb-achieve-tooltip-name { font-size:12px; font-weight:600; margin-bottom:4px; }
.vb-achieve-tooltip-desc { font-size:11px; color:rgba(255,255,255,0.4); line-height:1.4; margin-bottom:4px; }
.vb-achieve-tooltip-xp { font-size:11px; font-weight:600; color:#f97316; }

/* Filter pills */
.vb-filter-row { display:flex; gap:8px; }
.vb-filter-pill {
  padding:6px 16px; border-radius:8px; border:1px solid rgba(255,255,255,0.08);
  background:transparent; color:rgba(255,255,255,0.4); font-size:13px;
  cursor:pointer; transition:all 0.2s; font-family:inherit;
}
.vb-filter-pill:hover { border-color:rgba(255,255,255,0.15); color:rgba(255,255,255,0.6); }
.vb-filter-pill.active {
  background:rgba(249,115,22,0.12); color:#f97316;
  border-color:rgba(249,115,22,0.3);
}

/* Vision cards grid */
.vb-vision-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(340px, 1fr)); gap:20px; }
.vb-vision-card {
  background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.06);
  border-radius:16px; overflow:hidden; transition:all 0.3s ease; cursor:pointer;
}
.vb-vision-card:hover { transform:translateY(-4px); box-shadow:0 20px 60px rgba(0,0,0,0.5); }
.vb-card-image-wrap { position:relative; height:180px; overflow:hidden; }
.vb-card-image-wrap img { width:100%; height:100%; object-fit:cover; transition:transform 0.4s ease; }
.vb-vision-card:hover .vb-card-image-wrap img { transform:scale(1.05); }
.vb-card-image-overlay {
  position:absolute; inset:0;
  background:linear-gradient(to top, rgba(6,6,16,0.95) 0%, rgba(6,6,16,0.2) 60%, transparent 100%);
}
.vb-status-badge {
  position:absolute; top:12px; right:12px; padding:4px 10px;
  border-radius:6px; font-size:10px; font-weight:700; letter-spacing:0.08em; border:1px solid;
}
.vb-status-planning { background:rgba(249,115,22,0.15); color:#f97316; border-color:#f97316; }
.vb-status-future { background:rgba(139,92,246,0.15); color:#8b5cf6; border-color:#8b5cf6; }
.vb-status-active { background:rgba(16,185,129,0.15); color:#10b981; border-color:#10b981; }
.vb-card-content { padding:20px 24px 24px; }
.vb-card-title { font-size:18px; font-weight:600; margin-bottom:4px; letter-spacing:-0.01em; }
.vb-card-target {
  font-size:14px; font-weight:600; margin-bottom:8px;
  background:linear-gradient(90deg, #f97316, #ec4899);
  -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
}
.vb-card-note { font-size:13px; color:rgba(255,255,255,0.4); margin-bottom:20px; line-height:1.5; }
.vb-card-stats-row { display:flex; align-items:center; gap:16px; margin-bottom:20px; }
.vb-progress-ring-wrap { position:relative; width:64px; height:64px; flex-shrink:0; }
.vb-progress-pct {
  position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
  font-size:14px; font-weight:700;
}
.vb-card-stats-col { flex:1; }
.vb-card-stat-dim { font-size:12px; color:rgba(255,255,255,0.4); display:block; margin-bottom:6px; }
.vb-card-bottom { border-top:1px solid rgba(255,255,255,0.04); padding-top:14px; margin-bottom:12px; }
.vb-card-bottom-row { display:flex; justify-content:space-between; margin-bottom:6px; }
.vb-card-bottom-label { font-size:12px; color:rgba(255,255,255,0.35); }
.vb-card-bottom-val { font-size:13px; font-weight:600; }
.vb-card-bottom-val.green { color:#10b981; }
.vb-card-bottom-val.amber { color:#f59e0b; }
.vb-gap-alert {
  padding:10px 14px; border-radius:10px; font-size:12px; font-weight:500;
  background:rgba(245,158,11,0.08); color:#f59e0b;
  border:1px solid rgba(245,158,11,0.15);
}

/* Add card */
.vb-add-card {
  border:2px dashed rgba(255,255,255,0.08); border-radius:16px;
  display:flex; align-items:center; justify-content:center;
  min-height:400px; cursor:pointer; transition:all 0.3s;
}
.vb-add-card:hover { border-color:rgba(255,255,255,0.15); background:rgba(255,255,255,0.01); }
.vb-add-card-inner { text-align:center; padding:32px; }
.vb-add-icon {
  width:56px; height:56px; border-radius:50%;
  background:linear-gradient(135deg, rgba(249,115,22,0.15), rgba(139,92,246,0.15));
  display:flex; align-items:center; justify-content:center;
  font-size:28px; color:rgba(255,255,255,0.4); margin:0 auto 16px;
  border:1px solid rgba(255,255,255,0.08);
}
.vb-add-title { font-size:16px; font-weight:600; margin-bottom:8px; color:rgba(255,255,255,0.5); }
.vb-add-desc { font-size:13px; color:rgba(255,255,255,0.25); line-height:1.6; }

/* Milestones */
.vb-milestone-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(480px, 1fr)); gap:20px; }
@media (max-width: 1000px) { .vb-milestone-grid { grid-template-columns:1fr; } }
.vb-ms-card {
  background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.06);
  border-radius:20px; padding:0; overflow:hidden; position:relative;
}
.vb-ms-card::before {
  content:''; position:absolute; top:0; left:0; right:0; height:3px; border-radius:20px 20px 0 0;
}
.vb-ms-card.amber::before { background:linear-gradient(90deg, #f59e0b, #f97316); }
.vb-ms-card.purple::before { background:linear-gradient(90deg, #8b5cf6, #ec4899); }
.vb-ms-body { padding:28px; }
.vb-ms-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:24px; }
.vb-ms-header-left { display:flex; align-items:center; gap:14px; }
.vb-ms-icon-wrap {
  width:48px; height:48px; border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:24px;
}
.vb-ms-card.amber .vb-ms-icon-wrap { background:rgba(245,158,11,0.12); }
.vb-ms-card.purple .vb-ms-icon-wrap { background:rgba(139,92,246,0.12); }
.vb-ms-title { font-size:17px; font-weight:600; margin-bottom:3px; letter-spacing:-0.01em; }
.vb-ms-target-val { font-size:14px; font-weight:700; }
.vb-ms-card.amber .vb-ms-target-val { color:#f59e0b; }
.vb-ms-card.purple .vb-ms-target-val { color:#8b5cf6; }
.vb-ms-viz { display:flex; align-items:center; gap:24px; margin-bottom:24px; }
.vb-ms-gauge-wrap { position:relative; width:130px; height:130px; flex-shrink:0; }
.vb-ms-gauge-svg { width:130px; height:130px; transform:rotate(-90deg); }
.vb-ms-gauge-bg { fill:none; stroke:rgba(255,255,255,0.04); stroke-width:8; }
.vb-ms-gauge-fill { fill:none; stroke-width:8; stroke-linecap:round; transition:stroke-dashoffset 1.5s cubic-bezier(0.22,1,0.36,1); }
.vb-ms-card.amber .vb-ms-gauge-fill { stroke:url(#vbMsGradAmber); }
.vb-ms-card.purple .vb-ms-gauge-fill { stroke:url(#vbMsGradPurple); }
.vb-ms-gauge-center {
  position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); text-align:center;
}
.vb-ms-gauge-pct { font-size:28px; font-weight:700; display:block; letter-spacing:-0.02em; }
.vb-ms-gauge-label { font-size:10px; color:rgba(255,255,255,0.4); font-weight:500; letter-spacing:0.05em; }
.vb-ms-chart-area { flex:1; min-width:0; }
.vb-ms-chart-title { font-size:10px; font-weight:600; letter-spacing:0.1em; color:rgba(255,255,255,0.4); margin-bottom:8px; }
.vb-ms-chart-svg { width:100%; height:80px; overflow:visible; }
.vb-ms-chart-grid-line { stroke:rgba(255,255,255,0.04); stroke-width:1; }
.vb-ms-chart-area-fill { opacity:0.15; }
.vb-ms-card.amber .vb-ms-chart-area-fill { fill:url(#vbMsAreaAmber); }
.vb-ms-card.purple .vb-ms-chart-area-fill { fill:url(#vbMsAreaPurple); }
.vb-ms-chart-line { fill:none; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }
.vb-ms-card.amber .vb-ms-chart-line { stroke:#f59e0b; }
.vb-ms-card.purple .vb-ms-chart-line { stroke:#8b5cf6; }
.vb-ms-chart-dot { fill:#f59e0b; }
.vb-ms-card.purple .vb-ms-chart-dot { fill:#8b5cf6; }
.vb-ms-chart-dot-glow { opacity:0.3; }
.vb-ms-card.amber .vb-ms-chart-dot-glow { fill:#f59e0b; }
.vb-ms-card.purple .vb-ms-chart-dot-glow { fill:#8b5cf6; }
.vb-ms-chart-target-line { stroke:rgba(255,255,255,0.15); stroke-width:1; stroke-dasharray:4 4; }
.vb-ms-chart-target-label { font-size:9px; fill:rgba(255,255,255,0.4); font-family:'DM Sans', sans-serif; }
.vb-ms-chart-labels { display:flex; justify-content:space-between; margin-top:4px; }
.vb-ms-chart-label-text { font-size:9px; color:rgba(255,255,255,0.25); }
.vb-ms-stats { display:grid; grid-template-columns:repeat(4, 1fr); gap:0; border-top:1px solid rgba(255,255,255,0.06); }
.vb-ms-stat {
  padding:16px 20px; text-align:center;
  border-right:1px solid rgba(255,255,255,0.06);
}
.vb-ms-stat:last-child { border-right:none; }
.vb-ms-stat-val { font-size:16px; font-weight:700; display:block; margin-bottom:2px; letter-spacing:-0.01em; }
.vb-ms-stat-label { font-size:9px; font-weight:600; letter-spacing:0.08em; color:rgba(255,255,255,0.4); }
.vb-ms-stat-val.green { color:#10b981; }
.vb-ms-stat-val.amber-c { color:#f59e0b; }
.vb-ms-stat-val.purple-c { color:#8b5cf6; }
.vb-ms-stat-val.red { color:#ef4444; }
.vb-ms-note-bar {
  padding:12px 28px; background:rgba(255,255,255,0.015);
  border-top:1px solid rgba(255,255,255,0.06); font-size:12px; color:rgba(255,255,255,0.4);
  display:flex; align-items:center; gap:8px;
}
.vb-add-milestone-btn {
  display:flex; align-items:center; gap:6px; padding:8px 16px;
  border-radius:10px; border:1px dashed rgba(249,115,22,0.3);
  background:rgba(249,115,22,0.05); color:#f97316;
  font-size:13px; font-weight:500; cursor:pointer; font-family:inherit; transition:all 0.2s;
}
.vb-add-milestone-btn:hover { background:rgba(249,115,22,0.12); border-color:#f97316; }

/* Modal */
.vb-modal-overlay {
  position:fixed; inset:0; background:rgba(0,0,0,0.7); backdrop-filter:blur(8px);
  display:flex; align-items:center; justify-content:center; z-index:1000;
  opacity:0; pointer-events:none; transition:opacity 0.3s;
}
.vb-modal-overlay.open { opacity:1; pointer-events:auto; }
.vb-modal {
  background:#0c0c1a; border:1px solid rgba(255,255,255,0.08);
  border-radius:20px; width:100%; max-width:560px; max-height:90vh; overflow:auto;
  transform:translateY(20px); transition:transform 0.3s;
}
.vb-modal-overlay.open .vb-modal { transform:translateY(0); }
.vb-modal-header {
  display:flex; justify-content:space-between; align-items:center;
  padding:20px 28px; border-bottom:1px solid rgba(255,255,255,0.06);
}
.vb-modal-title { font-size:18px; font-weight:600; }
.vb-modal-close { background:none; border:none; color:rgba(255,255,255,0.4); font-size:18px; cursor:pointer; }
.vb-modal-body { padding:24px 28px; }
.vb-modal-label { font-size:13px; font-weight:600; color:rgba(255,255,255,0.5); margin-bottom:10px; display:block; }
.vb-link-input-wrap { display:flex; gap:10px; margin-bottom:8px; }
.vb-link-input {
  flex:1; padding:12px 16px; border-radius:10px;
  background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);
  color:#fff; font-size:14px; outline:none; font-family:inherit;
}
.vb-link-input::placeholder { color:rgba(255,255,255,0.25); }
.vb-link-fetch-btn {
  padding:12px 20px; border-radius:10px;
  background:linear-gradient(135deg, #f97316, #ec4899);
  border:none; color:#fff; font-weight:600; font-size:13px; cursor:pointer;
  white-space:nowrap; font-family:inherit;
}
.vb-link-hint { font-size:12px; color:rgba(255,255,255,0.25); margin-bottom:20px; }
.vb-modal-divider { height:1px; background:rgba(255,255,255,0.06); margin:20px 0; }
.vb-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:14px; }
.vb-form-label { display:block; font-size:11px; font-weight:600; color:rgba(255,255,255,0.35); margin-bottom:6px; letter-spacing:0.05em; }
.vb-form-input {
  width:100%; padding:10px 14px; border-radius:8px;
  background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);
  color:#fff; font-size:13px; outline:none; font-family:inherit;
}
.vb-form-input::placeholder { color:rgba(255,255,255,0.2); }
.vb-form-input:focus { border-color:rgba(249,115,22,0.3); }
select.vb-form-input { appearance:none; cursor:pointer; }
textarea.vb-form-input { height:72px; resize:vertical; }
.vb-add-vision-btn {
  width:100%; padding:14px 24px; border-radius:12px; border:none;
  background:linear-gradient(135deg, #f97316, #ec4899, #8b5cf6);
  color:#fff; font-size:15px; font-weight:600; cursor:pointer; margin-top:20px;
  letter-spacing:-0.01em; font-family:inherit; transition:opacity 0.2s;
}
.vb-add-vision-btn:hover { opacity:0.9; }
`;

/* ───────────────── SVG HELPERS ───────────────── */
const ChaseLogo = () => (
  <svg viewBox="0 0 22 22" fill="none" style={{width:"100%",height:"100%"}}><path d="M4 7h7v3H7v5H4V7z" fill="#fff"/><path d="M11 7h7v8h-3v-5h-4V7z" fill="#fff"/></svg>
);
const AcornsLogo = () => (
  <svg viewBox="0 0 22 22" fill="none" style={{width:"100%",height:"100%"}}><path d="M11 4c-1.5 0-3 1-3.5 2.5C6 7 5 8.5 5 10.5 5 14 7.5 17 11 18c3.5-1 6-4 6-7.5 0-2-1-3.5-2.5-4C14 5 12.5 4 11 4z" fill="#fff"/><path d="M11 4V2M11 4c-.8 0-1.5.3-2 .8" stroke="#3a7a3a" strokeWidth="1" strokeLinecap="round"/></svg>
);
const AmexLogo = () => (
  <svg viewBox="0 0 22 22" fill="none" style={{width:"100%",height:"100%"}}><rect x="2" y="6" width="18" height="10" rx="1.5" fill="none" stroke="#fff" strokeWidth="1.2"/><text x="11" y="13" textAnchor="middle" fontSize="6" fontWeight="800" fill="#fff" fontFamily="sans-serif">AMEX</text></svg>
);
const PlusCircleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/><path d="M7 4v6M4 7h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
);

const acctLogoMap = { chase: ChaseLogo, acorns: AcornsLogo, amex: AmexLogo };

/* ───────────────── COMPONENT ───────────────── */
const VisionBoard = () => {
  const [filter, setFilter] = useState("all");
  const [showAllAchievements, setShowAllAchievements] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [xpDisplay, setXpDisplay] = useState(0);
  const [xpBarWidth, setXpBarWidth] = useState(0);
  const [tickerWidth, setTickerWidth] = useState(0);

  const heroCanvasRef = useRef(null);
  const orbitalCanvasRef = useRef(null);
  const gaugeBarRefs = useRef([]);
  const msGaugeRefs = useRef([]);
  const achieveRingRefs = useRef([]);

  /* XP counter animation */
  useEffect(() => {
    const target = 4850;
    const max = 7500;
    const duration = 1200;
    const start = Date.now();
    let raf;
    function animate() {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);
      setXpDisplay(current);
      setXpBarWidth((current / max) * 100);
      if (progress < 1) raf = requestAnimationFrame(animate);
    }
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  /* Ticker fill animation */
  useEffect(() => {
    const t = setTimeout(() => setTickerWidth(68), 600);
    return () => clearTimeout(t);
  }, []);

  /* Gauge bar animations */
  useEffect(() => {
    const timers = [];
    gaugeBarRefs.current.forEach((bars) => {
      if (!bars) return;
      const children = bars.children;
      for (let i = 0; i < children.length; i++) {
        const t = setTimeout(() => {
          children[i].style.height = children[i].dataset.target;
        }, 300 + i * 60);
        timers.push(t);
      }
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  /* Milestone gauge ring animation */
  useEffect(() => {
    const circumference = 2 * Math.PI * 56;
    const timers = [];
    msGaugeRefs.current.forEach((ring) => {
      if (!ring) return;
      const pct = parseFloat(ring.dataset.pct) || 0;
      ring.style.strokeDasharray = circumference;
      ring.style.strokeDashoffset = circumference;
      const t = setTimeout(() => {
        ring.style.strokeDashoffset = circumference - (pct / 100) * circumference;
      }, 500);
      timers.push(t);
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  /* Achievement ring animation */
  useEffect(() => {
    const circumference = 2 * Math.PI * 40;
    const timers = [];
    achieveRingRefs.current.forEach((ring) => {
      if (!ring) return;
      const progress = parseFloat(ring.dataset.progress) || 0;
      ring.style.strokeDasharray = circumference;
      ring.style.strokeDashoffset = circumference;
      const t = setTimeout(() => {
        ring.style.strokeDashoffset = circumference - (progress / 100) * circumference;
      }, 300);
      timers.push(t);
    });
    return () => timers.forEach(clearTimeout);
  }, [showAllAchievements]);

  /* ═══ TOPOGRAPHIC TERRAIN CANVAS ═══ */
  useEffect(() => {
    const canvas = heroCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let w, h, dpr;
    let time = 0;
    let raf;

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      dpr = window.devicePixelRatio || 1;
      w = rect.width; h = rect.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w + "px"; canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    function draw() {
      time += 0.016;
      ctx.clearRect(0, 0, w, h);

      // Faint grid
      ctx.strokeStyle = "rgba(249,115,22,0.025)";
      ctx.lineWidth = 0.5;
      for (let x = 0; x < w; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

      // Contour lines
      const totalLines = 30;
      for (let i = 0; i < totalLines; i++) {
        const t = i / totalLines;
        const baseY = t * h * 1.2 - h * 0.1;
        let r, g, b;
        if (t < 0.33) { const m = t / 0.33; r = Math.round(249+(236-249)*m); g = Math.round(115+(72-115)*m); b = Math.round(22+(153-22)*m); }
        else if (t < 0.66) { const m = (t-0.33)/0.33; r = Math.round(236+(139-236)*m); g = Math.round(72+(92-72)*m); b = Math.round(153+(246-153)*m); }
        else { const m = (t-0.66)/0.34; r = Math.round(139+(80-139)*m); g = Math.round(92+(40-92)*m); b = Math.round(246+(200-246)*m); }

        const pulse = 0.5 + 0.5 * Math.sin(time * 0.4 + i * 0.3);
        const alpha = 0.04 + 0.10 * pulse;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.lineWidth = 1.2 + pulse * 0.8;

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
        ctx.stroke();

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
          ctx.fillStyle = `rgba(${r},${g},${b},${alpha * 0.15})`;
          ctx.fill();
        }
      }

      // Ambient glow zones
      const g1x = w * 0.25 + Math.sin(time * 0.08) * w * 0.05;
      const g1 = ctx.createRadialGradient(g1x, h * 0.3, 0, g1x, h * 0.3, w * 0.2);
      g1.addColorStop(0, "rgba(249,115,22,0.04)"); g1.addColorStop(1, "transparent");
      ctx.fillStyle = g1; ctx.fillRect(0, 0, w, h);

      const g2x = w * 0.75 + Math.cos(time * 0.06) * w * 0.05;
      const g2 = ctx.createRadialGradient(g2x, h * 0.5, 0, g2x, h * 0.5, w * 0.2);
      g2.addColorStop(0, "rgba(139,92,246,0.03)"); g2.addColorStop(1, "transparent");
      ctx.fillStyle = g2; ctx.fillRect(0, 0, w, h);

      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  /* ═══ RADAR SWEEP CANVAS ═══ */
  useEffect(() => {
    const canvas = orbitalCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const size = 340;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + "px";
    canvas.style.height = size + "px";
    ctx.scale(dpr, dpr);

    const cx = size / 2, cy = size / 2;
    const maxR = 140;
    let time = 0;
    let raf;

    function draw() {
      time += 0.016;
      ctx.clearRect(0, 0, size, size);

      // Concentric rings
      for (let i = 1; i <= 5; i++) {
        const r = (maxR / 5) * i;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(249,115,22,${i === 5 ? 0.12 : 0.05})`;
        ctx.lineWidth = i === 5 ? 1.5 : 0.8;
        ctx.stroke();
      }

      // Crosshairs
      ctx.strokeStyle = "rgba(249,115,22,0.06)"; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(cx - maxR, cy); ctx.lineTo(cx + maxR, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy - maxR); ctx.lineTo(cx, cy + maxR); ctx.stroke();

      // Sweep
      const sweepAngle = time * 0.8;
      for (let i = 0; i < 30; i++) {
        const a = sweepAngle - i * 0.02;
        const trailAlpha = (1 - i / 30) * 0.06;
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, maxR, a - 0.02, a + 0.02);
        ctx.closePath();
        ctx.fillStyle = `rgba(249,115,22,${trailAlpha})`;
        ctx.fill();
      }
      const sx = cx + Math.cos(sweepAngle) * maxR;
      const sy = cy + Math.sin(sweepAngle) * maxR;
      const sweepGrad = ctx.createLinearGradient(cx, cy, sx, sy);
      sweepGrad.addColorStop(0, "rgba(249,115,22,0.6)");
      sweepGrad.addColorStop(1, "rgba(249,115,22,0.05)");
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(sx, sy);
      ctx.strokeStyle = sweepGrad; ctx.lineWidth = 2; ctx.stroke();

      // Blips
      RADAR_BLIPS.forEach(b => {
        const bx = cx + Math.cos(b.angle) * b.dist * maxR;
        const by = cy + Math.sin(b.angle) * b.dist * maxR;
        const [cr, cg, cb] = b.color;
        let angleDiff = ((sweepAngle % (Math.PI*2)) - b.angle + Math.PI*3) % (Math.PI*2) - Math.PI;
        const nearSweep = Math.abs(angleDiff) < 0.3;
        const intensity = nearSweep ? 0.9 : (0.3 + 0.15 * Math.sin(time * 2));

        const glow = ctx.createRadialGradient(bx, by, 0, bx, by, b.sz * 3);
        glow.addColorStop(0, `rgba(${cr},${cg},${cb},${0.3 * intensity})`);
        glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(bx, by, b.sz * 3, 0, Math.PI * 2); ctx.fill();

        ctx.beginPath();
        ctx.arc(bx, by, b.sz + 4, -Math.PI/2, -Math.PI/2 + Math.PI * 2 * b.progress);
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},${0.5 * intensity})`;
        ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.stroke(); ctx.lineCap = "butt";

        ctx.beginPath(); ctx.arc(bx, by, b.sz + 4, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,0.04)"; ctx.lineWidth = 2; ctx.stroke();

        const coreGrad = ctx.createRadialGradient(bx, by, 0, bx, by, b.sz);
        coreGrad.addColorStop(0, `rgba(255,255,255,${0.8 * intensity})`);
        coreGrad.addColorStop(0.4, `rgba(${cr},${cg},${cb},${0.9 * intensity})`);
        coreGrad.addColorStop(1, `rgba(${cr},${cg},${cb},${0.3 * intensity})`);
        ctx.fillStyle = coreGrad;
        ctx.beginPath(); ctx.arc(bx, by, b.sz, 0, Math.PI * 2); ctx.fill();

        ctx.shadowColor = "rgba(0,0,0,0.8)"; ctx.shadowBlur = 4;
        ctx.font = "600 7px 'IBM Plex Mono', monospace";
        ctx.fillStyle = `rgba(${cr},${cg},${cb},${0.8 * intensity})`;
        ctx.textAlign = "center";
        ctx.fillText(b.label, bx, by - b.sz - 8);
        ctx.font = "700 9px 'DM Sans', sans-serif";
        ctx.fillStyle = `rgba(255,255,255,${0.7 * intensity})`;
        ctx.fillText(b.value, bx, by + b.sz + 14);
        ctx.shadowBlur = 0;
      });

      // Center ping
      const pingPulse = 0.5 + 0.5 * Math.sin(time * 2);
      ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(249,115,22,${0.5 + 0.3 * pingPulse})`; ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, 6 + pingPulse * 4, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(249,115,22,${0.15 * (1 - pingPulse)})`; ctx.lineWidth = 1; ctx.stroke();

      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  const filteredCards = VISION_CARDS.filter(c => filter === "all" || c.status === filter);

  return (
    <div className="vb-root">
      <style>{STYLES}</style>

      {/* SVG gradient defs */}
      <svg width="0" height="0" style={{position:"absolute"}}>
        <defs>
          <linearGradient id="vbAchieveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f97316"/>
            <stop offset="50%" stopColor="#ec4899"/>
            <stop offset="100%" stopColor="#8b5cf6"/>
          </linearGradient>
          <linearGradient id="vbProgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f97316"/>
            <stop offset="100%" stopColor="#8b5cf6"/>
          </linearGradient>
          <linearGradient id="vbMsGradAmber" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b"/><stop offset="100%" stopColor="#f97316"/>
          </linearGradient>
          <linearGradient id="vbMsGradPurple" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6"/><stop offset="100%" stopColor="#ec4899"/>
          </linearGradient>
          <linearGradient id="vbMsAreaAmber" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b"/><stop offset="100%" stopColor="transparent"/>
          </linearGradient>
          <linearGradient id="vbMsAreaPurple" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6"/><stop offset="100%" stopColor="transparent"/>
          </linearGradient>
        </defs>
      </svg>

      {/* Ambient glows */}
      <div className="vb-glow-1" />
      <div className="vb-glow-2" />

      {/* ═══ HERO BANNER ═══ */}
      <section className="vb-hero">
        <canvas ref={heroCanvasRef} className="hero-canvas" />
        <div className="vb-hero-scanline" />
        <div className="vb-hud-corner tl" />
        <div className="vb-hud-corner tr" />
        <div className="vb-hud-corner bl" />
        <div className="vb-hud-corner br" />

        <div className="vb-hero-content">
          {/* LEFT PANEL */}
          <div className="vb-hero-left">
            <span className="vb-sys-label">VISION CONTROL SYSTEM v5.0</span>
            <p className="vb-greeting">Good evening, Colby — scanning your financial universe</p>
            <h1 className="vb-value">$14.5M <span className="sep">—</span> $16.1M</h1>
            <p className="vb-value-sub">TOTAL VISION PORTFOLIO &nbsp;&middot;&nbsp; 5 active visions &nbsp;&middot;&nbsp; <span>+12.4% YoY</span></p>

            <div className="vb-gauges">
              {GAUGE_DATA.map((g, gi) => (
                <div key={gi} className={`vb-gauge-card ${g.cls}`}>
                  <div className="vb-gauge-header">
                    <span className="vb-gauge-num">{g.num}</span>
                    <div className="vb-gauge-indicator" />
                  </div>
                  <span className="vb-gauge-label">{g.label}</span>
                  <div className="vb-gauge-bars" ref={el => gaugeBarRefs.current[gi] = el}>
                    {g.values.map((v, vi) => {
                      const max = Math.max(...g.values);
                      return <div key={vi} className="vb-gauge-bar" style={{height:"0%"}} data-target={`${(v/max)*100}%`} />;
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="vb-ticker">
              <div className="vb-ticker-dot" />
              <span className="vb-ticker-label">SAVINGS RATE</span>
              <div className="vb-ticker-bar"><div className="vb-ticker-fill" style={{width:`${tickerWidth}%`}} /></div>
              <span className="vb-ticker-val">$7,200/mo</span>
            </div>
          </div>

          {/* CENTER: Orbital */}
          <div className="vb-hero-orbital">
            <canvas ref={orbitalCanvasRef} width="680" height="680" />
          </div>

          {/* RIGHT: Player Card */}
          <div className="vb-hero-player">
            <div className="vb-player-card">
              <div className="vb-player-top">
                <div className="vb-player-identity">
                  <div className="vb-avatar">
                    <div className="vb-avatar-ring" />
                    <div className="vb-avatar-inner">CO</div>
                    <span className="vb-level-badge">7</span>
                  </div>
                  <div>
                    <h3 className="vb-player-name">Colby Culbertson</h3>
                    <p className="vb-player-title">WEALTH ARCHITECT</p>
                  </div>
                </div>

                <div>
                  <div className="vb-xp-bar-outer">
                    <div className="vb-xp-bar-inner" style={{width:`${xpBarWidth}%`}} />
                  </div>
                  <div className="vb-xp-meta">
                    <span className="vb-xp-text">{xpDisplay.toLocaleString()} / 7,500 XP</span>
                    <span className="vb-xp-level">&rarr; Level 8</span>
                  </div>
                </div>
              </div>

              <div className="vb-player-stats">
                {[
                  {icon:"🔥", num:"14", label:"STREAK"},
                  {icon:"⚡", num:"4,850", label:"TOTAL XP"},
                  {icon:"🏅", num:"12", label:"BADGES"},
                  {icon:"🎯", num:"3", label:"QUESTS"},
                ].map((s, i) => (
                  <div key={i} className="vb-p-stat">
                    <span className="vb-p-stat-icon">{s.icon}</span>
                    <span className="vb-p-stat-num">{s.num}</span>
                    <span className="vb-p-stat-label">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Linked accounts bar */}
        <div className="vb-accounts">
          <span className="vb-accounts-label">LINKED ACCOUNTS</span>
          <div className="vb-account-chips">
            {ACCOUNTS.map((a, i) => {
              const Logo = acctLogoMap[a.logo];
              return (
                <div key={i} className="vb-account-chip">
                  <div className={`vb-acct-logo ${a.logo}`}>{Logo && <Logo />}</div>
                  <span className={`vb-acct-status${a.syncing ? " syncing" : ""}`} />
                  {a.name} <span className="vb-acct-mask">{a.mask}</span>
                </div>
              );
            })}
          </div>
          <button className="vb-link-btn">
            <PlusCircleIcon />
            Link Account
          </button>
        </div>
      </section>

      {/* ═══ ACHIEVEMENTS ═══ */}
      <section className="vb-section">
        <div className="vb-section-header">
          <div className="vb-section-header-left">
            <span style={{fontSize:20}}>🏆</span>
            <h2 className="vb-section-title">Achievements</h2>
            <span className="vb-achieve-count">12 of 24 earned</span>
            <span className="vb-xp-earned">+2,400 XP earned</span>
          </div>
          <button className="vb-view-all-btn" onClick={() => setShowAllAchievements(!showAllAchievements)}>
            {showAllAchievements ? "Show Less" : "View All \u2192"}
          </button>
        </div>

        <div className="vb-achieve-grid">
          {ACHIEVEMENTS.map((a, i) => {
            if (!showAllAchievements && a.hiddenDefault) return null;
            const circ = 2 * Math.PI * 40;
            return (
              <div key={i} className={`vb-achieve-card ${a.earned ? "earned" : "locked"}`}>
                <div className="vb-achieve-ring-wrap">
                  <svg className="vb-achieve-ring-svg" viewBox="0 0 88 88">
                    <circle className="vb-achieve-ring-bg" cx="44" cy="44" r="40"/>
                    <circle
                      className="vb-achieve-ring-fill"
                      cx="44" cy="44" r="40"
                      ref={el => achieveRingRefs.current[i] = el}
                      data-progress={a.progress}
                    />
                  </svg>
                  <span className="vb-achieve-icon-center">{a.icon}</span>
                  {a.earned && <div className="vb-achieve-check">&#10003;</div>}
                </div>
                <p className="vb-achieve-name">{a.name}</p>
                <p className="vb-achieve-xp">+{a.xp.toLocaleString()} XP</p>
                <div className="vb-achieve-tooltip">
                  <p className="vb-achieve-tooltip-name">{a.name}</p>
                  <p className="vb-achieve-tooltip-desc">{a.desc}</p>
                  <p className="vb-achieve-tooltip-xp">{a.earned ? `+${a.xp.toLocaleString()} XP earned` : a.progress > 0 ? `${a.progress}% complete` : "Not started"}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══ ASSETS & PURCHASES ═══ */}
      <section className="vb-section">
        <div className="vb-section-header">
          <h2 className="vb-section-title">Assets &amp; Purchases</h2>
          <div className="vb-filter-row">
            {["all","active","planning","future"].map(f => (
              <button key={f} className={`vb-filter-pill ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="vb-vision-grid">
          {filteredCards.map(c => (
            <div key={c.id} className="vb-vision-card" data-status={c.status}>
              <div className="vb-card-image-wrap">
                <img src={c.img} alt={c.title} />
                <div className="vb-card-image-overlay" />
                <span className={`vb-status-badge vb-status-${c.status}`}>{c.status.toUpperCase()}</span>
              </div>
              <div className="vb-card-content">
                <h3 className="vb-card-title">{c.title}</h3>
                <p className="vb-card-target">{c.target}</p>
                <p className="vb-card-note">{c.note}</p>
                <div className="vb-card-stats-row">
                  <div className="vb-progress-ring-wrap">
                    <svg width="64" height="64" viewBox="0 0 64 64">
                      <circle cx="32" cy="32" r="27" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5"/>
                      <circle cx="32" cy="32" r="27" fill="none" stroke="url(#vbProgGrad)" strokeWidth="5" strokeDasharray="169.65" strokeDashoffset={c.dashoffset} strokeLinecap="round" transform="rotate(-90 32 32)"/>
                    </svg>
                    <span className="vb-progress-pct">{c.pct}%</span>
                  </div>
                  <div className="vb-card-stats-col">
                    <span className="vb-card-stat-dim">{c.needPerMo}/mo needed to save</span>
                    <span className="vb-card-stat-dim">{c.paceMonths} mo at current pace</span>
                    <span className="vb-card-stat-dim">Target: {c.targetDate}</span>
                  </div>
                </div>
                <div className="vb-card-bottom">
                  <div className="vb-card-bottom-row">
                    <span className="vb-card-bottom-label">Monthly savings needed</span>
                    <span className="vb-card-bottom-val">{c.needPerMo}</span>
                  </div>
                  <div className="vb-card-bottom-row">
                    <span className="vb-card-bottom-label">Current pace ETA</span>
                    <span className={`vb-card-bottom-val ${c.paceColor}`}>{c.paceMonths} months</span>
                  </div>
                </div>
                {c.gapAlert && <div className="vb-gap-alert">&#9888; {c.gapAlert}</div>}
              </div>
            </div>
          ))}

          {/* Add new vision card */}
          <div className="vb-add-card" onClick={() => setModalOpen(true)}>
            <div className="vb-add-card-inner">
              <div className="vb-add-icon">+</div>
              <h3 className="vb-add-title">Add New Vision</h3>
              <p className="vb-add-desc">Paste a link to any item, property, or asset<br/>and we'll pull in the image &amp; details automatically</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FINANCIAL MILESTONES ═══ */}
      <section className="vb-section">
        <div className="vb-section-header">
          <div className="vb-section-header-left">
            <h2 className="vb-section-title">Financial Milestones</h2>
            <span className="vb-achieve-count">2 goals</span>
          </div>
          <button className="vb-add-milestone-btn" onClick={() => setModalOpen(true)}>
            <PlusCircleIcon />
            Add Milestone
          </button>
        </div>
        <div className="vb-milestone-grid">
          {/* $10M Net Worth */}
          <div className="vb-ms-card amber">
            <div className="vb-ms-body">
              <div className="vb-ms-header">
                <div className="vb-ms-header-left">
                  <div className="vb-ms-icon-wrap">💎</div>
                  <div>
                    <h3 className="vb-ms-title">$10M Net Worth Milestone</h3>
                    <p className="vb-ms-target-val">$10,000,000</p>
                  </div>
                </div>
                <span className="vb-status-badge" style={{background:"rgba(234,179,8,0.15)",color:"#f59e0b",borderColor:"#f59e0b",position:"static"}}>TRACKING</span>
              </div>
              <div className="vb-ms-viz">
                <div className="vb-ms-gauge-wrap">
                  <svg className="vb-ms-gauge-svg" viewBox="0 0 130 130">
                    <circle className="vb-ms-gauge-bg" cx="65" cy="65" r="56"/>
                    <circle className="vb-ms-gauge-fill" cx="65" cy="65" r="56" ref={el => msGaugeRefs.current[0] = el} data-pct="25.7"/>
                  </svg>
                  <div className="vb-ms-gauge-center">
                    <span className="vb-ms-gauge-pct">25.7%</span>
                    <span className="vb-ms-gauge-label">COMPLETE</span>
                  </div>
                </div>
                <div className="vb-ms-chart-area">
                  <p className="vb-ms-chart-title">WEALTH TRAJECTORY</p>
                  <svg className="vb-ms-chart-svg" viewBox="0 0 260 80" preserveAspectRatio="none">
                    <line className="vb-ms-chart-grid-line" x1="0" y1="20" x2="260" y2="20"/>
                    <line className="vb-ms-chart-grid-line" x1="0" y1="40" x2="260" y2="40"/>
                    <line className="vb-ms-chart-grid-line" x1="0" y1="60" x2="260" y2="60"/>
                    <line className="vb-ms-chart-target-line" x1="0" y1="8" x2="260" y2="8"/>
                    <text className="vb-ms-chart-target-label" x="262" y="11">$10M</text>
                    <path className="vb-ms-chart-area-fill" d="M0,70 L37,68 L74,65 L111,60 L148,52 L185,40 L222,25 L260,8 L260,80 L0,80 Z"/>
                    <polyline className="vb-ms-chart-line" points="0,70 37,68 74,66 111,64" style={{opacity:1}}/>
                    <polyline className="vb-ms-chart-line" points="111,64 148,52 185,40 222,25 260,8" style={{strokeDasharray:"6 4",opacity:0.5}}/>
                    <circle className="vb-ms-chart-dot-glow" cx="111" cy="64" r="6"/>
                    <circle className="vb-ms-chart-dot" cx="111" cy="64" r="3"/>
                  </svg>
                  <div className="vb-ms-chart-labels">
                    <span className="vb-ms-chart-label-text">2024</span>
                    <span className="vb-ms-chart-label-text">2026</span>
                    <span className="vb-ms-chart-label-text" style={{color:"#f59e0b"}}>NOW</span>
                    <span className="vb-ms-chart-label-text">2028</span>
                    <span className="vb-ms-chart-label-text">2030</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="vb-ms-stats">
              <div className="vb-ms-stat"><span className="vb-ms-stat-val amber-c">$2.57M</span><span className="vb-ms-stat-label">CURRENT</span></div>
              <div className="vb-ms-stat"><span className="vb-ms-stat-val">2030</span><span className="vb-ms-stat-label">TARGET YEAR</span></div>
              <div className="vb-ms-stat"><span className="vb-ms-stat-val red">$208K/mo</span><span className="vb-ms-stat-label">NEEDED</span></div>
              <div className="vb-ms-stat"><span className="vb-ms-stat-val" style={{color:"rgba(255,255,255,0.4)"}}>1,439 mo</span><span className="vb-ms-stat-label">AT PACE</span></div>
            </div>
            <div className="vb-ms-note-bar">
              <span style={{opacity:0.5}}>💡</span>
              First major wealth milestone — accelerate with business exits &amp; real estate appreciation
            </div>
          </div>

          {/* Passive Income */}
          <div className="vb-ms-card purple">
            <div className="vb-ms-body">
              <div className="vb-ms-header">
                <div className="vb-ms-header-left">
                  <div className="vb-ms-icon-wrap">📈</div>
                  <div>
                    <h3 className="vb-ms-title">Passive Income &gt; $50K/mo</h3>
                    <p className="vb-ms-target-val">$50,000/mo</p>
                  </div>
                </div>
                <span className="vb-status-badge" style={{background:"rgba(234,179,8,0.15)",color:"#f59e0b",borderColor:"#f59e0b",position:"static"}}>TRACKING</span>
              </div>
              <div className="vb-ms-viz">
                <div className="vb-ms-gauge-wrap">
                  <svg className="vb-ms-gauge-svg" viewBox="0 0 130 130">
                    <circle className="vb-ms-gauge-bg" cx="65" cy="65" r="56"/>
                    <circle className="vb-ms-gauge-fill" cx="65" cy="65" r="56" ref={el => msGaugeRefs.current[1] = el} data-pct="16.4"/>
                  </svg>
                  <div className="vb-ms-gauge-center">
                    <span className="vb-ms-gauge-pct">16.4%</span>
                    <span className="vb-ms-gauge-label">COMPLETE</span>
                  </div>
                </div>
                <div className="vb-ms-chart-area">
                  <p className="vb-ms-chart-title">INCOME TRAJECTORY</p>
                  <svg className="vb-ms-chart-svg" viewBox="0 0 260 80" preserveAspectRatio="none">
                    <line className="vb-ms-chart-grid-line" x1="0" y1="20" x2="260" y2="20"/>
                    <line className="vb-ms-chart-grid-line" x1="0" y1="40" x2="260" y2="40"/>
                    <line className="vb-ms-chart-grid-line" x1="0" y1="60" x2="260" y2="60"/>
                    <line className="vb-ms-chart-target-line" x1="0" y1="8" x2="260" y2="8"/>
                    <text className="vb-ms-chart-target-label" x="262" y="11">$50K</text>
                    <path className="vb-ms-chart-area-fill" d="M0,75 L43,72 L87,67 L130,58 L173,42 L216,24 L260,8 L260,80 L0,80 Z"/>
                    <polyline className="vb-ms-chart-line" points="0,75 43,72 87,67" style={{opacity:1}}/>
                    <polyline className="vb-ms-chart-line" points="87,67 130,58 173,42 216,24 260,8" style={{strokeDasharray:"6 4",opacity:0.5}}/>
                    <circle className="vb-ms-chart-dot-glow" cx="87" cy="67" r="6"/>
                    <circle className="vb-ms-chart-dot" cx="87" cy="67" r="3"/>
                  </svg>
                  <div className="vb-ms-chart-labels">
                    <span className="vb-ms-chart-label-text">2024</span>
                    <span className="vb-ms-chart-label-text" style={{color:"#8b5cf6"}}>NOW</span>
                    <span className="vb-ms-chart-label-text">2026</span>
                    <span className="vb-ms-chart-label-text">2028</span>
                    <span className="vb-ms-chart-label-text">2029</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="vb-ms-stats">
              <div className="vb-ms-stat"><span className="vb-ms-stat-val purple-c">$8.2K/mo</span><span className="vb-ms-stat-label">CURRENT</span></div>
              <div className="vb-ms-stat"><span className="vb-ms-stat-val">2029</span><span className="vb-ms-stat-label">TARGET YEAR</span></div>
              <div className="vb-ms-stat"><span className="vb-ms-stat-val amber-c">$17K/mo</span><span className="vb-ms-stat-label">NEEDED</span></div>
              <div className="vb-ms-stat"><span className="vb-ms-stat-val" style={{color:"rgba(255,255,255,0.4)"}}>86 mo</span><span className="vb-ms-stat-label">AT PACE</span></div>
            </div>
            <div className="vb-ms-note-bar">
              <span style={{opacity:0.5}}>💡</span>
              Rental + business dividends + investments — add 2 more STR properties to accelerate
            </div>
          </div>
        </div>
      </section>

      {/* ═══ ADD VISION MODAL ═══ */}
      <div className={`vb-modal-overlay ${modalOpen ? "open" : ""}`} onClick={() => setModalOpen(false)}>
        <div className="vb-modal" onClick={e => e.stopPropagation()}>
          <div className="vb-modal-header">
            <h2 className="vb-modal-title">Add New Vision</h2>
            <button className="vb-modal-close" onClick={() => setModalOpen(false)}>&#10005;</button>
          </div>
          <div className="vb-modal-body">
            <label className="vb-modal-label">Paste a link</label>
            <div className="vb-link-input-wrap">
              <input type="text" className="vb-link-input" placeholder="https://zillow.com/... or https://tesla.com/..." />
              <button className="vb-link-fetch-btn">Fetch &rarr;</button>
            </div>
            <p className="vb-link-hint">We'll auto-pull the image, name, and price from the URL</p>

            <div className="vb-modal-divider" />

            <label className="vb-modal-label">Or add manually</label>
            <div className="vb-form-grid">
              <div>
                <label className="vb-form-label">VISION NAME</label>
                <input className="vb-form-input" placeholder="e.g., Dream Beach House" />
              </div>
              <div>
                <label className="vb-form-label">CATEGORY</label>
                <select className="vb-form-input">
                  <option>Real Estate</option>
                  <option>Vehicle</option>
                  <option>Luxury</option>
                  <option>Travel</option>
                  <option>Business</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="vb-form-label">ESTIMATED COST (LOW)</label>
                <input className="vb-form-input" placeholder="$0" />
              </div>
              <div>
                <label className="vb-form-label">ESTIMATED COST (HIGH)</label>
                <input className="vb-form-input" placeholder="$0" />
              </div>
              <div>
                <label className="vb-form-label">TARGET DATE</label>
                <input className="vb-form-input" type="month" />
              </div>
              <div>
                <label className="vb-form-label">STATUS</label>
                <select className="vb-form-input">
                  <option>Planning</option>
                  <option>Active</option>
                  <option>Future</option>
                </select>
              </div>
            </div>
            <div>
              <label className="vb-form-label">NOTES</label>
              <textarea className="vb-form-input" style={{height:72}} placeholder="Any details about this vision..." />
            </div>
            <button className="vb-add-vision-btn">Add to Vision Board &nbsp;&#10022;&nbsp; +100 XP</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisionBoard;
