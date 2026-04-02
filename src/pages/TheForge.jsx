import { useState } from "react";
import { Badge, Card, KPI } from "../components/shared";
import { C } from "../data/constants";
import { useMissionControlData } from "../context/MissionControlDataContext";

const STAGES = ["sourced", "evaluating", "building", "testing", "launched"];

const TheForge = () => {
  const { projects = [], acpSessions = [] } = useMissionControlData();
  const [newIdea, setNewIdea] = useState("");
  const ideas = projects.filter(p => p.status === "active").map(p => ({
    ...p, stage: p.doneCount > 0 ? "building" : "evaluating",
    score: Math.min(99, Math.round((p.doneCount / Math.max(p.taskCount, 1)) * 100)),
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>The Forge</h1>
      <div style={{ fontSize: 13, color: C.muted }}>Business idea pipeline — source, evaluate, build, launch</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        <KPI label="Ideas" value={ideas.length} sub="In pipeline" color={C.accent} />
        <KPI label="Building" value={ideas.filter(i => i.stage === "building").length} sub="Active" color={C.green} />
        <KPI label="Evaluating" value={ideas.filter(i => i.stage === "evaluating").length} sub="Under review" color={C.amber} />
      </div>
      <Card>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Pipeline</div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${STAGES.length}, 1fr)`, gap: 8 }}>
          {STAGES.map(stage => (
            <div key={stage} style={{ padding: 8, borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`, minHeight: 100 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", marginBottom: 8 }}>{stage}</div>
              {ideas.filter(i => i.stage === stage).map(idea => (
                <div key={idea.id} style={{ padding: 8, borderRadius: 6, background: C.bg, border: `1px solid ${C.border}`, marginBottom: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{idea.name}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{idea.score}% · {idea.taskCount} tasks</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
export default TheForge;
