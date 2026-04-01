import { Badge, Card, KPI } from '../components/shared';
import { C } from '../data/constants';
import { useMissionControlData } from '../context/MissionControlDataContext';

function statusColor(status) {
  switch (String(status || "").toLowerCase()) {
    case "ok":
    case "live":
    case "online":
      return C.green;
    case "error":
    case "failed":
      return C.red;
    default:
      return C.amber;
  }
}

const SystemMonitor = () => {
  const { snapshot, cronJobs } = useMissionControlData();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>System Monitor</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <KPI label="Gateway" value={snapshot.health?.status || "--"} sub={snapshot.sourceLabel || "runtime"} color={statusColor(snapshot.health?.status)} />
        <KPI label="Cron Jobs" value={cronJobs.length || "--"} sub="Bundled OpenClaw scheduler inventory" color={C.accent} />
      </div>
      <Card>
        {cronJobs.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {cronJobs.map((job) => (
              <div key={job.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 16px", borderRadius: 12, background: C.surface, border: `1px solid ${C.border}` }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{job.name}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{job.enabled ? "Enabled" : "Disabled"}</div>
                </div>
                <Badge color={statusColor(job.lastStatus)}>{job.lastStatus || "unknown"}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: "center", color: C.muted }}>
            No scheduler data available in the current snapshot.
          </div>
        )}
      </Card>
    </div>
  );
};

export default SystemMonitor;
