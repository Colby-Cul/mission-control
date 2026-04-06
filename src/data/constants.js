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
  { id: "main", name: "Jarvis", initials: "JV", color: "#6366f1", ring: "#818cf8", dept: "Operations", model: "Claude Sonnet 4.6", role: "chief of staff", status: "online", sessions: 510 },
  { id: "coding-agent", name: "Coding Agent", initials: "CA", color: "#10b981", ring: "#34d399", dept: "Engineering", model: "Claude Sonnet 4.6", role: "software engineer", status: "online", sessions: 4 },
  { id: "validation", name: "Validator", initials: "VL", color: "#0ea5e9", ring: "#38bdf8", dept: "Engineering", model: "Claude Sonnet 4.6", role: "QA", status: "online", sessions: 1 },
  { id: "executive-assistant", name: "Victoria", initials: "VA", color: "#8b5cf6", ring: "#a78bfa", dept: "Executive", model: "Claude Haiku 4.5", role: "executive assistant", status: "online", sessions: 6 },

  { id: "cfo", name: "CFO", initials: "CF", color: "#D4AF37", ring: "#F5D060", dept: "Finance", model: "Claude Sonnet 4.6", role: "Chief Financial Officer", status: "online", sessions: 0 },
  { id: "fin-researcher", name: "Financial Researcher", initials: "FR", color: "#2DD4BF", ring: "#5EEAD4", dept: "Finance", model: "Claude Sonnet 4.6", role: "Financial Researcher", status: "online", sessions: 0 },
  { id: "tax-advisor", name: "Tax Advisor", initials: "TA", color: "#1E3A5F", ring: "#3B6B9E", dept: "Finance", model: "Claude Sonnet 4.6", role: "Strategic Tax Advisor", status: "online", sessions: 0 },
  { id: "crypto-analyst", name: "Crypto Analyst", initials: "CA", color: "#F59E0B", ring: "#FBBF24", dept: "Finance", model: "Claude Sonnet 4.6", role: "Crypto Investment Analyst", status: "online", sessions: 0 },
  { id: "bookkeeper", name: "Bookkeeper", initials: "BK", color: "#6366F1", ring: "#818CF8", dept: "Finance", model: "Claude Haiku 4.5", role: "Bookkeeper", status: "online", sessions: 0 },
  { id: "stock-analyst", name: "Stock Analyst", initials: "SA", color: "#10B981", ring: "#34D399", dept: "Finance", model: "Claude Sonnet 4.6", role: "Stock Analyst", status: "online", sessions: 0 },
  { id: "designer", name: "Designer", initials: "DS", color: "#ec4899", ring: "#f472b6", dept: "Engineering", model: "GPT-4o-mini", role: "Creative Director & Lead Designer", status: "online", sessions: 0 },

  { id: "maven", name: "Maven", initials: "MV", color: "#e11d48", ring: "#fb7185", dept: "Marketing", model: "GPT-4o-mini", role: "CMO", status: "online", sessions: 0 },
  { id: "quill", name: "Quill", initials: "QL", color: "#7c3aed", ring: "#a78bfa", dept: "Marketing", model: "GPT-4o-mini", role: "Content Strategist", status: "online", sessions: 0 },
  { id: "echo", name: "Echo", initials: "EC", color: "#0891b2", ring: "#22d3ee", dept: "Marketing", model: "GPT-4o-mini", role: "Social Media Manager", status: "online", sessions: 0 },
  { id: "spark", name: "Spark", initials: "SP", color: "#ea580c", ring: "#fb923c", dept: "Marketing", model: "GPT-4o-mini", role: "Growth Hacker", status: "online", sessions: 0 },
  { id: "beacon", name: "Beacon", initials: "BC", color: "#059669", ring: "#34d399", dept: "Marketing", model: "GPT-4o-mini", role: "SEO & Email Specialist", status: "online", sessions: 0 },
  { id: "lens", name: "Lens", initials: "LN", color: "#4f46e5", ring: "#818cf8", dept: "Marketing", model: "GPT-4o-mini", role: "Market Research Analyst", status: "online", sessions: 0 },
  { id: "pulse", name: "Pulse", initials: "PL", color: "#0d9488", ring: "#2dd4bf", dept: "Marketing", model: "GPT-4o-mini", role: "Performance Analyst", status: "online", sessions: 0 },
  { id: "sentinel", name: "Sentinel", initials: "SN", color: "#b91c1c", ring: "#f87171", dept: "Marketing", model: "GPT-4o-mini", role: "QA Validator", status: "online", sessions: 0 },
  { id: "herald", name: "Herald", initials: "HR", color: "#a16207", ring: "#fbbf24", dept: "Marketing", model: "GPT-4o-mini", role: "Brand & PR Specialist", status: "online", sessions: 0 },
  { id: "scribe", name: "Scribe", initials: "SC", color: "#6d28d9", ring: "#a78bfa", dept: "Marketing", model: "GPT-4o-mini", role: "Copywriter", status: "online", sessions: 0 },
];

export const DEPARTMENTS = ["Operations", "Engineering", "Executive", "Finance", "Marketing"];

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

// ── Cost trend data (static / deterministic) ──
export const COST_TREND = [
  { date: "Mar 8",  total: 9.12,  opus: 4.56,  sonnet: 2.88, haiku: 1.68 },
  { date: "Mar 9",  total: 10.05, opus: 5.10,  sonnet: 3.15, haiku: 1.80 },
  { date: "Mar 10", total: 52.30, opus: 26.40, sonnet: 16.10, haiku: 9.80 },
  { date: "Mar 11", total: 48.75, opus: 24.20, sonnet: 15.35, haiku: 9.20 },
  { date: "Mar 12", total: 55.10, opus: 28.00, sonnet: 17.50, haiku: 9.60 },
  { date: "Mar 13", total: 43.90, opus: 22.10, sonnet: 13.80, haiku: 8.00 },
  { date: "Mar 14", total: 50.20, opus: 25.50, sonnet: 16.00, haiku: 8.70 },
  { date: "Mar 15", total: 11.40, opus: 5.70,  sonnet: 3.60, haiku: 2.10 },
  { date: "Mar 16", total: 8.85,  opus: 4.35,  sonnet: 2.70, haiku: 1.80 },
  { date: "Mar 17", total: 47.60, opus: 23.80, sonnet: 15.00, haiku: 8.80 },
  { date: "Mar 18", total: 51.45, opus: 26.00, sonnet: 16.25, haiku: 9.20 },
  { date: "Mar 19", total: 46.30, opus: 23.10, sonnet: 14.70, haiku: 8.50 },
  { date: "Mar 20", total: 54.80, opus: 27.90, sonnet: 17.30, haiku: 9.60 },
  { date: "Mar 21", total: 49.15, opus: 24.60, sonnet: 15.75, haiku: 8.80 },
];
