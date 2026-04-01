import { Badge, Card } from "../components/shared";
import { C } from "../data/constants";
import { useMissionControlData } from "../context/MissionControlDataContext";

function statusColor(status) {
  switch (String(status || "").toLowerCase()) {
    case "ok":
    case "healthy":
    case "online":
    case "done":
    case "complete":
    case "completed":
      return C.green;
    case "busy":
    case "warning":
    case "working on it":
      return C.amber;
    case "error":
    case "failed":
    case "offline":
      return C.red;
    default:
      return C.cyan;
  }
}

function formatDateTime(value) {
  if (!value) {
    return "Pending";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

const ActivityFeed = () => {
  const { activities, snapshot, refresh } = useMissionControlData();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Activity Feed</h1>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>
            Unified timeline from OpenClaw gateway status and Monday.com updates.
          </div>
        </div>
        <button
          onClick={refresh}
          style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 10, padding: "10px 14px", fontWeight: 600, cursor: "pointer" }}
        >
          Refresh Activity
        </button>
      </div>

      <Card>
        {activities.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {activities.map((activity) => (
              <div key={activity.id} style={{ display: "grid", gridTemplateColumns: "110px minmax(0, 1fr) auto", gap: 14, alignItems: "start", padding: "14px 0", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 12, color: C.muted }}>{formatDateTime(activity.at)}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{activity.title}</div>
                    <Badge color={activity.source === "monday" ? C.accent : C.cyan}>{activity.source}</Badge>
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{activity.description}</div>
                </div>
                <Badge color={statusColor(activity.status)}>{activity.status}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: "center", color: C.muted }}>
            {snapshot.healthError || snapshot.mondayError || "No live activity yet. Connect at least one data source to populate the feed."}
          </div>
        )}
      </Card>
    </div>
  );
};

export default ActivityFeed;
