import { fmtRevenue, fmtBuildCost, computeROI } from "../utils/computeMetrics";

const METRICS = [
  { key: "confidence", label: "Confidence",      get: i => i.confidenceScore, fmt: v => `${v}%`, best: "max" },
  { key: "revenue",    label: "Revenue",         get: i => i.revenueEstimate?.max || 0, fmt: (_, i) => fmtRevenue(i.revenueEstimate), best: "max" },
  { key: "cost",       label: "Build Cost",      get: i => i.buildCostEstimate || 0, fmt: (_, i) => fmtBuildCost(i.buildCostEstimate), best: "min" },
  { key: "time",       label: "Time to MVP",     get: i => parseWeeks(i.timeToMVP), fmt: (_, i) => i.timeToMVP || "—", best: "min" },
  { key: "competition",label: "Competition",     get: i => ({ low: 1, medium: 2, high: 3 })[i.riskAssessment?.market] || 2, fmt: (_, i) => i.riskAssessment?.market || "—", best: "min" },
  { key: "techRisk",   label: "Technical Risk",  get: i => ({ low: 1, medium: 2, high: 3 })[i.riskAssessment?.technical] || 2, fmt: (_, i) => i.riskAssessment?.technical || "—", best: "min" },
  { key: "roi",        label: "ROI Score",       get: i => roiVal(computeROI(i)), fmt: (_, i) => computeROI(i), best: "max" },
  { key: "category",   label: "Aligns With",     get: () => 0, fmt: (_, i) => [i.category, ...(i.tags || []).slice(0, 2)].filter(Boolean).join(", "), best: null },
];

function parseWeeks(str) {
  if (!str) return 99;
  const m = String(str).match(/(\d+)\s*week/i);
  return m ? parseInt(m[1], 10) : 4;
}

function roiVal(grade) {
  return { "A+": 6, A: 5, "B+": 4, B: 3, C: 2, D: 1 }[grade] || 0;
}

function indicatorEmoji(score) {
  if (score >= 75) return "🟢";
  if (score >= 50) return "🟡";
  return "🔴";
}

export default function CompareModal({ ideas, onDeploy, onClose }) {
  if (!ideas || ideas.length < 2) return null;

  // Find best value per metric
  const bestPerMetric = {};
  METRICS.forEach(m => {
    if (!m.best) return;
    const vals = ideas.map(i => m.get(i));
    const bestVal = m.best === "max" ? Math.max(...vals) : Math.min(...vals);
    bestPerMetric[m.key] = bestVal;
  });

  // Pick winner by most "best" wins
  const wins = ideas.map(idea => METRICS.filter(m => m.best && m.get(idea) === bestPerMetric[m.key]).length);
  const maxWins = Math.max(...wins);
  const winnerIdx = wins.indexOf(maxWins);

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-[1000px] max-h-[85vh] overflow-y-auto bg-gray-900 border border-slate-700/50 rounded-xl shadow-2xl z-50 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-100">Compare Ideas</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">✕</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/30">
                <th className="text-left text-slate-500 text-xs px-3 py-2 min-w-[120px]">Metric</th>
                {ideas.map((idea, i) => (
                  <th key={idea.id} className="text-center text-slate-300 text-xs px-3 py-2 font-semibold min-w-[140px]">
                    {idea.name}
                    {i === winnerIdx && <span className="ml-1 text-yellow-400">👑</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {METRICS.map(m => (
                <tr key={m.key} className="border-b border-slate-700/20">
                  <td className="text-slate-400 px-3 py-2.5">{m.label}</td>
                  {ideas.map(idea => {
                    const val = m.get(idea);
                    const isBest = m.best && val === bestPerMetric[m.key];
                    return (
                      <td key={idea.id} className={`text-center px-3 py-2.5 ${isBest ? "text-green-400 font-semibold" : "text-slate-300"}`}>
                        {m.key === "roi" ? `[${m.fmt(val, idea)}]` : m.fmt(val, idea)}
                        {isBest && m.best && " ⭐"}
                        {m.key === "confidence" && ` ${indicatorEmoji(val)}`}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-center gap-3 mt-6">
          <button onClick={() => { onDeploy(ideas[winnerIdx].id); onClose(); }}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-gradient-to-br from-green-600 to-green-700 text-white hover:from-green-500 hover:to-green-600 transition-colors">
            🚀 Deploy Winner: {ideas[winnerIdx].name}
          </button>
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors">
            Close
          </button>
        </div>
      </div>
    </>
  );
}
