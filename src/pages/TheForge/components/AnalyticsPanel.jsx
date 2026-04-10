import { STAGES } from "../utils/stageMapper";

export default function AnalyticsPanel({ ideas, stageCounts, onClose }) {
  const total = ideas.length;
  const killed = (() => { try { return JSON.parse(localStorage.getItem("forge-killed") || "[]").length; } catch { return 0; } })();
  const launched = stageCounts.launched || 0;
  const sourcedPerWeek = Math.max(1, Math.round(total / 4));
  const killRate = total + killed > 0 ? Math.round((killed / (total + killed)) * 100) : 0;

  // Conversion rates between stages
  const stageKeys = STAGES.map(s => s.key);
  const conversions = stageKeys.slice(1).map((key, i) => {
    const prev = stageKeys[i];
    const fromCount = stageCounts[prev] || 0;
    const toCount = stageCounts[key] || 0;
    const total = fromCount + toCount;
    return {
      from: STAGES[i].label,
      to: STAGES[i + 1].label,
      rate: total > 0 ? Math.round((toCount / Math.max(total, 1)) * 100) : 0,
    };
  });

  // Health score (composite)
  const health = Math.min(100, Math.round(
    (total > 0 ? 20 : 0) +
    (launched > 0 ? 30 : 0) +
    ((stageCounts.building || 0) > 0 ? 20 : 0) +
    (killRate < 80 ? 15 : 0) +
    (sourcedPerWeek > 0 ? 15 : 0)
  ));

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-[800px] max-h-[85vh] overflow-y-auto bg-gray-900 border border-slate-700/50 rounded-xl shadow-2xl z-50 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-100">Factory Analytics</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">✕</button>
        </div>

        {/* Top stats */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
          {[
            { label: "Total Ideas", value: total, color: "text-purple-400" },
            { label: "Sourced/wk", value: `~${sourcedPerWeek}`, color: "text-slate-400" },
            { label: "Building", value: stageCounts.building || 0, color: "text-blue-400" },
            { label: "Launched", value: launched, color: "text-green-400" },
            { label: "Kill Rate", value: `${killRate}%`, color: "text-red-400" },
            { label: "Health", value: `${health}%`, color: health >= 60 ? "text-green-400" : "text-yellow-400" },
          ].map(s => (
            <div key={s.label} className="bg-slate-800/40 rounded-lg p-3 text-center">
              <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-slate-500 uppercase mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Stage breakdown */}
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Pipeline Breakdown</h4>
        <div className="space-y-2 mb-6">
          {STAGES.map(stage => {
            const count = stageCounts[stage.key] || 0;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={stage.key} className="flex items-center gap-3">
                <span className={`text-xs font-medium w-24 ${stage.text}`}>{stage.label}</span>
                <div className="flex-1 h-2 rounded-full bg-slate-800">
                  <div className={`h-2 rounded-full ${stage.bg}`} style={{ width: `${pct}%`, opacity: 0.7 }} />
                </div>
                <span className="text-xs text-slate-400 w-12 text-right">{count} ({pct}%)</span>
              </div>
            );
          })}
        </div>

        {/* Conversion rates */}
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Stage Conversions</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {conversions.map(c => (
            <div key={c.from} className="bg-slate-800/30 rounded-lg p-3">
              <div className="text-xs text-slate-500">{c.from} → {c.to}</div>
              <div className={`text-lg font-bold mt-1 ${c.rate >= 50 ? "text-green-400" : c.rate >= 25 ? "text-yellow-400" : "text-red-400"}`}>
                {c.rate}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
