import { Badge, Card, KPI } from "../components/shared";
import { C } from "../data/constants";
import { useMissionControlData } from "../context/MissionControlDataContext";
import { statusColor } from "./liveViewUtils";

const TheFloor = () => {
  const { agents, cronJobs, metrics } = useMissionControlData();
  const recentJobs = cronJobs.slice(0, 6);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>The Floor</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <KPI label="Agents Online" value={agents.length ? `${metrics.onlineAgents}/${agents.length}` : "--"} sub={`${metrics.busyAgents} busy`} color={C.green} />
        <KPI label="Scheduler Jobs" value={cronJobs.length || "--"} sub="Operational floor load" color={C.accent} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 1fr) minmax(320px, 1fr)", gap: 16 }}>
        <Card>
          {agents.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {agents.map((agent) => (
                <div key={agent.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 14px", borderRadius: 10, background: C.surface, border: `1px solid ${C.border}` }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{agent.name}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{agent.role}</div>
                  </div>
                  <Badge color={statusColor(agent.status)}>{agent.status}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: "center", color: C.muted }}>
              No live floor roster available.
            </div>
          )}
        </Card>
        <Card>
          {recentJobs.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {recentJobs.map((job) => (
                <div key={job.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 14px", borderRadius: 10, background: C.surface, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 13, color: C.text }}>{job.name}</div>
                  <Badge color={statusColor(job.lastStatus || (job.enabled ? "enabled" : "disabled"))}>{job.lastStatus || (job.enabled ? "enabled" : "disabled")}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: "center", color: C.muted }}>
              No scheduler data available.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default TheFloor;
