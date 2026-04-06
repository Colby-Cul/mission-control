import { useState } from "react";
import { Badge, Card, KPI } from "../components/shared";
import { C } from "../data/constants";
import { useMissionControlData } from "../context/MissionControlDataContext";
import { getApiUrl } from "../utils/api";
import { fmtDate, fmtCost } from "../utils/format";

const CommandDeck = () => {
  const { acpSessions = [], projects = [], cronJobs = [], refresh } = useMissionControlData();
  const [actionResult, setActionResult] = useState(null);

  const myTasks = acpSessions.filter(s => s.agent === "main").slice(0, 10);
  const blockedTasks = acpSessions.filter(s => s.status === "blocked" || s.status === "stuck");
  const recentCompleted = acpSessions.filter(s => s.status === "done").slice(0, 8);
  const pendingApprovals = blockedTasks.length;
  const todayTasks = acpSessions.filter(s => {
    const d = new Date(s.endTime || s.dateCreated);
    return !isNaN(d) && (Date.now() - d.getTime()) < 86400000;
  }).length;

  const quickAction = async (name, desc) => {
    setActionResult(null);
    try {
      const resp = await fetch(`${getApiUrl()}/task`, { method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({name, description: desc, agent: "main", status: "pending", priority: "high"}) });
      const data = await resp.json();
      setActionResult({ ok: data.ok, msg: data.ok ? `${name} dispatched` : data.error });
    } catch { setActionResult({ ok: false, msg: "API unreachable" }); }
    setTimeout(() => setActionResult(null), 4000);
  };

  const unblock = async (task) => {
    try {
      await fetch(`${getApiUrl()}/task`, { method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({name: `Unblock: ${task.task?.slice(0,60)}`, agent: "main", status: "pending", priority: "critical", description: `Escalated from blocked queue. Original: ${task.task}`}) });
      refresh();
    } catch {}
  };

  const triggerSync = async () => {
    try { await fetch(`${getApiUrl()}/sync`, { method: "POST" }); refresh(); } catch {}
    setActionResult({ ok: true, msg: "Sync triggered" });
    setTimeout(() => setActionResult(null), 3000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Command Deck</h1>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>Executive cockpit — approvals, tasks, and quick actions</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => quickAction("New Task", "Created from Command Deck")} style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 8, padding: "8px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>+ New Task</button>
          <button onClick={() => quickAction("New Project", "Created from Command Deck")} style={{ background: C.purple, color: "#fff", border: "none", borderRadius: 8, padding: "8px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>+ New Project</button>
          <button onClick={triggerSync} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 8, padding: "8px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>⟳ Force Sync</button>
        </div>
      </div>

      {actionResult && <div style={{ padding: 8, borderRadius: 8, background: actionResult.ok ? C.green+"22" : C.red+"22", color: actionResult.ok ? C.green : C.red, fontSize: 12 }}>{actionResult.msg}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        <KPI label="Today's Tasks" value={todayTasks} sub="Last 24 hours" color={C.accent} />
        <KPI label="Pending Approvals" value={pendingApprovals} sub={pendingApprovals ? "Needs attention" : "Clear"} color={pendingApprovals ? C.red : C.green} />
        <KPI label="Active Projects" value={projects.filter(p => p.status === "active").length} sub="In progress" color={C.purple} />
        <KPI label="Cron Jobs" value={cronJobs.filter(j => j.enabled).length} sub={`${cronJobs.filter(j => j.lastStatus === "error").length} errors`} color={C.cyan} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* Blocked / Approval Queue */}
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.red, marginBottom: 12 }}>🚨 Blocked Queue ({blockedTasks.length})</div>
          {blockedTasks.length ? blockedTasks.map(t => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(t.task || "Task").slice(0, 50)}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{t.agent} · {fmtDate(t.dateCreated)}</div>
              </div>
              <button onClick={() => unblock(t)} style={{ background: C.amber, color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>Escalate</button>
            </div>
          )) : <div style={{ color: C.green, fontSize: 13 }}>✅ No blocked tasks</div>}
        </Card>

        {/* Recent Completed */}
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>✅ Recently Completed</div>
          {recentCompleted.map(t => (
            <div key={t.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 12, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{(t.task || "Task").slice(0, 45)}</div>
              <div style={{ fontSize: 11, color: C.muted, flexShrink: 0, marginLeft: 8 }}>{fmtCost(t.totalCost)} · {fmtDate(t.endTime)}</div>
            </div>
          ))}
        </Card>
      </div>

      {/* My Tasks */}
      <Card>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>My Tasks (Jarvis)</div>
        {myTasks.length ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ textAlign: "left", borderBottom: `1px solid ${C.border}` }}>
                <th style={{ padding: "10px 8px", fontSize: 12, color: C.muted }}>Task</th>
                <th style={{ padding: "10px 8px", fontSize: 12, color: C.muted }}>Status</th>
                <th style={{ padding: "10px 8px", fontSize: 12, color: C.muted }}>Cost</th>
                <th style={{ padding: "10px 8px", fontSize: 12, color: C.muted }}>Time</th>
              </tr></thead>
              <tbody>{myTasks.map(t => (
                <tr key={t.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "10px 8px", fontSize: 12, color: C.text }}>{(t.task||"").slice(0,55)}</td>
                  <td style={{ padding: "10px 8px" }}><Badge color={t.status === "done" ? C.green : t.status === "blocked" ? C.red : C.amber}>{t.status}</Badge></td>
                  <td style={{ padding: "10px 8px", fontSize: 12, color: C.text }}>{fmtCost(t.totalCost)}</td>
                  <td style={{ padding: "10px 8px", fontSize: 12, color: C.muted }}>{fmtDate(t.endTime || t.dateCreated)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <div style={{ color: C.muted, fontSize: 13 }}>No tasks assigned to main agent</div>}
      </Card>
    </div>
  );
};
export default CommandDeck;
