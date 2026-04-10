import { getStageDef } from "../utils/stageMapper";
import { isQuickWin, fmtRevenue, fmtBuildCost, computeROI } from "../utils/computeMetrics";

const STAGE_BADGE_CLASSES = {
  sourced:    "bg-slate-500/20 text-slate-400",
  evaluating: "bg-yellow-500/20 text-yellow-400",
  approved:   "bg-purple-500/20 text-purple-400",
  building:   "bg-blue-500/20 text-blue-400",
  testing:    "bg-orange-500/20 text-orange-400",
  launched:   "bg-green-500/20 text-green-400",
};

function confidenceColor(score) {
  if (score >= 75) return "from-green-500 to-green-600";
  if (score >= 50) return "from-yellow-500 to-yellow-600";
  return "from-red-500 to-red-600";
}

function confidenceBarColor(score) {
  if (score >= 75) return "bg-gradient-to-r from-green-500 to-green-400";
  if (score >= 50) return "bg-gradient-to-r from-yellow-500 to-yellow-400";
  return "bg-gradient-to-r from-red-500 to-red-400";
}

export default function IdeaCard({
  idea, isComparing, onToggleCompare, onClick, onDeploy, onKill, onShelve, onAskAgent,
}) {
  const stageDef = getStageDef(idea.forgeStage);
  const quickWin = isQuickWin(idea);
  const pct = idea.progressPct || 0;
  const roi = computeROI(idea);

  return (
    <div
      onClick={onClick}
      className={`relative flex flex-col bg-slate-900/50 rounded-xl border transition-all duration-200 cursor-pointer group
        hover:-translate-y-0.5 hover:shadow-lg hover:shadow-purple-500/5
        ${idea.forgeStage === "building" ? "border-l-[3px] border-l-blue-500 border-slate-700/30" : "border-slate-700/30"}
        ${idea.source === "agent" ? "border-dashed border-purple-500/30" : ""}
        ${isComparing ? "ring-2 ring-purple-500/60" : ""}
      `}
    >
      {/* Top badges row */}
      <div className="flex items-center justify-between px-4 pt-3">
        <div className="flex items-center gap-1.5">
          {quickWin && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-400">
              ⚡ QUICK WIN
            </span>
          )}
          {idea.source === "agent" && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gradient-to-br from-purple-600/20 to-purple-800/20 text-purple-400">
              🤖 Agent
            </span>
          )}
          {(idea.forgeStage === "sourced" || idea.forgeStage === "evaluating") && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400">
              ⏳ Awaiting Review
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {/* Compare checkbox */}
          <button onClick={e => { e.stopPropagation(); onToggleCompare(idea.id); }}
            className={`w-4 h-4 rounded border text-[10px] flex items-center justify-center transition-colors
              ${isComparing ? "bg-purple-500 border-purple-500 text-white" : "border-slate-600 text-transparent hover:border-slate-400"}`}>
            ✓
          </button>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${STAGE_BADGE_CLASSES[idea.forgeStage] || STAGE_BADGE_CLASSES.sourced}`}>
            {stageDef.label}
          </span>
        </div>
      </div>

      {/* Title & pitch */}
      <div className="px-4 pt-2">
        <h3 className="text-[15px] font-bold text-gray-100 leading-tight">{idea.name}</h3>
        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{(idea.pitch || "").slice(0, 100)}</p>
      </div>

      {/* Source line */}
      <div className="px-4 mt-2 flex items-center gap-1.5 text-[10px] text-slate-500">
        <span className={`w-1.5 h-1.5 rounded-full ${idea.source === "agent" ? "bg-purple-400" : "bg-slate-400"}`} />
        <span className="capitalize">{idea.source}</span>
        <span>·</span>
        <span className="capitalize">{idea.priority || "medium"}</span>
        <span>·</span>
        <span>{idea.createdAt ? new Date(idea.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}</span>
        {idea.agents?.length > 0 && (
          <>
            <span>·</span>
            <span>{idea.agents.length} agent{idea.agents.length > 1 ? "s" : ""}</span>
          </>
        )}
      </div>

      {/* Confidence bar */}
      <div className="px-4 mt-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-slate-500">Confidence</span>
          <span className={`text-xs font-bold bg-gradient-to-r ${confidenceColor(idea.confidenceScore)} bg-clip-text text-transparent`}>
            {idea.confidenceScore}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-800">
          <div className={`h-1.5 rounded-full transition-all ${confidenceBarColor(idea.confidenceScore)}`}
            style={{ width: `${idea.confidenceScore}%` }} />
        </div>
      </div>

      {/* 3-col metrics */}
      <div className="grid grid-cols-3 gap-2 px-4 mt-3">
        <div className="bg-slate-800/40 rounded-lg p-2 text-center">
          <div className="text-xs font-bold text-gray-200">{fmtRevenue(idea.revenueEstimate)}</div>
          <div className="text-[9px] text-slate-500 uppercase tracking-wide mt-0.5">Rev/mo</div>
        </div>
        <div className="bg-slate-800/40 rounded-lg p-2 text-center">
          <div className="text-xs font-bold text-gray-200">{fmtBuildCost(idea.buildCostEstimate)}</div>
          <div className="text-[9px] text-slate-500 uppercase tracking-wide mt-0.5">Build Cost</div>
        </div>
        <div className="bg-slate-800/40 rounded-lg p-2 text-center">
          <div className="text-xs font-bold text-gray-200">{idea.timeToMVP || "—"}</div>
          <div className="text-[9px] text-slate-500 uppercase tracking-wide mt-0.5">Time to MVP</div>
        </div>
      </div>

      {/* Tags */}
      {(idea.tags || []).length > 0 && (
        <div className="flex items-center gap-1 px-4 mt-2 flex-wrap">
          {idea.tags.slice(0, 4).map(tag => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/60 text-slate-400 border border-slate-700/30">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Progress bar */}
      <div className="px-4 mt-3">
        <div className="h-1 rounded-full bg-slate-800">
          <div className="h-1 rounded-full bg-purple-500/70 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-slate-500">
            {idea.doneCount || 0} / {idea.taskCount || 0} tasks
          </span>
          <span className="text-[10px] text-slate-500">{pct}%</span>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-700/30 mt-3" />

      {/* Action buttons */}
      <div className="flex items-center gap-1 px-3 py-2">
        <button onClick={e => { e.stopPropagation(); onDeploy(idea.id); }}
          className="flex-1 px-2 py-1 text-[10px] font-semibold rounded-md bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors">
          🚀 Deploy
        </button>
        <button onClick={e => { e.stopPropagation(); onAskAgent(idea); }}
          className="flex-1 px-2 py-1 text-[10px] font-semibold rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-colors">
          💬 Ask Agent
        </button>
        <button onClick={e => { e.stopPropagation(); onShelve(idea.id); }}
          className="flex-1 px-2 py-1 text-[10px] font-semibold rounded-md bg-slate-500/10 text-slate-400 border border-slate-500/20 hover:bg-slate-500/20 transition-colors">
          ⏸️ Shelve
        </button>
        <button onClick={e => { e.stopPropagation(); onKill(idea.id); }}
          className="flex-1 px-2 py-1 text-[10px] font-semibold rounded-md bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors">
          ✕ Kill
        </button>
      </div>
    </div>
  );
}
