import { getStageDef } from "../utils/stageMapper";
import { fmtRevenue, fmtBuildCost, computeROI } from "../utils/computeMetrics";

const RISK_COLOR = { low: "text-green-400 bg-green-500/10 border-green-500/20", medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20", high: "text-red-400 bg-red-500/10 border-red-500/20" };

const STAGE_BADGE = {
  sourced: "bg-slate-500/20 text-slate-400", evaluating: "bg-yellow-500/20 text-yellow-400",
  approved: "bg-purple-500/20 text-purple-400", building: "bg-blue-500/20 text-blue-400",
  testing: "bg-orange-500/20 text-orange-400", launched: "bg-green-500/20 text-green-400",
};

export default function IdeaDetailPanel({ idea, onClose, onDeploy, onKill, onShelve, onAskAgent }) {
  if (!idea) return null;
  const stage = getStageDef(idea.forgeStage);
  const roi = computeROI(idea);
  const risk = idea.riskAssessment || { technical: "medium", market: "medium", financial: "medium" };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 w-full max-w-[640px] h-full bg-gray-950 border-l border-slate-700/50 z-50 overflow-y-auto
        animate-[slideIn_300ms_ease-out]"
        style={{ "--tw-enter-translate-x": "100%" }}>

        {/* Header */}
        <div className="sticky top-0 bg-gray-950/95 backdrop-blur-sm border-b border-slate-700/30 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${STAGE_BADGE[idea.forgeStage] || STAGE_BADGE.sourced}`}>
                {stage.label}
              </span>
              <span className="text-[10px] text-slate-500 capitalize">{idea.priority || "medium"} priority</span>
              <span className="text-[10px] text-slate-500">
                {idea.createdAt ? new Date(idea.createdAt).toLocaleDateString() : ""}
              </span>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-lg">✕</button>
          </div>
          <h2 className="text-xl font-bold text-gray-100 mt-2">{idea.name}</h2>
          <p className="text-sm text-slate-400 mt-1">{idea.pitch || idea.description}</p>
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Revenue/mo", value: fmtRevenue(idea.revenueEstimate) },
              { label: "Build Cost", value: fmtBuildCost(idea.buildCostEstimate) },
              { label: "Time to MVP", value: idea.timeToMVP || "—" },
              { label: "Confidence", value: `${idea.confidenceScore}%` },
            ].map(s => (
              <div key={s.label} className="bg-slate-800/40 rounded-lg p-3 text-center">
                <div className="text-sm font-bold text-gray-200">{s.value}</div>
                <div className="text-[10px] text-slate-500 uppercase mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-4 gap-2">
            <button onClick={() => onDeploy(idea.id)}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors">
              🚀 Deploy
            </button>
            <button onClick={() => onAskAgent(idea)}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-colors">
              💬 Ask Agent
            </button>
            <button onClick={() => onShelve(idea.id)}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-500/10 text-slate-400 border border-slate-500/20 hover:bg-slate-500/20 transition-colors">
              ⏸️ Shelve
            </button>
            <button onClick={() => onKill(idea.id)}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors">
              ✕ Kill
            </button>
          </div>

          {/* Executive Summary */}
          <Section title="Executive Summary">
            <p className="text-sm text-slate-300 leading-relaxed">
              <strong>{idea.name}</strong> is a {idea.category || "product"} initiative currently in the <em>{stage.label}</em> stage
              with a confidence score of {idea.confidenceScore}%. Estimated monthly revenue potential
              is {fmtRevenue(idea.revenueEstimate)} with a build cost of {fmtBuildCost(idea.buildCostEstimate)}.
              ROI grade: <strong>{roi}</strong>.
            </p>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              {idea.progressPct > 0
                ? `Progress is at ${idea.progressPct}% with ${idea.doneCount} of ${idea.taskCount} tasks completed.`
                : "This idea has not yet entered active development."
              }
              {idea.agents?.length > 0 && ` ${idea.agents.length} agent(s) are assigned: ${idea.agents.join(", ")}.`}
            </p>
          </Section>

          {/* Market Analysis */}
          <Section title="Market Analysis">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-slate-500">Category:</span>{" "}
                <span className="text-slate-300 capitalize">{idea.category || "—"}</span>
              </div>
              <div>
                <span className="text-slate-500">Competition:</span>{" "}
                <span className="text-slate-300 capitalize">{risk.market}</span>
              </div>
              <div>
                <span className="text-slate-500">Source:</span>{" "}
                <span className="text-slate-300 capitalize">{idea.source}</span>
              </div>
              <div>
                <span className="text-slate-500">ROI Grade:</span>{" "}
                <span className="text-slate-300 font-bold">{roi}</span>
              </div>
            </div>
            {idea.competitors && idea.competitors.length > 0 && (
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {idea.competitors.map(c => (
                  <span key={c} className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/30">{c}</span>
                ))}
              </div>
            )}
          </Section>

          {/* Revenue Model */}
          <Section title="Revenue Model">
            <div className="bg-slate-800/30 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/30">
                    <th className="text-left text-slate-500 text-xs px-3 py-2">Stream</th>
                    <th className="text-right text-slate-500 text-xs px-3 py-2">Estimate</th>
                  </tr>
                </thead>
                <tbody>
                  {idea.revenueModel?.streams ? idea.revenueModel.streams.map((s, i) => (
                    <tr key={i} className="border-b border-slate-700/20">
                      <td className="text-slate-300 px-3 py-2">{s.name}</td>
                      <td className="text-slate-300 text-right px-3 py-2">{s.estimate}</td>
                    </tr>
                  )) : (
                    <tr className="border-b border-slate-700/20">
                      <td className="text-slate-300 px-3 py-2 capitalize">{idea.category || "Primary"} revenue</td>
                      <td className="text-slate-300 text-right px-3 py-2">{fmtRevenue(idea.revenueEstimate)}</td>
                    </tr>
                  )}
                  <tr className="bg-slate-800/50">
                    <td className="text-slate-200 font-semibold px-3 py-2">Total</td>
                    <td className="text-slate-200 font-semibold text-right px-3 py-2">{fmtRevenue(idea.revenueEstimate)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Section>

          {/* Risk Assessment */}
          <Section title="Risk Assessment">
            <div className="grid grid-cols-3 gap-3">
              {["technical", "market", "financial"].map(key => (
                <div key={key} className={`rounded-lg border p-3 text-center ${RISK_COLOR[risk[key]] || RISK_COLOR.medium}`}>
                  <div className="text-xs font-bold uppercase capitalize">{risk[key]}</div>
                  <div className="text-[10px] text-slate-500 mt-1 capitalize">{key}</div>
                </div>
              ))}
            </div>
          </Section>

          {/* Build Roadmap */}
          {idea.buildRoadmap ? (
            <Section title="Build Roadmap">
              <ol className="space-y-2">
                {idea.buildRoadmap.map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-xs flex items-center justify-center font-bold">
                      {i + 1}
                    </span>
                    <div>
                      <span className="text-sm text-slate-300">{step.step}</span>
                      <span className="text-[10px] text-slate-500 ml-2">{step.duration} · ${step.cost}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </Section>
          ) : (
            <Section title="Build Roadmap">
              <p className="text-sm text-slate-500 italic">No roadmap defined yet. Click "Ask Agent" to generate one.</p>
            </Section>
          )}

          {/* Agent Research Log */}
          <Section title="Agent Research Log">
            {(idea.sessions || []).length > 0 ? (
              <div className="space-y-2">
                {idea.sessions.slice(0, 10).map((s, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className="text-slate-500 flex-shrink-0">
                      {s.dateCreated ? new Date(s.dateCreated).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                    </span>
                    <span className="text-purple-400 font-medium flex-shrink-0">{s.agent}</span>
                    <span className="text-slate-400">{s.task}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">No agent research activity yet.</p>
            )}
          </Section>

          {/* Connected Resources */}
          <Section title="Connected Resources">
            <div className="flex flex-wrap gap-2">
              <span className="text-xs px-2.5 py-1 rounded bg-slate-800/60 text-slate-400 border border-slate-700/30">
                📁 Project: {idea.id}
              </span>
              <span className="text-xs px-2.5 py-1 rounded bg-slate-800/60 text-slate-400 border border-slate-700/30">
                📋 {idea.taskCount || 0} Tasks
              </span>
              <span className="text-xs px-2.5 py-1 rounded bg-slate-800/60 text-slate-400 border border-slate-700/30">
                💰 ${(idea.totalCost || 0).toFixed(2)} Spent
              </span>
              <span className="text-xs px-2.5 py-1 rounded bg-slate-800/60 text-slate-400 border border-slate-700/30">
                🔄 {(idea.sessions || []).length} Sessions
              </span>
            </div>
          </Section>
        </div>
      </div>
    </>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{title}</h3>
      {children}
    </div>
  );
}
