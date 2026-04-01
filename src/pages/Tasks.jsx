import { useState } from "react";
import { Badge, Card, KPI } from "../components/shared";
import { C } from "../data/constants";
import { useMissionControlData } from "../context/MissionControlDataContext";

function statusColor(status) {
  switch (String(status || "").toLowerCase()) {
    case "done":
    case "complete":
      return C.green;
    case "delegated":
    case "working":
      return C.amber;
    case "error":
    case "blocked":
      return C.red;
    default:
      return C.cyan;
  }
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatBytes(value) {
  const size = Number(value);
  if (!Number.isFinite(size) || size < 0) return "—";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTokens(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "—";
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

const Tasks = () => {
  const { acpSessions, snapshot, refresh } = useMissionControlData();
  const [filter, setFilter] = useState("all");
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [newAgent, setNewAgent] = useState("main");
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  const sessions = acpSessions || [];
  const filtered = filter === "all" ? sessions : sessions.filter(s => s.agent === filter || s.status === filter);
  const totalTokens = sessions.reduce((sum, s) => sum + (s.tokens || 0), 0);
  const totalBytes = sessions.reduce((sum, s) => sum + (s.sizeBytes || 0), 0);
  const delegated = sessions.filter(s => s.status === "delegated").length;
  const done = sessions.filter(s => s.status === "done").length;
  const cron = sessions.filter(s => s.isCron).length;

  const handleAddTask = async () => {
    if (!newTask.trim()) return;
    setSubmitting(true);
    setSubmitResult(null);
    try {
      // This would call the local OpenClaw gateway API
      // For now, show the command the user needs to run
      setSubmitResult({
        ok: true,
        message: `Run: openclaw agent --agent ${newAgent} --message "${newTask.replace(/"/g, '\\"')}"`,
      });
    } catch (e) {
      setSubmitResult({ ok: false, message: String(e) });
    }
    setSubmitting(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Tasks</h1>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>
            Real ACP sessions from OpenClaw runtime — {sessions.length} total across all agents.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowAddTask(!showAddTask)}
            style={{ background: C.green, color: "#fff", border: "none", borderRadius: 10, padding: "10px 14px", fontWeight: 600, cursor: "pointer" }}>
            + Add Task
          </button>
          <button onClick={refresh}
            style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 10, padding: "10px 14px", fontWeight: 600, cursor: "pointer" }}>
            Refresh Tasks
          </button>
        </div>
      </div>

      {showAddTask && (
        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>New Task</div>
            <input value={newTask} onChange={e => setNewTask(e.target.value)} placeholder="Describe the task..."
              style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 13 }} />
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <select value={newAgent} onChange={e => setNewAgent(e.target.value)}
                style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 13 }}>
                <option value="main">Jarvis (main)</option>
                <option value="worker">Worker</option>
                <option value="validation">Validator</option>
                <option value="executive-assistant">Victoria</option>
              </select>
              <button onClick={handleAddTask} disabled={submitting || !newTask.trim()}
                style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 600, cursor: "pointer", opacity: submitting ? 0.5 : 1 }}>
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </div>
            {submitResult && (
              <div style={{ padding: 12, borderRadius: 8, background: submitResult.ok ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${submitResult.ok ? C.green : C.red}`, color: C.text, fontSize: 12, fontFamily: "monospace", wordBreak: "break-all" }}>
                {submitResult.message}
              </div>
            )}
          </div>
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <KPI label="Total Sessions" value={sessions.length || "—"} sub="All ACP sessions" color={C.accent} />
        <KPI label="Completed" value={done || "—"} sub="Finished tasks" color={C.green} />
        <KPI label="Delegated" value={delegated || "—"} sub="Active delegations" color={C.amber} />
        <KPI label="Cron Tasks" value={cron || "—"} sub="Automated runs" color={C.cyan} />
        <KPI label="Total Tokens" value={formatTokens(totalTokens)} sub="Across all sessions" color={C.purple} />
        <KPI label="Transcript Size" value={formatBytes(totalBytes)} sub="Combined transcripts" color={C.teal} />
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {["all", "done", "delegated", "main", "codex"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ background: filter === f ? C.accent : C.surface, color: filter === f ? "#fff" : C.muted, border: `1px solid ${filter === f ? C.accent : C.border}`, borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>ACP Sessions ({filtered.length})</div>
          {filtered.length ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: `1px solid ${C.border}` }}>
                    <th style={{ padding: "12px 10px", fontSize: 12, color: C.muted, fontWeight: 600 }}>Task</th>
                    <th style={{ padding: "12px 10px", fontSize: 12, color: C.muted, fontWeight: 600 }}>Agent</th>
                    <th style={{ padding: "12px 10px", fontSize: 12, color: C.muted, fontWeight: 600 }}>Status</th>
                    <th style={{ padding: "12px 10px", fontSize: 12, color: C.muted, fontWeight: 600 }}>Tokens</th>
                    <th style={{ padding: "12px 10px", fontSize: 12, color: C.muted, fontWeight: 600 }}>Size</th>
                    <th style={{ padding: "12px 10px", fontSize: 12, color: C.muted, fontWeight: 600 }}>Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.sessionId} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: "14px 10px", fontSize: 13, color: C.text, maxWidth: 300 }}>
                        <div style={{ fontWeight: 500 }}>{s.task || "ACP Session"}</div>
                        <div style={{ fontSize: 11, color: C.muted, fontFamily: "monospace", marginTop: 2 }}>{s.sessionId?.slice(0, 16)}</div>
                      </td>
                      <td style={{ padding: "14px 10px" }}><Badge color={s.agent === "codex" ? C.purple : C.accent}>{s.agent}</Badge></td>
                      <td style={{ padding: "14px 10px" }}><Badge color={statusColor(s.status)}>{s.status}</Badge></td>
                      <td style={{ padding: "14px 10px", fontSize: 13, color: C.text }}>{formatTokens(s.tokens)}</td>
                      <td style={{ padding: "14px 10px", fontSize: 13, color: C.text }}>{formatBytes(s.sizeBytes)}</td>
                      <td style={{ padding: "14px 10px", fontSize: 13, color: C.text }}>{formatDateTime(s.endTime)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: 18, borderRadius: 12, background: C.surface, border: `1px dashed ${C.border}`, color: C.muted, fontSize: 13 }}>
              No sessions match the current filter.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Tasks;
