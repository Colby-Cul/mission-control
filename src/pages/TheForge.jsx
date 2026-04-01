import { Badge, Card, KPI } from "../components/shared";
import { C } from "../data/constants";
import { useMissionControlData } from "../context/MissionControlDataContext";
import { priorityColor, statusColor } from "./liveViewUtils";

const TheForge = () => {
  const { mondayItems } = useMissionControlData();
  const backlog = mondayItems
    .filter((item) => !["done", "complete", "completed"].includes(item.status))
    .sort((left, right) => {
      const priorityRank = { critical: 4, high: 3, medium: 2, low: 1, unspecified: 0 };
      return (priorityRank[right.priority] || 0) - (priorityRank[left.priority] || 0);
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>The Forge</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <KPI label="Backlog" value={backlog.length || "--"} sub="Open Monday work items" color={C.accent} />
        <KPI label="Critical" value={backlog.filter((item) => item.priority === "critical").length || "--"} sub="Needs immediate attention" color={C.red} />
      </div>
      <Card>
        {backlog.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {backlog.slice(0, 12).map((item) => (
              <div key={item.id} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto auto", gap: 14, alignItems: "center", padding: "14px 0", borderBottom: `1px solid ${C.border}` }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{item.boardName} / {item.group} / {item.owner}</div>
                </div>
                <Badge color={priorityColor(item.priority)}>{item.priority}</Badge>
                <Badge color={statusColor(item.status)}>{item.status}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: "center", color: C.muted }}>
            No forge backlog available. Monday tasks may be fully complete or not connected.
          </div>
        )}
      </Card>
    </div>
  );
};

export default TheForge;
