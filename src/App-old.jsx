import { useState, useMemo, useCallback, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area, RadarChart,
  Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Treemap
} from "recharts";

/* ═══════════════════════════════════════════════════════════
   OPEN CLAW MISSION CONTROL — v3.0
   Full 15-screen sidebar application
   ═══════════════════════════════════════════════════════════ */

// ── Color Palette ──
const C = {
  bg: "#030712", surface: "#111827", card: "#1f2937", border: "#374151",
  text: "#f9fafb", muted: "#9ca3af", accent: "#6366f1", accentLight: "#818cf8",
  green: "#10b981", red: "#ef4444", amber: "#f59e0b", cyan: "#0ea5e9",
  purple: "#8b5cf6", pink: "#ec4899", teal: "#14b8a6",
};

// ── Agent Data (consistent avatars everywhere) ──
const AGENTS = [
  { id: "tm", name: "Task Master", initials: "TM", color: "#6366f1", ring: "#818cf8", dept: "Operations", model: "Claude Opus 4", role: "Chief Operations Agent", status: "online", costDay: 12.40, costMonth: 372, sessions: 847 },
  { id: "bm", name: "Bot Manager", initials: "BM", color: "#10b981", ring: "#34d399", dept: "Engineering", model: "Claude Sonnet 4", role: "Infrastructure Lead", status: "online", costDay: 8.20, costMonth: 246, sessions: 623 },
  { id: "fm", name: "Fleet Monitor", initials: "FM", color: "#0ea5e9", ring: "#38bdf8", dept: "Engineering", model: "Claude Haiku 4.5", role: "Fleet Operations Specialist", status: "online", costDay: 3.10, costMonth: 93, sessions: 1204 },
  { id: "ae", name: "Alert Engine", initials: "AE", color: "#ef4444", ring: "#f87171", dept: "Operations", model: "Claude Haiku 4.5", role: "Alert & Monitoring Agent", status: "online", costDay: 2.80, costMonth: 84, sessions: 2105 },
  { id: "cr", name: "Code Reviewer", initials: "CR", color: "#8b5cf6", ring: "#a78bfa", dept: "Engineering", model: "Claude Opus 4", role: "Senior Code Analyst", status: "busy", costDay: 15.60, costMonth: 468, sessions: 412 },
  { id: "dg", name: "Doc Generator", initials: "DG", color: "#ec4899", ring: "#f472b6", dept: "Documentation", model: "Claude Sonnet 4", role: "Documentation Specialist", status: "online", costDay: 5.30, costMonth: 159, sessions: 538 },
  { id: "ba", name: "Biz Analytics", initials: "BA", color: "#f59e0b", ring: "#fbbf24", dept: "Analytics", model: "Claude Sonnet 4", role: "Business Intelligence Agent", status: "online", costDay: 7.90, costMonth: 237, sessions: 389 },
  { id: "ib", name: "Integration Bridge", initials: "IB", color: "#14b8a6", ring: "#2dd4bf", dept: "Engineering", model: "Claude Sonnet 4", role: "Integration Specialist", status: "offline", costDay: 4.50, costMonth: 135, sessions: 291 },
];

const DEPARTMENTS = ["Operations", "Engineering", "Analytics", "Documentation"];

// ── Projects ──
const PROJECTS = [
  { id: "atlas", name: "Mission Control ATLAS", color: "#6366f1", agents: ["tm", "bm", "fm", "cr"], status: "on-track", progress: 68, priority: "high", tasks: 24, completed: 16 },
  { id: "phoenix", name: "Fleet Scaling Engine", color: "#ef4444", agents: ["fm", "bm", "ae"], status: "at-risk", progress: 42, priority: "high", tasks: 18, completed: 7 },
  { id: "nova", name: "Cost Analytics Module", color: "#f59e0b", agents: ["ba", "tm"], status: "on-track", progress: 55, priority: "medium", tasks: 12, completed: 6 },
  { id: "echo", name: "Integration Hub v2", color: "#10b981", agents: ["ib", "bm", "dg"], status: "blocked", progress: 31, priority: "medium", tasks: 15, completed: 4 },
  { id: "omega", name: "Autonomous Factory Pipeline", color: "#8b5cf6", agents: ["ba", "tm", "cr"], status: "on-track", progress: 18, priority: "low", tasks: 20, completed: 3 },
];

// ── Tasks ──
const TASKS_DATA = [
  { id: "t1", name: "Implement OAuth2 refresh token rotation", project: "atlas", agents: ["cr","bm"], status: "working", priority: "high", points: 5, daysActive: 3 },
  { id: "t2", name: "Fix WebSocket reconnection on mobile", project: "atlas", agents: ["fm"], status: "stuck", priority: "critical", points: 3, daysActive: 7 },
  { id: "t3", name: "Build cost ingestion service", project: "nova", agents: ["ba","tm"], status: "working", priority: "high", points: 8, daysActive: 1 },
  { id: "t4", name: "Design fleet auto-scaling algorithm", project: "phoenix", agents: ["fm","bm"], status: "working", priority: "high", points: 13, daysActive: 2 },
  { id: "t5", name: "Write API docs for bot-manager endpoints", project: "echo", agents: ["dg"], status: "review", priority: "medium", points: 3, daysActive: 5 },
  { id: "t6", name: "Set up Prometheus alerting rules", project: "atlas", agents: ["ae"], status: "done", priority: "medium", points: 5, daysActive: 10 },
  { id: "t7", name: "Create Monday.com integration connector", project: "echo", agents: ["ib","bm"], status: "todo", priority: "high", points: 8, daysActive: 0 },
  { id: "t8", name: "Implement RBAC permission middleware", project: "atlas", agents: ["cr"], status: "working", priority: "critical", points: 8, daysActive: 4 },
  { id: "t9", name: "Build executive KPI summary dashboard", project: "nova", agents: ["ba"], status: "todo", priority: "medium", points: 5, daysActive: 0 },
  { id: "t10", name: "Deploy canary release pipeline", project: "atlas", agents: ["bm"], status: "done", priority: "high", points: 5, daysActive: 12 },
  { id: "t11", name: "Implement cost anomaly detection", project: "nova", agents: ["ba","tm"], status: "todo", priority: "medium", points: 8, daysActive: 0 },
  { id: "t12", name: "Fix alert deduplication logic", project: "phoenix", agents: ["ae"], status: "working", priority: "high", points: 3, daysActive: 6 },
  { id: "t13", name: "Build bot health check widget", project: "phoenix", agents: ["fm"], status: "review", priority: "medium", points: 5, daysActive: 8 },
  { id: "t14", name: "Create Slack notification templates", project: "echo", agents: ["ib","dg"], status: "stuck", priority: "medium", points: 3, daysActive: 4 },
  { id: "t15", name: "Implement GraphQL federation gateway", project: "atlas", agents: ["cr","bm"], status: "done", priority: "critical", points: 13, daysActive: 14 },
  { id: "t16", name: "Design mobile push notification system", project: "atlas", agents: ["bm"], status: "todo", priority: "low", points: 8, daysActive: 0 },
  { id: "t17", name: "Load test fleet-monitor at 10K bots", project: "phoenix", agents: ["fm","ae"], status: "working", priority: "high", points: 5, daysActive: 2 },
  { id: "t18", name: "Build custom report export (CSV/PDF)", project: "nova", agents: ["ba","dg"], status: "todo", priority: "low", points: 5, daysActive: 0 },
  { id: "t19", name: "Implement audit log viewer UI", project: "atlas", agents: ["cr"], status: "working", priority: "medium", points: 8, daysActive: 3 },
  { id: "t20", name: "Set up ELK stack for centralized logging", project: "atlas", agents: ["bm","ae"], status: "done", priority: "high", points: 8, daysActive: 15 },
  { id: "t21", name: "Source Twitter API trending data pipeline", project: "omega", agents: ["ba"], status: "working", priority: "medium", points: 5, daysActive: 2 },
  { id: "t22", name: "Build idea scoring algorithm", project: "omega", agents: ["ba","tm"], status: "todo", priority: "high", points: 13, daysActive: 0 },
  { id: "t23", name: "Create skill grading evaluation framework", project: "omega", agents: ["cr"], status: "working", priority: "medium", points: 8, daysActive: 1 },
];

// ── Financial Data ──
const COMPANIES = [
  { id: "cg", name: "Culbertson & Gray Group", revenue: 284000, expenses: 196000, burn: 16333, aiCost: 1794, humanEquiv: 42000 },
  { id: "oc", name: "Open Claw", revenue: 0, expenses: 8400, burn: 8400, aiCost: 1794, humanEquiv: 85000 },
  { id: "jc", name: "JC Consulting", revenue: 18500, expenses: 4200, burn: 0, aiCost: 420, humanEquiv: 12000 },
];

// ── Skills ──
const SKILLS = [
  { id: "s1", name: "Monday.com Operations", grade: "A", score: 94, usage: 342, agents: ["tm"], version: "3.2" },
  { id: "s2", name: "Code Review & Analysis", grade: "A+", score: 97, usage: 218, agents: ["cr"], version: "2.8" },
  { id: "s3", name: "Document Generation", grade: "B+", score: 87, usage: 156, agents: ["dg"], version: "2.1" },
  { id: "s4", name: "Fleet Monitoring", grade: "A-", score: 91, usage: 890, agents: ["fm"], version: "4.0" },
  { id: "s5", name: "Cost Analytics", grade: "B", score: 82, usage: 104, agents: ["ba"], version: "1.9" },
  { id: "s6", name: "Alert Management", grade: "A", score: 93, usage: 1540, agents: ["ae"], version: "3.5" },
  { id: "s7", name: "API Integration", grade: "C+", score: 72, usage: 67, agents: ["ib"], version: "1.2" },
  { id: "s8", name: "Task Orchestration", grade: "A", score: 95, usage: 445, agents: ["tm","bm"], version: "3.7" },
  { id: "s9", name: "Discord Bot Management", grade: "B-", score: 78, usage: 89, agents: ["bm"], version: "1.5" },
  { id: "s10", name: "Financial Modeling", grade: "B", score: 83, usage: 52, agents: ["ba"], version: "1.1" },
];

// ── Forge Ideas ──
const FORGE_IDEAS = [
  { id: "f1", name: "AI Resume Screener SaaS", stage: "building", score: 87, source: "Twitter Trends", revenue: null },
  { id: "f2", name: "Automated Compliance Checker", stage: "evaluating", score: 74, source: "Reddit r/startups", revenue: null },
  { id: "f3", name: "Smart Invoice Parser", stage: "launched", score: 91, source: "Financial Trends", revenue: 1240 },
  { id: "f4", name: "SEO Content Farm Engine", stage: "testing", score: 68, source: "Blog Monitor", revenue: null },
  { id: "f5", name: "Micro-SaaS Directory Scraper", stage: "sourced", score: 55, source: "Twitter Trends", revenue: null },
  { id: "f6", name: "AI Meeting Notes Summarizer", stage: "reviewing", score: 82, source: "Product Hunt", revenue: null },
  { id: "f7", name: "Automated Bookkeeping Bot", stage: "approved", score: 79, source: "Financial Trends", revenue: null },
];

