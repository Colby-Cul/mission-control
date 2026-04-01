import { useState, useEffect } from "react";
import { Badge, Card, KPI } from "../components/shared";
import { C } from "../data/constants";
import { useMissionControlData } from "../context/MissionControlDataContext";

const STATUS_COLS = { "todo": "To Do", "delegated": "In Progress", "blocked": "Blocked", "done": "Done" };
const STATUS_COLORS = { done: C.green, delegated: C.amber, blocked: C.red, todo: C.cyan, complete: C.green };

function fmt(v) { if (!v) return "—"; const d = new Date(typeof v === "number" ? v : v); return isNaN(d) ? "—" : d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }
function fmtBytes(v) { const n = Number(v); if (!isFinite(n) || n < 0) return "—"; return n < 1024 ? `${n} B` : n < 1048576 ? `${(n/1024).toFixed(1)} KB` : `${(n/1048576).toFixed(1)} MB`; }
function fmtTokens(v) { const n = Number(v); if (!isFinite(n) || n <= 0) return "—"; return n >= 1e6 ? `${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `${(n/1e3).toFixed(1)}K` : String(n); }
function fmtCost(v) { const n = Number(v); return isFinite(n) && n > 0 ? `$${n.toFixed(4)}` : "$0.00"; }

const VIEWS = ["list", "kanban", "gitt"];

const Tasks = () => {
  const { acpSessions = [], refresh } = useMissionControlData();
  const [view, setView] = useState(() => localStorage.getItem("mc-task-view") || "list");
  const [sortCol, setSortCol] = useState("endTime");
  const [sortDir, setSortDir] = useState("desc");
  const [filter, setFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [newAgent, setNewAgent] = useState("main");
  const [submitResult, setSubmitResult] = useState(null);

  useEffect(() => { localStorage.setItem("mc-task-view", view); }, [view]);

  const sessions = acpSessions || [];
  const filtered = filter === "all" ? sessions : sessions.filter(s => s.agent === filter || s.status === filter);

  const sorted = [...filtered].sort((a, b) => {
    let av = a[sortCol], bv = b[sortCol];
    if (typeof av === "string") av = av.toLowerCase();
    if (typeof bv === "string") bv = bv.toLowerCase();
    if (av == null) return 1; if (bv == null) return -1;
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === "asc" ? cmp : -cmp;
  });

  const toggleSort = (col) => { if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortCol(col); setSortDir("desc"); } };
  const arrow = (col) => sortCol === col ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  const totalCost = sessions.reduce((s, t) => s + (t.totalCost || 0), 0);
  const totalTokens = sessions.reduce((s, t) => s + (t.tokens || 0), 0);

  const handleAdd = () => {
    if (!newTask.trim()) return;
    setSubmitResult({ ok: true, message: `Run: openclaw agent --agent ${newAgent} --message "${newTask.replace(/"/g, '\\"')}"` });
  };

  // ── KANBAN VIEW ──
  const KanbanView = () => {
    const cols = Object.entries(STATUS_COLS);
    const grouped = {};
    cols.forEach(([k]) => { grouped[k] = []; });
    sessions.forEach(s => { const key = s.status === "complete" ? "done" : (grouped[s.status] ? s.status : "todo"); grouped[key]?.push(s); });

    return (
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols.length}, minmax(220px, 1fr))`, gap: 12, overflowX: "auto" }}>
        {cols.map(([key, label]) => (
          <div key={key} style={{ background: C.surface, borderRadius: 12, padding: 12, border: `1px solid ${C.border}`, minHeight: 200 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{label}</span>
              <Badge color={STATUS_COLORS[key] || C.cyan}>{(grouped[key] || []).length}</Badge>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(grouped[key] || []).slice(0, 20).map(s => (
                <div key={s.sessionId} style={{ background: C.card, borderRadius: 8, padding: 10, border: `1px solid ${C.border}`, borderLeft: `3px solid ${STATUS_COLORS[s.status] || C.cyan}` }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 4, lineHeight: 1.3 }}>{(s.task || "Session").slice(0, 60)}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 11, color: C.muted }}>
                    <span>{s.agent}</span>
                    <span>·</span>
                    <span>{s.model?.split('/').pop() || "?"}</span>
                    <span>·</span>
                    <span>{fmtCost(s.totalCost)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ── GITT VIEW ──
  const GittView = () => (
    <div style={{ position: "relative", paddingLeft: 40 }}>
      <div style={{ position: "absolute", left: 19, top: 0, bottom: 0, width: 2, background: C.border }} />
      {sorted.slice(0, 40).map((s, i) => {
        const color = STATUS_COLORS[s.status] || C.cyan;
        const hasBranch = s.spawns > 0;
        return (
          <div key={s.sessionId} style={{ position: "relative", marginBottom: 4, paddingLeft: 24 }}>
            <div style={{ position: "absolute", left: -28, top: 12, width: 12, height: 12, borderRadius: "50%", background: color, border: `2px solid ${C.bg}`, zIndex: 1 }} />
            {hasBranch && <div style={{ position: "absolute", left: -16, top: 18, width: 20, height: 2, background: C.accent }} />}
            <div style={{ background: C.surface, borderRadius: 8, padding: 10, border: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{(s.task || "Session").slice(0, 80)}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2, fontFamily: "monospace" }}>{s.sessionId?.slice(0, 12)}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <Badge color={color}>{s.status}</Badge>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{fmt(s.endTime)}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, fontSize: 11, color: C.muted, marginTop: 6, flexWrap: "wrap" }}>
                <span>{s.agent}</span>
                <span>{s.model?.split('/').pop()}</span>
                <span>{fmtTokens(s.tokens)} tokens</span>
                <span>{fmtCost(s.totalCost)}</span>
                {hasBranch && <span style={{ color: C.accent }}>↳ {s.spawns} spawn{s.spawns > 1 ? "s" : ""}</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  // ── SORTABLE HEADER ──
  const TH = ({ col, children }) => (
    <th onClick={() => toggleSort(col)} style={{ padding: "12px 10px", fontSize: 12, color: C.muted, fontWeight: 600, cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>
      {children}{arrow(col)}
    </th>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Tasks</h1>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>{sessions.length} ACP sessions · ${totalCost.toFixed(2)} total cost · {fmtTokens(totalTokens)} tokens</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowAdd(!showAdd)} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 10, padding: "10px 14px", fontWeight: 600, cursor: "pointer" }}>+ Add Task</button>
          <button onClick={refresh} style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 10, padding: "10px 14px", fontWeight: 600, cursor: "pointer" }}>Refresh</button>
        </div>
      </div>

      {/* Add Task */}
      {showAdd && (
        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>New Task</div>
            <input value={newTask} onChange={e => setNewTask(e.target.value)} placeholder="Describe the task..."
              style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 13 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <select value={newAgent} onChange={e => setNewAgent(e.target.value)}
                style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 13 }}>
                <option value="main">Jarvis (main)</option><option value="worker">Worker</option><option value="validation">Validator</option><option value="executive-assistant">Victoria</option>
              </select>
              <button onClick={handleAdd} style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 600, cursor: "pointer" }}>Submit</button>
            </div>
            {submitResult && <div style={{ padding: 12, borderRadius: 8, background: "rgba(16,185,129,0.1)", border: `1px solid ${C.green}`, color: C.text, fontSize: 12, fontFamily: "monospace" }}>{submitResult.message}</div>}
          </div>
        </Card>
      )}

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        <KPI label="Total Sessions" value={sessions.length || "—"} sub="All ACP sessions" color={C.accent} />
        <KPI label="Completed" value={sessions.filter(s => s.status === "done").length || "—"} sub="Finished" color={C.green} />
        <KPI label="In Progress" value={sessions.filter(s => s.status === "delegated").length || "—"} sub="Active" color={C.amber} />
        <KPI label="Total Cost" value={`$${totalCost.toFixed(2)}`} sub="API spend" color={C.purple} />
        <KPI label="Total Tokens" value={fmtTokens(totalTokens)} sub="All sessions" color={C.teal} />
      </div>

      {/* View Toggle + Filters */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 4 }}>
          {VIEWS.map(v => (
            <button key={v} onClick={() => setView(v)} style={{ background: view === v ? C.accent : C.surface, color: view === v ? "#fff" : C.muted, border: `1px solid ${view === v ? C.accent : C.border}`, borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              {v === "list" ? "List" : v === "kanban" ? "Kanban" : "Gitt"}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {["all", "done", "delegated", "main", "codex"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ background: filter === f ? C.accent : C.surface, color: filter === f ? "#fff" : C.muted, border: `1px solid ${filter === f ? C.accent : C.border}`, borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Views */}
      {view === "kanban" ? <KanbanView /> : view === "gitt" ? <GittView /> : (
        <Card>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1000 }}>
              <thead><tr style={{ textAlign: "left", borderBottom: `1px solid ${C.border}` }}>
                <TH col="task">Task</TH><TH col="agent">Agent</TH><TH col="status">Status</TH>
                <TH col="model">Model</TH><TH col="totalCost">Cost</TH><TH col="tokens">Tokens</TH>
                <TH col="sizeBytes">Size</TH><TH col="dateCreated">Created</TH><TH col="dateFinished">Finished</TH>
              </tr></thead>
              <tbody>
                {sorted.map(s => (
                  <tr key={s.sessionId} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: "12px 10px", fontSize: 13, color: C.text, maxWidth: 280 }}>
                      <div style={{ fontWeight: 500 }}>{(s.task || "Session").slice(0, 70)}</div>
                      <div style={{ fontSize: 11, color: C.muted, fontFamily: "monospace", marginTop: 2 }}>{s.sessionId?.slice(0, 16)}</div>
                    </td>
                    <td style={{ padding: "12px 10px" }}><Badge color={s.agent === "codex" ? C.purple : C.accent}>{s.agent}</Badge></td>
                    <td style={{ padding: "12px 10px" }}><Badge color={STATUS_COLORS[s.status] || C.cyan}>{s.status}</Badge></td>
                    <td style={{ padding: "12px 10px", fontSize: 12, color: C.text }}>{s.model?.split('/').pop() || "—"}</td>
                    <td style={{ padding: "12px 10px", fontSize: 12, color: C.text }}>{fmtCost(s.totalCost)}</td>
                    <td style={{ padding: "12px 10px", fontSize: 12, color: C.text }}>{fmtTokens(s.tokens)}</td>
                    <td style={{ padding: "12px 10px", fontSize: 12, color: C.text }}>{fmtBytes(s.sizeBytes)}</td>
                    <td style={{ padding: "12px 10px", fontSize: 12, color: C.text }}>{fmt(s.dateCreated)}</td>
                    <td style={{ padding: "12px 10px", fontSize: 12, color: C.text }}>{fmt(s.dateFinished)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Tasks;
