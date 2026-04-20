import { STAGES, getStageDef } from "../utils/stageMapper";
import { fmtBuildCost } from "../utils/computeMetrics";

const STAGE_HEADER_BG = {
  sourced: "bg-slate-500/10 border-slate-500/20",
  evaluating: "bg-yellow-500/10 border-yellow-500/20",
  approved: "bg-purple-500/10 border-purple-500/20",
  building: "bg-blue-500/10 border-blue-500/20",
  testing: "bg-orange-500/10 border-orange-500/20",
  launched: "bg-green-500/10 border-green-500/20",
};

export default function KanbanView({ ideas, onDeploy, onKill, onClick }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto">
      {STAGES.map(stage => {
        const stageIdeas = ideas.filter(i => i.forgeStage === stage.key);
        return (
          <div key={stage.key} className="min-w-[180px]">
            {/* Column header */}
            <div className={`flex items-center justify-between rounded-lg px-3 py-2 border ${STAGE_HEADER_BG[stage.key]}`}>
              <span className={`text-xs font-bold uppercase ${stage.text}`}>{stage.label}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${stage.text} bg-slate-800/40`}>
                {stageIdeas.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2 mt-2">
              {stageIdeas.map(idea => (
                <div key={idea.id} onClick={() => onClick(idea)}
                  className="bg-slate-900/50 border border-slate-700/30 rounded-lg p-3 cursor-pointer hover:bg-slate-800/50 transition-colors"
                  style={{ borderLeft: `3px solid ${stage.accent}` }}>
                  <h4 className="text-xs font-bold text-gray-200 leading-tight">{idea.name}</h4>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] text-slate-400">{idea.confidenceScore}%</span>
                    <span className="text-[10px] text-slate-500">·</span>
                    <span className="text-[10px] text-slate-400">{fmtBuildCost(idea.buildCostEstimate)}</span>
                  </div>
                  {/* Mini progress */}
                  <div className="h-1 rounded-full bg-slate-800 mt-2">
                    <div className="h-1 rounded-full bg-purple-500/60" style={{ width: `${idea.progressPct}%` }} />
                  </div>
                  {/* Mini actions */}
                  <div className="flex items-center gap-1 mt-2">
                    <button onClick={e => { e.stopPropagation(); onDeploy(idea.id); }}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20">
                      🚀
                    </button>
                    <button onClick={e => { e.stopPropagation(); onKill(idea.id); }}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20">
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              {stageIdeas.length === 0 && (
                <div className="text-[10px] text-slate-600 text-center py-4">Empty</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
