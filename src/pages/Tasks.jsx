import { useEffect, useMemo, useState } from "react";
import { Badge, Card, KPI, Avatar } from "../components/shared";
import { C } from "../data/constants";
import taskTemplates from "../data/task-templates.json";
import { useMissionControlData } from "../context/MissionControlDataContext";
import { statusColor } from "./liveViewUtils";
import { fmtDate, fmtCost, fmtTokens } from "../utils/format";

const VIEW_STORAGE_KEY = "mission-control.tasks.view-mode";
const SORT_STORAGE_KEY = "mission-control.tasks.sort";
const PRIORITY_FILTER_KEY = "mission-control.tasks.priority-filter";
const KANBAN_COLUMNS = [
  { key: "todo", label: "To Do", color: C.cyan },
  { key: "inprogress", label: "In Progress", color: C.amber },
  { key: "blocked", label: "Blocked", color: C.red },
  { key: "done", label: "Done", color: C.green },
];
const TASK_SUB_TABS = [
  { key: "my-tasks", label: "My Tasks" },
  { key: "blocked-queue", label: "Blocked Queue" },
  { key: "recently-completed", label: "Recently Completed" },
  { key: "task-templates", label: "Task Templates" },
];
const PRIORITIES = [
  { key: "critical", label: "Critical", color: "#ef4444", order: 0 },
  { key: "high", label: "High", color: "#f97316", order: 1 },
  { key: "normal", label: "Normal", color: "#6366f1", order: 2 },
  { key: "low", label: "Low", color: "#6b7280", order: 3 },
];
const PRIORITY_MAP = Object.fromEntries(PRIORITIES.map(p => [p.key, p]));

// Sprint-style status groups for list view
const SPRINT_GROUPS = [
  { key: "critical-active", label: "CRITICAL - FIX NOW", color: "#ef4444", emoji: "!!", filter: s => s.priority === "critical" && s.lane !== "done" },
  { key: "inprogress", label: "In Progress", color: C.amber, filter: s => s.lane === "inprogress" && s.priority !== "critical" },
  { key: "blocked", label: "Blocked", color: C.red, filter: s => s.lane === "blocked" && s.priority !== "critical" },
  { key: "todo", label: "To Do", color: C.cyan, filter: s => s.lane === "todo" && s.priority !== "critical" },
  { key: "done", label: "Completed", color: C.green, filter: s => s.lane === "done" && s.priority !== "critical" },
];

const SORTABLE_COLUMNS = [
  { key: "task", label: "Task" },
  { key: "projectName", label: "Project" },
  { key: "agent", label: "Agent" },
  { key: "priority", label: "Priority" },
  { key: "status", label: "Status" },
  { key: "durationMinutes", label: "Time" },
  { key: "apiModelUsed", label: "Model" },
  { key: "tokens", label: "Tokens" },
  { key: "totalCost", label: "Cost" },
  { key: "dateCreated", label: "Created" },
];

function readStoredView() {
  if (typeof window === "undefined") return "list";
  const v = window.localStorage.getItem(VIEW_STORAGE_KEY);
  return ["list", "kanban", "gitt"].includes(v) ? v : "list";
}
function readStoredSort() {
  if (typeof window === "undefined") return { key: "dateCreated", direction: "desc" };
  try { const p = JSON.parse(window.sessionStorage.getItem(SORT_STORAGE_KEY)); if (p?.key) return p; } catch {}
  return { key: "dateCreated", direction: "desc" };
}
function readStoredPriorityFilter() {
  if (typeof window === "undefined") return [];
  try { const p = JSON.parse(window.localStorage.getItem(PRIORITY_FILTER_KEY)); if (Array.isArray(p)) return p; } catch {}
  return [];
}
function normalizeLane(status, lane) {
  if (lane && KANBAN_COLUMNS.some(c => c.key === lane)) return lane;
  const v = String(status || "").toLowerCase();
  if (["done","complete","completed","success"].includes(v)) return "done";
  if (["blocked","failed","error","stalled"].includes(v)) return "blocked";
  if (["delegated","working","running","busy","active","pending","in progress","in_progress"].includes(v)) return "inprogress";
  return "todo";
}
function getComparableValue(task, key) {
  if (key === "priority") return PRIORITY_MAP[task.priority]?.order ?? 2;
  if (["tokens","totalCost","estimatedCostToCompletion","durationMinutes"].includes(key)) return Number(task[key] || 0);
  if (["dateCreated","dateFinished"].includes(key)) return new Date(task[key] || 0).getTime();
  return String(task[key] || "").toLowerCase();
}
function sortTasks(tasks, sort) {
  const dir = sort.direction === "asc" ? 1 : -1;
  return [...tasks].sort((a, b) => {
    const av = getComparableValue(a, sort.key), bv = getComparableValue(b, sort.key);
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });
}

