// ── Color Palette ──
export const C = {
  bg: "#030712", 
  surface: "#111827", 
  card: "#1f2937", 
  border: "#374151",
  text: "#f9fafb", 
  muted: "#9ca3af", 
  accent: "#6366f1", 
  accentLight: "#818cf8",
  green: "#10b981", 
  red: "#ef4444", 
  amber: "#f59e0b", 
  cyan: "#0ea5e9",
  purple: "#8b5cf6", 
  pink: "#ec4899", 
  teal: "#14b8a6",
};

// ── Agent Data (consistent avatars everywhere) ──
export const AGENTS = [
  { id: "tm", name: "Task Master", initials: "TM", color: "#6366f1", ring: "#818cf8", dept: "Operations", model: "Claude Opus 4", role: "Chief Operations Agent", status: "online", costDay: 12.40, costMonth: 372, sessions: 847 },
  { id: "bm", name: "Bot Manager", initials: "BM", color: "#10b981", ring: "#34d399", dept: "Engineering", model: "Claude Sonnet 4", role: "Infrastructure Lead", status: "online", costDay: 8.20, costMonth: 246, sessions: 623 },
  { id: "fm", name: "Fleet Monitor", initials: "FM", color: "#0ea5e9", ring: "#38bdf8", dept: "Engineering", model: "Claude Haiku 4.5", role: "Fleet Operations Specialist", status: "online", costDay: 3.10, costMonth: 93, sessions: 1204 },
  { id: "ae", name: "Alert Engine", initials: "AE", color: "#ef4444", ring: "#f87171", dept: "Operations", model: "Claude Haiku 4.5", role: "Alert & Monitoring Agent", status: "online", costDay: 2.80, costMonth: 84, sessions: 2105 },
  { id: "cr", name: "Code Reviewer", initials: "CR", color: "#8b5cf6", ring: "#a78bfa", dept: "Engineering", model: "Claude Opus 4", role: "Senior Code Analyst", status: "busy", costDay: 15.60, costMonth: 468, sessions: 412 },
  { id: "dg", name: "Doc Generator", initials: "DG", color: "#ec4899", ring: "#f472b6", dept: "Documentation", model: "Claude Sonnet 4", role: "Documentation Specialist", status: "online", costDay: 5.30, costMonth: 159, sessions: 538 },
  { id: "ba", name: "Biz Analytics", initials: "BA", color: "#f59e0b", ring: "#fbbf24", dept: "Analytics", model: "Claude Sonnet 4", role: "Business Intelligence Agent", status: "online", costDay: 7.90, costMonth: 237, sessions: 389 },
  { id: "ib", name: "Integration Bridge", initials: "IB", color: "#14b8a6", ring: "#2dd4bf", dept: "Engineering", model: "Claude Sonnet 4", role: "Integration Specialist", status: "offline", costDay: 4.50, costMonth: 135, sessions: 291 },
];

export const DEPARTMENTS = ["Operations", "Engineering", "Analytics", "Documentation"];

// ── Projects ──
export const PROJECTS = [
  { id: "atlas", name: "Mission Control ATLAS", color: "#6366f1", agents: ["tm", "bm", "fm", "cr"], status: "on-track", progress: 68, priority: "high", tasks: 24, completed: 16 },
  { id: "phoenix", name: "Fleet Scaling Engine", color: "#ef4444", agents: ["fm", "bm", "ae"], status: "at-risk", progress: 42, priority: "high", tasks: 18, completed: 7 },
  { id: "nova", name: "Cost Analytics Module", color: "#f59e0b", agents: ["ba", "tm"], status: "on-track", progress: 55, priority: "medium", tasks: 12, completed: 6 },
  { id: "echo", name: "Integration Hub v2", color: "#10b981", agents: ["ib", "bm", "dg"], status: "blocked", progress: 31, priority: "medium", tasks: 15, completed: 4 },
  { id: "omega", name: "Autonomous Factory Pipeline", color: "#8b5cf6", agents: ["ba", "tm", "cr"], status: "on-track", progress: 18, priority: "low", tasks: 20, completed: 3 },
];

// ── Tasks ──
export const TASKS_DATA = [
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
export const COMPANIES = [
  { id: "cg", name: "Culbertson & Gray Group", revenue: 284000, expenses: 196000, burn: 16333, aiCost: 1794, humanEquiv: 42000 },
  { id: "oc", name: "Open Claw", revenue: 0, expenses: 8400, burn: 8400, aiCost: 1794, humanEquiv: 85000 },
  { id: "jc", name: "JC Consulting", revenue: 18500, expenses: 4200, burn: 0, aiCost: 420, humanEquiv: 12000 },
];

// ── Skills ──
export const SKILLS = [
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
export const FORGE_IDEAS = [
  { id: "f1", name: "AI Resume Screener SaaS", stage: "building", score: 87, source: "Twitter Trends", revenue: null },
  { id: "f2", name: "Automated Compliance Checker", stage: "evaluating", score: 74, source: "Reddit r/startups", revenue: null },
  { id: "f3", name: "Smart Invoice Parser", stage: "launched", score: 91, source: "Financial Trends", revenue: 1240 },
  { id: "f4", name: "SEO Content Farm Engine", stage: "testing", score: 68, source: "Blog Monitor", revenue: null },
  { id: "f5", name: "Micro-SaaS Directory Scraper", stage: "sourced", score: 55, source: "Twitter Trends", revenue: null },
];

// ── Activity Feed Data ──
export const ACTIVITIES = [
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
];

// ── Cost trend data generator ──
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

export const COST_TREND = genCostTrend(14);