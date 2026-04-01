import { Badge, Card, KPI } from "../components/shared";
import { C } from "../data/constants";
import { useMissionControlData } from "../context/MissionControlDataContext";

const DocsHub = () => {
  const { skills, config, snapshot } = useMissionControlData();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Docs Hub</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <KPI label="Installed Skills" value={skills.length || "--"} sub="OpenClaw documentation surface" color={C.accent} />
        <KPI label="Monday Board" value={config.mondayBoardId || "--"} sub={snapshot.monday?.name || "Configured board target"} color={C.cyan} />
      </div>
      <Card>
        {skills.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {skills.map((skill) => (
              <div key={skill.path || skill.id} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 14, alignItems: "center", padding: "14px 0", borderBottom: `1px solid ${C.border}` }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{skill.name}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{skill.path || "No path metadata"}</div>
                </div>
                <Badge color={C.cyan}>{skill.version || "1.0"}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: "center", color: C.muted }}>
            No documentation sources available in the current snapshot.
          </div>
        )}
      </Card>
    </div>
  );
};

export default DocsHub;
