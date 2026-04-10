import { useState } from "react";
import { getStageDef } from "../utils/stageMapper";
import { fmtRevenue, fmtBuildCost } from "../utils/computeMetrics";

const COLUMNS = [
  { key: "name",       label: "Name",       sortable: true },
  { key: "forgeStage", label: "Stage",      sortable: true },
  { key: "confidence", label: "Confidence", sortable: true },
  { key: "revenue",    label: "Revenue",    sortable: true },
  { key: "cost",       label: "Build Cost", sortable: true },
  { key: "time",       label: "Time",       sortable: true },
  { key: "priority",   label: "Priority",   sortable: true },
  { key: "source",     label: "Source",     sortable: true },
  { key: "actions",    label: "Actions",    sortable: false },
];

const STAGE_BADGE = {
  sourced: "bg-slate-500/20 text-slate-400", evaluating: "bg-yellow-500/20 text-yellow-400",
  approved: "bg-purple-500/20 text-purple-400", building: "bg-blue-500/20 text-blue-400",
  testing: "bg-orange-500/20 text-orange-400", launched: "bg-green-500/20 text-green-400",
};

function getSortValue(idea, key) {
  switch (key) {
    case "name": return (idea.name || "").toLowerCase();
    case "forgeStage": return idea.forgeStage;
    case "confidence": return idea.confidenceScore || 0;
    case "revenue": return idea.revenueEstimate?.max || 0;
    case "cost": return idea.buildCostEstimate || 0;
    case "time": return parseFloat(idea.timeToMVP) || 99;
    case "priority": return { critical: 0, high: 1, medium: 2, low: 3 }[idea.priority] ?? 2;
    case "source": return idea.source || "";
    default: return 0;
  }
}

export default function TableView({ ideas, onDeploy, onKill, onClick }) {
  const [sortCol, setSortCol] = useState("confidence");
  const [sortDir, setSortDir] = useState("desc");

  const handleSort = (col) => {
    if (col === sortCol) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("desc"); }
  };

  const sorted = [...ideas].sort((a, b) => {
    const va = getSortValue(a, sortCol);
    const vb = getSortValue(b, sortCol);
    const cmp = typeof va === "string" ? va.localeCompare(vb) : va - vb;
    return sortDir === "asc" ? cmp : -cmp;
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700/30">
            {COLUMNS.map(col => (
              <th key={col.key}
                onClick={() => col.sortable && handleSort(col.key)}
                className={`text-left text-slate-500 text-xs px-3 py-2 font-semibold whitespace-nowrap
                  ${col.sortable ? "cursor-pointer hover:text-slate-300" : ""}`}>
                {col.label}
                {sortCol === col.key && (
                  <span className="ml-1 text-purple-400">{sortDir === "asc" ? "↑" : "↓"}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(idea => {
            const stageDef = getStageDef(idea.forgeStage);
            return (
              <tr key={idea.id}
                onClick={() => onClick(idea)}
                className="border-b border-slate-700/20 cursor-pointer hover:bg-slate-800/30 transition-colors">
                <td className="px-3 py-2.5">
                  <span className="text-gray-200 font-medium">{idea.name}</span>
                </td>
                <td className="px-3 py-2.5">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${STAGE_BADGE[idea.forgeStage]}`}>
                    {stageDef.label}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-slate-300">{idea.confidenceScore}%</td>
                <td className="px-3 py-2.5 text-slate-300">{fmtRevenue(idea.revenueEstimate)}</td>
                <td className="px-3 py-2.5 text-slate-300">{fmtBuildCost(idea.buildCostEstimate)}</td>
                <td className="px-3 py-2.5 text-slate-300">{idea.timeToMVP || "—"}</td>
                <td className="px-3 py-2.5">
                  <span className="text-slate-400 capitalize text-xs">{idea.priority || "medium"}</span>
                </td>
                <td className="px-3 py-2.5">
                  <span className="text-slate-400 capitalize text-xs">{idea.source}</span>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1">
                    <button onClick={e => { e.stopPropagation(); onDeploy(idea.id); }}
                      className="text-[10px] px-2 py-0.5 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20">
                      🚀 Deploy
                    </button>
                    <button onClick={e => { e.stopPropagation(); onKill(idea.id); }}
                      className="text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20">
                      ✕ Kill
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {sorted.length === 0 && (
        <div className="text-center text-slate-500 text-sm py-8">No ideas match your filters</div>
      )}
    </div>
  );
}
