import { Badge, Card, KPI } from "../components/shared";
import { C } from "../data/constants";
import { useMissionControlData } from "../context/MissionControlDataContext";
import { formatDateTime, statusColor } from "./liveViewUtils";

const CommandDeck = () => {
  const { snapshot, metrics, activities, cronJobs, refresh } = useMissionControlData();
  const failingJobs = cronJobs.filter((job) => String(job.lastStatus || "").toLowerCase() === "error");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Command Deck</h1>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>
            Live control surface for gateway health, Monday execution, and scheduler pressure.
          </div>
        </div>
        <button
          onClick={refresh}
          style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 10, padding: "10px 14px", fontWeight: 600, cursor: "pointer" }}
        >
          Refresh Deck
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <KPI label="Gateway" value={metrics.healthStatus} sub={snapshot.healthError || "Health endpoint responding"} color={statusColor(metrics.healthStatus)} />
        <KPI label="Task Flow" value={metrics.totalTasks || "--"} sub={`${metrics.completedTasks} complete / ${metrics.activeTasks} active`} color={C.accent} />
        <KPI label="Sessions" value={metrics.activeSessions || "--"} sub="OpenClaw live or bundled inventory" color={C.cyan} />
        <KPI label="Scheduler" value={failingJobs.length ? `${failingJobs.length} failing` : "clear"} sub={cronJobs.length ? `${cronJobs.length} jobs tracked` : "No cron inventory"} color={failingJobs.length ? C.red : C.green} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 1fr) minmax(320px, 1fr)", gap: 16 }}>
        <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Operational Readiness</div>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 14px", borderRadius: 10, background: C.surface, border: `1px solid ${C.border}` }}>
              <span style={{ color: C.text, fontSize: 13 }}>Gateway detail channel</span>
              <Badge color={statusColor(metrics.detailStatus)}>{metrics.detailStatus}</Badge>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 14px", borderRadius: 10, background: C.surface, border: `1px solid ${C.border}` }}>
              <span style={{ color: C.text, fontSize: 13 }}>Monday board</span>
              <Badge color={statusColor(metrics.mondayStatus)}>{metrics.mondayStatus}</Badge>
            </div>
            <div style={{ padding: "12px 14px", borderRadius: 10, background: C.surface, border: `1px solid ${C.border}`, color: C.muted, fontSize: 12 }}>
              Last refresh: {formatDateTime(snapshot.lastUpdated)}
            </div>
          </div>
        </Card>

        <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Priority Alerts</div>
          {failingJobs.length || snapshot.statusError || snapshot.mondayError ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {snapshot.statusError ? <div style={{ padding: "12px 14px", borderRadius: 10, background: C.surface, border: `1px solid ${C.border}`, color: C.text, fontSize: 13 }}>Gateway status issue: {snapshot.statusError}</div> : null}
              {snapshot.mondayError ? <div style={{ padding: "12px 14px", borderRadius: 10, background: C.surface, border: `1px solid ${C.border}`, color: C.text, fontSize: 13 }}>Monday issue: {snapshot.mondayError}</div> : null}
              {failingJobs.slice(0, 4).map((job) => (
                <div key={job.name} style={{ padding: "12px 14px", borderRadius: 10, background: C.surface, border: `1px solid ${C.border}`, color: C.text, fontSize: 13 }}>
                  Scheduler failure: {job.name}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: 18, borderRadius: 12, background: C.surface, border: `1px dashed ${C.border}`, color: C.muted, fontSize: 13 }}>
              No blocking issues detected in the current snapshot.
            </div>
          )}
        </Card>
      </div>

      <Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Recent Commands</div>
          {activities.length ? activities.slice(0, 8).map((activity) => (
            <div key={activity.id} style={{ display: "grid", gridTemplateColumns: "120px minmax(0, 1fr) auto", gap: 14, padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 12, color: C.muted }}>{formatDateTime(activity.at, "Pending")}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{activity.title}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{activity.description}</div>
              </div>
              <Badge color={statusColor(activity.status)}>{activity.status}</Badge>
            </div>
          )) : (
            <div style={{ color: C.muted, fontSize: 13 }}>No command events available yet.</div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default CommandDeck;
