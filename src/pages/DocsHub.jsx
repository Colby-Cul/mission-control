import { Card, KPI } from "../components/shared";
import { C } from "../data/constants";
import { useMissionControlData } from "../context/MissionControlDataContext";

const DOCS = [
  { id: "claude-md", name: "CLAUDE.md", desc: "Main agent instructions", path: "agents/main/agent/CLAUDE.md" },
  { id: "memory-anchor", name: "MEMORY_ANCHOR.md", desc: "Persistent startup anchor", path: "persistent-memory/MEMORY_ANCHOR.md" },
  { id: "memory-md", name: "MEMORY.md", desc: "Long-term memory", path: "workspace/anthropic/MEMORY.md" },
  { id: "heartbeat", name: "HEARTBEAT.md", desc: "Heartbeat checklist", path: "workspace/anthropic/HEARTBEAT.md" },
  { id: "tools-md", name: "TOOLS.md", desc: "Tools reference", path: "workspace/anthropic/TOOLS.md" },
  { id: "soul-md", name: "SOUL.md", desc: "Agent personality", path: "workspace/anthropic/SOUL.md" },
  { id: "agents-md", name: "AGENTS.md", desc: "Agent conventions", path: "workspace/anthropic/AGENTS.md" },
  { id: "mc-claude", name: "MC CLAUDE.md", desc: "Mission Control instructions", path: "../../mission-control/CLAUDE.md" },
];

const DocsHub = () => {
  const { skills = [] } = useMissionControlData();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Docs Hub</h1>
      <div style={{ fontSize: 13, color: C.muted }}>Agent documentation, policy files, and reference material</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <KPI label="Policy Docs" value={DOCS.length} sub="Core files" color={C.accent} />
        <KPI label="Skills" value={skills.length} sub="With docs" color={C.cyan} />
      </div>
      <Card>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Core Policy Documents</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 8 }}>
          {DOCS.map(d => (
            <div key={d.id} style={{ padding: 12, borderRadius: 8, background: C.surface, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>📄 {d.name}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{d.desc}</div>
              <div style={{ fontSize: 11, color: C.muted, fontFamily: "monospace", marginTop: 4 }}>~/.openclaw/{d.path}</div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Skill Documentation</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 }}>
          {skills.map(s => (
            <div key={s.id} style={{ padding: 10, borderRadius: 8, background: C.surface, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{s.name}</div>
              <div style={{ fontSize: 11, color: C.muted, fontFamily: "monospace" }}>~/.openclaw/skills/{s.id}/SKILL.md</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
export default DocsHub;
