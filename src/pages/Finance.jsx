import { Badge, Card, KPI } from "../components/shared";
import { C } from "../data/constants";
import { useMissionControlData } from "../context/MissionControlDataContext";
import { parseCostAmount, statusColor } from "./liveViewUtils";

const Finance = () => {
  const { agents, metrics, snapshot } = useMissionControlData();
  const totalAgentCost = agents.reduce((sum, agent) => sum + parseCostAmount(agent.cost), 0);
  const costStatus = totalAgentCost > 0 ? "tracked" : "snapshot";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Finance</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <KPI label="Agent Cost" value={totalAgentCost ? `$${totalAgentCost.toFixed(totalAgentCost >= 100 ? 0 : 2)}` : "--"} sub="From gateway bot telemetry when available" color={C.green} />
        <KPI label="Completed Tasks" value={metrics.completedTasks || "--"} sub={`${metrics.totalTasks || 0} total tasks`} color={C.accent} />
        <KPI label="Sessions" value={metrics.activeSessions || "--"} sub="Execution volume proxy" color={C.cyan} />
        <KPI label="Telemetry" value={costStatus} sub={snapshot.sourceLabel || "runtime"} color={statusColor(costStatus === "tracked" ? "connected" : "warning")} />
      </div>
      <Card>
        {agents.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {agents.map((agent) => (
              <div key={agent.id} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto auto", gap: 14, alignItems: "center", padding: "14px 0", borderBottom: `1px solid ${C.border}` }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{agent.name}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{agent.role}</div>
                </div>
                <div style={{ fontSize: 13, color: C.text }}>{agent.cost || "No cost telemetry"}</div>
                <Badge color={statusColor(agent.status)}>{agent.status}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: "center", color: C.muted }}>
            No agent telemetry available yet.
          </div>
        )}
      </Card>
    </div>
  );
};

export default Finance;
