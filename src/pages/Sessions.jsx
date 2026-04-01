import { Badge, Card, KPI } from '../components/shared';
import { C } from '../data/constants';
import { useMissionControlData } from '../context/MissionControlDataContext';

function statusColor(status) {
  switch (String(status || "").toLowerCase()) {
    case "active":
    case "online":
      return C.green;
    case "idle":
      return C.cyan;
    default:
      return C.amber;
  }
}

const Sessions = () => {
  const { agents, metrics } = useMissionControlData();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Sessions</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <KPI label="Active Sessions" value={metrics.activeSessions || "--"} sub="Rolled up from gateway or snapshot" color={C.accent} />
      </div>
      <Card>
        {agents.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {agents
              .slice()
              .sort((left, right) => right.sessions - left.sessions)
              .map((agent) => (
                <div key={agent.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 16px", borderRadius: 12, background: C.surface, border: `1px solid ${C.border}` }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{agent.name}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{agent.role}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 13, color: C.text }}>{agent.sessions} sessions</div>
                    <Badge color={statusColor(agent.status)}>{agent.status}</Badge>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: "center", color: C.muted }}>
            No session inventory yet.
          </div>
        )}
      </Card>
    </div>
  );
};

export default Sessions;