// ── Sessions Data ──
function generateSessions() {
  const models = ["Claude Opus 4", "Claude Sonnet 4", "Claude Haiku 4.5"];
  const sessions = [];
  for (let i = 0; i < 30; i++) {
    const agent = AGENTS[Math.floor(Math.random() * AGENTS.length)];
    const model = models[Math.floor(Math.random() * models.length)];
    const tokens = Math.floor(Math.random() * 180000) + 5000;
    const dur = Math.floor(Math.random() * 3600) + 60;
    const cost = model.includes("Opus") ? tokens * 0.00004 : model.includes("Sonnet") ? tokens * 0.000008 : tokens * 0.000002;
    sessions.push({
      id: `sess-${i}`, agent: agent.name, agentId: agent.id, model,
      tokens, duration: dur, cost: Math.round(cost * 100) / 100,
      start: new Date(2026, 2, 21 - Math.floor(i / 4), 8 + (i % 12), Math.floor(Math.random() * 60)),
    });
  }
  return sessions;
}
const SESSIONS = generateSessions();

// ── Activity Feed Data ──
const ACTIVITIES = [
  { id: "a1", agent: "tm", action: "Completed task", target: "Deploy canary release pipeline", time: "2 min ago", type: "success" },
  { id: "a2", agent: "cr", action: "Started code review", target: "OAuth2 refresh token rotation", time: "5 min ago", type: "info" },
  { id: "a3", agent: "ae", action: "Triggered alert", target: "High CPU on VPS-03", time: "8 min ago", type: "warning" },
  { id: "a4", agent: "fm", action: "Flagged as stuck", target: "WebSocket reconnection on mobile", time: "12 min ago", type: "error" },
  { id: "a5", agent: "ba", action: "Generated report", target: "Weekly cost analytics", time: "18 min ago", type: "success" },
  { id: "a6", agent: "dg", action: "Published document", target: "API docs v2.3", time: "25 min ago", type: "info" },
  { id: "a7", agent: "bm", action: "Scaled fleet", target: "+3 instances on phoenix cluster", time: "31 min ago", type: "info" },
  { id: "a8", agent: "tm", action: "Created task", target: "Build idea scoring algorithm", time: "42 min ago", type: "info" },
  { id: "a9", agent: "ib", action: "Connection failed", target: "Slack webhook endpoint", time: "55 min ago", type: "error" },
  { id: "a10", agent: "cr", action: "Approved PR", target: "GraphQL federation gateway", time: "1 hr ago", type: "success" },
  { id: "a11", agent: "ae", action: "Resolved alert", target: "Memory usage normalized", time: "1.5 hr ago", type: "success" },
  { id: "a12", agent: "ba", action: "Detected anomaly", target: "Cost spike on Opus model", time: "2 hr ago", type: "warning" },
];

// ── System Monitor Data ──
const SYSTEM = {
  cpu: 34, ram: 62, disk: 48, network: { in: 124, out: 87 },
  uptime: "14d 7h 23m",
  containers: [
    { name: "mission-control-api", status: "running", cpu: 12, mem: 256, uptime: "14d" },
    { name: "gateway-proxy", status: "running", cpu: 8, mem: 128, uptime: "14d" },
    { name: "redis-cache", status: "running", cpu: 3, mem: 64, uptime: "14d" },
    { name: "postgres-db", status: "running", cpu: 15, mem: 512, uptime: "14d" },
    { name: "discord-bot", status: "running", cpu: 5, mem: 96, uptime: "7d" },
    { name: "cron-scheduler", status: "stopped", cpu: 0, mem: 0, uptime: "-" },
  ],
  errors: [
    { time: "10:42 AM", level: "WARN", msg: "Redis connection pool near limit (48/50)" },
    { time: "09:18 AM", level: "ERROR", msg: "Slack webhook 403 — token expired" },
    { time: "08:55 AM", level: "WARN", msg: "Disk I/O latency >200ms on /data volume" },
    { time: "Yesterday", level: "ERROR", msg: "OOM kill on fleet-monitor (restarted)" },
  ],
  crons: [
    { name: "Daily cost rollup", schedule: "0 2 * * *", lastRun: "Today 2:00 AM", status: "success", enabled: true },
    { name: "Weekly report gen", schedule: "0 6 * * 1", lastRun: "Mon 6:00 AM", status: "success", enabled: true },
    { name: "Hourly health check", schedule: "0 * * * *", lastRun: "10:00 AM", status: "success", enabled: true },
    { name: "Nightly backup", schedule: "0 3 * * *", lastRun: "Today 3:00 AM", status: "failed", enabled: true },
    { name: "Model benchmark", schedule: "0 4 * * 0", lastRun: "Sun 4:00 AM", status: "success", enabled: false },
  ],
};

// ── Cost trend data ──
function genCostTrend(days) {
  const d = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(2026, 2, 21 - i);
    const isWknd = date.getDay() === 0 || date.getDay() === 6;
    const f = isWknd ? 0.3 : 1;
    d.push({
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      total: +(((Math.random() * 40 + 30) * f).toFixed(2)),
      opus: +(((Math.random() * 20 + 15) * f).toFixed(2)),
      sonnet: +(((Math.random() * 12 + 8) * f).toFixed(2)),
      haiku: +(((Math.random() * 5 + 2) * f).toFixed(2)),
    });
  }
  return d;
}
const COST_TREND = genCostTrend(14);

// ═══════════════════════════════════════
// SVG ICON COMPONENTS
// ═══════════════════════════════════════
const Icon = ({ d, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);

const icons = {
  home: <Icon d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10" />,
  command: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/></svg>,
  team: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  floor: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
  projects: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  tasks: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  finance: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  forge: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  skills: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>,
  activity: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  sessions: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  memory: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  docs: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  files: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>,
  system: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  settings: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  search: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  bell: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  chevron: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  menu: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  x: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
};

// ── Navigation items ──
const NAV_ITEMS = [
  { id: "home", label: "Home", icon: icons.home },
  { id: "command", label: "Command Deck", icon: icons.command },
  { id: "team", label: "Team", icon: icons.team },
  { id: "floor", label: "The Floor", icon: icons.floor },
  { id: "projects", label: "Projects", icon: icons.projects },
  { id: "tasks", label: "Tasks", icon: icons.tasks },
  { id: "finance", label: "Finance", icon: icons.finance },
  { id: "forge", label: "The Forge", icon: icons.forge },
  { id: "skills", label: "Skill Lab", icon: icons.skills },
  { id: "activity", label: "Activity Feed", icon: icons.activity },
  { id: "sessions", label: "Sessions", icon: icons.sessions },
  { id: "memory", label: "Memory", icon: icons.memory },
  { id: "docs", label: "Docs Hub", icon: icons.docs },
  { id: "files", label: "Workspace Files", icon: icons.files },
  { id: "system", label: "System Monitor", icon: icons.system },
  { id: "rentals", label: "Rentals", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg> },
];

// ═══════════════════════════════════════
// SHARED UI COMPONENTS
// ═══════════════════════════════════════
const Badge = ({ children, color = C.accent }) => (
  <span style={{ background: color + "22", color, fontSize: 11, padding: "2px 8px", borderRadius: 9999, fontWeight: 600 }}>{children}</span>
);

const Avatar = ({ agent, size = 32 }) => {
  const a = typeof agent === "string" ? AGENTS.find(x => x.id === agent) : agent;
  if (!a) return null;
  const statusColor = a.status === "online" ? C.green : a.status === "busy" ? C.amber : "#64748b";
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: "50%", background: a.color,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.35, fontWeight: 700, color: "#fff", border: `2px solid ${a.ring}`,
      }}>{a.initials}</div>
      <div style={{
        position: "absolute", bottom: -1, right: -1, width: size * 0.3, height: size * 0.3,
        borderRadius: "50%", background: statusColor, border: `2px solid ${C.surface}`,
      }} />
    </div>
  );
};

const Card = ({ children, style = {}, onClick }) => (
  <div onClick={onClick} style={{
    background: C.card, borderRadius: 12, border: `1px solid ${C.border}`,
    padding: 20, ...style, cursor: onClick ? "pointer" : "default",
  }}>{children}</div>
);

const KPI = ({ label, value, sub, color = C.accent, icon }) => (
  <Card style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ color: C.muted, fontSize: 12, fontWeight: 500 }}>{label}</span>
      {icon && <span style={{ color }}>{icon}</span>}
    </div>
    <div style={{ fontSize: 28, fontWeight: 700, color: C.text, letterSpacing: -1 }}>{value}</div>
    {sub && <div style={{ fontSize: 12, color: C.muted }}>{sub}</div>}
    <div style={{ height: 3, borderRadius: 2, background: color + "33", marginTop: 4 }}>
      <div style={{ height: 3, borderRadius: 2, background: color, width: "60%" }} />
    </div>
  </Card>
);

const StatusDot = ({ status }) => {
  const colors = { "on-track": C.green, "at-risk": C.amber, blocked: C.red, completed: C.cyan };
  return <span style={{ width: 8, height: 8, borderRadius: "50%", background: colors[status] || C.muted, display: "inline-block" }} />;
};

const PriorityDot = ({ priority }) => {
  const colors = { critical: C.red, high: C.amber, medium: C.accent, low: C.muted };
  return <span style={{ width: 8, height: 8, borderRadius: "50%", background: colors[priority] || C.muted, display: "inline-block" }} />;
};

const ProgressBar = ({ value, color = C.accent, height = 6 }) => (
  <div style={{ height, borderRadius: height / 2, background: C.border, width: "100%" }}>
    <div style={{ height, borderRadius: height / 2, background: color, width: `${Math.min(100, value)}%`, transition: "width 0.3s" }} />
  </div>
);

const Tab = ({ active, children, onClick }) => (
  <button onClick={onClick} style={{
    background: active ? C.accent + "22" : "transparent", color: active ? C.accentLight : C.muted,
    border: active ? `1px solid ${C.accent}44` : "1px solid transparent",
    borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all 0.2s",
  }}>{children}</button>
);

