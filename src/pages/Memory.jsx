import { Badge, Card, KPI } from "../components/shared";
import { C } from "../data/constants";
import { useMissionControlData } from "../context/MissionControlDataContext";
import { formatDateTime, statusColor } from "./liveViewUtils";

const Memory = () => {
  const { activities, snapshot } = useMissionControlData();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Memory</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <KPI label="Captured Events" value={activities.length || "--"} sub="Unified mission memory" color={C.accent} />
        <KPI label="Last Snapshot" value={snapshot.sourceLabel || "--"} sub={formatDateTime(snapshot.lastUpdated)} color={C.cyan} />
      </div>
      <Card>
        {activities.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {activities.map((activity) => (
              <div key={activity.id} style={{ padding: "14px 16px", borderRadius: 12, background: C.surface, border: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{activity.title}</div>
                  <Badge color={statusColor(activity.status)}>{activity.status}</Badge>
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{activity.description}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>{formatDateTime(activity.at, "Pending")}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: "center", color: C.muted }}>
            No memory entries captured yet.
          </div>
        )}
      </Card>
    </div>
  );
};

export default Memory;