function fmtDuration(minutes) {
  if (!minutes || minutes <= 0) return "-";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function PriorityBadge({ priority, onClick }) {
  const p = PRIORITY_MAP[priority] || PRIORITY_MAP.normal;
  return (
    <span onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 700,
      background: p.color + "22", color: p.color, border: `1px solid ${p.color}33`,
      cursor: onClick ? "pointer" : "default", userSelect: "none",
    }}>
      {p.label}
    </span>
  );
}

function PrioritySelector({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <PriorityBadge priority={value} onClick={() => setOpen(!open)} />
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, zIndex: 20, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }}>
          {PRIORITIES.map(p => (
            <button key={p.key} onClick={() => { onChange(p.key); setOpen(false); }} style={{
              display: "block", width: "100%", padding: "8px 16px", border: "none", background: value === p.key ? p.color + "22" : "transparent",
              color: p.color, fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left",
            }}>
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Critical item pulsing animation
const criticalPulseStyle = `
@keyframes criticalPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
  50% { box-shadow: 0 0 12px 4px rgba(239, 68, 68, 0.3); }
}
`;

const Tasks = () => {
  const { acpSessions, agents, snapshot, refresh } = useMissionControlData();
  const [viewMode, setViewMode] = useState(readStoredView);
  const [sort, setSort] = useState(readStoredSort);
  const [activeTab, setActiveTab] = useState("my-tasks");
  const [filter, setFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState(readStoredPriorityFilter);
  const [expandedCard, setExpandedCard] = useState(null);
  const [expandedNode, setExpandedNode] = useState(null);
  const [collapsedGroups, setCollapsedGroups] = useState(() => ["done"]); // Done collapsed by default
  const [dragState, setDragState] = useState(null);
  const [dndError, setDndError] = useState(null);
  const [localPriorities, setLocalPriorities] = useState({});

  useEffect(() => { if (typeof window !== "undefined") window.localStorage.setItem(VIEW_STORAGE_KEY, viewMode); }, [viewMode]);
  useEffect(() => { if (typeof window !== "undefined") window.sessionStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(sort)); }, [sort]);
  useEffect(() => { if (typeof window !== "undefined") window.localStorage.setItem(PRIORITY_FILTER_KEY, JSON.stringify(priorityFilter)); }, [priorityFilter]);

  const sessions = useMemo(() => (acpSessions || []).map(s => ({
    ...s,
    lane: normalizeLane(s.status, s.lane),
    apiModelUsed: s.apiModelUsed || s.model || "-",
    priority: localPriorities[s.sessionId || s.id] || s.priority || "normal",
  })), [acpSessions, localPriorities]);

  const visibleSessions = useMemo(() => {
    let base = sessions;
    if (activeTab === "blocked-queue") base = sessions.filter(s => s.lane === "blocked");
    else if (activeTab === "recently-completed") base = sessions.filter(s => s.lane === "done");
    else if (activeTab === "my-tasks" && filter !== "all") base = sessions.filter(s => s.agent === filter || s.lane === filter || s.status === filter);
    else if (activeTab === "task-templates") base = [];
    if (priorityFilter.length > 0) base = base.filter(s => priorityFilter.includes(s.priority));
    return sortTasks(base, sort);
  }, [activeTab, filter, priorityFilter, sessions, sort]);

  const grouped = useMemo(() => KANBAN_COLUMNS.reduce((acc, col) => {
    acc[col.key] = visibleSessions.filter(s => s.lane === col.key)
      .sort((a, b) => (PRIORITY_MAP[a.priority]?.order ?? 2) - (PRIORITY_MAP[b.priority]?.order ?? 2));
    return acc;
  }, {}), [visibleSessions]);

  const gittTimeline = useMemo(() => [...visibleSessions].sort((a, b) =>
    new Date(b.dateCreated || 0).getTime() - new Date(a.dateCreated || 0).getTime()
  ), [visibleSessions]);

  // Sprint groups with filtered tasks
  const sprintGroups = useMemo(() => SPRINT_GROUPS.map(group => {
    const tasks = visibleSessions.filter(group.filter)
      .sort((a, b) => (PRIORITY_MAP[a.priority]?.order ?? 2) - (PRIORITY_MAP[b.priority]?.order ?? 2));
    const totalTime = tasks.reduce((sum, t) => sum + (t.durationMinutes || 0), 0);
    const totalCost = tasks.reduce((sum, t) => sum + (t.totalCost || 0), 0);
    return { ...group, tasks, totalTime, totalCost };
  }), [visibleSessions]);

  // Project time summary
  const projectTimeSummary = useMemo(() => {
    const map = {};
    sessions.filter(s => s.lane !== "done").forEach(s => {
      const pName = s.projectName || "Unassigned";
      if (!map[pName]) map[pName] = { name: pName, totalMinutes: 0, totalCost: 0, count: 0 };
      map[pName].totalMinutes += s.durationMinutes || 0;
      map[pName].totalCost += s.totalCost || 0;
      map[pName].count += 1;
    });
    return Object.values(map).sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [sessions]);

  // Agent summary for visible tasks
  const agentSummary = useMemo(() => {
    const map = {};
    visibleSessions.forEach(s => {
      if (!s.agent) return;
      if (!map[s.agent]) {
        const agentData = (agents || []).find(a => a.id === s.agent);
        map[s.agent] = { id: s.agent, agent: agentData, count: 0 };
      }
      map[s.agent].count += 1;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [visibleSessions, agents]);

  const totals = useMemo(() => ({
    sessions: sessions.length,
    done: sessions.filter(s => s.lane === "done").length,
    active: sessions.filter(s => s.lane !== "done").length,
    blocked: sessions.filter(s => s.lane === "blocked").length,
    critical: sessions.filter(s => s.priority === "critical" && s.lane !== "done").length,
    totalCost: sessions.reduce((sum, s) => sum + Number(s.totalCost || 0), 0),
    totalTime: sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0),
  }), [sessions]);

  const handleSort = (key) => setSort(c => c.key === key ? { key, direction: c.direction === "asc" ? "desc" : "asc" } : { key, direction: "desc" });

  const handlePriorityChange = (taskId, priority) => {
    setLocalPriorities(p => ({ ...p, [taskId]: priority }));
    fetch(`/api/tasks/update-status`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: taskId, priority }),
    }).catch(() => {});
  };

  const togglePriorityFilter = (key) => {
    setPriorityFilter(f => f.includes(key) ? f.filter(k => k !== key) : [...f, key]);
  };

  const toggleSprintGroup = (key) => {
    setCollapsedGroups(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const onDrop = async (lane) => {
    if (!dragState) return;
    const taskId = dragState.sessionId || dragState.id;
    const originalLane = dragState.lane;
    setDragState(null);
    try {
      const res = await fetch(`/api/tasks/update-status`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: taskId, status: lane, lane }),
      });
      if (!res.ok) throw new Error("API returned " + res.status);
      refresh();
    } catch {
      setLocalPriorities(p => ({ ...p }));
      if (acpSessions) {
        const target = acpSessions.find(s => (s.sessionId || s.id) === taskId);
        if (target) target.lane = originalLane;
      }
      refresh();
      setDndError(taskId);
      setTimeout(() => setDndError(null), 2000);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <style>{criticalPulseStyle}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Tasks</h1>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Sprint-style task management with priority tracking</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "inline-flex", padding: 4, borderRadius: 12, background: C.surface, border: `1px solid ${C.border}` }}>
            {["list", "kanban", "gitt"].map(v => (
              <button key={v} onClick={() => setViewMode(v)} style={{ background: viewMode === v ? C.accent : "transparent", color: viewMode === v ? "#fff" : C.muted, border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {v === "list" ? "Sprint" : v === "kanban" ? "Kanban" : "Timeline"}
              </button>
            ))}
          </div>
          <button onClick={refresh} style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 10, padding: "10px 14px", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Refresh</button>
        </div>
      </div>

      {/* Sub tabs */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {TASK_SUB_TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ background: activeTab === tab.key ? "rgba(59,130,246,0.18)" : C.surface, color: activeTab === tab.key ? C.text : C.muted, border: `1px solid ${activeTab === tab.key ? C.accent : C.border}`, borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Priority filter bar */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 13, color: C.muted, marginRight: 4, fontWeight: 600 }}>Priority:</span>
        <button onClick={() => setPriorityFilter([])} style={{ background: priorityFilter.length === 0 ? C.accent : C.surface, color: priorityFilter.length === 0 ? "#fff" : C.muted, border: `1px solid ${priorityFilter.length === 0 ? C.accent : C.border}`, borderRadius: 6, padding: "5px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>All</button>
        {PRIORITIES.map(p => (
          <button key={p.key} onClick={() => togglePriorityFilter(p.key)} style={{ background: priorityFilter.includes(p.key) ? p.color + "22" : C.surface, color: priorityFilter.includes(p.key) ? p.color : C.muted, border: `1px solid ${priorityFilter.includes(p.key) ? p.color + "55" : C.border}`, borderRadius: 6, padding: "5px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Status filter (for My Tasks tab) */}
      {activeTab === "my-tasks" && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["all", "todo", "inprogress", "blocked", "done"].map(v => (
            <button key={v} onClick={() => setFilter(v)} style={{ background: filter === v ? C.accent : C.surface, color: filter === v ? "#fff" : C.muted, border: `1px solid ${filter === v ? C.accent : C.border}`, borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {v === "all" ? "All" : v === "inprogress" ? "In Progress" : v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
        <KPI label="Total" value={totals.sessions || "-"} sub="All sessions" color={C.accent} />
        <KPI label="Active" value={totals.active || "-"} sub="In queue" color={C.amber} />
        {totals.critical > 0 && (
          <KPI label="Critical" value={totals.critical} sub="Needs immediate fix" color={C.red} />
        )}
        <KPI label="Blocked" value={totals.blocked || "0"} sub="Needs attention" color={C.red} />
        <KPI label="Done" value={totals.done || "-"} sub="Completed" color={C.green} />
        <KPI label="Time Spent" value={fmtDuration(totals.totalTime)} sub="All sessions" color={C.cyan} />
        <KPI label="Cost" value={fmtCost(totals.totalCost)} sub="Total API spend" color={C.teal} />
      </div>

      {/* Agent summary */}
      {agentSummary.length > 0 && (
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 10 }}>Active Agents</div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {agentSummary.slice(0, 10).map(a => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Avatar agent={a.agent} size={28} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{a.agent?.name || a.id}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{a.count} task{a.count !== 1 ? "s" : ""}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Project time summary (for items in queue) */}
      {projectTimeSummary.length > 0 && viewMode === "list" && (
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 10 }}>Time by Project (In Queue)</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 }}>
            {projectTimeSummary.map(p => (
              <div key={p.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: C.surface, borderRadius: 8, border: `1px solid ${C.border}` }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{p.count} task{p.count !== 1 ? "s" : ""}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.cyan }}>{fmtDuration(p.totalMinutes)}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{fmtCost(p.totalCost)}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
            {activeTab === "task-templates" ? `Templates (${taskTemplates.length})` : `Tasks (${visibleSessions.length})`}
          </div>
          <div style={{ fontSize: 13, color: C.muted }}>Updated {fmtDate(snapshot?.generatedAt || snapshot?.lastUpdated)}</div>
        </div>

        {/* Templates */}
        {activeTab === "task-templates" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
            {taskTemplates.map(t => (
              <div key={t.id} style={{ border: `1px solid ${C.border}`, borderRadius: 14, background: C.surface, padding: 14 }}>
                <div style={{ color: C.text, fontSize: 14, fontWeight: 700 }}>{t.name}</div>
                <div style={{ color: C.muted, fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>{t.description}</div>
              </div>
            ))}
          </div>
        )}

        {/* SPRINT LIST VIEW */}
        {activeTab !== "task-templates" && viewMode === "list" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {sprintGroups.map(group => {
              if (group.tasks.length === 0) return null;
              const isCollapsed = collapsedGroups.includes(group.key);
              const isCritical = group.key === "critical-active";
              return (
                <div key={group.key} style={{
                  borderRadius: 12,
                  border: `1px solid ${isCritical ? group.color + "66" : C.border}`,
                  overflow: "hidden",
                  ...(isCritical ? { animation: "criticalPulse 2s ease-in-out infinite" } : {}),
                }}>
                  {/* Group header */}
                  <button
                    onClick={() => toggleSprintGroup(group.key)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "10px 16px", border: "none", cursor: "pointer",
                      background: `linear-gradient(135deg, ${group.color}18, ${group.color}08)`,
                      borderBottom: isCollapsed ? "none" : `1px solid ${C.border}`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {isCritical && <span style={{ fontSize: 16, color: group.color }}>!!</span>}
                      <span style={{ fontSize: 14, fontWeight: 700, color: group.color }}>{group.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.muted, background: C.surface, padding: "2px 8px", borderRadius: 6 }}>{group.tasks.length}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <span style={{ fontSize: 13, color: C.muted }}>{fmtDuration(group.totalTime)} total</span>
                      <span style={{ fontSize: 13, color: C.muted }}>{fmtCost(group.totalCost)}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        style={{ transition: "transform 0.2s", transform: isCollapsed ? "rotate(0deg)" : "rotate(90deg)" }}>
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                  </button>
                  {/* Tasks table */}
                  {!isCollapsed && (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1100 }}>
                        <thead>
                          <tr style={{ textAlign: "left", borderBottom: `1px solid ${C.border}` }}>
                            {SORTABLE_COLUMNS.map(col => (
                              <th key={col.key} style={{ padding: "10px 8px", fontSize: 12, color: C.muted, fontWeight: 600 }}>
                                <button onClick={() => handleSort(col.key)} style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer", padding: 0, font: "inherit" }}>
                                  {col.label} {sort.key === col.key ? (sort.direction === "asc" ? "\u2191" : "\u2193") : ""}
                                </button>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {group.tasks.map((task, i) => (
                            <tr key={task.id} style={{
                              borderBottom: `1px solid ${C.border}`,
                              background: i % 2 === 0 ? "transparent" : C.surface + "44",
                              ...(task.priority === "critical" ? { background: "rgba(239, 68, 68, 0.06)" } : {}),
                            }}>
                              <td style={{ padding: "10px 8px", color: C.text, fontWeight: 600, maxWidth: 300 }}>
                                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6, lineHeight: 1.5 }}>
                                  {task.priority === "critical" && <span style={{ color: "#ef4444", fontWeight: 800, fontSize: 14 }}>!!</span>}
                                  {task.task}
                                </div>
                              </td>
                              <td style={{ padding: "10px 8px", color: C.text, fontSize: 13 }}>{task.projectName || "-"}</td>
                              <td style={{ padding: "10px 8px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  {(() => {
                                    const agentData = (agents || []).find(a => a.id === task.agent);
                                    return agentData ? <Avatar agent={agentData} size={20} /> : null;
                                  })()}
                                  <span style={{ fontSize: 13, color: C.text }}>{(() => { const a = (agents || []).find(x => x.id === task.agent); return a?.name || task.agent; })()}</span>
                                </div>
                              </td>
                              <td style={{ padding: "10px 8px" }}><PrioritySelector value={task.priority} onChange={(p) => handlePriorityChange(task.sessionId || task.id, p)} /></td>
                              <td style={{ padding: "10px 8px" }}><Badge color={statusColor(task.status)}>{task.status}</Badge></td>
                              <td style={{ padding: "10px 8px", color: C.cyan, fontSize: 13, fontWeight: 600 }}>{fmtDuration(task.durationMinutes)}</td>
                              <td style={{ padding: "10px 8px", color: C.muted, fontSize: 13 }}>{task.apiModelUsed || "-"}</td>
                              <td style={{ padding: "10px 8px", color: C.text, fontSize: 13 }}>{fmtTokens(task.tokens)}</td>
                              <td style={{ padding: "10px 8px", color: C.text, fontSize: 13 }}>{fmtCost(task.totalCost)}</td>
                              <td style={{ padding: "10px 8px", color: C.muted, fontSize: 13 }}>{fmtDate(task.dateCreated)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* KANBAN VIEW */}
        {activeTab !== "task-templates" && viewMode === "kanban" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, alignItems: "start" }}>
            {KANBAN_COLUMNS.map(col => (
              <div key={col.key} onDragOver={e => e.preventDefault()} onDrop={() => onDrop(col.key)} style={{ minHeight: 200, borderRadius: 16, padding: 12, background: "linear-gradient(180deg, rgba(31,41,55,0.92), rgba(17,24,39,0.88))", border: `1px solid ${dragState && dragState.lane !== col.key ? C.border : col.color}`, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div style={{ color: col.color, fontWeight: 700, fontSize: 14 }}>{col.label}</div>
                  <div style={{ color: C.muted, fontSize: 13 }}>{grouped[col.key]?.length || 0}</div>
                </div>
                {(grouped[col.key] || []).map(task => {
                  const isExpanded = expandedCard === (task.sessionId || task.id);
                  const prioColor = PRIORITY_MAP[task.priority]?.color || PRIORITY_MAP.normal.color;
                  const hasError = dndError === (task.sessionId || task.id);
                  const isCrit = task.priority === "critical";
                  return (
                    <div key={task.id} draggable onDragStart={() => setDragState(task)} onDragEnd={() => setDragState(null)} style={{
                      padding: 12, borderRadius: 12, background: hasError ? "rgba(239,68,68,0.12)" : C.card,
                      border: `1px solid ${hasError ? C.red : C.border}`, borderLeft: `3px solid ${prioColor}`,
                      cursor: "grab", transition: "background 0.3s, border-color 0.3s",
                      ...(isCrit ? { animation: "criticalPulse 2s ease-in-out infinite" } : {}),
                    }}>
                      {hasError && <div style={{ color: C.red, fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Move failed - reverted</div>}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 6 }}>
                        <div style={{ color: C.text, fontSize: 13, fontWeight: 700, lineHeight: 1.5, flex: 1, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                          {isCrit && <span style={{ color: "#ef4444", marginRight: 4 }}>!!</span>}
                          {task.task}
                        </div>
                        <PriorityBadge priority={task.priority} />
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8, alignItems: "center" }}>
                        {(() => {
                          const agentData = (agents || []).find(a => a.id === task.agent);
                          return agentData ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <Avatar agent={agentData} size={18} />
                              <span style={{ fontSize: 11, color: C.text }}>{agentData.name}</span>
                            </div>
                          ) : <Badge color={C.accent}>{task.agent}</Badge>;
                        })()}
                        <Badge color={statusColor(task.status)}>{task.status}</Badge>
                        {task.durationMinutes > 0 && <span style={{ fontSize: 11, color: C.cyan }}>{fmtDuration(task.durationMinutes)}</span>}
                      </div>
                      <button onClick={() => setExpandedCard(isExpanded ? null : (task.sessionId || task.id))} style={{ width: "100%", marginTop: 8, padding: "4px 0", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 6, color: C.muted, fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                        {isExpanded ? "\u25B2 Collapse" : "\u25BC Details"}
                      </button>
                      {isExpanded && (
                        <div style={{ marginTop: 8, padding: 10, borderRadius: 8, background: C.bg, border: `1px solid ${C.border}`, fontSize: 13 }}>
                          <div style={{ color: C.text, lineHeight: 1.6, marginBottom: 8 }}>{(task.task || "").slice(0, 400)}{(task.task || "").length > 400 ? "\u2026" : ""}</div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                            <div><span style={{ color: C.muted }}>Agent:</span> <span style={{ color: C.text }}>{task.agent}</span></div>
                            <div><span style={{ color: C.muted }}>Model:</span> <span style={{ color: C.text }}>{task.apiModelUsed || "-"}</span></div>
                            <div><span style={{ color: C.muted }}>Cost:</span> <span style={{ color: C.text }}>{fmtCost(task.totalCost)}</span></div>
                            <div><span style={{ color: C.muted }}>Tokens:</span> <span style={{ color: C.text }}>{fmtTokens(task.tokens)}</span></div>
                            <div><span style={{ color: C.muted }}>Time:</span> <span style={{ color: C.cyan }}>{fmtDuration(task.durationMinutes)}</span></div>
                            <div><span style={{ color: C.muted }}>Created:</span> <span style={{ color: C.text }}>{fmtDate(task.dateCreated)}</span></div>
                          </div>
                          <div style={{ marginTop: 6, fontFamily: "monospace", color: C.muted, fontSize: 10 }}>Session: {task.sessionId || task.id}</div>
                          <div style={{ marginTop: 6 }}>
                            <span style={{ color: C.muted }}>Priority: </span>
                            <PrioritySelector value={task.priority} onChange={(p) => handlePriorityChange(task.sessionId || task.id, p)} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* TIMELINE VIEW */}
        {activeTab !== "task-templates" && viewMode === "gitt" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {gittTimeline.map((task, i) => {
              const expanded = expandedNode === task.id;
              const color = statusColor(task.status);
              const prioColor = PRIORITY_MAP[task.priority]?.color || C.border;
              const hasNext = i < gittTimeline.length - 1;
              return (
                <div key={task.id} style={{ display: "grid", gridTemplateColumns: "120px 56px minmax(0, 1fr)", gap: 0 }}>
                  <div style={{ padding: "8px 8px 18px 0", color: C.muted, fontSize: 13, textAlign: "right" }}>{fmtDate(task.dateCreated)}</div>
                  <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
                    <div style={{ width: 14, height: 14, borderRadius: "50%", background: color, border: `3px solid ${C.bg}`, boxShadow: `0 0 0 2px ${color}55`, marginTop: 10, zIndex: 1 }} />
                    {hasNext && <div style={{ position: "absolute", top: 24, bottom: -8, left: "50%", width: 2, transform: "translateX(-50%)", background: `linear-gradient(180deg, ${color}, ${C.border})` }} />}
                  </div>
                  <div style={{ padding: "0 0 18px 12px" }}>
                    <button onClick={() => setExpandedNode(expanded ? null : task.id)} style={{ width: "100%", textAlign: "left", border: `1px solid ${expanded ? color : C.border}`, borderLeft: `3px solid ${prioColor}`, borderRadius: 14, background: "linear-gradient(135deg, rgba(31,41,55,0.98), rgba(17,24,39,0.92))", padding: 14, color: C.text, cursor: "pointer" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <div style={{ fontWeight: 700, lineHeight: 1.5, fontSize: 14 }}>{task.task}</div>
                        <PriorityBadge priority={task.priority} />
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8, alignItems: "center" }}>
                        {(() => {
                          const agentData = (agents || []).find(a => a.id === task.agent);
                          return agentData ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <Avatar agent={agentData} size={18} />
                              <span style={{ fontSize: 11, color: C.text }}>{agentData.name}</span>
                            </div>
                          ) : <Badge color={C.accent}>{task.agent}</Badge>;
                        })()}
                        <Badge color={color}>{task.status}</Badge>
                        <Badge color={C.teal}>{task.apiModelUsed || "-"}</Badge>
                        {task.durationMinutes > 0 && <span style={{ fontSize: 11, color: C.cyan }}>{fmtDuration(task.durationMinutes)}</span>}
                      </div>
                      {expanded && (
                        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, fontSize: 13 }}>
                          <div><span style={{ color: C.muted }}>Cost:</span> <span style={{ color: C.text }}>{fmtCost(task.totalCost)}</span></div>
                          <div><span style={{ color: C.muted }}>Tokens:</span> <span style={{ color: C.text }}>{fmtTokens(task.tokens)}</span></div>
                          <div><span style={{ color: C.muted }}>Time:</span> <span style={{ color: C.cyan }}>{fmtDuration(task.durationMinutes)}</span></div>
                          <div><span style={{ color: C.muted }}>Created:</span> <span style={{ color: C.text }}>{fmtDate(task.dateCreated)}</span></div>
                          <div><span style={{ color: C.muted }}>Finished:</span> <span style={{ color: C.text }}>{fmtDate(task.dateFinished)}</span></div>
                          <div style={{ gridColumn: "1/-1", fontFamily: "monospace", color: C.muted, fontSize: 10 }}>Session: {task.sessionId}</div>
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default Tasks;
