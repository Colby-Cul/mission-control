import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Card, KPI, ProgressBar } from "../components/shared";
import { C, AGENTS } from "../data/constants";
import { useMissionControlData } from "../context/MissionControlDataContext";

function fmtCost(v) { const n = Number(v); return isFinite(n) && n > 0 ? `$${n.toFixed(2)}` : "$0.00"; }
function fmtTokens(v) { const n = Number(v); return n >= 1e6 ? `${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `${(n/1e3).toFixed(1)}K` : isFinite(n) ? String(n) : "0"; }
function fmtDate(v) { if (!v) return "—"; const d = new Date(v); return isNaN(d) ? "—" : d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }
function statusColor(s) {
  const v = String(s || "").toLowerCase();
  if (["ok","live","online","connected","active","running","done"].includes(v)) return C.green;
  if (["busy","warning","delegated","pending"].includes(v)) return C.amber;
  if (["offline","error","failed","blocked","disconnected"].includes(v)) return C.red;
  return C.cyan;
}

// Simple sparkline bar chart
function MiniBarChart({ data, color, height = 40 }) {
  if (!data || !data.length) return null;
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, background: color || C.accent, borderRadius: 2, height: `${Math.max((v / max) * 100, 4)}%`, opacity: 0.5 + (i / data.length) * 0.5 }} />
      ))}
    </div>
  );
}

const Home = () => {
  const navigate = useNavigate();
  const { acpSessions = [], projects = [], cronJobs = [], skills = [], snapshot, agents, liveMetrics = {} } = useMissionControlData();

  const allAgents = AGENTS.map(ca => {
    const live = agents?.find(a => a.id === ca.id);
    return { ...ca, ...(live || {}), sessions: live?.sessions || ca.sessions || 0, status: live?.status || "online" };
  });

  const totalCost = acpSessions.reduce((s, t) => s + (t.totalCost || 0), 0);
  const totalTokens = acpSessions.reduce((s, t) => s + (t.tokens || 0), 0);
  const doneTasks = acpSessions.filter(s => s.status === "done" || s.status === "completed").length;
  const activeTasks = acpSessions.filter(s => s.status === "delegated" || s.status === "pending").length;
  const blockedTasks = acpSessions.filter(s => s.status === "blocked").length;
  const activeProjects = projects.filter(p => p.status === "active").length;
  const enabledCrons = cronJobs.filter(j => j.enabled).length;
  const errorCrons = cronJobs.filter(j => j.consecutiveErrors > 0 || j.lastStatus === "error").length;
  const gatewayOk = snapshot?.health?.ok || snapshot?.health?.status === "live";
  const workerConnected = snapshot?.workerNode?.connected || false;

  // Activity sparkline: sessions per day for last 7 days
  const activityData = useMemo(() => {
    const now = Date.now();
    const days = Array(7).fill(0);
    acpSessions.forEach(s => {
      const ts = new Date(s.endTime || s.dateFinished || s.dateCreated).getTime();
      if (ts) {
        const daysAgo = Math.floor((now - ts) / 86400000);
        if (daysAgo >= 0 && daysAgo < 7) days[6 - daysAgo]++;
      }
    });
    return days;
  }, [acpSessions]);

  // Cost sparkline: cost per day for last 7 days
  const costData = useMemo(() => {
    const now = Date.now();
    const days = Array(7).fill(0);
    acpSessions.forEach(s => {
      const ts = new Date(s.endTime || s.dateFinished || s.dateCreated).getTime();
      if (ts && s.totalCost) {
        const daysAgo = Math.floor((now - ts) / 86400000);
        if (daysAgo >= 0 && daysAgo < 7) days[6 - daysAgo] += s.totalCost;
      }
    });
    return days;
  }, [acpSessions]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Hero */}
      <div style={{ padding: "20px 24px", borderRadius: 16, background: `linear-gradient(135deg, ${C.accent}18, ${C.purple}12, ${C.cyan}08)`, border: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: C.text, margin: 0 }}>Mission Control</h1>
            <div style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>OpenClaw Agent Operations Dashboard</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Badge color={gatewayOk ? C.green : C.red}>{gatewayOk ? "Gateway Live" : "Gateway Down"}</Badge>
            <Badge color={workerConnected ? C.green : C.red}>{workerConnected ? "Worker Connected" : "Worker Offline"}</Badge>
          </div>
        </div>
      </div>

      {/* System Health Strip */}
      <div style={{ display: "flex", gap: 2, height: 6, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ flex: 3, background: gatewayOk ? C.green : C.red }} title="Gateway" />
        <div style={{ flex: 2, background: workerConnected ? C.green : C.red }} title="Worker" />
        <div style={{ flex: 3, background: errorCrons === 0 ? C.green : C.amber }} title="Cron Jobs" />
        <div style={{ flex: 2, background: blockedTasks === 0 ? C.green : C.red }} title="Blocked Tasks" />
      </div>

      {/* Exec Mood Ring + Daily Briefing */}
      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 12 }}>
        {/* Mood Ring */}
        <Card>
          {(() => {
            const uptimeScore = gatewayOk && workerConnected ? 30 : gatewayOk ? 15 : 0;
            const taskScore = acpSessions.length > 0 ? Math.min(30, Math.round((doneTasks / Math.max(acpSessions.length, 1)) * 30)) : 0;
            const burnScore = totalCost < 10 ? 20 : totalCost < 50 ? 10 : 0;
            const projectScore = activeProjects > 0 ? 10 : 0;
            const errorScore = errorCrons === 0 && blockedTasks === 0 ? 10 : errorCrons > 2 ? 0 : 5;
            const total = uptimeScore + taskScore + burnScore + projectScore + errorScore;
            const color = total >= 80 ? C.green : total >= 50 ? C.amber : C.red;
            return (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>Org Health</div>
                <div style={{ fontSize: 48, fontWeight: 800, color, lineHeight: 1 }}>{total}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>/ 100</div>
                <div style={{ marginTop: 8, fontSize: 10, color: C.muted }}>
                  Uptime {uptimeScore} · Tasks {taskScore} · Burn {burnScore} · Projects {projectScore} · Errors {errorScore}
                </div>
              </div>
            );
          })()}
        </Card>

        {/* Daily Briefing */}
        <Card>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}>📋 Daily Briefing</div>
          <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6 }}>
            <div>• <strong>{acpSessions.length}</strong> total sessions, <strong>{doneTasks}</strong> completed, <strong>{activeTasks}</strong> active{blockedTasks > 0 && <span style={{ color: C.red }}>, <strong>{blockedTasks} blocked</strong></span>}</div>
            <div>• <strong>{projects.length}</strong> projects ({activeProjects} active) · API spend: <strong>{fmtCost(totalCost)}</strong></div>
            <div>• {enabledCrons} cron jobs running{errorCrons > 0 ? <span style={{ color: C.amber }}>, {errorCrons} with errors</span> : <span style={{ color: C.green }}>, all healthy</span>}</div>
            <div>• Gateway: {gatewayOk ? "✅ live" : "❌ down"} · Worker: {workerConnected ? "✅ connected" : "❌ offline"}</div>
            {blockedTasks > 0 && <div style={{ color: C.red, marginTop: 4 }}>⚠️ {blockedTasks} task(s) need attention</div>}
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => navigate("/tasks")} style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontWeight: 600, cursor: "pointer", fontSize: 12 }}>+ New Task</button>
        <button onClick={() => navigate("/projects")} style={{ background: C.purple, color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontWeight: 600, cursor: "pointer", fontSize: 12 }}>+ New Project</button>
        <button onClick={() => navigate("/team")} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontWeight: 600, cursor: "pointer", fontSize: 12 }}>Agent Status</button>
        <button onClick={() => navigate("/incidents")} style={{ background: C.red, color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontWeight: 600, cursor: "pointer", fontSize: 12 }}>Incidents</button>
      </div>

      {/* Primary KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        <KPI label="Total Sessions" value={acpSessions.length || "—"} sub="All ACP sessions" color={C.accent} />
        <KPI label="Completed" value={doneTasks || "—"} sub={`${activeTasks} active`} color={C.green} />
        <KPI label="Blocked" value={blockedTasks || "0"} sub={blockedTasks ? "Needs attention" : "All clear"} color={blockedTasks ? C.red : C.green} />
        <KPI label="Projects" value={projects.length || "—"} sub={`${activeProjects} active`} color={C.purple} />
        <KPI label="Total Cost" value={fmtCost(totalCost)} sub={fmtTokens(totalTokens) + " tokens"} color={C.amber} />
        <KPI label="Agents" value={allAgents.length} sub={`${allAgents.filter(a => a.status === "online").length} online`} color={C.cyan} />
      </div>
      {/* Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Card>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}>Activity (7 days)</div>
          <MiniBarChart data={activityData} color={C.accent} height={60} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.muted, marginTop: 4 }}>
            <span>7d ago</span><span>Today</span>
          </div>
        </Card>
        <Card>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}>Cost Trend (7 days)</div>
          <MiniBarChart data={costData} color={C.green} height={60} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.muted, marginTop: 4 }}>
            <span>7d ago</span><span>Today: {fmtCost(costData[6])}</span>
          </div>
        </Card>
      </div>

      {/* Projects + Agents Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* Active Projects */}
        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Projects</div>
            <button onClick={() => navigate("/projects")} style={{ background: "transparent", border: "none", color: C.accent, fontSize: 12, cursor: "pointer" }}>View all →</button>
          </div>
          {projects.map(p => {
            const pct = p.taskCount > 0 ? Math.round((p.doneCount / p.taskCount) * 100) : 0;
            return (
              <div key={p.id} style={{ padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{p.name}</span>
                  <span style={{ fontSize: 12, color: C.muted }}>{fmtCost(p.totalCost)}</span>
                </div>
                <div style={{ marginTop: 6, background: C.bg, borderRadius: 3, height: 4, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: C.green, borderRadius: 3 }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.muted, marginTop: 4 }}>
                  <span>{p.doneCount}/{p.taskCount} tasks</span>
                  <span>{pct}%</span>
                </div>
              </div>
            );
          })}
        </Card>

        {/* Agent Status */}
        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Agents</div>
            <button onClick={() => navigate("/team")} style={{ background: "transparent", border: "none", color: C.accent, fontSize: 12, cursor: "pointer" }}>View all →</button>
          </div>
          {allAgents.map(agent => {
            const agentSessions = acpSessions.filter(s => s.agent === agent.id);
            const agentCost = agentSessions.reduce((sum, s) => sum + (s.totalCost || 0), 0);
            return (
              <div key={agent.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: agent.color || C.accent, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 12 }}>
                    {agent.initials || agent.name?.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{agent.name}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{agent.model} · {agent.sessions} sessions</div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <Badge color={statusColor(agent.status)}>{agent.status}</Badge>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{fmtCost(agentCost)}</div>
                </div>
              </div>
            );
          })}
        </Card>
      </div>

      {/* Recent Activity + Cron Status */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* Recent Tasks */}
        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Recent Tasks</div>
            <button onClick={() => navigate("/tasks")} style={{ background: "transparent", border: "none", color: C.accent, fontSize: 12, cursor: "pointer" }}>View all →</button>
          </div>
          {acpSessions.slice(0, 6).map(s => (
            <div key={s.sessionId || s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(s.task || "Session").slice(0, 50)}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{s.agent} · {fmtDate(s.endTime || s.dateFinished)}</div>
              </div>
              <Badge color={statusColor(s.status)}>{s.status}</Badge>
            </div>
          ))}
        </Card>

        {/* Cron Jobs */}
        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Cron Jobs</div>
            <div style={{ fontSize: 12, color: C.muted }}>{enabledCrons} active · {errorCrons > 0 ? <span style={{ color: C.red }}>{errorCrons} erroring</span> : <span style={{ color: C.green }}>all healthy</span>}</div>
          </div>
          {cronJobs.slice(0, 6).map(job => (
            <div key={job.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: C.text }}>{job.name}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{job.schedule}</div>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <Badge color={job.enabled ? C.green : C.red}>{job.enabled ? "on" : "off"}</Badge>
                {job.lastStatus && <Badge color={statusColor(job.lastStatus)}>{job.lastStatus}</Badge>}
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* Skills */}
      <Card>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Installed Skills ({skills.length})</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {skills.map(s => (
            <span key={s.id} style={{ padding: "4px 10px", borderRadius: 6, background: C.surface, border: `1px solid ${C.border}`, fontSize: 12, color: C.text }}>{s.name}</span>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default Home;
