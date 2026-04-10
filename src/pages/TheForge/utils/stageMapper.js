// Maps existing project data to forge pipeline stages
const STAGE_DEFS = [
  { key: "sourced",    label: "Sourced",    color: "slate",  accent: "#94a3b8", border: "border-slate-400",  bg: "bg-slate-400",  text: "text-slate-400"  },
  { key: "evaluating", label: "Evaluating", color: "yellow", accent: "#facc15", border: "border-yellow-400", bg: "bg-yellow-400", text: "text-yellow-400" },
  { key: "approved",   label: "Approved",   color: "purple", accent: "#a78bfa", border: "border-purple-400", bg: "bg-purple-400", text: "text-purple-400" },
  { key: "building",   label: "Building",   color: "blue",   accent: "#60a5fa", border: "border-blue-400",   bg: "bg-blue-400",   text: "text-blue-400"   },
  { key: "testing",    label: "Testing",    color: "orange", accent: "#fb923c", border: "border-orange-400", bg: "bg-orange-400", text: "text-orange-400" },
  { key: "launched",   label: "Launched",   color: "green",  accent: "#4ade80", border: "border-green-400",  bg: "bg-green-400",  text: "text-green-400"  },
];

export const STAGES = STAGE_DEFS;

export function getStageDef(key) {
  return STAGE_DEFS.find(s => s.key === key) || STAGE_DEFS[0];
}

export function deriveForgeStage(project) {
  if (project.forgeStage) return project.forgeStage;
  const { taskCount = 0, doneCount = 0, status, sessions = [] } = project;
  const pct = taskCount > 0 ? (doneCount / taskCount) * 100 : 0;
  if (status === "completed" || pct >= 100) return "launched";
  if (pct >= 75) return "testing";
  if (pct >= 30) return "building";
  if (pct >= 10) return "evaluating";
  if (status === "active" && (sessions.length > 0 || doneCount > 0)) return "approved";
  if (status === "paused") return "sourced";
  return "sourced";
}

export function getStageIndex(key) {
  return STAGE_DEFS.findIndex(s => s.key === key);
}

export function nextStage(key) {
  const idx = getStageIndex(key);
  return idx < STAGE_DEFS.length - 1 ? STAGE_DEFS[idx + 1].key : key;
}
