import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Card, KPI } from "../components/shared";
import { C } from "../data/constants";
import taskTemplates from "../data/task-templates.json";
import { useMissionControlData } from "../context/MissionControlDataContext";

const VIEW_STORAGE_KEY = "mission-control.tasks.view-mode";
const SORT_STORAGE_KEY = "mission-control.tasks.sort";
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
const SORTABLE_COLUMNS = [
  { key: "task", label: "Task" },
  { key: "projectName", label: "Project" },
  { key: "agent", label: "Agent" },
  { key: "status", label: "Status" },
  { key: "apiModelUsed", label: "API Model Used" },
  { key: "tokens", label: "Tokens" },
  { key: "totalCost", label: "Total Cost" },
  { key: "estimatedCostToCompletion", label: "Est. Cost Remaining" },
  { key: "estimatedTimeToCompletion", label: "Est. Time Remaining" },
  { key: "dateCreated", label: "Date Created" },
  { key: "dateFinished", label: "Date Finished" },
];
const LOCAL_API = "http://127.0.0.1:7070";

function readStoredView() {
  if (typeof window === "undefined") return "list";
  const value = window.localStorage.getItem(VIEW_STORAGE_KEY);
  return ["list", "kanban", "gitt"].includes(value) ? value : "list";
}

function readStoredSort() {
  if (typeof window === "undefined") return { key: "dateCreated", direction: "desc" };
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(SORT_STORAGE_KEY) || "null");
    if (parsed?.key && parsed?.direction) return parsed;
  } catch {}
  return { key: "dateCreated", direction: "desc" };
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatTokens(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return "—";
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}M`;
  if (number >= 1_000) return `${(number / 1_000).toFixed(1)}K`;
  return String(number);
}

function statusColor(status) {
  const normalized = String(status || "").toLowerCase();
  if (["done", "complete", "completed", "success"].includes(normalized)) return C.green;
  if (["blocked", "failed", "error", "stalled"].includes(normalized)) return C.red;
  if (["delegated", "working", "running", "busy", "in progress", "in_progress", "active", "pending"].includes(normalized)) return C.amber;
  return C.cyan;
}

function normalizeLane(status, lane) {
  if (lane && KANBAN_COLUMNS.some((column) => column.key === lane)) return lane;
  const normalized = String(status || "").toLowerCase();
  if (["done", "complete", "completed", "success"].includes(normalized)) return "done";
  if (["blocked", "failed", "error", "stalled"].includes(normalized)) return "blocked";
  if (["delegated", "working", "running", "busy", "active", "pending", "in progress", "in_progress"].includes(normalized)) return "inprogress";
  return "todo";
}

function getArrow(sortKey, activeSort) {
  if (activeSort.key !== sortKey) return "";
  return activeSort.direction === "asc" ? "↑" : "↓";
}

function getComparableValue(task, key) {
  switch (key) {
    case "tokens":
    case "totalCost":
    case "estimatedCostToCompletion":
      return Number(task[key] || 0);
    case "dateCreated":
    case "dateFinished":
      return new Date(task[key] || 0).getTime();
    default:
      return String(task[key] || "").toLowerCase();
  }
}

function sortTasks(tasks, sort) {
  const direction = sort.direction === "asc" ? 1 : -1;
  return [...tasks].sort((left, right) => {
    const leftValue = getComparableValue(left, sort.key);
    const rightValue = getComparableValue(right, sort.key);
    if (leftValue < rightValue) return -1 * direction;
    if (leftValue > rightValue) return 1 * direction;
    return String(left.sessionId || left.id).localeCompare(String(right.sessionId || right.id));
  });
}

function ViewToggle({ value, onChange }) {
  return (
    <div style={{ display: "inline-flex", padding: 4, borderRadius: 12, background: C.surface, border: `1px solid ${C.border}` }}>
      {[
        { key: "list", label: "List" },
        { key: "kanban", label: "Kanban" },
        { key: "gitt", label: "Gitt" },
      ].map((view) => (
        <button
          key={view.key}
          onClick={() => onChange(view.key)}
          style={{
            background: value === view.key ? C.accent : "transparent",
            color: value === view.key ? "#fff" : C.muted,
            border: "none",
            borderRadius: 8,
            padding: "8px 14px",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {view.label}
        </button>
      ))}
    </div>
  );
}

function SortableHeader({ column, sort, onSort }) {
  return (
    <th style={{ padding: "12px 10px", fontSize: 12, color: C.muted, fontWeight: 600 }}>
      <button
        onClick={() => onSort(column.key)}
        style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer", padding: 0, font: "inherit" }}
      >
        {column.label} {getArrow(column.key, sort)}
      </button>
    </th>
  );
}

function TaskDetailGrid({ task }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
      <div style={{ fontSize: 12, color: C.muted }}>Agent<div style={{ color: C.text, fontSize: 13, marginTop: 3 }}>{task.agent}</div></div>
      <div style={{ fontSize: 12, color: C.muted }}>API Model Used<div style={{ color: C.text, fontSize: 13, marginTop: 3 }}>{task.apiModelUsed || "—"}</div></div>
      <div style={{ fontSize: 12, color: C.muted }}>Total Cost<div style={{ color: C.text, fontSize: 13, marginTop: 3 }}>{formatCurrency(task.totalCost)}</div></div>
      <div style={{ fontSize: 12, color: C.muted }}>Est. Cost Remaining<div style={{ color: C.text, fontSize: 13, marginTop: 3 }}>{formatCurrency(task.estimatedCostToCompletion)}</div></div>
      <div style={{ fontSize: 12, color: C.muted }}>Est. Time Remaining<div style={{ color: C.text, fontSize: 13, marginTop: 3 }}>{task.estimatedTimeToCompletion || "—"}</div></div>
      <div style={{ fontSize: 12, color: C.muted }}>Date Created<div style={{ color: C.text, fontSize: 13, marginTop: 3 }}>{formatDate(task.dateCreated)}</div></div>
      <div style={{ fontSize: 12, color: C.muted }}>Date Finished<div style={{ color: C.text, fontSize: 13, marginTop: 3 }}>{formatDate(task.dateFinished)}</div></div>
      <div style={{ fontSize: 12, color: C.muted }}>Tokens<div style={{ color: C.text, fontSize: 13, marginTop: 3 }}>{formatTokens(task.tokens)}</div></div>
    </div>
  );
}

const Tasks = () => {
  const navigate = useNavigate();
  const { acpSessions, snapshot, refresh } = useMissionControlData();
  const [viewMode, setViewMode] = useState(readStoredView);
  const [sort, setSort] = useState(readStoredSort);
  const [activeTab, setActiveTab] = useState("my-tasks");
  const [filter, setFilter] = useState("all");
  const [expandedNode, setExpandedNode] = useState(null);
  const [dragState, setDragState] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(VIEW_STORAGE_KEY, viewMode);
    }
  }, [viewMode]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(sort));
    }
  }, [sort]);

  const sessions = useMemo(
    () => (acpSessions || []).map((session) => ({
      ...session,
      lane: normalizeLane(session.status, session.lane),
      apiModelUsed: session.apiModelUsed || session.model || "—",
    })),
    [acpSessions]
  );

  const visibleSessions = useMemo(() => {
    let base = sessions;
    if (activeTab === "blocked-queue") {
      base = sessions.filter((session) => session.lane === "blocked");
    } else if (activeTab === "recently-completed") {
      base = sessions.filter((session) => session.lane === "done");
    } else if (activeTab === "my-tasks" && filter !== "all") {
      base = sessions.filter((session) => session.agent === filter || session.lane === filter || session.status === filter);
    } else if (activeTab === "task-templates") {
      base = [];
    }
    return sortTasks(base, sort);
  }, [activeTab, filter, sessions, sort]);

  const grouped = useMemo(
    () =>
      KANBAN_COLUMNS.reduce((acc, column) => {
        acc[column.key] = visibleSessions
          .filter((session) => session.lane === column.key)
          .sort((left, right) => new Date(right.dateCreated || 0).getTime() - new Date(left.dateCreated || 0).getTime());
        return acc;
      }, {}),
    [visibleSessions]
  );

  const gittTimeline = useMemo(() => {
    return [...visibleSessions].sort(
      (left, right) => new Date(right.dateCreated || right.dateFinished || 0).getTime() - new Date(left.dateCreated || left.dateFinished || 0).getTime()
    );
  }, [visibleSessions]);

  const totals = useMemo(() => ({
    sessions: sessions.length,
    done: sessions.filter((session) => session.lane === "done").length,
    active: sessions.filter((session) => session.lane !== "done").length,
    blocked: sessions.filter((session) => session.lane === "blocked").length,
    totalCost: sessions.reduce((sum, session) => sum + Number(session.totalCost || 0), 0),
  }), [sessions]);

  const handleSort = (key) => {
    setSort((current) => (
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: ["task", "projectName", "agent", "status", "apiModelUsed", "estimatedTimeToCompletion"].includes(key) ? "asc" : "desc" }
    ));
  };

  const persistLaneChange = async (task, lane) => {
    const statusMap = { todo: "todo", inprogress: "in_progress", blocked: "blocked", done: "done" };
    try {
      await fetch(`${LOCAL_API}/task/update-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: task.sessionId || task.id,
          status: statusMap[lane] || lane,
          lane,
          projectId: task.projectId,
          projectName: task.projectName,
        }),
      });
      refresh();
    } catch {
      // Keep UI usable even if the local API is down.
    }
  };

  const onDrop = async (lane) => {
    if (!dragState) return;
    await persistLaneChange(dragState, lane);
    setDragState(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Tasks</h1>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>
            Mission Control session data from `live-data.json`. View mode persists in `localStorage`; sorting persists for this browser session.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <ViewToggle value={viewMode} onChange={setViewMode} />
          <button
            onClick={refresh}
            style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 10, padding: "10px 14px", fontWeight: 600, cursor: "pointer" }}
          >
            Refresh Tasks
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {TASK_SUB_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              background: activeTab === tab.key ? "rgba(59,130,246,0.18)" : C.surface,
              color: activeTab === tab.key ? C.text : C.muted,
              border: `1px solid ${activeTab === tab.key ? C.accent : C.border}`,
              borderRadius: 10,
              padding: "8px 14px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "my-tasks" ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["all", "todo", "inprogress", "blocked", "done", "main", "codex"].map((value) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              style={{
                background: filter === value ? C.accent : C.surface,
                color: filter === value ? "#fff" : C.muted,
                border: `1px solid ${filter === value ? C.accent : C.border}`,
                borderRadius: 8,
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {value === "all" ? "All" : value === "inprogress" ? "In Progress" : value.charAt(0).toUpperCase() + value.slice(1)}
            </button>
          ))}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <KPI label="Total Sessions" value={totals.sessions || "—"} sub="All ACP sessions" color={C.accent} />
        <KPI label="Completed" value={totals.done || "—"} sub="Done lane" color={C.green} />
        <KPI label="Active Work" value={totals.active || "—"} sub="To do + in progress + blocked" color={C.amber} />
        <KPI label="Blocked" value={totals.blocked || "0"} sub="Needs attention" color={C.red} />
        <KPI label="Total Cost" value={formatCurrency(totals.totalCost)} sub="Calculated from runtime session data" color={C.teal} />
      </div>

      <Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
              {activeTab === "task-templates" ? `Task Templates (${taskTemplates.length})` : `Visible Tasks (${visibleSessions.length})`}
            </div>
            <div style={{ fontSize: 12, color: C.muted }}>Source updated {formatDate(snapshot?.generatedAt || snapshot?.lastUpdated)}</div>
          </div>

          {activeTab === "task-templates" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
              {taskTemplates.map((template) => (
                <div key={template.id} style={{ border: `1px solid ${C.border}`, borderRadius: 14, background: C.surface, padding: 14 }}>
                  <div style={{ color: C.text, fontSize: 14, fontWeight: 700 }}>{template.name}</div>
                  <div style={{ color: C.muted, fontSize: 12, marginTop: 6 }}>{template.description}</div>
                </div>
              ))}
            </div>
          ) : null}

          {activeTab !== "task-templates" && viewMode === "list" ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1440 }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: `1px solid ${C.border}` }}>
                    {SORTABLE_COLUMNS.map((column) => (
                      <SortableHeader key={column.key} column={column} sort={sort} onSort={handleSort} />
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleSessions.map((task) => (
                    <tr key={task.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: "14px 10px", color: C.text, fontWeight: 600 }}>{task.task}</td>
                      <td style={{ padding: "14px 10px", color: C.text }}>
                        {task.projectName ? (
                          <button onClick={() => navigate(`/projects?project=${encodeURIComponent(task.projectId)}`)} style={{ background: "transparent", border: "none", color: C.accent, cursor: "pointer", padding: 0 }}>
                            {task.projectName}
                          </button>
                        ) : "—"}
                      </td>
                      <td style={{ padding: "14px 10px" }}><Badge color={task.agent === "codex" ? C.purple : C.accent}>{task.agent}</Badge></td>
                      <td style={{ padding: "14px 10px" }}><Badge color={statusColor(task.status)}>{task.status}</Badge></td>
                      <td style={{ padding: "14px 10px", color: C.text }}>{task.apiModelUsed || "—"}</td>
                      <td style={{ padding: "14px 10px", color: C.text }}>{formatTokens(task.tokens)}</td>
                      <td style={{ padding: "14px 10px", color: C.text }}>{formatCurrency(task.totalCost)}</td>
                      <td style={{ padding: "14px 10px", color: C.text }}>{formatCurrency(task.estimatedCostToCompletion)}</td>
                      <td style={{ padding: "14px 10px", color: C.text }}>{task.estimatedTimeToCompletion || "—"}</td>
                      <td style={{ padding: "14px 10px", color: C.text }}>{formatDate(task.dateCreated)}</td>
                      <td style={{ padding: "14px 10px", color: C.text }}>{formatDate(task.dateFinished)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {activeTab !== "task-templates" && viewMode === "kanban" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, alignItems: "start" }}>
              {KANBAN_COLUMNS.map((column) => (
                <div
                  key={column.key}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => onDrop(column.key)}
                  style={{
                    minHeight: 260,
                    borderRadius: 16,
                    padding: 12,
                    background: "linear-gradient(180deg, rgba(31,41,55,0.92), rgba(17,24,39,0.88))",
                    border: `1px solid ${dragState && dragState.lane !== column.key ? C.border : column.color}`,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ color: column.color, fontWeight: 700 }}>{column.label}</div>
                    <div style={{ color: C.muted, fontSize: 12 }}>{grouped[column.key]?.length || 0}</div>
                  </div>
                  {(grouped[column.key] || []).map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => setDragState(task)}
                      onDragEnd={() => setDragState(null)}
                      style={{ padding: 12, borderRadius: 12, background: C.card, border: `1px solid ${C.border}`, cursor: "grab" }}
                    >
                      <div style={{ color: C.text, fontSize: 13, fontWeight: 700, lineHeight: 1.4 }}>{task.task}</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                        <Badge color={task.agent === "codex" ? C.purple : C.accent}>{task.agent}</Badge>
                        <Badge color={statusColor(task.status)}>{task.status}</Badge>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, marginTop: 10 }}>
                        <div style={{ fontSize: 11, color: C.muted }}>Model<div style={{ color: C.text, fontSize: 12, marginTop: 2 }}>{task.apiModelUsed || "—"}</div></div>
                        <div style={{ fontSize: 11, color: C.muted }}>Cost so far<div style={{ color: C.text, fontSize: 12, marginTop: 2 }}>{formatCurrency(task.totalCost)}</div></div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : null}

          {activeTab !== "task-templates" && viewMode === "gitt" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {gittTimeline.map((task, index) => {
                const nodeExpanded = expandedNode === task.id;
                const color = statusColor(task.status);
                const hasBranch = Boolean(task.parentSession);
                const hasNext = index < gittTimeline.length - 1;

                return (
                  <div key={task.id} style={{ display: "grid", gridTemplateColumns: "140px 56px minmax(0, 1fr)", gap: 0 }}>
                    <div style={{ padding: "8px 12px 18px 0", color: C.muted, fontSize: 12, textAlign: "right" }}>{formatDate(task.dateCreated)}</div>
                    <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
                      <div style={{ width: 14, height: 14, borderRadius: "50%", background: color, border: `3px solid ${C.bg}`, boxShadow: `0 0 0 2px ${color}55`, marginTop: 10, zIndex: 1 }} />
                      {hasNext ? <div style={{ position: "absolute", top: 24, bottom: -8, left: "50%", width: 2, transform: "translateX(-50%)", background: `linear-gradient(180deg, ${color}, ${C.border})` }} /> : null}
                      {hasBranch ? <div style={{ position: "absolute", top: 17, left: "50%", width: 18, height: 2, transform: "translateX(0)", background: color }} /> : null}
                    </div>
                    <div style={{ padding: "0 0 18px 16px" }}>
                      <button
                        onClick={() => setExpandedNode(nodeExpanded ? null : task.id)}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          border: `1px solid ${nodeExpanded ? color : C.border}`,
                          borderRadius: 14,
                          background: "linear-gradient(135deg, rgba(31,41,55,0.98), rgba(17,24,39,0.92))",
                          padding: 14,
                          color: C.text,
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                          <div style={{ fontWeight: 700, lineHeight: 1.4 }}>{task.task}</div>
                          <div style={{ fontSize: 11, color: C.muted, fontFamily: "monospace" }}>{task.sessionId || task.id}</div>
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                          <Badge color={task.agent === "codex" ? C.purple : C.accent}>{task.agent}</Badge>
                          <Badge color={color}>{task.status}</Badge>
                          <Badge color={C.teal}>{task.apiModelUsed || "—"}</Badge>
                        </div>
                        {nodeExpanded ? (
                          <div style={{ marginTop: 12 }}>
                            <TaskDetailGrid task={task} />
                            {task.parentSession ? (
                              <div style={{ marginTop: 10, fontSize: 12, color: C.muted }}>Parent session: {task.parentSession}</div>
                            ) : null}
                          </div>
                        ) : null}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
};

export default Tasks;
