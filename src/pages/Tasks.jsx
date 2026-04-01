import { Badge, Card, KPI } from "../components/shared";
import { C } from "../data/constants";
import { useMissionControlData } from "../context/MissionControlDataContext";

function statusColor(status) {
  switch (String(status || "").toLowerCase()) {
    case "done":
    case "complete":
    case "completed":
      return C.green;
    case "working on it":
    case "in progress":
    case "busy":
    case "stuck":
      return C.amber;
    case "error":
    case "blocked":
    case "offline":
      return C.red;
    default:
      return C.cyan;
  }
}

function priorityColor(priority) {
  switch (priority) {
    case "critical":
      return C.red;
    case "high":
      return C.amber;
    case "medium":
      return C.cyan;
    case "low":
      return C.green;
    default:
      return C.muted;
  }
}

function formatDateTime(value) {
  if (!value) {
    return "No update";
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

const Tasks = () => {
  const { mondayItems, snapshot, metrics, refresh } = useMissionControlData();
  const doneCount = mondayItems.filter((item) => ["done", "complete", "completed"].includes(item.status)).length;
  const ownerCount = new Set(mondayItems.map((item) => item.owner).filter(Boolean)).size;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Tasks</h1>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>
            Live Monday.com task feed merged into Mission Control.
          </div>
        </div>
        <button
          onClick={refresh}
          style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 10, padding: "10px 14px", fontWeight: 600, cursor: "pointer" }}
        >
          Refresh Tasks
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <KPI label="Board Status" value={metrics.mondayStatus} sub={snapshot.monday?.name || "Monday board"} color={statusColor(metrics.mondayStatus)} />
        <KPI label="Loaded Items" value={mondayItems.length || "--"} sub={mondayItems.length ? `${doneCount} complete` : "Waiting for Monday"} color={C.accent} />
        <KPI label="Owners" value={ownerCount || "--"} sub={ownerCount ? "Distinct assignees on feed" : "No owners detected"} color={C.cyan} />
      </div>

      <Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Monday Board Queue</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
              Showing the latest items returned by the configured board query.
            </div>
          </div>

          {mondayItems.length ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: `1px solid ${C.border}` }}>
                    <th style={{ padding: "12px 10px", fontSize: 12, color: C.muted, fontWeight: 600 }}>Task</th>
                    <th style={{ padding: "12px 10px", fontSize: 12, color: C.muted, fontWeight: 600 }}>Status</th>
                    <th style={{ padding: "12px 10px", fontSize: 12, color: C.muted, fontWeight: 600 }}>Priority</th>
                    <th style={{ padding: "12px 10px", fontSize: 12, color: C.muted, fontWeight: 600 }}>Owner</th>
                    <th style={{ padding: "12px 10px", fontSize: 12, color: C.muted, fontWeight: 600 }}>Group</th>
                    <th style={{ padding: "12px 10px", fontSize: 12, color: C.muted, fontWeight: 600 }}>Due</th>
                    <th style={{ padding: "12px 10px", fontSize: 12, color: C.muted, fontWeight: 600 }}>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {mondayItems.map((item) => (
                    <tr key={item.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: "14px 10px", fontSize: 13, color: C.text, fontWeight: 600 }}>{item.name}</td>
                      <td style={{ padding: "14px 10px" }}><Badge color={statusColor(item.status)}>{item.status}</Badge></td>
                      <td style={{ padding: "14px 10px" }}><Badge color={priorityColor(item.priority)}>{item.priority}</Badge></td>
                      <td style={{ padding: "14px 10px", fontSize: 13, color: C.text }}>{item.owner}</td>
                      <td style={{ padding: "14px 10px", fontSize: 13, color: C.text }}>{item.group}</td>
                      <td style={{ padding: "14px 10px", fontSize: 13, color: C.text }}>{item.dueDate || "—"}</td>
                      <td style={{ padding: "14px 10px", fontSize: 13, color: C.text }}>{formatDateTime(item.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: 18, borderRadius: 12, background: C.surface, border: `1px dashed ${C.border}`, color: C.muted, fontSize: 13 }}>
              {snapshot.mondayError || "No Monday tasks available. Configure the board in Settings and refresh the feed."}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Tasks;
