import { useState } from "react";
import { Badge, Card, KPI } from "../components/shared";
import { C } from "../data/constants";
import { useMissionControlData } from "../context/MissionControlDataContext";

import { getApiUrl } from "../utils/api";
const STAGES = [
  { key: "sourced", label: "Sourced", color: C.muted },
  { key: "evaluating", label: "Evaluating", color: C.amber },
  { key: "approved", label: "Approved", color: C.accent },
  { key: "building", label: "Building", color: C.cyan },
  { key: "testing", label: "Testing", color: C.purple },
  { key: "launched", label: "Launched", color: C.green },
];

const TheForge = () => {
  const { projects = [], acpSessions = [], refresh } = useMissionControlData();
  const [showAdd, setShowAdd] = useState(false);
  const [newIdea, setNewIdea] = useState("");
  const [newSource, setNewSource] = useState("Manual");
  const [addResult, setAddResult] = useState(null);

  // Derive ideas from projects (non-system projects)
  const ideas = projects.filter(p => p.id !== "system-ops").map(p => {
    const pct = p.taskCount > 0 ? Math.round((p.doneCount / p.taskCount) * 100) : 0;
    let stage = "sourced";
    if (pct >= 100) stage = "launched";
    else if (pct >= 75) stage = "testing";
    else if (pct >= 30) stage = "building";
    else if (pct >= 10) stage = "evaluating";
    else if (p.status === "active") stage = "approved";
    return { ...p, stage, score: pct, source: "Internal" };
  });

  const handleAdd = async () => {
    if (!newIdea.trim()) return;
    try {
      await fetch(`/api/projects`, { method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({name: newIdea, agents: ["main"], status: "active", description: `Source: ${newSource}. Added from The Forge pipeline.`})});
      setAddResult({ ok: true, msg: `"${newIdea}" added to pipeline` });
      setNewIdea(""); setTimeout(() => { setAddResult(null); refresh(); }, 2000);
    } catch { setAddResult({ ok: false, msg: "API unreachable" }); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>The Forge</h1>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>Idea pipeline — source, evaluate, build, test, launch</div>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 10, padding: "10px 14px", fontWeight: 600, cursor: "pointer" }}>+ Add Idea</button>
      </div>

      {showAdd && (
        <Card>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input value={newIdea} onChange={e => setNewIdea(e.target.value)} placeholder="Idea name..." style={{ flex: 1, minWidth: 200, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13 }} />
            <select value={newSource} onChange={e => setNewSource(e.target.value)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13 }}>
              <option>Manual</option><option>Twitter/X</option><option>Reddit</option><option>Product Hunt</option><option>Financial Trends</option><option>Blog Monitor</option>
            </select>
            <button onClick={handleAdd} disabled={!newIdea.trim()} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 600, cursor: "pointer" }}>Submit</button>
          </div>
          {addResult && <div style={{ marginTop: 8, padding: 8, borderRadius: 6, background: addResult.ok ? C.green+"22" : C.red+"22", color: addResult.ok ? C.green : C.red, fontSize: 12 }}>{addResult.msg}</div>}
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
        <KPI label="In Pipeline" value={ideas.length} sub="Total ideas" color={C.accent} />
        <KPI label="Building" value={ideas.filter(i => i.stage === "building").length} sub="Active" color={C.cyan} />
        <KPI label="Launched" value={ideas.filter(i => i.stage === "launched").length} sub="Live" color={C.green} />
      </div>

      {/* Kanban Pipeline */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${STAGES.length}, minmax(160px, 1fr))`, gap: 8, overflowX: "auto" }}>
        {STAGES.map(stage => {
          const stageIdeas = ideas.filter(i => i.stage === stage.key);
          return (
            <div key={stage.key} style={{ background: C.surface, borderRadius: 12, padding: 10, border: `1px solid ${C.border}`, minHeight: 200 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: stage.color }}>{stage.label}</span>
                <Badge color={stage.color}>{stageIdeas.length}</Badge>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {stageIdeas.map(idea => (
                  <div key={idea.id} style={{ padding: 8, borderRadius: 8, background: C.card, border: `1px solid ${C.border}`, borderLeft: `3px solid ${stage.color}` }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{idea.name}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{idea.score}% · {idea.taskCount || 0} tasks · {idea.source}</div>
                    {idea.totalCost > 0 && <div style={{ fontSize: 11, color: C.muted }}>${idea.totalCost.toFixed(2)} spent</div>}
                  </div>
                ))}
                {!stageIdeas.length && <div style={{ fontSize: 11, color: C.muted, padding: 8 }}>Empty</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default TheForge;
