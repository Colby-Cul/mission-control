// Computes derived business metrics for forge ideas from raw project data

const CATEGORY_REVENUE = {
  str: { min: 2000, max: 8000 },
  saas: { min: 1000, max: 15000 },
  internal: { min: 500, max: 3000 },
  service: { min: 1000, max: 5000 },
  content: { min: 200, max: 2000 },
};

function inferCategory(project) {
  const name = (project.name || "").toLowerCase();
  const tags = (project.tags || []).map(t => t.toLowerCase());
  const all = [name, ...tags].join(" ");
  if (all.includes("str") || all.includes("rental") || all.includes("guest") || all.includes("booking")) return "str";
  if (all.includes("saas") || all.includes("widget") || all.includes("pricing") || all.includes("api")) return "saas";
  if (all.includes("internal") || all.includes("ops") || all.includes("mission") || all.includes("system")) return "internal";
  if (all.includes("service") || all.includes("concierge")) return "service";
  if (all.includes("content") || all.includes("blog") || all.includes("seo")) return "content";
  return "saas";
}

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function computeConfidence(project) {
  if (typeof project.confidenceScore === "number") return project.confidenceScore;
  const { taskCount = 0, doneCount = 0, sessions = [], agents = [], totalCost = 0 } = project;
  let score = 40; // base
  if (taskCount > 0) score += Math.min(20, (doneCount / taskCount) * 20);
  if (sessions.length > 0) score += Math.min(15, sessions.length * 2);
  if (agents.length > 1) score += 5;
  if (totalCost > 0) score += Math.min(10, totalCost * 2);
  // deterministic jitter from project id
  const jitter = (hashCode(project.id || "x") % 20) - 10;
  return Math.max(15, Math.min(98, Math.round(score + jitter)));
}

export function computeRevenueEstimate(project) {
  if (project.revenueEstimate) return project.revenueEstimate;
  const cat = inferCategory(project);
  const range = CATEGORY_REVENUE[cat] || CATEGORY_REVENUE.saas;
  const h = hashCode(project.id || "x");
  const spread = range.max - range.min;
  const min = range.min + Math.round((h % 40) / 40 * spread * 0.3);
  const max = range.min + Math.round(spread * 0.5) + Math.round((h % 60) / 60 * spread * 0.5);
  return { min, max, period: "month" };
}

export function computeBuildCost(project) {
  if (typeof project.buildCostEstimate === "number") return project.buildCostEstimate;
  const cost = project.estimatedCostToCompletion || project.totalCost || 0;
  if (cost > 0) return Math.round(cost * 100) / 100;
  const h = hashCode(project.id || "x");
  return 150 + (h % 1200);
}

export function computeTimeToMVP(project) {
  if (project.timeToMVP) return project.timeToMVP;
  if (project.estimatedTimeToCompletion) return project.estimatedTimeToCompletion;
  const h = hashCode(project.id || "x");
  const weeks = 1 + (h % 6);
  return `${weeks} week${weeks > 1 ? "s" : ""}`;
}

export function computeSource(project) {
  if (project.source) return project.source;
  const agents = project.agents || project.agentsWorkedOn || [];
  if (agents.length > 0 && agents.some(a => a !== "main")) return "agent";
  return "manual";
}

export function computeCategory(project) {
  if (project.category) return project.category;
  return inferCategory(project);
}

export function computeRisk(project) {
  if (project.riskAssessment) return project.riskAssessment;
  const h = hashCode(project.id || "x");
  const levels = ["low", "medium", "high"];
  return {
    technical: levels[h % 3],
    market: levels[(h >> 2) % 3],
    financial: levels[(h >> 4) % 3],
  };
}

export function isQuickWin(idea) {
  return idea.confidenceScore > 80 && idea.buildCostEstimate < 500 && parseWeeks(idea.timeToMVP) <= 3;
}

function parseWeeks(str) {
  if (!str) return 99;
  const m = String(str).match(/(\d+)\s*week/i);
  if (m) return parseInt(m[1], 10);
  const d = String(str).match(/(\d+)\s*day/i);
  if (d) return Math.ceil(parseInt(d[1], 10) / 7);
  const mn = String(str).match(/~?(\d+)\s*min/i);
  if (mn) return Math.ceil(parseInt(mn[1], 10) / (7 * 24 * 60));
  return 4;
}

export function computeROI(idea) {
  const revMax = idea.revenueEstimate?.max || 0;
  const cost = idea.buildCostEstimate || 1;
  const confidence = (idea.confidenceScore || 50) / 100;
  const weeks = parseWeeks(idea.timeToMVP) || 4;
  const score = (revMax / cost) * confidence * (1 / weeks);
  if (score > 5) return "A+";
  if (score > 3) return "A";
  if (score > 1.5) return "B+";
  if (score > 0.8) return "B";
  if (score > 0.3) return "C";
  return "D";
}

export function fmtRevenue(est) {
  if (!est) return "—";
  const fmt = n => n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : `$${n}`;
  return `${fmt(est.min)}-${fmt(est.max)}/mo`;
}

export function fmtBuildCost(cost) {
  if (!cost && cost !== 0) return "—";
  return cost >= 1000 ? `$${(cost / 1000).toFixed(1)}K` : `$${Math.round(cost)}`;
}
