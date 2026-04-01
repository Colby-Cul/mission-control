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

function formatBytes(value) {
  const size = Number(value);
  if (!Number.isFinite(size) || size < 0) {
    return "—";
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

const Tasks = () => {
  const { acpSessions, snapshot, refresh } = useMissionControlData();
  const totalBytes = acpSessions.reduce((sum, session) => sum + (session.sizeBytes || 0), 0);
  const latestSession = acpSessions.reduce((latest, session) => {
    if (!latest) {
      return session;
    }

    return new Date(session.lastModified || 0).getTime() > new Date(latest.lastModified || 0).getTime() ? session : latest;
  }, null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Tasks</h1>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>
            Real completed ACP sessions loaded from the bundled live data snapshot.
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
        <KPI label="Completed Tasks" value={acpSessions.length || "--"} sub={acpSessions.length ? "ACP sessions in snapshot" : "No completed sessions"} color={C.green} />
        <KPI label="Transcript Storage" value={acpSessions.length ? formatBytes(totalBytes) : "--"} sub={acpSessions.length ? "Combined transcript size" : "No transcript files"} color={C.accent} />
        <KPI label="Latest Completion" value={latestSession ? formatDateTime(latestSession.lastModified) : "--"} sub={snapshot.lastUpdated ? `Snapshot ${formatDateTime(snapshot.lastUpdated)}` : "No snapshot timestamp"} color={C.cyan} />
      </div>

      <Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Completed ACP Sessions</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
              Each row is a real session record from `src/data/live-data.json`.
            </div>
          </div>

          {acpSessions.length ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: `1px solid ${C.border}` }}>
                    <th style={{ padding: "12px 10px", fontSize: 12, color: C.muted, fontWeight: 600 }}>Task</th>
                    <th style={{ padding: "12px 10px", fontSize: 12, color: C.muted, fontWeight: 600 }}>Status</th>
                    <th style={{ padding: "12px 10px", fontSize: 12, color: C.muted, fontWeight: 600 }}>Session ID</th>
                    <th style={{ padding: "12px 10px", fontSize: 12, color: C.muted, fontWeight: 600 }}>Transcript Path</th>
                    <th style={{ padding: "12px 10px", fontSize: 12, color: C.muted, fontWeight: 600 }}>Size</th>
                    <th style={{ padding: "12px 10px", fontSize: 12, color: C.muted, fontWeight: 600 }}>Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {acpSessions.map((session) => (
                    <tr key={session.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: "14px 10px", fontSize: 13, color: C.text, fontWeight: 600 }}>ACP Session Complete</td>
                      <td style={{ padding: "14px 10px" }}><Badge color={statusColor(session.status)}>{session.status}</Badge></td>
                      <td style={{ padding: "14px 10px", fontSize: 13, color: C.text, fontFamily: "monospace" }}>{session.id}</td>
                      <td style={{ padding: "14px 10px", fontSize: 12, color: C.text, fontFamily: "monospace", wordBreak: "break-all" }}>{session.transcriptPath || "—"}</td>
                      <td style={{ padding: "14px 10px", fontSize: 13, color: C.text }}>{formatBytes(session.sizeBytes)}</td>
                      <td style={{ padding: "14px 10px", fontSize: 13, color: C.text }}>{formatDateTime(session.lastModified)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: 18, borderRadius: 12, background: C.surface, border: `1px dashed ${C.border}`, color: C.muted, fontSize: 13 }}>
              No ACP sessions were found in `src/data/live-data.json`.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Tasks;
