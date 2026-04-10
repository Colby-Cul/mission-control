import { useState, useEffect, useCallback, useRef } from "react";
import { fmtRevenue, fmtBuildCost } from "../utils/computeMetrics";

export default function ReviewQueue({ ideas, onApprove, onKill, onNeedInfo, onClose }) {
  const [idx, setIdx] = useState(0);
  const idxRef = useRef(idx);
  idxRef.current = idx;

  const current = ideas[idx] || null;
  const currentRef = useRef(current);
  currentRef.current = current;

  const advance = useCallback(() => {
    if (idxRef.current < ideas.length - 1) setIdx(i => i + 1);
    else onClose();
  }, [ideas.length, onClose]);

  useEffect(() => {
    const handleKey = (e) => {
      const c = currentRef.current;
      if (!c) return;
      if (e.key === "ArrowRight") { onApprove(c.id); advance(); }
      if (e.key === "ArrowLeft") { onKill(c.id); advance(); }
      if (e.key === "ArrowDown") { onNeedInfo(c); }
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onApprove, onKill, onNeedInfo, onClose, advance]);

  if (!current) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[600px] bg-gray-900 border border-slate-700/50 rounded-xl shadow-2xl z-50 p-6">
        <div className="text-center">
          <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
            Review Queue · {idx + 1} of {ideas.length}
          </span>
        </div>

        <h2 className="text-xl font-bold text-gray-100 text-center mt-4">{current.name}</h2>
        <p className="text-sm text-slate-400 text-center mt-2 max-w-md mx-auto">
          {(current.pitch || current.description || "").slice(0, 200)}
        </p>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="bg-slate-800/40 rounded-lg p-3 text-center">
            <div className="text-sm font-bold text-gray-200">{fmtRevenue(current.revenueEstimate)}</div>
            <div className="text-[10px] text-slate-500 uppercase mt-1">Revenue</div>
          </div>
          <div className="bg-slate-800/40 rounded-lg p-3 text-center">
            <div className="text-sm font-bold text-gray-200">{fmtBuildCost(current.buildCostEstimate)}</div>
            <div className="text-[10px] text-slate-500 uppercase mt-1">Build Cost</div>
          </div>
          <div className="bg-slate-800/40 rounded-lg p-3 text-center">
            <div className="text-sm font-bold text-gray-200">{current.confidenceScore}%</div>
            <div className="text-[10px] text-slate-500 uppercase mt-1">Confidence</div>
          </div>
        </div>

        {/* Agent summary */}
        {current.agents?.length > 0 && (
          <div className="mt-4 bg-slate-800/30 rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-xs">
              <span>🤖</span>
              <span className="text-slate-500">Agent Summary:</span>
              <span className="text-slate-300">
                {current.source === "agent" ? "Agent-sourced idea" : "Manual submission"}.
                {" "}{current.category} category, {current.riskAssessment?.market || "medium"} competition,
                {" "}{current.timeToMVP || "unknown"} to MVP.
              </span>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          <button onClick={() => { onKill(current.id); advance(); }}
            className="py-3 text-sm font-semibold rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors">
            👎 Kill It
          </button>
          <button onClick={() => onNeedInfo(current)}
            className="py-3 text-sm font-semibold rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/20 transition-colors">
            🔍 Need More Info
          </button>
          <button onClick={() => { onApprove(current.id); advance(); }}
            className="py-3 text-sm font-semibold rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors">
            👍 Approve
          </button>
        </div>

        {/* Keyboard hints */}
        <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-slate-600">
          <span>← Kill</span>
          <span>↓ More Info</span>
          <span>→ Approve</span>
        </div>

        {/* Pagination dots */}
        <div className="flex items-center justify-center gap-1.5 mt-4">
          {ideas.map((_, i) => (
            <span key={i}
              className={`w-2 h-2 rounded-full transition-colors ${i === idx ? "bg-purple-400" : "bg-slate-700"}`} />
          ))}
        </div>
      </div>
    </>
  );
}
