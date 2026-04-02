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

// ── Real Agent Data (from OpenClaw runtime) ──
export const AGENTS = [
  { id: "main", name: "Jarvis", initials: "JV", color: "#6366f1", ring: "#818cf8", dept: "Operations", model: "GPT-4o", role: "chief of staff", status: "online", sessions: 510 },
  { id: "worker", name: "Worker", initials: "WK", color: "#10b981", ring: "#34d399", dept: "Engineering", model: "GPT-4o", role: "implementation", status: "online", sessions: 4 },
  { id: "validation", name: "Validator", initials: "VL", color: "#0ea5e9", ring: "#38bdf8", dept: "Engineering", model: "GPT-4o", role: "QA", status: "online", sessions: 1 },
  { id: "executive-assistant", name: "Victoria", initials: "VA", color: "#8b5cf6", ring: "#a78bfa", dept: "Executive", model: "GPT-4o-mini", role: "executive assistant", status: "online", sessions: 6 },

  { id: "cfo", name: "CFO", initials: "CF", color: "#D4AF37", ring: "#F5D060", dept: "Finance", model: "GPT-4o", role: "Chief Financial Officer", status: "online", sessions: 0 },
  { id: "fin-researcher", name: "Financial Researcher", initials: "FR", color: "#2DD4BF", ring: "#5EEAD4", dept: "Finance", model: "GPT-4o", role: "Financial Researcher", status: "online", sessions: 0 },
  { id: "tax-advisor", name: "Tax Advisor", initials: "TA", color: "#1E3A5F", ring: "#3B6B9E", dept: "Finance", model: "GPT-4o", role: "Strategic Tax Advisor", status: "online", sessions: 0 },
  { id: "crypto-analyst", name: "Crypto Analyst", initials: "CA", color: "#F59E0B", ring: "#FBBF24", dept: "Finance", model: "GPT-4o", role: "Crypto Investment Analyst", status: "online", sessions: 0 },
  { id: "stock-analyst", name: "Stock Analyst", initials: "SA", color: "#10B981", ring: "#34D399", dept: "Finance", model: "GPT-4o", role: "Stock Analyst", status: "online", sessions: 0 },
];

export const DEPARTMENTS = ["Operations", "Engineering", "Executive", "Finance"];

// ── Real Projects ──
export const PROJECTS = [
  { id: "mc", name: "Mission Control Dashboard", color: "#6366f1", agents: ["main", "worker"], status: "on-track", progress: 0, priority: "high", tasks: 0, completed: 0 },
];

// ── Real Tasks (only tasks with verified ACP session evidence) ──
// Each task MUST have a sessionId and transcriptPath that correspond to a real execution
export const TASKS_DATA = [
  // Populated by real ACP session completions — see live-data.json
];

// ── Financial Data ──
export const COMPANIES = [
  { id: "cg", name: "Culbertson & Gray Group", revenue: 284000, expenses: 196000, burn: 16333, aiCost: 0, humanEquiv: 0 },
];

// ── Real Skills (from ~/.openclaw/skills/) ──
export const SKILLS = [
  { id: "s1", name: "Monday.com Operations", grade: "-", score: 0, usage: 0, agents: ["main"], version: "1.0" },
  { id: "s2", name: "Discord Chat", grade: "-", score: 0, usage: 0, agents: ["main"], version: "1.0" },
  { id: "s3", name: "Task Master", grade: "-", score: 0, usage: 0, agents: ["main"], version: "1.0" },
  { id: "s4", name: "Prompt Guard", grade: "-", score: 0, usage: 0, agents: ["main"], version: "1.0" },
  { id: "s5", name: "Session Hygiene", grade: "-", score: 0, usage: 0, agents: ["main"], version: "1.0" },
  { id: "s6", name: "Agent Browser", grade: "-", score: 0, usage: 0, agents: ["main"], version: "1.0" },
  { id: "s7", name: "Enterprise Architecture Audit", grade: "-", score: 0, usage: 0, agents: ["main"], version: "1.0" },
  { id: "s8", name: "macOS UI Control", grade: "-", score: 0, usage: 0, agents: ["main"], version: "1.0" },
  { id: "s9", name: "Travel Planning", grade: "-", score: 0, usage: 0, agents: ["main"], version: "1.0" },
  { id: "s10", name: "Slack Integration", grade: "-", score: 0, usage: 0, agents: ["main"], version: "1.0" },
  { id: "s11", name: "AgentMail", grade: "-", score: 0, usage: 0, agents: ["main"], version: "1.0" },
  { id: "s12", name: "Web Search (Exa)", grade: "-", score: 0, usage: 0, agents: ["main"], version: "1.0" },
];

// ── Forge Ideas ──
export const FORGE_IDEAS = [];

// ── Activity Feed Data (empty — will be populated by real events) ──
export const ACTIVITIES = [];

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
