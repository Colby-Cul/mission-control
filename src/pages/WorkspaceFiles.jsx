import { Card, KPI } from "../components/shared";
import { C } from "../data/constants";
import { useMissionControlData } from "../context/MissionControlDataContext";

const WORKSPACE_DIRS = [
  { name: "Agent Configs", path: "~/.openclaw/agents/", desc: "Agent directories and session stores" },
  { name: "Skills", path: "~/.openclaw/skills/", desc: "Installed OpenClaw skills" },
  { name: "Persistent Memory", path: "~/.openclaw/persistent-memory/", desc: "Startup anchors and config" },
  { name: "Scripts", path: "~/.openclaw/scripts/", desc: "mc-sync and utilities" },
  { name: "Logs", path: "~/.openclaw/logs/", desc: "Gateway, API, and sync logs" },
  { name: "Cron", path: "~/.openclaw/cron/", desc: "Cron job definitions" },
  { name: "Credentials", path: "~/.openclaw/credentials/", desc: "API keys and tokens" },
  { name: "MC API Server", path: "~/.openclaw/mc-api/", desc: "Local Mission Control API" },
  { name: "Mission Control", path: "~/mission-control/", desc: "Dashboard source code" },
  { name: "STR Website", path: "~/.openclaw/workspace/anthropic/str-website/", desc: "STR project files" },
];

const WorkspaceFiles = () => {
  const { skills = [] } = useMissionControlData();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Workspace Files</h1>
      <div style={{ fontSize: 13, color: C.muted }}>OpenClaw directory structure and key file locations</div>
      <KPI label="Directories" value={WORKSPACE_DIRS.length} sub="Key workspace locations" color={C.accent} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
        {WORKSPACE_DIRS.map(d => (
          <Card key={d.name}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>📁 {d.name}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{d.desc}</div>
            <div style={{ fontSize: 11, color: C.accent, fontFamily: "monospace", marginTop: 6 }}>{d.path}</div>
          </Card>
        ))}
      </div>
    </div>
  );
};
export default WorkspaceFiles;
