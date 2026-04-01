import { Card, KPI } from "../components/shared";
import { C } from "../data/constants";
import { useMissionControlData } from "../context/MissionControlDataContext";

const WorkspaceFiles = () => {
  const { skills, config, snapshot } = useMissionControlData();
  const fileRows = [
    {
      label: "Bundled snapshot",
      value: "src/data/live-data.json",
      note: snapshot.lastUpdated || "Generated during build"
    },
    {
      label: "Gateway endpoint",
      value: config.gatewayUrl || "Not configured",
      note: snapshot.healthError || "Used for /health and /api/status"
    },
    {
      label: "Monday endpoint",
      value: config.mondayProxyUrl || "Gateway relay or direct token fallback",
      note: snapshot.monday?.name || snapshot.mondayError || `Board ${config.mondayBoardId || "not set"}`
    },
    ...skills.slice(0, 8).map((skill) => ({
      label: skill.name,
      value: skill.path || "No path metadata",
      note: "Installed skill file"
    }))
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Workspace Files</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <KPI label="Tracked Files" value={fileRows.length || "--"} sub="Bundled runtime references" color={C.accent} />
      </div>
      <Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {fileRows.map((row) => (
            <div key={`${row.label}:${row.value}`} style={{ padding: "12px 14px", borderRadius: 10, background: C.surface, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{row.label}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 4, wordBreak: "break-word" }}>{row.value}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>{row.note}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default WorkspaceFiles;
