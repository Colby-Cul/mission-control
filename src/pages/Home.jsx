import { Badge, Card, KPI } from "../components/shared";
import { C } from "../data/constants";
import { useMissionControlData } from "../context/MissionControlDataContext";

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
    case "done":
    case "complete":
    case "completed":
      return C.green;
    case "busy":
    case "warning":
    case "degraded":
    case "working on it":
    case "stuck":
      return C.amber;
    case "offline":
    case "error":
    case "failed":
    case "stopped":
    case "unreachable":
      return C.red;
    default:
      return C.cyan;
  }
}

function SourceStatus({ label, value, note, color }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "12px 14px", borderRadius: 10, background: C.surface, border: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <span style={{ fontSize: 12, color: C.muted }}>{label}</span>
        <Badge color={color}>{value}</Badge>
      </div>
      <span style={{ fontSize: 12, color: C.text }}>{note}</span>
    </div>
  );
}

const Home = () => {
  const { config, snapshot, agents, mondayItems, activities, metrics, pollIntervalMs, refresh } = useMissionControlData();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Card style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap", background: `linear-gradient(135deg, ${C.accent}18, ${C.cyan}12)` }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: C.text, margin: 0 }}>Command Deck</h1>
            <Badge color={statusColor(metrics.healthStatus)}>{metrics.healthStatus}</Badge>
            <Badge color={statusColor(metrics.mondayStatus)}>{metrics.mondayStatus}</Badge>
          </div>
          <div style={{ color: C.muted, fontSize: 14 }}>
            Live Mission Control feed across the OpenClaw gateway and Monday.com board activity.
          </div>
          <div style={{ color: C.muted, fontSize: 12 }}>
            Last update: {formatDateTime(snapshot.lastUpdated)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={refresh}
            style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 10, padding: "10px 14px", fontWeight: 600, cursor: "pointer" }}
          >
            Refresh Feed
          </button>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <KPI label="Gateway Health" value={metrics.healthStatus} sub={snapshot.health?.version ? `version ${snapshot.health.version}` : snapshot.healthError || config.gatewayUrl} color={statusColor(metrics.healthStatus)} />
        <KPI label="Agents Online" value={agents.length ? `${metrics.onlineAgents}/${agents.length}` : "--"} sub={agents.length ? `${metrics.busyAgents} busy` : "Waiting for /api/status"} color={C.green} />
        <KPI label="Monday Tasks" value={mondayItems.length || "--"} sub={mondayItems.length ? `${metrics.completedTasks} completed` : snapshot.mondayError || "Configure a token in Settings"} color={C.amber} />
        <KPI label="Active Work" value={snapshot.status || mondayItems.length ? metrics.activeTasks : "--"} sub={snapshot.status?.session?.activeSessions ? `${metrics.activeSessions} live sessions` : "OpenClaw + Monday rollup"} color={C.purple} />
        <KPI label="Refresh Cadence" value={`${pollIntervalMs / 1000}s`} sub={snapshot.loading ? "Polling now" : "Automatic polling enabled"} color={C.cyan} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 1fr) minmax(320px, 1fr)", gap: 16 }}>
        <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Source Health</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
              GitHub Pages should point at a public gateway or Monday proxy. Direct Monday tokens remain a local fallback.
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            <SourceStatus label="Gateway /health" value={snapshot.health ? "connected" : "offline"} color={snapshot.health ? C.green : C.red} note={snapshot.healthError || config.gatewayUrl} />
            <SourceStatus label="Gateway /api/status" value={metrics.detailStatus} color={statusColor(metrics.detailStatus)} note={snapshot.statusError || "Detailed bot status is available."} />
            <SourceStatus label="Monday board" value={metrics.mondayStatus} color={statusColor(metrics.mondayStatus)} note={snapshot.monday?.name || snapshot.mondayError || `Board ${config.mondayBoardId || "not set"}`} />
          </div>
        </Card>

        <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Recent Activity</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
              Monday item updates are merged with gateway agent status in one live timeline.
            </div>
          </div>

          {activities.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {activities.slice(0, 6).map((activity) => (
                <div key={activity.id} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: "12px 14px", borderRadius: 10, background: C.surface, border: `1px solid ${C.border}` }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{activity.title}</div>
                      <Badge color={activity.source === "monday" ? C.accent : C.cyan}>{activity.source}</Badge>
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{activity.description}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <Badge color={statusColor(activity.status)}>{activity.status}</Badge>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>{formatDateTime(activity.at)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: 18, borderRadius: 12, background: C.surface, border: `1px dashed ${C.border}`, color: C.muted, fontSize: 13 }}>
              {snapshot.healthError || snapshot.mondayError || "No activity yet. Connect the gateway and Monday board to start the unified feed."}
            </div>
          )}
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 1.2fr) minmax(320px, 1fr)", gap: 16 }}>
        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>OpenClaw Agents</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                Live bot inventory from the configured OpenClaw gateway status endpoint.
              </div>
            </div>
            {snapshot.loading ? <Badge color={C.cyan}>Refreshing</Badge> : null}
          </div>

          {agents.length ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              {agents.map((agent) => (
                <div key={agent.id} style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, background: C.surface }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{agent.name}</div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{agent.role}</div>
                    </div>
                    <Badge color={statusColor(agent.status)}>{agent.status}</Badge>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12, fontSize: 12 }}>
                    <div style={{ color: C.muted }}>Model: <span style={{ color: C.text }}>{agent.model}</span></div>
                    <div style={{ color: C.muted }}>Sessions: <span style={{ color: C.text }}>{agent.sessions}</span></div>
                    <div style={{ color: C.muted }}>Cost: <span style={{ color: C.text }}>{agent.cost || "n/a"}</span></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: 18, borderRadius: 12, background: C.surface, border: `1px dashed ${C.border}`, color: C.muted, fontSize: 13 }}>
              {snapshot.statusError || snapshot.healthError || "No live agent payload yet. Start the gateway or provide a token if /api/status is protected."}
            </div>
          )}
        </Card>

        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Monday Focus Queue</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                Most recently updated items from the configured Monday board.
              </div>
            </div>
            {snapshot.monday ? <Badge color={C.accent}>{snapshot.monday.name}</Badge> : null}
          </div>

          {mondayItems.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {mondayItems.slice(0, 6).map((item) => (
                <div key={item.id} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: "12px 14px", borderRadius: 10, background: C.surface, border: `1px solid ${C.border}` }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                      {item.group} · {item.owner} · {item.dueDate || "No due date"}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <Badge color={statusColor(item.status)}>{item.status}</Badge>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>{formatDateTime(item.updatedAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: 18, borderRadius: 12, background: C.surface, border: `1px dashed ${C.border}`, color: C.muted, fontSize: 13 }}>
              {snapshot.mondayError || "No Monday tasks yet. Add the API token and board id in Settings to populate this panel."}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Home;