const Table = ({ columns, rows }) => (
  <div style={{ overflowX: "auto", borderRadius: 8, border: `1px solid ${C.border}` }}>
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
        <tr style={{ background: C.surface }}>
          {columns.map((col, i) => (
            <th key={i} style={{ padding: "10px 12px", textAlign: "left", color: C.muted, fontWeight: 600, borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{col}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri} style={{ borderBottom: `1px solid ${C.border}22` }}>
            {row.map((cell, ci) => (
              <td key={ci} style={{ padding: "10px 12px", color: C.text, whiteSpace: "nowrap" }}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const SectionTitle = ({ children }) => (
  <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: "0 0 16px 0" }}>{children}</h2>
);

const SubTitle = ({ children }) => (
  <h3 style={{ fontSize: 15, fontWeight: 600, color: C.muted, margin: "24px 0 12px 0", textTransform: "uppercase", letterSpacing: 1 }}>{children}</h3>
);

// ═══════════════════════════════════════
// SCREEN: HOME DASHBOARD
// ═══════════════════════════════════════
const HomeScreen = () => {
  const onlineAgents = AGENTS.filter(a => a.status === "online").length;
  const busyAgents = AGENTS.filter(a => a.status === "busy").length;
  const totalTasks = TASKS_DATA.length;
  const activeTasks = TASKS_DATA.filter(t => t.status === "working").length;
  const stuckTasks = TASKS_DATA.filter(t => t.status === "stuck").length;
  const doneTasks = TASKS_DATA.filter(t => t.status === "done").length;
  const totalCostToday = AGENTS.reduce((s, a) => s + a.costDay, 0);

  const statusDist = useMemo(() => {
    const counts = {};
    TASKS_DATA.forEach(t => { counts[t.status] = (counts[t.status] || 0) + 1; });
    return Object.entries(counts).map(([k, v]) => ({
      name: k.charAt(0).toUpperCase() + k.slice(1), value: v,
      color: { todo: C.muted, working: C.amber, stuck: C.red, review: C.purple, done: C.green }[k] || C.accent,
    }));
  }, []);

  const deptLoad = useMemo(() =>
    DEPARTMENTS.map(d => ({
      name: d, agents: AGENTS.filter(a => a.dept === d).length,
      tasks: TASKS_DATA.filter(t => t.agents.some(aid => AGENTS.find(a => a.id === aid)?.dept === d)).length,
    })), []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Time + Weather */}
      <Card style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: `linear-gradient(135deg, ${C.accent}15, ${C.purple}15)` }}>
        <div>
          <div style={{ fontSize: 32, fontWeight: 700, color: C.text }}>
            {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
          </div>
          <div style={{ color: C.muted, fontSize: 14 }}>Saturday, March 21, 2026</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 24, fontWeight: 600, color: C.text }}>72°F</div>
          <div style={{ color: C.muted, fontSize: 13 }}>Clear skies — Austin, TX</div>
        </div>
      </Card>

      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <KPI label="Agents Online" value={`${onlineAgents}/${AGENTS.length}`} sub={`${busyAgents} busy`} color={C.green} />
        <KPI label="Active Tasks" value={activeTasks} sub={`${stuckTasks} stuck`} color={C.amber} />
        <KPI label="Completed" value={doneTasks} sub={`of ${totalTasks} total`} color={C.green} />
        <KPI label="Projects" value={PROJECTS.length} sub="2 on track, 1 at risk" color={C.accent} />
        <KPI label="Today's AI Cost" value={`$${totalCostToday.toFixed(2)}`} sub="across all agents" color={C.cyan} />
        <KPI label="Sessions Today" value="47" sub="avg 12 min each" color={C.purple} />
      </div>

      {/* Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Cost Trend (14 days)</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={COST_TREND}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="date" tick={{ fill: C.muted, fontSize: 11 }} />
              <YAxis tick={{ fill: C.muted, fontSize: 11 }} tickFormatter={v => `$${v}`} />
              <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }} />
              <Area type="monotone" dataKey="total" stroke={C.accent} fill={C.accent + "33"} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Task Distribution</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusDist} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                {statusDist.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }} />
              <Legend wrapperStyle={{ fontSize: 11, color: C.muted }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Agent Status + Activity */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Agent Status</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {AGENTS.map(a => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar agent={a} size={28} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{a.role}</div>
                </div>
                <Badge color={a.status === "online" ? C.green : a.status === "busy" ? C.amber : C.muted}>
                  {a.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Recent Activity</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {ACTIVITIES.slice(0, 8).map(act => {
              const ag = AGENTS.find(a => a.id === act.agent);
              const typeColor = { success: C.green, info: C.cyan, warning: C.amber, error: C.red }[act.type];
              return (
                <div key={act.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                  <Avatar agent={ag} size={22} />
                  <span style={{ color: typeColor, fontWeight: 600, minWidth: 0 }}>{act.action}</span>
                  <span style={{ color: C.muted, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{act.target}</span>
                  <span style={{ color: C.muted, fontSize: 11, whiteSpace: "nowrap" }}>{act.time}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Department Load */}
      <Card>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Department Workload</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={deptLoad}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="name" tick={{ fill: C.muted, fontSize: 11 }} />
            <YAxis tick={{ fill: C.muted, fontSize: 11 }} />
            <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }} />
            <Bar dataKey="agents" fill={C.accent} radius={[4, 4, 0, 0]} name="Agents" />
            <Bar dataKey="tasks" fill={C.cyan} radius={[4, 4, 0, 0]} name="Tasks" />
            <Legend wrapperStyle={{ fontSize: 11, color: C.muted }} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};

// ═══════════════════════════════════════
// SCREEN: COMMAND DECK
// ═══════════════════════════════════════
const CommandDeckScreen = () => {
  const [approvalTab, setApprovalTab] = useState("pending");
  const myTasks = TASKS_DATA.filter(t => t.priority === "critical" || t.priority === "high").slice(0, 6);
  const approvals = [
    { id: "ap1", title: "Deploy fleet-monitor v2.4 to production", agent: "bm", urgency: "high", time: "10 min ago" },
    { id: "ap2", title: "Increase Opus budget limit to $50/day", agent: "ba", urgency: "medium", time: "1 hr ago" },
    { id: "ap3", title: "Add new sub-agent: SEO Crawler", agent: "tm", urgency: "low", time: "3 hr ago" },
    { id: "ap4", title: "Kill stale task: Legacy API migration", agent: "cr", urgency: "medium", time: "5 hr ago" },
  ];
  const emails = [
    { id: "e1", from: "investor@vc.com", subject: "Q1 Portfolio Review — Action Required", draft: "Thank you for reaching out. I've reviewed the Q1 numbers and..." },
    { id: "e2", from: "partner@agency.com", subject: "Contract renewal discussion", draft: "Hi, I'd be happy to schedule a call this week to discuss..." },
    { id: "e3", from: "tax@advisor.com", subject: "2025 Tax Filing Deadline", draft: "Thanks for the reminder. I've forwarded the documents to..." },
  ];
  const schedule = [
    { time: "9:00 AM", event: "Daily standup", type: "recurring" },
    { time: "10:30 AM", event: "Investor call — Q1 review", type: "meeting" },
    { time: "12:00 PM", event: "Lunch break", type: "personal" },
    { time: "2:00 PM", event: "Sprint planning — ATLAS", type: "meeting" },
    { time: "4:00 PM", event: "Review Forge pipeline ideas", type: "task" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* My Tasks */}
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>My Priority Tasks</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {myTasks.map(t => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: `1px solid ${C.border}22` }}>
                <PriorityDot priority={t.priority} />
                <span style={{ flex: 1, fontSize: 13, color: C.text }}>{t.name}</span>
                <Badge color={t.status === "stuck" ? C.red : t.status === "working" ? C.amber : C.muted}>{t.status}</Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Schedule */}
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Today's Schedule</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {schedule.map((s, i) => {
              const tc = { recurring: C.accent, meeting: C.cyan, personal: C.green, task: C.amber }[s.type];
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: `1px solid ${C.border}22` }}>
                  <span style={{ fontSize: 12, color: C.muted, width: 65, fontFamily: "monospace" }}>{s.time}</span>
                  <span style={{ width: 3, height: 20, borderRadius: 2, background: tc }} />
                  <span style={{ flex: 1, fontSize: 13, color: C.text }}>{s.event}</span>
                  <Badge color={tc}>{s.type}</Badge>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Approval Queue */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Approval Queue</div>
          <div style={{ display: "flex", gap: 6 }}>
            {["pending", "approved", "denied"].map(t => (
              <Tab key={t} active={approvalTab === t} onClick={() => setApprovalTab(t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</Tab>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {approvals.map(ap => {
            const ag = AGENTS.find(a => a.id === ap.agent);
            return (
              <div key={ap.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, borderRadius: 8, background: C.surface }}>
                <Avatar agent={ag} size={28} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{ap.title}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{ag?.name} · {ap.time}</div>
                </div>
                <PriorityDot priority={ap.urgency} />
                <div style={{ display: "flex", gap: 4 }}>
                  <button style={{ background: C.green + "22", color: C.green, border: "none", borderRadius: 6, padding: "4px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>Approve</button>
                  <button style={{ background: C.amber + "22", color: C.amber, border: "none", borderRadius: 6, padding: "4px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>Queue</button>
                  <button style={{ background: C.red + "22", color: C.red, border: "none", borderRadius: 6, padding: "4px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>Deny</button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* High Priority Emails */}
      <Card>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>High Priority Emails</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {emails.map(e => (
            <div key={e.id} style={{ padding: 12, borderRadius: 8, background: C.surface, border: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{e.subject}</span>
                <span style={{ fontSize: 11, color: C.muted }}>{e.from}</span>
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 8, fontStyle: "italic" }}>AI Draft: "{e.draft}"</div>
              <div style={{ display: "flex", gap: 6 }}>
                <button style={{ background: C.green + "22", color: C.green, border: "none", borderRadius: 6, padding: "4px 14px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>Approve & Send</button>
                <button style={{ background: C.accent + "22", color: C.accentLight, border: "none", borderRadius: 6, padding: "4px 14px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>Edit Draft</button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

// ═══════════════════════════════════════
// SCREEN: TEAM
// ═══════════════════════════════════════
const TeamScreen = () => {
  const [view, setView] = useState("grid");
  const [selectedAgent, setSelectedAgent] = useState(null);

  if (selectedAgent) {
    const a = AGENTS.find(x => x.id === selectedAgent);
    const agentTasks = TASKS_DATA.filter(t => t.agents.includes(a.id));
    const agentSessions = SESSIONS.filter(s => s.agentId === a.id);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <button onClick={() => setSelectedAgent(null)} style={{ background: "none", border: "none", color: C.accentLight, cursor: "pointer", fontSize: 13, textAlign: "left", padding: 0 }}>← Back to Team</button>
        <Card style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <Avatar agent={a} size={64} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.text }}>{a.name}</div>
            <div style={{ fontSize: 14, color: C.muted }}>{a.role} · {a.dept}</div>
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <Badge color={C.cyan}>{a.model}</Badge>
              <Badge color={a.status === "online" ? C.green : a.status === "busy" ? C.amber : C.muted}>{a.status}</Badge>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: C.text }}>${a.costDay}</div>
            <div style={{ fontSize: 12, color: C.muted }}>per day · ${a.costMonth}/mo</div>
          </div>
        </Card>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          <KPI label="Sessions" value={a.sessions} color={C.accent} />
          <KPI label="Active Tasks" value={agentTasks.filter(t => t.status === "working").length} color={C.amber} />
          <KPI label="Completed" value={agentTasks.filter(t => t.status === "done").length} color={C.green} />
          <KPI label="Stuck" value={agentTasks.filter(t => t.status === "stuck").length} color={C.red} />
        </div>
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Assigned Tasks</div>
          <Table columns={["Task", "Project", "Status", "Priority", "Days Active"]}
            rows={agentTasks.map(t => [
              t.name,
              PROJECTS.find(p => p.id === t.project)?.name || t.project,
              <Badge color={{ working: C.amber, stuck: C.red, review: C.purple, done: C.green, todo: C.muted }[t.status]}>{t.status}</Badge>,
              <><PriorityDot priority={t.priority} /> {t.priority}</>,
              t.daysActive + "d",
            ])} />
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <SectionTitle>Team</SectionTitle>
        <div style={{ display: "flex", gap: 6 }}>
          <Tab active={view === "grid"} onClick={() => setView("grid")}>Grid</Tab>
          <Tab active={view === "org"} onClick={() => setView("org")}>Org Chart</Tab>
        </div>
      </div>

      {view === "org" ? (
        <Card>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
            {/* Executive */}
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#fff", margin: "0 auto", border: `3px solid ${C.accentLight}` }}>CC</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginTop: 6 }}>Colby Culbertson</div>
              <div style={{ fontSize: 12, color: C.muted }}>Executive / Founder</div>
            </div>
            <div style={{ width: 2, height: 24, background: C.border }} />
            {/* Departments */}
            <div style={{ display: "flex", gap: 32, flexWrap: "wrap", justifyContent: "center" }}>
              {DEPARTMENTS.map(dept => {
                const deptAgents = AGENTS.filter(a => a.dept === dept);
                return (
                  <div key={dept} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.accentLight, padding: "4px 12px", background: C.accent + "22", borderRadius: 6 }}>{dept}</div>
                    <div style={{ width: 2, height: 16, background: C.border }} />
                    <div style={{ display: "flex", gap: 12 }}>
                      {deptAgents.map(a => (
                        <div key={a.id} onClick={() => setSelectedAgent(a.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer", padding: 8, borderRadius: 8, transition: "background 0.2s" }}>
                          <Avatar agent={a} size={36} />
                          <span style={{ fontSize: 11, color: C.text, fontWeight: 500 }}>{a.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {AGENTS.map(a => (
            <Card key={a.id} onClick={() => setSelectedAgent(a.id)} style={{ cursor: "pointer", transition: "border-color 0.2s" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
                <Avatar agent={a} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{a.name}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{a.role}</div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted, marginBottom: 8 }}>
                <span>{a.dept}</span>
                <Badge color={C.cyan}>{a.model}</Badge>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: C.muted }}>Cost/day</span>
                <span style={{ color: C.text, fontWeight: 600 }}>${a.costDay}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 4 }}>
                <span style={{ color: C.muted }}>Sessions</span>
                <span style={{ color: C.text, fontWeight: 600 }}>{a.sessions.toLocaleString()}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════
// SCREEN: THE FLOOR (Live Operations)
// ═══════════════════════════════════════
const TheFloorScreen = () => {
  const [dept, setDept] = useState("All");
  const filtered = dept === "All" ? AGENTS : AGENTS.filter(a => a.dept === dept);

  const topPerformers = [...AGENTS].sort((a, b) => b.sessions - a.sessions).slice(0, 3);
  const lowPerformers = [...AGENTS].sort((a, b) => a.sessions - b.sessions).slice(0, 3);

  const deptHealth = DEPARTMENTS.map(d => {
    const dAgents = AGENTS.filter(a => a.dept === d);
    const dTasks = TASKS_DATA.filter(t => t.agents.some(aid => dAgents.find(a => a.id === aid)));
    const stuck = dTasks.filter(t => t.status === "stuck").length;
    const load = dTasks.length / Math.max(dAgents.length, 1);
    return { name: d, agents: dAgents.length, tasks: dTasks.length, stuck, load: load.toFixed(1), strain: load > 4 ? "high" : load > 2.5 ? "medium" : "low" };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Department Toggle */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {["All", ...DEPARTMENTS].map(d => <Tab key={d} active={dept === d} onClick={() => setDept(d)}>{d}</Tab>)}
      </div>

      {/* Agent Workstations */}
      <SubTitle>Agent Workstations</SubTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
        {filtered.map(a => {
          const task = TASKS_DATA.find(t => t.status === "working" && t.agents.includes(a.id));
          const humanCost = 65000 / 365;
          const savings = humanCost - a.costDay;
          return (
            <Card key={a.id}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
                <Avatar agent={a} size={40} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{a.dept} · {a.model}</div>
                </div>
                <Badge color={a.status === "online" ? C.green : a.status === "busy" ? C.amber : C.muted}>{a.status}</Badge>
              </div>
              {task ? (
                <div style={{ padding: 8, background: C.surface, borderRadius: 6, marginBottom: 8, fontSize: 12 }}>
                  <div style={{ color: C.accentLight, fontWeight: 500 }}>Currently working on:</div>
                  <div style={{ color: C.text, marginTop: 2 }}>{task.name}</div>
                </div>
              ) : (
                <div style={{ padding: 8, background: C.surface, borderRadius: 6, marginBottom: 8, fontSize: 12, color: C.muted }}>Idle — no active task</div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 12 }}>
                <div><span style={{ color: C.muted }}>Cost/day: </span><span style={{ color: C.text, fontWeight: 600 }}>${a.costDay}</span></div>
                <div><span style={{ color: C.muted }}>Cost/mo: </span><span style={{ color: C.text, fontWeight: 600 }}>${a.costMonth}</span></div>
                <div><span style={{ color: C.muted }}>Revenue value: </span><span style={{ color: C.green, fontWeight: 600 }}>${(a.costDay * 8.5).toFixed(0)}/day</span></div>
                <div><span style={{ color: C.muted }}>vs Human: </span><span style={{ color: C.green, fontWeight: 600 }}>saves ${savings.toFixed(0)}/day</span></div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Performance + Department Health */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Top Performers</div>
          {topPerformers.map((a, i) => (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: `1px solid ${C.border}22` }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: [C.amber, C.muted, "#cd7f32"][i], width: 20 }}>#{i + 1}</span>
              <Avatar agent={a} size={28} />
              <span style={{ flex: 1, fontSize: 13, color: C.text }}>{a.name}</span>
              <span style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>{a.sessions} sessions</span>
            </div>
          ))}
        </Card>
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Needs Attention</div>
          {lowPerformers.map(a => (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: `1px solid ${C.border}22` }}>
              <Avatar agent={a} size={28} />
              <span style={{ flex: 1, fontSize: 13, color: C.text }}>{a.name}</span>
              <span style={{ fontSize: 12, color: C.red }}>{a.sessions} sessions</span>
              <button style={{ background: C.amber + "22", color: C.amber, border: "none", borderRadius: 6, padding: "3px 10px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Force Upgrade</button>
            </div>
          ))}
        </Card>
      </div>

      {/* Department Health */}
      <Card>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Department Health</div>
        <Table columns={["Department", "Agents", "Tasks", "Stuck", "Load/Agent", "Strain"]}
          rows={deptHealth.map(d => [
            d.name,
            d.agents,
            d.tasks,
            <span style={{ color: d.stuck > 0 ? C.red : C.muted }}>{d.stuck}</span>,
            d.load,
            <Badge color={d.strain === "high" ? C.red : d.strain === "medium" ? C.amber : C.green}>{d.strain}</Badge>,
          ])} />
      </Card>

      {/* New Agent Suggestion */}
      <Card style={{ border: `1px solid ${C.amber}44`, background: C.amber + "08" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>💡</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>New Agent Recommendation</div>
            <div style={{ fontSize: 12, color: C.muted }}>Engineering dept has 4.3 tasks/agent load. Consider creating a "DevOps Specialist" sub-agent to handle infrastructure tasks currently overloading Bot Manager.</div>
          </div>
          <button style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 8, padding: "6px 16px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>Create Agent</button>
        </div>
      </Card>
    </div>
  );
};

// ═══════════════════════════════════════
// SCREEN: PROJECTS
// ═══════════════════════════════════════
const ProjectsScreen = () => {
  const [selectedProject, setSelectedProject] = useState(null);
  const [projView, setProjView] = useState("kanban");

  if (selectedProject) {
    const p = PROJECTS.find(x => x.id === selectedProject);
    const pTasks = TASKS_DATA.filter(t => t.project === p.id);
    const statuses = ["todo", "working", "stuck", "review", "done"];
    const statusLabels = { todo: "To Do", working: "Working", stuck: "Stuck", review: "Review", done: "Done" };
    const statusColors = { todo: C.muted, working: C.amber, stuck: C.red, review: C.purple, done: C.green };

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <button onClick={() => setSelectedProject(null)} style={{ background: "none", border: "none", color: C.accentLight, cursor: "pointer", fontSize: 13, textAlign: "left", padding: 0 }}>← Back to Projects</button>
        <Card style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: p.color }} />
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>{p.name}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{p.agents.length} agents · {p.tasks} tasks</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <StatusDot status={p.status} />
            <Badge color={p.status === "on-track" ? C.green : p.status === "at-risk" ? C.amber : C.red}>{p.status}</Badge>
          </div>
        </Card>

        {/* Project KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
          <KPI label="Progress" value={`${p.progress}%`} color={C.accent} />
          <KPI label="Total Tasks" value={p.tasks} color={C.cyan} />
          <KPI label="Completed" value={p.completed} color={C.green} />
          <KPI label="In Progress" value={pTasks.filter(t => t.status === "working").length} color={C.amber} />
          <KPI label="Blocked" value={pTasks.filter(t => t.status === "stuck").length} color={C.red} />
        </div>

        <ProgressBar value={p.progress} color={p.color} height={8} />

        {/* View Tabs */}
        <div style={{ display: "flex", gap: 6 }}>
          {["kanban", "table", "calendar"].map(v => <Tab key={v} active={projView === v} onClick={() => setProjView(v)}>{v.charAt(0).toUpperCase() + v.slice(1)}</Tab>)}
        </div>

        {projView === "kanban" ? (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${statuses.length}, 1fr)`, gap: 10 }}>
            {statuses.map(s => (
              <div key={s} style={{ background: C.surface, borderRadius: 10, padding: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: statusColors[s], marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
                  <span>{statusLabels[s]}</span>
                  <span style={{ background: statusColors[s] + "22", borderRadius: 10, padding: "0 6px", fontSize: 11 }}>{pTasks.filter(t => t.status === s).length}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {pTasks.filter(t => t.status === s).map(t => (
                    <div key={t.id} style={{ background: C.card, borderRadius: 8, padding: 10, border: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 12, color: C.text, fontWeight: 500, marginBottom: 6 }}>{t.name}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", gap: -4 }}>
                          {t.agents.map(aid => <Avatar key={aid} agent={aid} size={20} />)}
                        </div>
                        <PriorityDot priority={t.priority} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Table columns={["Task", "Status", "Priority", "Agents", "Days"]}
            rows={pTasks.map(t => [
              t.name,
              <Badge color={statusColors[t.status]}>{t.status}</Badge>,
              <><PriorityDot priority={t.priority} /> {t.priority}</>,
              t.agents.map(a => AGENTS.find(x => x.id === a)?.initials).join(", "),
              t.daysActive + "d",
            ])} />
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionTitle>Projects</SectionTitle>

      {/* Overview KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <KPI label="Total Projects" value={PROJECTS.length} color={C.accent} />
        <KPI label="On Track" value={PROJECTS.filter(p => p.status === "on-track").length} color={C.green} />
        <KPI label="At Risk" value={PROJECTS.filter(p => p.status === "at-risk").length} color={C.amber} />
        <KPI label="Blocked" value={PROJECTS.filter(p => p.status === "blocked").length} color={C.red} />
      </div>

      {/* Project Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
        {PROJECTS.map(p => (
          <Card key={p.id} onClick={() => setSelectedProject(p.id)} style={{ cursor: "pointer" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <PriorityDot priority={p.priority} />
                <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{p.name}</span>
              </div>
              <Badge color={p.status === "on-track" ? C.green : p.status === "at-risk" ? C.amber : C.red}>{p.status}</Badge>
            </div>
            <ProgressBar value={p.progress} color={p.color} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 12, color: C.muted }}>
              <span>{p.completed}/{p.tasks} tasks</span>
              <span>{p.progress}%</span>
            </div>
            <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
              {p.agents.map(aid => <Avatar key={aid} agent={aid} size={24} />)}
            </div>
          </Card>
        ))}
      </div>

      {/* Resource Allocation Chart */}
      <Card>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Resource Allocation</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={PROJECTS.map(p => ({ name: p.name.split(" ").slice(0, 2).join(" "), agents: p.agents.length, tasks: p.tasks, completed: p.completed }))}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="name" tick={{ fill: C.muted, fontSize: 11 }} />
            <YAxis tick={{ fill: C.muted, fontSize: 11 }} />
            <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }} />
            <Bar dataKey="tasks" fill={C.accent} radius={[4, 4, 0, 0]} name="Total Tasks" />
            <Bar dataKey="completed" fill={C.green} radius={[4, 4, 0, 0]} name="Completed" />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};

// ═══════════════════════════════════════
// SCREEN: TASKS
// ═══════════════════════════════════════
const TasksScreen = () => {
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("priority");
  const statusColors = { todo: C.muted, working: C.amber, stuck: C.red, review: C.purple, done: C.green };
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

  const filtered = useMemo(() => {
    let tasks = [...TASKS_DATA];
    if (filter === "my") tasks = tasks.filter(t => t.priority === "critical" || t.priority === "high");
    else if (filter === "stuck") tasks = tasks.filter(t => t.status === "stuck");
    else if (filter === "done") tasks = tasks.filter(t => t.status === "done");
    else if (filter === "unassigned") tasks = tasks.filter(t => t.agents.length === 0);
    if (sortBy === "priority") tasks.sort((a, b) => (priorityOrder[a.priority] || 9) - (priorityOrder[b.priority] || 9));
    else if (sortBy === "status") tasks.sort((a, b) => a.status.localeCompare(b.status));
    else if (sortBy === "days") tasks.sort((a, b) => b.daysActive - a.daysActive);
    return tasks;
  }, [filter, sortBy]);

  const stuckCount = TASKS_DATA.filter(t => t.status === "stuck").length;
  const workingCount = TASKS_DATA.filter(t => t.status === "working").length;
  const doneCount = TASKS_DATA.filter(t => t.status === "done").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionTitle>Tasks — Cross-Project Control Room</SectionTitle>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        <KPI label="Total" value={TASKS_DATA.length} color={C.accent} />
        <KPI label="In Progress" value={workingCount} color={C.amber} />
        <KPI label="Stuck" value={stuckCount} color={C.red} />
        <KPI label="In Review" value={TASKS_DATA.filter(t => t.status === "review").length} color={C.purple} />
        <KPI label="Done" value={doneCount} color={C.green} />
      </div>

      {/* Filters */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {[["all", "All Tasks"], ["my", "High Priority"], ["stuck", "Blocked/Stuck"], ["done", "Completed"]].map(([k, l]) => (
            <Tab key={k} active={filter === k} onClick={() => setFilter(k)}>{l}</Tab>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: C.muted }}>Sort:</span>
          {["priority", "status", "days"].map(s => (
            <Tab key={s} active={sortBy === s} onClick={() => setSortBy(s)}>{s.charAt(0).toUpperCase() + s.slice(1)}</Tab>
          ))}
        </div>
      </div>

      {/* Task Table */}
      <Table columns={["Priority", "Task", "Project", "Status", "Agents", "Points", "Days Active"]}
        rows={filtered.map(t => [
          <PriorityDot priority={t.priority} />,
          <span style={{ fontWeight: 500 }}>{t.name}</span>,
          <span style={{ color: PROJECTS.find(p => p.id === t.project)?.color }}>{PROJECTS.find(p => p.id === t.project)?.name.split(" ").slice(0, 2).join(" ")}</span>,
          <Badge color={statusColors[t.status]}>{t.status}</Badge>,
          <div style={{ display: "flex", gap: 2 }}>{t.agents.map(a => <Avatar key={a} agent={a} size={20} />)}</div>,
          t.points,
          <span style={{ color: t.daysActive > 7 ? C.red : t.daysActive > 3 ? C.amber : C.muted }}>{t.daysActive}d</span>,
        ])} />

      {/* Stuck Queue */}
      {stuckCount > 0 && (
        <Card style={{ border: `1px solid ${C.red}33` }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.red, marginBottom: 10 }}>⚠ Blocked / Stuck Queue — Needs Executive Intervention</div>
          {TASKS_DATA.filter(t => t.status === "stuck").map(t => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}22` }}>
              <PriorityDot priority={t.priority} />
              <span style={{ flex: 1, fontSize: 13, color: C.text }}>{t.name}</span>
              <div style={{ display: "flex", gap: 2 }}>{t.agents.map(a => <Avatar key={a} agent={a} size={22} />)}</div>
              <span style={{ fontSize: 12, color: C.red }}>{t.daysActive}d stuck</span>
              <button style={{ background: C.accent + "22", color: C.accentLight, border: "none", borderRadius: 6, padding: "3px 10px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Reassign</button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
};

// ═══════════════════════════════════════
// SCREEN: FINANCE
// ═══════════════════════════════════════
const FinanceScreen = () => {
  const [companyTab, setCompanyTab] = useState("all");
  const totalRevenue = COMPANIES.reduce((s, c) => s + c.revenue, 0);
  const totalExpenses = COMPANIES.reduce((s, c) => s + c.expenses, 0);
  const totalAiCost = AGENTS.reduce((s, a) => s + a.costMonth, 0);
  const totalHumanEquiv = COMPANIES.reduce((s, c) => s + c.humanEquiv, 0);

  const costByModel = [
    { name: "Opus 4", cost: 936, color: C.accent },
    { name: "Sonnet 4", cost: 642, color: C.cyan },
    { name: "Haiku 4.5", cost: 177, color: C.green },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionTitle>Finance</SectionTitle>

      {/* Company Tabs */}
      <div style={{ display: "flex", gap: 6 }}>
        <Tab active={companyTab === "all"} onClick={() => setCompanyTab("all")}>Overview</Tab>
        {COMPANIES.map(c => <Tab key={c.id} active={companyTab === c.id} onClick={() => setCompanyTab(c.id)}>{c.name.split(" ")[0]}</Tab>)}
        <Tab active={companyTab === "costs"} onClick={() => setCompanyTab("costs")}>AI Costs</Tab>
      </div>

      {companyTab === "all" ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <KPI label="Total Revenue" value={`$${(totalRevenue / 1000).toFixed(0)}K`} sub="across all companies" color={C.green} />
            <KPI label="Total Expenses" value={`$${(totalExpenses / 1000).toFixed(0)}K`} color={C.red} />
            <KPI label="Net P&L" value={`$${((totalRevenue - totalExpenses) / 1000).toFixed(0)}K`} color={totalRevenue > totalExpenses ? C.green : C.red} />
            <KPI label="AI vs Human Savings" value={`$${((totalHumanEquiv - totalAiCost) / 1000).toFixed(0)}K/mo`} sub="total savings" color={C.green} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Card>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Revenue by Company</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={COMPANIES.map(c => ({ name: c.name.split(" ")[0], revenue: c.revenue / 1000, expenses: c.expenses / 1000 }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="name" tick={{ fill: C.muted, fontSize: 11 }} />
                  <YAxis tick={{ fill: C.muted, fontSize: 11 }} tickFormatter={v => `$${v}K`} />
                  <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }} />
                  <Bar dataKey="revenue" fill={C.green} radius={[4, 4, 0, 0]} name="Revenue" />
                  <Bar dataKey="expenses" fill={C.red} radius={[4, 4, 0, 0]} name="Expenses" />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>AI Cost by Model</div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={costByModel} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="cost" nameKey="name">
                    {costByModel.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }} formatter={v => `$${v}/mo`} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>
          <Card>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Payroll vs AI Agent Cost</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={[{ name: "Human Equivalent", cost: totalHumanEquiv }, { name: "AI Agents", cost: totalAiCost }, { name: "Savings", cost: totalHumanEquiv - totalAiCost }]}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="name" tick={{ fill: C.muted, fontSize: 11 }} />
                <YAxis tick={{ fill: C.muted, fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
                <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }} formatter={v => `$${v.toLocaleString()}`} />
                <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
                  {[C.red, C.amber, C.green].map((c, i) => <Cell key={i} fill={c} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </>
      ) : companyTab === "costs" ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <KPI label="Daily AI Cost" value={`$${AGENTS.reduce((s, a) => s + a.costDay, 0).toFixed(2)}`} color={C.accent} />
            <KPI label="Monthly AI Cost" value={`$${totalAiCost.toLocaleString()}`} color={C.cyan} />
            <KPI label="Projected Yearly" value={`$${(totalAiCost * 12).toLocaleString()}`} color={C.purple} />
          </div>
          <Card>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Daily Cost Trend</div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={COST_TREND}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="date" tick={{ fill: C.muted, fontSize: 11 }} />
                <YAxis tick={{ fill: C.muted, fontSize: 11 }} tickFormatter={v => `$${v}`} />
                <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }} />
                <Area type="monotone" dataKey="opus" stackId="1" stroke={C.accent} fill={C.accent + "55"} name="Opus" />
                <Area type="monotone" dataKey="sonnet" stackId="1" stroke={C.cyan} fill={C.cyan + "55"} name="Sonnet" />
                <Area type="monotone" dataKey="haiku" stackId="1" stroke={C.green} fill={C.green + "55"} name="Haiku" />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Cost by Agent</div>
            <Table columns={["Agent", "Model", "Daily", "Monthly", "Yearly"]}
              rows={AGENTS.map(a => [
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Avatar agent={a} size={22} />{a.name}</div>,
                <Badge color={C.cyan}>{a.model}</Badge>,
                `$${a.costDay}`,
                `$${a.costMonth}`,
                `$${(a.costMonth * 12).toLocaleString()}`,
              ])} />
          </Card>
        </>
      ) : (
        /* Individual Company */
        (() => {
          const comp = COMPANIES.find(c => c.id === companyTab);
          if (!comp) return null;
          const pnl = comp.revenue - comp.expenses;
          return (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                <KPI label="Revenue" value={`$${(comp.revenue / 1000).toFixed(0)}K`} color={C.green} />
                <KPI label="Expenses" value={`$${(comp.expenses / 1000).toFixed(0)}K`} color={C.red} />
                <KPI label="Net P&L" value={`$${(pnl / 1000).toFixed(0)}K`} color={pnl >= 0 ? C.green : C.red} />
                <KPI label="Burn Rate" value={comp.burn > 0 ? `$${(comp.burn / 1000).toFixed(1)}K/mo` : "N/A"} color={C.amber} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Card>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>SWOT Analysis</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[["Strengths", C.green, "AI-first operations, low overhead"], ["Weaknesses", C.red, "Revenue concentration risk"], ["Opportunities", C.cyan, "Market expansion, new products"], ["Threats", C.amber, "Regulatory changes, competition"]].map(([title, color, text]) => (
                      <div key={title} style={{ padding: 10, borderRadius: 8, background: color + "11", border: `1px solid ${color}33` }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color, marginBottom: 4 }}>{title}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>{text}</div>
                      </div>
                    ))}
                  </div>
                </Card>
                <Card>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>AI Advisor Suggestions</div>
                  <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ fontWeight: 600, color: C.accentLight }}>Financial: </span>
                      Consider diversifying revenue streams. Current P&L shows healthy margins but concentration in a single vertical increases risk.
                    </div>
                    <div>
                      <span style={{ fontWeight: 600, color: C.amber }}>Tax: </span>
                      Q1 estimated taxes due April 15. Review Section 179 deductions for AI infrastructure investments.
                    </div>
                  </div>
                </Card>
              </div>
            </>
          );
        })()
      )}
    </div>
  );
};

// ═══════════════════════════════════════
// SCREEN: THE FORGE
// ═══════════════════════════════════════
const ForgeScreen = () => {
  const stages = ["sourced", "evaluating", "approved", "building", "testing", "reviewing", "launched"];
  const stageColors = { sourced: C.muted, evaluating: C.cyan, approved: C.accent, building: C.amber, testing: C.purple, reviewing: C.pink, launched: C.green };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionTitle>The Forge — Autonomous Factory</SectionTitle>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <KPI label="Ideas in Pipeline" value={FORGE_IDEAS.length} color={C.accent} />
        <KPI label="Building" value={FORGE_IDEAS.filter(f => f.stage === "building").length} color={C.amber} />
        <KPI label="Launched" value={FORGE_IDEAS.filter(f => f.stage === "launched").length} color={C.green} />
        <KPI label="Revenue" value={`$${FORGE_IDEAS.filter(f => f.revenue).reduce((s, f) => s + f.revenue, 0).toLocaleString()}`} sub="from launched products" color={C.green} />
      </div>

      {/* Pipeline Kanban */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8 }}>
        {stages.map(s => (
          <div key={s} style={{ minWidth: 180, background: C.surface, borderRadius: 10, padding: 10, flex: "0 0 180px" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: stageColors[s], marginBottom: 8, textTransform: "capitalize", display: "flex", justifyContent: "space-between" }}>
              <span>{s}</span>
              <span style={{ background: stageColors[s] + "22", borderRadius: 10, padding: "0 6px", fontSize: 11 }}>{FORGE_IDEAS.filter(f => f.stage === s).length}</span>
            </div>
            {FORGE_IDEAS.filter(f => f.stage === s).map(idea => (
              <div key={idea.id} style={{ background: C.card, borderRadius: 8, padding: 10, border: `1px solid ${C.border}`, marginBottom: 6 }}>
                <div style={{ fontSize: 12, color: C.text, fontWeight: 500, marginBottom: 4 }}>{idea.name}</div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Source: {idea.source}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: C.accentLight }}>Score: {idea.score}</span>
                  {idea.revenue && <Badge color={C.green}>${idea.revenue}</Badge>}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Ideas Table */}
      <Card>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>All Ideas</div>
        <Table columns={["Idea", "Stage", "Score", "Source", "Revenue", "Actions"]}
          rows={FORGE_IDEAS.map(f => [
            <span style={{ fontWeight: 500 }}>{f.name}</span>,
            <Badge color={stageColors[f.stage]}>{f.stage}</Badge>,
            <span style={{ color: f.score > 80 ? C.green : f.score > 60 ? C.amber : C.red }}>{f.score}/100</span>,
            f.source,
            f.revenue ? `$${f.revenue}` : "—",
            <div style={{ display: "flex", gap: 4 }}>
              <button style={{ background: C.green + "22", color: C.green, border: "none", borderRadius: 4, padding: "2px 8px", fontSize: 11, cursor: "pointer" }}>Advance</button>
              <button style={{ background: C.red + "22", color: C.red, border: "none", borderRadius: 4, padding: "2px 8px", fontSize: 11, cursor: "pointer" }}>Kill</button>
            </div>,
          ])} />
      </Card>
    </div>
  );
};

// ═══════════════════════════════════════
// SCREEN: SKILL LAB
// ═══════════════════════════════════════
const SkillLabScreen = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <SectionTitle>Skill Lab</SectionTitle>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
      <KPI label="Total Skills" value={SKILLS.length} color={C.accent} />
      <KPI label="Avg Grade" value="B+" color={C.green} />
      <KPI label="Total Invocations" value={SKILLS.reduce((s, sk) => s + sk.usage, 0).toLocaleString()} color={C.cyan} />
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
      {SKILLS.map(sk => {
        const gradeColor = sk.score >= 90 ? C.green : sk.score >= 80 ? C.cyan : sk.score >= 70 ? C.amber : C.red;
        return (
          <Card key={sk.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{sk.name}</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: gradeColor }}>{sk.grade}</span>
            </div>
            <ProgressBar value={sk.score} color={gradeColor} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted, marginTop: 8 }}>
              <span>{sk.score}/100</span>
              <span>v{sk.version}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
              <span style={{ fontSize: 11, color: C.muted }}>{sk.usage} invocations</span>
              <div style={{ display: "flex", gap: 2 }}>{sk.agents.map(a => <Avatar key={a} agent={a} size={20} />)}</div>
            </div>
            {sk.score < 80 && (
              <button style={{ marginTop: 8, width: "100%", background: C.amber + "22", color: C.amber, border: "none", borderRadius: 6, padding: "5px 0", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Force Research & Improve</button>
            )}
          </Card>
        );
      })}
    </div>
  </div>
);

// ═══════════════════════════════════════
// SCREEN: ACTIVITY FEED
// ═══════════════════════════════════════
const ActivityScreen = () => {
  const typeColors = { success: C.green, info: C.cyan, warning: C.amber, error: C.red };
  const hourlyData = Array.from({ length: 24 }, (_, h) => ({ hour: `${h}:00`, count: Math.floor(Math.random() * 30) + (h >= 8 && h <= 18 ? 15 : 2) }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionTitle>Activity Feed</SectionTitle>
      <Card>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Activity Heatmap (Today)</div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={hourlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="hour" tick={{ fill: C.muted, fontSize: 10 }} interval={2} />
            <YAxis tick={{ fill: C.muted, fontSize: 11 }} />
            <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }} />
            <Bar dataKey="count" fill={C.accent} radius={[2, 2, 0, 0]} name="Actions" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <Card>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Live Feed</div>
        {ACTIVITIES.map(act => {
          const ag = AGENTS.find(a => a.id === act.agent);
          return (
            <div key={act.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}22` }}>
              <Avatar agent={ag} size={28} />
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: typeColors[act.type] }} />
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{ag?.name}</span>
                <span style={{ fontSize: 13, color: C.muted }}> {act.action} — </span>
                <span style={{ fontSize: 13, color: C.accentLight }}>{act.target}</span>
              </div>
              <span style={{ fontSize: 11, color: C.muted }}>{act.time}</span>
            </div>
          );
        })}
      </Card>
    </div>
  );
};

// ═══════════════════════════════════════
// SCREEN: SESSIONS
// ═══════════════════════════════════════
const SessionsScreen = () => {
  const [filterModel, setFilterModel] = useState("All");
  const models = ["All", "Claude Opus 4", "Claude Sonnet 4", "Claude Haiku 4.5"];
  const filtered = filterModel === "All" ? SESSIONS : SESSIONS.filter(s => s.model === filterModel);
  const totalTokens = SESSIONS.reduce((s, x) => s + x.tokens, 0);
  const totalCost = SESSIONS.reduce((s, x) => s + x.cost, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionTitle>Sessions</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <KPI label="Total Sessions" value={SESSIONS.length} color={C.accent} />
        <KPI label="Total Tokens" value={`${(totalTokens / 1000000).toFixed(1)}M`} color={C.cyan} />
        <KPI label="Total Cost" value={`$${totalCost.toFixed(2)}`} color={C.amber} />
        <KPI label="Avg Duration" value={`${Math.floor(SESSIONS.reduce((s, x) => s + x.duration, 0) / SESSIONS.length / 60)}m`} color={C.purple} />
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {models.map(m => <Tab key={m} active={filterModel === m} onClick={() => setFilterModel(m)}>{m}</Tab>)}
      </div>
      <Table columns={["Agent", "Model", "Tokens", "Duration", "Cost", "Started"]}
        rows={filtered.map(s => [
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Avatar agent={s.agentId} size={22} />{s.agent}</div>,
          <Badge color={s.model.includes("Opus") ? C.accent : s.model.includes("Sonnet") ? C.cyan : C.green}>{s.model.replace("Claude ", "")}</Badge>,
          s.tokens.toLocaleString(),
          `${Math.floor(s.duration / 60)}m ${s.duration % 60}s`,
          `$${s.cost.toFixed(2)}`,
          s.start.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
        ])} />
    </div>
  );
};

// ═══════════════════════════════════════
// SCREEN: MEMORY & KNOWLEDGE
// ═══════════════════════════════════════
const MemoryScreen = () => {
  const memoryEntries = AGENTS.map(a => ({
    agent: a, entries: Math.floor(Math.random() * 500) + 50,
    size: `${(Math.random() * 4 + 0.5).toFixed(1)} MB`,
    lastWrite: `${Math.floor(Math.random() * 24)}h ago`,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionTitle>Memory & Knowledge</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        <KPI label="Total Memories" value={memoryEntries.reduce((s, m) => s + m.entries, 0).toLocaleString()} color={C.accent} />
        <KPI label="Knowledge Base Size" value="14.2 MB" color={C.cyan} />
        <KPI label="Agents with Memory" value={`${AGENTS.length}/${AGENTS.length}`} color={C.green} />
      </div>
      <Card>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Memory by Agent</div>
        <Table columns={["Agent", "Entries", "Size", "Last Write", "Actions"]}
          rows={memoryEntries.map(m => [
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Avatar agent={m.agent} size={24} />{m.agent.name}</div>,
            m.entries,
            m.size,
            m.lastWrite,
            <div style={{ display: "flex", gap: 4 }}>
              <button style={{ background: C.accent + "22", color: C.accentLight, border: "none", borderRadius: 4, padding: "2px 8px", fontSize: 11, cursor: "pointer" }}>Browse</button>
              <button style={{ background: C.cyan + "22", color: C.cyan, border: "none", borderRadius: 4, padding: "2px 8px", fontSize: 11, cursor: "pointer" }}>Search</button>
            </div>,
          ])} />
      </Card>
      <Card>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Vector Search</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input placeholder="Search semantic memory..." style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none" }} />
          <button style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>Search</button>
        </div>
      </Card>
    </div>
  );
};

// ═══════════════════════════════════════
// SCREEN: DOCS HUB
// ═══════════════════════════════════════
const DocsScreen = () => {
  const docs = [
    { id: "d1", name: "Mission Control Project Plan", type: "docx", project: "atlas", agent: "tm", updated: "Mar 20", size: "1.2 MB" },
    { id: "d2", name: "Monday Operations Guide", type: "docx", project: "atlas", agent: "dg", updated: "Mar 19", size: "890 KB" },
    { id: "d3", name: "API Documentation v2.3", type: "md", project: "echo", agent: "dg", updated: "Mar 21", size: "340 KB" },
    { id: "d4", name: "Fleet Scaling Architecture", type: "md", project: "phoenix", agent: "fm", updated: "Mar 18", size: "210 KB" },
    { id: "d5", name: "Cost Analytics Report Q1", type: "pdf", project: "nova", agent: "ba", updated: "Mar 15", size: "2.1 MB" },
    { id: "d6", name: "Security Audit Findings", type: "pdf", project: "atlas", agent: "cr", updated: "Mar 14", size: "1.8 MB" },
  ];
  const typeIcon = { docx: "📝", md: "📄", pdf: "📕" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionTitle>Docs Hub</SectionTitle>
      <div style={{ display: "flex", gap: 8 }}>
        <input placeholder="Search documents..." style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none" }} />
        <button style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>+ New Doc</button>
      </div>
      <Table columns={["", "Document", "Type", "Project", "Author", "Updated", "Size"]}
        rows={docs.map(d => [
          <span style={{ fontSize: 18 }}>{typeIcon[d.type]}</span>,
          <span style={{ fontWeight: 500, color: C.accentLight, cursor: "pointer" }}>{d.name}</span>,
          <Badge color={C.muted}>{d.type}</Badge>,
          PROJECTS.find(p => p.id === d.project)?.name.split(" ").slice(0, 2).join(" ") || d.project,
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}><Avatar agent={d.agent} size={20} />{AGENTS.find(a => a.id === d.agent)?.name}</div>,
          d.updated,
          d.size,
        ])} />
    </div>
  );
};

// ═══════════════════════════════════════
// SCREEN: WORKSPACE FILES
// ═══════════════════════════════════════
const FilesScreen = () => {
  const files = [
    { name: "src/", type: "folder", size: "—", modified: "Mar 21" },
    { name: "config/", type: "folder", size: "—", modified: "Mar 20" },
    { name: "docs/", type: "folder", size: "—", modified: "Mar 19" },
    { name: "package.json", type: "json", size: "2.4 KB", modified: "Mar 21" },
    { name: "tsconfig.json", type: "json", size: "1.1 KB", modified: "Mar 18" },
    { name: ".env", type: "env", size: "0.3 KB", modified: "Mar 15" },
    { name: "docker-compose.yml", type: "yml", size: "1.8 KB", modified: "Mar 20" },
    { name: "README.md", type: "md", size: "4.2 KB", modified: "Mar 17" },
  ];
  const folderIcon = "📁"; const fileIcon = "📄";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionTitle>Workspace Files</SectionTitle>
      <Card style={{ display: "flex", alignItems: "center", gap: 8, padding: 10, fontSize: 13 }}>
        <span style={{ color: C.muted }}>📂</span>
        <span style={{ color: C.accentLight, cursor: "pointer" }}>workspace</span>
        <span style={{ color: C.muted }}>/</span>
        <span style={{ color: C.text }}>root</span>
      </Card>
      <div style={{ display: "flex", gap: 8 }}>
        <button style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>Upload</button>
        <button style={{ background: C.surface, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer" }}>New Folder</button>
        <button style={{ background: C.surface, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer" }}>New File</button>
      </div>
      <Table columns={["", "Name", "Type", "Size", "Modified"]}
        rows={files.map(f => [
          <span style={{ fontSize: 16 }}>{f.type === "folder" ? folderIcon : fileIcon}</span>,
          <span style={{ fontWeight: 500, color: f.type === "folder" ? C.accentLight : C.text, cursor: "pointer" }}>{f.name}</span>,
          <Badge color={C.muted}>{f.type}</Badge>,
          f.size,
          f.modified,
        ])} />
    </div>
  );
};

// ═══════════════════════════════════════
// SCREEN: SYSTEM MONITOR
// ═══════════════════════════════════════
const SystemScreen = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <SectionTitle>System Monitor</SectionTitle>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
      <KPI label="CPU" value={`${SYSTEM.cpu}%`} color={SYSTEM.cpu > 80 ? C.red : SYSTEM.cpu > 50 ? C.amber : C.green} />
      <KPI label="RAM" value={`${SYSTEM.ram}%`} color={SYSTEM.ram > 80 ? C.red : SYSTEM.ram > 50 ? C.amber : C.green} />
      <KPI label="Disk" value={`${SYSTEM.disk}%`} color={C.cyan} />
      <KPI label="Network In" value={`${SYSTEM.network.in} MB/s`} color={C.accent} />
      <KPI label="Uptime" value={SYSTEM.uptime} color={C.green} />
    </div>

    {/* Containers */}
    <Card>
      <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Containers</div>
      <Table columns={["Container", "Status", "CPU %", "Memory", "Uptime"]}
        rows={SYSTEM.containers.map(c => [
          <span style={{ fontFamily: "monospace", fontSize: 12 }}>{c.name}</span>,
          <Badge color={c.status === "running" ? C.green : C.red}>{c.status}</Badge>,
          c.cpu > 0 ? `${c.cpu}%` : "—",
          c.mem > 0 ? `${c.mem} MB` : "—",
          c.uptime,
        ])} />
    </Card>

    {/* Errors */}
    <Card>
      <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Recent Errors & Warnings</div>
      {SYSTEM.errors.map((e, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: `1px solid ${C.border}22`, fontSize: 12 }}>
          <span style={{ fontFamily: "monospace", color: C.muted, width: 80 }}>{e.time}</span>
          <Badge color={e.level === "ERROR" ? C.red : C.amber}>{e.level}</Badge>
          <span style={{ color: C.text, flex: 1 }}>{e.msg}</span>
        </div>
      ))}
    </Card>

    {/* Cron Manager */}
    <Card>
      <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Cron Manager</div>
      <Table columns={["Job", "Schedule", "Last Run", "Status", "Enabled", "Actions"]}
        rows={SYSTEM.crons.map(c => [
          <span style={{ fontWeight: 500 }}>{c.name}</span>,
          <span style={{ fontFamily: "monospace", fontSize: 11, color: C.muted }}>{c.schedule}</span>,
          c.lastRun,
          <Badge color={c.status === "success" ? C.green : C.red}>{c.status}</Badge>,
          <span style={{ color: c.enabled ? C.green : C.muted }}>{c.enabled ? "✓" : "✗"}</span>,
          <button style={{ background: C.accent + "22", color: C.accentLight, border: "none", borderRadius: 4, padding: "2px 8px", fontSize: 11, cursor: "pointer" }}>Run Now</button>,
        ])} />
    </Card>
  </div>
);

// ═══════════════════════════════════════
// SCREEN: RENTALS CALENDAR (Lodgify)
// ═══════════════════════════════════════
const RENTAL_PROPS = {
  533203: { name: "Graeagle Cabin", short: "Graeagle", color: "#10b981", icon: "🏠" },
  746614: { name: "Northstar Luxury", short: "Northstar", color: "#6366f1", icon: "🏔️" },
};

const RentalsScreen = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMonth, setViewMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [tab, setTab] = useState("calendar");
  const [filterProp, setFilterProp] = useState("all");

  // Fetch bookings from Lodgify API (proxied or direct)
  useEffect(() => {
    // For now, use static data embedded at build time
    // TODO: wire to API proxy endpoint
    setBookings(window.__LODGIFY_BOOKINGS || []);
    setLoading(false);
  }, []);

  const today = new Date();
  today.setHours(0,0,0,0);

  const filtered = useMemo(() => {
    let b = bookings.filter(x => x.status === "Booked" || x.status === "Open");
    if (filterProp !== "all") b = b.filter(x => String(x.property_id) === filterProp);
    return b;
  }, [bookings, filterProp]);

  // Calendar helpers
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const firstDow = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1).getDay();
  const monthLabel = viewMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const prevMonth = () => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
  const nextMonth = () => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1));
  const goToday = () => setViewMonth(new Date(today.getFullYear(), today.getMonth(), 1));

  // Build calendar grid with booking overlays
  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < firstDow; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d);
      date.setHours(0,0,0,0);
      const dateStr = date.toISOString().split("T")[0];
      const dayBookings = filtered.filter(b => {
        return dateStr >= b.arrival && dateStr < b.departure;
      });
      days.push({ day: d, date, dateStr, bookings: dayBookings, isToday: date.getTime() === today.getTime() });
    }
    return days;
  }, [viewMonth, filtered, daysInMonth, firstDow, today]);

  // Upcoming check-ins (next 14 days)
  const upcoming = useMemo(() => {
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() + 14);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    const todayStr = today.toISOString().split("T")[0];
    return filtered
      .filter(b => b.arrival >= todayStr && b.arrival <= cutoffStr)
      .sort((a, b) => a.arrival.localeCompare(b.arrival));
  }, [filtered, today]);

  // KPI calcs
  const totalRevenue = filtered.reduce((s, b) => s + (b.total_amount || 0), 0);
  const bookedCount = filtered.filter(b => b.status === "Booked").length;
  const openCount = filtered.filter(b => b.status === "Open").length;
  const avgNightly = filtered.length > 0
    ? filtered.reduce((s, b) => {
        const nights = Math.max(1, Math.round((new Date(b.departure) - new Date(b.arrival)) / 86400000));
        return s + (b.total_amount || 0) / nights;
      }, 0) / filtered.length
    : 0;

  if (loading) return <div style={{ padding: 40, color: C.muted }}>Loading Lodgify data...</div>;
  if (error) return <div style={{ padding: 40, color: C.red }}>{error}</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <SectionTitle>🏡 Pineside Cabins — Rentals</SectionTitle>
        <div style={{ display: "flex", gap: 8 }}>
          <Tab active={filterProp === "all"} onClick={() => setFilterProp("all")}>All Properties</Tab>
          {Object.entries(RENTAL_PROPS).map(([id, p]) => (
            <Tab key={id} active={filterProp === id} onClick={() => setFilterProp(id)}>{p.icon} {p.short}</Tab>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <KPI label="Confirmed Bookings" value={bookedCount} color={C.green} />
        <KPI label="Pending / Open" value={openCount} color={C.amber} />
        <KPI label="Total Pipeline" value={`$${(totalRevenue / 1000).toFixed(0)}K`} color={C.cyan} />
        <KPI label="Avg $/Night" value={`$${avgNightly.toFixed(0)}`} color={C.accent} />
      </div>

      {/* View tabs */}
      <div style={{ display: "flex", gap: 8 }}>
        <Tab active={tab === "calendar"} onClick={() => setTab("calendar")}>Calendar</Tab>
        <Tab active={tab === "list"} onClick={() => setTab("list")}>All Bookings</Tab>
        <Tab active={tab === "upcoming"} onClick={() => setTab("upcoming")}>Upcoming</Tab>
      </div>

      {tab === "calendar" && (
        <Card>
          {/* Month nav */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <button onClick={prevMonth} style={{ background: C.surface, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontSize: 14 }}>←</button>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 18, fontWeight: 700 }}>{monthLabel}</span>
              <button onClick={goToday} style={{ background: C.accent + "22", color: C.accentLight, border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Today</button>
            </div>
            <button onClick={nextMonth} style={{ background: C.surface, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontSize: 14 }}>→</button>
          </div>

          {/* Day headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: C.muted, padding: 4 }}>{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
            {calendarDays.map((cell, i) => (
              <div key={i} style={{
                minHeight: 80, background: cell ? (cell.isToday ? C.accent + "11" : C.surface) : "transparent",
                borderRadius: 6, padding: cell ? 4 : 0,
                border: cell?.isToday ? `1px solid ${C.accent}44` : `1px solid ${C.border}22`,
              }}>
                {cell && (
                  <>
                    <div style={{ fontSize: 12, fontWeight: cell.isToday ? 700 : 500, color: cell.isToday ? C.accentLight : C.muted, marginBottom: 2 }}>{cell.day}</div>
                    {cell.bookings.slice(0, 3).map((b, bi) => {
                      const prop = RENTAL_PROPS[b.property_id] || { color: C.muted, icon: "🏠" };
                      const isCheckin = b.arrival === cell.dateStr;
                      const isCheckout = b.departure === cell.dateStr;
                      return (
                        <div key={bi} title={`${b.guest?.name || "Guest"} — ${prop.name}\n${b.arrival} → ${b.departure}\n$${(b.total_amount||0).toLocaleString()}`} style={{
                          fontSize: 10, padding: "1px 4px", borderRadius: 3, marginBottom: 1,
                          background: prop.color + "33", color: prop.color,
                          borderLeft: isCheckin ? `3px solid ${prop.color}` : "none",
                          borderRight: isCheckout ? `3px solid ${C.red}` : "none",
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                          fontWeight: isCheckin ? 700 : 400,
                        }}>
                          {isCheckin ? "▶ " : ""}{b.guest?.name || "Guest"}
                        </div>
                      );
                    })}
                    {cell.bookings.length > 3 && <div style={{ fontSize: 9, color: C.muted }}>+{cell.bookings.length - 3} more</div>}
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 11, color: C.muted }}>
            {Object.values(RENTAL_PROPS).map(p => (
              <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: p.color + "55" }} />
                {p.icon} {p.name}
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ borderLeft: `3px solid ${C.green}`, height: 10 }} /> Check-in</div>
          </div>
        </Card>
      )}

      {tab === "list" && (
        <Table columns={["Guest", "Property", "Check-in", "Check-out", "Nights", "Guests", "Total", "Source", "Status"]}
          rows={filtered.sort((a,b) => a.arrival.localeCompare(b.arrival)).map(b => {
            const prop = RENTAL_PROPS[b.property_id] || { name: "Unknown", color: C.muted, icon: "🏠" };
            const nights = Math.round((new Date(b.departure) - new Date(b.arrival)) / 86400000);
            const guestCount = (b.rooms || []).reduce((s, r) => s + (r.people || 0), 0);
            const source = (b.source || "Direct").replace("Integration", "");
            return [
              <span style={{ fontWeight: 600 }}>{b.guest?.name || "Unknown"}</span>,
              <span style={{ color: prop.color }}>{prop.icon} {prop.short || prop.name}</span>,
              b.arrival,
              b.departure,
              `${nights}n`,
              guestCount,
              <span style={{ fontWeight: 600, color: C.green }}>${(b.total_amount || 0).toLocaleString()}</span>,
              <Badge color={C.muted}>{source}</Badge>,
              <Badge color={b.status === "Booked" ? C.green : C.amber}>{b.status}</Badge>,
            ];
          })}
        />
      )}

      {tab === "upcoming" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {upcoming.length === 0 && <Card><span style={{ color: C.muted }}>No check-ins in the next 14 days.</span></Card>}
          {upcoming.map(b => {
            const prop = RENTAL_PROPS[b.property_id] || { name: "Unknown", color: C.muted, icon: "🏠" };
            const nights = Math.round((new Date(b.departure) - new Date(b.arrival)) / 86400000);
            const guestCount = (b.rooms || []).reduce((s, r) => s + (r.people || 0), 0);
            const arrDate = new Date(b.arrival + "T00:00:00");
            const daysUntil = Math.round((arrDate - today) / 86400000);
            return (
              <Card key={b.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 20px" }}>
                <div style={{ width: 48, height: 48, borderRadius: 10, background: prop.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{prop.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{b.guest?.name || "Unknown"}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{prop.name} · {nights}n · {guestCount} guests · {(b.source || "Direct").replace("Integration", "")}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.green }}>${(b.total_amount || 0).toLocaleString()}</div>
                  <Badge color={daysUntil === 0 ? C.green : daysUntil === 1 ? C.amber : C.muted}>
                    {daysUntil === 0 ? "TODAY" : daysUntil === 1 ? "TOMORROW" : `in ${daysUntil}d`}
                  </Badge>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

const ScreenPlaceholder = ({ name }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 400, color: C.muted, fontSize: 18 }}>
    Loading {name}...
  </div>
);

// ═══════════════════════════════════════
// MAIN APP SHELL
// ═══════════════════════════════════════
function App() {
  const [page, setPage] = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(o => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const SCREENS = {
    home: HomeScreen, command: CommandDeckScreen, team: TeamScreen,
    floor: TheFloorScreen, projects: ProjectsScreen, tasks: TasksScreen,
    finance: FinanceScreen, forge: ForgeScreen, skills: SkillLabScreen,
    activity: ActivityScreen, sessions: SessionsScreen, memory: MemoryScreen,
    docs: DocsScreen, files: FilesScreen, system: SystemScreen, rentals: RentalsScreen,
  };

  const ActiveScreen = SCREENS[page] || HomeScreen;
  const currentLabel = NAV_ITEMS.find(n => n.id === page)?.label || "Home";

  return (
    <div style={{ display: "flex", height: "100vh", background: C.bg, color: C.text, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", overflow: "hidden" }}>
      {/* ── SIDEBAR ── */}
      <div style={{
        width: sidebarOpen ? 220 : 56, minWidth: sidebarOpen ? 220 : 56,
        background: C.surface, borderRight: `1px solid ${C.border}`,
        display: "flex", flexDirection: "column", transition: "width 0.2s, min-width 0.2s", overflow: "hidden",
      }}>
        {/* Logo */}
        <div style={{ padding: sidebarOpen ? "16px 16px 12px" : "16px 0 12px", display: "flex", alignItems: "center", gap: 10, justifyContent: sidebarOpen ? "flex-start" : "center" }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, flexShrink: 0 }}>OC</div>
          {sidebarOpen && <span style={{ fontSize: 15, fontWeight: 700, color: C.text, whiteSpace: "nowrap" }}>Mission Control</span>}
        </div>

        {/* Nav Items */}
        <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV_ITEMS.map(item => {
            const active = page === item.id;
            return (
              <button key={item.id} onClick={() => setPage(item.id)} title={item.label} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: sidebarOpen ? "8px 10px" : "8px 0",
                justifyContent: sidebarOpen ? "flex-start" : "center",
                background: active ? C.accent + "22" : "transparent",
                color: active ? C.accentLight : C.muted,
                border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 500,
                transition: "all 0.15s", width: "100%", textAlign: "left",
              }}>
                <span style={{ flexShrink: 0, display: "flex" }}>{item.icon}</span>
                {sidebarOpen && <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>}
              </button>
            );
          })}
        </div>

        {/* Settings at bottom */}
        <div style={{ padding: 8, borderTop: `1px solid ${C.border}` }}>
          <button onClick={() => setPage("settings")} title="Settings" style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: sidebarOpen ? "8px 10px" : "8px 0",
            justifyContent: sidebarOpen ? "flex-start" : "center",
            background: "transparent", color: C.muted, border: "none", borderRadius: 8,
            cursor: "pointer", fontSize: 13, fontWeight: 500, width: "100%",
          }}>
            <span style={{ flexShrink: 0, display: "flex" }}>{icons.settings}</span>
            {sidebarOpen && <span>Settings</span>}
          </button>
        </div>
      </div>

      {/* ── MAIN AREA ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top Bar */}
        <div style={{
          height: 52, minHeight: 52, background: C.surface, borderBottom: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", padding: "0 16px", gap: 12,
        }}>
          <button onClick={() => setSidebarOpen(o => !o)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", display: "flex", padding: 4 }}>
            {icons.menu}
          </button>
          <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{currentLabel}</span>
          <div style={{ flex: 1 }} />
          {/* Search */}
          <button onClick={() => setSearchOpen(true)} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "6px 14px",
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 8,
            color: C.muted, cursor: "pointer", fontSize: 13,
          }}>
            {icons.search}
            <span>Search...</span>
            <kbd style={{ fontSize: 10, background: C.surface, padding: "2px 6px", borderRadius: 4, border: `1px solid ${C.border}`, color: C.muted, marginLeft: 8 }}>⌘K</kbd>
          </button>
          {/* Notifications */}
          <div style={{ position: "relative" }}>
            <button onClick={() => setNotifOpen(o => !o)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", display: "flex", padding: 4, position: "relative" }}>
              {icons.bell}
              <span style={{ position: "absolute", top: 0, right: 0, width: 8, height: 8, borderRadius: "50%", background: C.red }} />
            </button>
            {notifOpen && (
              <div style={{ position: "absolute", top: 36, right: 0, width: 320, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, zIndex: 100, boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Notifications</div>
                {ACTIVITIES.slice(0, 5).map(a => {
                  const ag = AGENTS.find(x => x.id === a.agent);
                  return (
                    <div key={a.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${C.border}22`, fontSize: 12 }}>
                      <Avatar agent={ag} size={22} />
                      <div style={{ flex: 1 }}>
                        <span style={{ color: C.text, fontWeight: 500 }}>{ag?.name}</span>
                        <span style={{ color: C.muted }}> {a.action} — {a.target}</span>
                      </div>
                      <span style={{ color: C.muted, fontSize: 10 }}>{a.time}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {/* User avatar */}
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, border: `2px solid ${C.accentLight}` }}>CC</div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
          <ActiveScreen />
        </div>

        {/* Floating Action Buttons */}
        <div style={{ position: "fixed", bottom: 24, right: 24, display: "flex", gap: 8, zIndex: 50 }}>
          <button style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 12, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 16px rgba(99,102,241,0.4)", display: "flex", alignItems: "center", gap: 6 }}>
            + Add Task
          </button>
          <button style={{ background: C.purple, color: "#fff", border: "none", borderRadius: 12, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 16px rgba(139,92,246,0.4)", display: "flex", alignItems: "center", gap: 6 }}>
            + New Project
          </button>
        </div>
      </div>

      {/* ── CMD+K SEARCH MODAL ── */}
      {searchOpen && (
        <div onClick={() => setSearchOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 120 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 560, background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 16px 48px rgba(0,0,0,0.5)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ color: C.muted }}>{icons.search}</span>
              <input autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search tasks, agents, projects, docs..." style={{ flex: 1, background: "none", border: "none", outline: "none", color: C.text, fontSize: 15 }} />
              <kbd style={{ fontSize: 10, background: C.surface, padding: "2px 8px", borderRadius: 4, border: `1px solid ${C.border}`, color: C.muted }}>ESC</kbd>
            </div>
            <div style={{ padding: 8, maxHeight: 320, overflowY: "auto" }}>
              {searchQuery.length > 0 ? (
                <>
                  {AGENTS.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase())).map(a => (
                    <button key={a.id} onClick={() => { setPage("team"); setSearchOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", width: "100%", background: "none", border: "none", borderRadius: 8, cursor: "pointer", color: C.text, fontSize: 13, textAlign: "left" }}>
                      <Avatar agent={a} size={24} />
                      <span>{a.name}</span>
                      <Badge color={C.cyan}>Agent</Badge>
                    </button>
                  ))}
                  {PROJECTS.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map(p => (
                    <button key={p.id} onClick={() => { setPage("projects"); setSearchOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", width: "100%", background: "none", border: "none", borderRadius: 8, cursor: "pointer", color: C.text, fontSize: 13, textAlign: "left" }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color }} />
                      <span>{p.name}</span>
                      <Badge color={C.purple}>Project</Badge>
                    </button>
                  ))}
                  {TASKS_DATA.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5).map(t => (
                    <button key={t.id} onClick={() => { setPage("tasks"); setSearchOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", width: "100%", background: "none", border: "none", borderRadius: 8, cursor: "pointer", color: C.text, fontSize: 13, textAlign: "left" }}>
                      <PriorityDot priority={t.priority} />
                      <span>{t.name}</span>
                      <Badge color={C.amber}>Task</Badge>
                    </button>
                  ))}
                </>
              ) : (
                <div style={{ padding: 20, textAlign: "center", color: C.muted, fontSize: 13 }}>
                  Type to search across tasks, agents, projects, and docs...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default App;
