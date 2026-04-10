import { STAGES } from "../utils/stageMapper";

const STAGE_BG = {
  sourced: "border-b-slate-400",
  evaluating: "border-b-yellow-400",
  approved: "border-b-purple-400",
  building: "border-b-blue-400",
  testing: "border-b-orange-400",
  launched: "border-b-green-400",
};

function conversionLabel(key, counts) {
  const total = Object.values(counts).reduce((s, v) => s + v, 0);
  switch (key) {
    case "sourced": return total > 0 ? "agent-discovered" : "—";
    case "evaluating": {
      const from = counts.sourced || 1;
      const pct = Math.round(((counts.evaluating + (counts.approved || 0) + (counts.building || 0) + (counts.testing || 0) + (counts.launched || 0)) / Math.max(from + counts.evaluating + counts.approved + counts.building + counts.testing + counts.launched, 1)) * 100);
      return `${pct}% pass rate`;
    }
    case "approved": {
      const fromEval = (counts.evaluating || 0) + (counts.approved || 0) + (counts.building || 0) + (counts.testing || 0) + (counts.launched || 0);
      return fromEval > 0 ? `${Math.round((counts.approved + (counts.building || 0) + (counts.testing || 0) + (counts.launched || 0)) / fromEval * 100)}% from eval` : "—";
    }
    case "building": {
      const fromApproved = (counts.approved || 0) + (counts.building || 0) + (counts.testing || 0) + (counts.launched || 0);
      return fromApproved > 0 ? `${Math.round((counts.building + (counts.testing || 0) + (counts.launched || 0)) / fromApproved * 100)}% of approved` : "—";
    }
    case "testing": return counts.testing > 0 ? "in QA" : "—";
    case "launched": return "$0/mo revenue";
    default: return "—";
  }
}

export default function PipelineFunnel({ stageCounts, activeStage, onStageClick }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
      {STAGES.map((stage, i) => {
        const count = stageCounts[stage.key] || 0;
        const isActive = activeStage === stage.key;
        return (
          <button key={stage.key} onClick={() => onStageClick(stage.key)}
            className={`relative flex flex-col items-center p-3 rounded-lg border-b-[3px] transition-all cursor-pointer
              ${STAGE_BG[stage.key]}
              ${isActive ? "bg-slate-800/80 ring-1 ring-purple-500/40" : "bg-slate-900/50 hover:bg-slate-800/60"}
            `}>
            {i > 0 && (
              <span className="hidden sm:block absolute -left-2.5 top-1/2 -translate-y-1/2 text-slate-600 text-sm font-bold">›</span>
            )}
            <span className={`text-[10px] font-bold uppercase tracking-wider ${stage.text}`}>
              {stage.label}
            </span>
            <span className="text-2xl font-bold text-gray-100 mt-1">{count}</span>
            <span className="text-[10px] text-slate-500 mt-0.5 text-center leading-tight">
              {conversionLabel(stage.key, stageCounts)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
