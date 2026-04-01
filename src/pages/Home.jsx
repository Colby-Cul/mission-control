import { Badge, Card, KPI } from "../components/shared";
import { C } from "../data/constants";
import liveData from "../data/live-data.json";

function formatDateTime(value) {
  if (!value) {
    return "Waiting for data";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Waiting for data";
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function statusColor(status) {
  switch (String(status || "").toLowerCase()) {
    case "ok":
    case "healthy":
    case "operational":
    case "online":
    case "running":
    case "active":
    case "connected":
    case "live":
      return C.green;
    case "warning":
    case "degraded":
    case "busy":
      return C.amber;
    case "offline":
    case "error":
    case "failed":
    case "stopped":
    case "disconnected":
      return C.red;
    default:
      return C.cyan;
  }
}

function DetailStat({ label, value, note, color }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "12px 14px", borderRadius: 10, background: C.surface, border: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <span style={{ fontSize: 12, color: C.muted }}>{label}</span>
        <Badge color={color}>{value}</Badge>
      </div>
      {note ? <span style={{ fontSize: 12, color: C.text }}>{note}</span> : null}
    </div>
  );
}

const Home = () => {
  const gatewayStatus = liveData.gateway?.status || (liveData.gateway?.ok ? "connected" : "offline");
  const agentCount = liveData.agents?.length || 0;
  const totalSessions = (liveData.agents || []).reduce((sum, agent) => sum + (agent.sessionCount || 0), 0);
  const activeCronJobs = (liveData.cronJobs || []).filter((job) => job.enabled).length;
  const workerStatus = liveData.workerNode?.connected ? "connected" : "disconnected";
  const workerHost = liveData.workerNode?.hostname || "Unknown host";
  const boardCount = liveData.mondayBoards?.length || 0;
  const skillCount = liveData.skills?.length || 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Card style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap", background: `linear-gradient(135deg, ${C.accent}18, ${C.cyan}12)` }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: C.text, margin: 0 }}>Command Deck</h1>
            <Badge color={statusColor(gatewayStatus)}>{gatewayStatus}</Badge>
            <Badge color={statusColor(workerStatus)}>{workerStatus}</Badge>
          </div>
          <div style={{ color: C.muted, fontSize: 14 }}>
            Real OpenClaw runtime state from the generated live data snapshot.
          </div>
          <div style={{ color: C.muted, fontSize: 12 }}>
            Generated: {formatDateTime(liveData.generatedAt)}
          </div>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <KPI label="Gateway Status" value={gatewayStatus} sub={liveData.gateway?.ok ? "Gateway responding" : "Gateway unavailable"} color={statusColor(gatewayStatus)} />
        <KPI label="Agent Count" value={agentCount} sub={`${totalSessions} total sessions`} color={C.green} />
        <KPI label="Active Cron Jobs" value={activeCronJobs} sub={`${liveData.cronJobs?.length || 0} configured jobs`} color={C.amber} />
        <KPI label="Worker Node" value={workerStatus} sub={workerHost} color={statusColor(workerStatus)} />
        <KPI label="Installed Skills" value={skillCount} sub="Loaded into runtime" color={C.cyan} />
        <KPI label="Monday Boards" value={boardCount} sub="Boards visible to Mission Control" color={C.purple} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 1fr) minmax(320px, 1fr)", gap: 16 }}>
        <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Runtime Health</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
              Snapshot of the gateway, worker node, jobs, skills, and Monday.com integration.
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            <DetailStat label="Gateway" value={gatewayStatus} color={statusColor(gatewayStatus)} note={liveData.gateway?.ok ? "Gateway health check is passing." : "Gateway health check is failing."} />
            <DetailStat label="Worker Node" value={workerStatus} color={statusColor(workerStatus)} note={workerHost} />
            <DetailStat label="Cron Jobs" value={`${activeCronJobs} active`} color={activeCronJobs ? C.green : C.red} note={`${liveData.cronJobs?.length || 0} total scheduled jobs`} />
            <DetailStat label="Skills" value={`${skillCount} installed`} color={C.cyan} note="Skill inventory from the live runtime snapshot." />
          </div>
        </Card>

        <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Agents</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
              Four real agents currently tracked by OpenClaw.
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(liveData.agents || []).map((agent) => (
              <div key={agent.id} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: "12px 14px", borderRadius: 10, background: C.surface, border: `1px solid ${C.border}` }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{agent.name}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{agent.model}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <Badge color={C.green}>{agent.sessionCount} sessions</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 1fr) minmax(320px, 1fr)", gap: 16 }}>
        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Cron Jobs</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                Enabled status and last result from the live scheduler payload.
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(liveData.cronJobs || []).slice(0, 8).map((job) => (
                <div key={job.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 14px", borderRadius: 10, background: C.surface, border: `1px solid ${C.border}` }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{job.name}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Last status: {job.lastStatus}</div>
                  </div>
                  <Badge color={job.enabled ? C.green : C.red}>{job.enabled ? "enabled" : "disabled"}</Badge>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Monday Boards</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                Live board inventory visible to Mission Control.
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(liveData.mondayBoards || []).slice(0, 8).map((board) => (
                <div key={board.id} style={{ padding: "12px 14px", borderRadius: 10, background: C.surface, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{board.name}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Board ID: {board.id}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Home;
