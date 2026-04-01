import { Badge, Card, KPI } from '../components/shared';
import { C } from '../data/constants';
import { useMissionControlData } from '../context/MissionControlDataContext';

function statusColor(status) {
  switch (String(status || "").toLowerCase()) {
    case "online":
    case "connected":
    case "active":
    case "running":
      return C.green;
    case "busy":
    case "warning":
      return C.amber;
    default:
      return C.cyan;
  }
}

const Team = () => {
  const { agents, metrics } = useMissionControlData();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Team</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <KPI label="Agents" value={agents.length || "--"} sub="Gateway or snapshot inventory" color={C.accent} />
        <KPI label="Online" value={agents.length ? metrics.onlineAgents : "--"} sub={`${metrics.busyAgents} busy`} color={C.green} />
      </div>
      <Card>
        {agents.length ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            {agents.map((agent) => (
              <div key={agent.id} style={{ padding: 16, borderRadius: 12, background: C.surface, border: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{agent.name}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{agent.role}</div>
                  </div>
                  <Badge color={statusColor(agent.status)}>{agent.status}</Badge>
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 10 }}>Model: <span style={{ color: C.text }}>{agent.model}</span></div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>Sessions: <span style={{ color: C.text }}>{agent.sessions}</span></div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: "center", color: C.muted }}>
            No live team inventory yet. Connect the gateway or ship a fresh snapshot.
          </div>
        )}
      </Card>
    </div>
  );
};

export default Team;
