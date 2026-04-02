import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Card, KPI } from "../components/shared";
import { C } from "../data/constants";
import taskTemplates from "../data/task-templates.json";
import { useMissionControlData } from "../context/MissionControlDataContext";

const VIEW_STORAGE_KEY = "mission-control.tasks.view-mode";
const VIEW_MODES = ["list", "kanban", "gitt"];
const TASK_SUB_TABS = [
  { key: "my-tasks", label: "My Tasks" },
  { key: "blocked-queue", label: "Blocked Queue" },
  { key: "recently-completed", label: "Recently Completed" },
  { key: "task-templates", label: "Task Templates" }
];
const SORTABLE_COLUMNS = [
  { key: "task", label: "Task" },
  { key: "projectName", label: "Project" },
  { key: "agent", label: "Agent" },
  { key: "status", label: "Status" },
  { key: "model", label: "Model" },
  { key: "tokens", label: "Tokens" },
  { key: "totalCost", label: "Cost" },
  { key: "dateCreated", label: "Created" },
  { key: "dateFinished", label: "Finished" },
  { key: "sizeBytes", label: "Size" }
];
const KANBAN_COLUMNS = [
  { key: "todo", label: "To Do" },
  { key: "inprogress", label: "In Progress" },
  { key: "blocked", label: "Blocked" },
  { key: "done", label: "Done" }
];

function readStoredView() {
  if (typeof window === "undefined") {
    return "list";
  }

  const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
  return VIEW_MODES.includes(stored) ? stored : "list";
}

function statusColor(status) {
  switch (String(status || "").toLowerCase()) {
    case "done":
    case "complete":
    case "completed":
      return C.green;
    case "delegated":
    case "working":
    case "running":
    case "in_progress":
    case "in progress":
      return C.amber;
    case "error":
    case "blocked":
    case "failed":
      return C.red;
    default:
      return C.cyan;
  }
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatShortDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
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

function formatCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: amount >= 100 ? 0 : 2
  }).format(amount);
}

function normalizeStatusLane(status) {
  const value = String(status || "").trim().toLowerCase();

  if (["done", "complete", "completed", "success"].includes(value)) {
    return "done";
  }
  if (["blocked", "error", "failed", "stalled"].includes(value)) {
    return "blocked";
  }
  if (["delegated", "working", "running", "busy", "in progress", "in_progress", "active"].includes(value)) {
    return "inprogress";
  }
  return "todo";
}

function getArrow(sortKey, activeSort) {
  if (activeSort.key !== sortKey) return ">";
  return activeSort.direction === "asc" ? "^" : "v";
}

function getComparableValue(task, key) {
  switch (key) {
    case "tokens":
    case "sizeBytes":
    case "totalCost":
      return Number(task[key] || 0);
    case "dateCreated":
    case "dateFinished":
      return new Date(task[key] || 0).getTime();
    default:
      return String(task[key] || "").toLowerCase();
  }
}

function compareTasks(left, right, sort) {
  const direction = sort.direction === "asc" ? 1 : -1;
  const leftValue = getComparableValue(left, sort.key);
  const rightValue = getComparableValue(right, sort.key);

  if (leftValue < rightValue) return -1 * direction;
  if (leftValue > rightValue) return 1 * direction;
  return String(left.sessionId || left.id).localeCompare(String(right.sessionId || right.id));
}

function normalizeTask(session, index) {
  const start = session?.dateCreated || session?.startTime || session?.lastModified || null;
  const end = session?.dateFinished || session?.endTime || session?.lastModified || null;
  const numericCost = Number(session?.totalCost);

  return {
    id: session?.id || session?.sessionId || `task-${index + 1}`,
    sessionId: session?.sessionId || session?.id || "",
    task: session?.task || "ACP Session",
    projectId: session?.projectId || "",
    projectName: session?.projectName || "",
    agent: session?.agent || "unknown",
    status: session?.status || "unknown",
    model: session?.model || "—",
    tokens: Number(session?.tokens) || 0,
    totalCost: Number.isFinite(numericCost) ? numericCost : null,
    dateCreated: start,
    dateFinished: end,
    sizeBytes: Number(session?.sizeBytes) || 0,
    lane: normalizeStatusLane(session?.status),
    source: session
  };
}

function ViewToggle({ viewMode, setViewMode }) {
  return (
    <div style={{ display: "inline-flex", padding: 4, borderRadius: 12, background: C.surface, border: `1px solid ${C.border}` }}>
      {[
        { key: "list", label: "List" },
        { key: "kanban", label: "Kanban" },
        { key: "gitt", label: "Gitt" }
      ].map((view) => (
        <button
          key={view.key}
          onClick={() => setViewMode(view.key)}
          style={{
            background: viewMode === view.key ? C.accent : "transparent",
            color: viewMode === view.key ? "#fff" : C.muted,
            border: "none",
            borderRadius: 8,
            padding: "8px 14px",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer"
          }}
        >
          {view.label}
        </button>
      ))}
    </div>
  );
}

function TaskSubTabs({ activeTab, setActiveTab }) {
  return (
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
            cursor: "pointer"
          }}
        >
          {tab.label}
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
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          background: "transparent",
          border: "none",
          color: "inherit",
          font: "inherit",
          padding: 0,
          cursor: "pointer"
        }}
      >
        <span>{column.label}</span>
        <span style={{ color: sort.key === column.key ? C.text : C.border, minWidth: 10, textAlign: "center" }}>
          {getArrow(column.key, sort)}
        </span>
      </button>
    </th>
  );
}

function TaskChip({ task }) {
  const navigate = useNavigate();

  return (
    <div
      style={{
        padding: 12,
        borderRadius: 12,
        background: "rgba(17,24,39,0.85)",
        border: `1px solid ${C.border}`,
        display: "flex",
        flexDirection: "column",
        gap: 10
      }}
    >
      <div>
        <div style={{ color: C.text, fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}>{task.task}</div>
        <div style={{ color: C.muted, fontSize: 11, fontFamily: "monospace", marginTop: 4 }}>
          {task.sessionId ? task.sessionId.slice(0, 16) : "unsynced"}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {task.projectName ? (
          <button
            onClick={() => navigate(`/projects?project=${encodeURIComponent(task.projectId)}`)}
            style={{
              background: "transparent",
              border: `1px solid ${C.border}`,
              borderRadius: 999,
              color: C.text,
              cursor: "pointer",
              fontSize: 11,
              padding: "2px 8px"
            }}
          >
            {task.projectName}
          </button>
        ) : null}
        <Badge color={task.agent === "codex" ? C.purple : C.accent}>{task.agent}</Badge>
        <Badge color={statusColor(task.status)}>{task.status}</Badge>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
        <div style={{ fontSize: 11, color: C.muted }}>
          Model
          <div style={{ color: C.text, fontSize: 12, marginTop: 2 }}>{task.model}</div>
        </div>
        <div style={{ fontSize: 11, color: C.muted }}>
          Tokens
          <div style={{ color: C.text, fontSize: 12, marginTop: 2 }}>{formatTokens(task.tokens)}</div>
        </div>
        <div style={{ fontSize: 11, color: C.muted }}>
          Created
          <div style={{ color: C.text, fontSize: 12, marginTop: 2 }}>{formatShortDate(task.dateCreated)}</div>
        </div>
        <div style={{ fontSize: 11, color: C.muted }}>
          Size
          <div style={{ color: C.text, fontSize: 12, marginTop: 2 }}>{formatBytes(task.sizeBytes)}</div>
        </div>
      </div>
    </div>
  );
}

function renderEmptyState(message) {
  return (
    <div style={{ padding: 18, borderRadius: 12, background: C.surface, border: `1px dashed ${C.border}`, color: C.muted, fontSize: 13 }}>
      {message}
    </div>
  );
}

function getTaskTimestamp(task) {
  return new Date(task.dateFinished || task.dateCreated || 0).getTime();
}

const Tasks = () => {
  const navigate = useNavigate();
  const { acpSessions, snapshot, refresh } = useMissionControlData();
  const [filter, setFilter] = useState("all");
  const [viewMode, setViewMode] = useState(readStoredView);
  const [activeTab, setActiveTab] = useState("my-tasks");
  const [sort, setSort] = useState({ key: "dateCreated", direction: "desc" });
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newAgent, setNewAgent] = useState("main");
  const [newPriority, setNewPriority] = useState("normal");
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(VIEW_STORAGE_KEY, viewMode);
    }
  }, [viewMode]);

  const sessions = useMemo(() => (acpSessions || []).map(normalizeTask), [acpSessions]);

  const filtered = useMemo(() => {
    if (filter === "all") return sessions;
    return sessions.filter((session) => session.agent === filter || session.status === filter || session.lane === filter);
  }, [filter, sessions]);

  const blockedQueue = useMemo(() => {
    return sessions.filter((session) => String(session.status || "").toLowerCase() === "blocked");
  }, [sessions]);

  const recentlyCompleted = useMemo(() => {
    return sessions
      .filter((session) => session.lane === "done")
      .sort((left, right) => getTaskTimestamp(right) - getTaskTimestamp(left))
      .slice(0, 30);
  }, [sessions]);

  const visibleSessions = useMemo(() => {
    switch (activeTab) {
      case "blocked-queue":
        return blockedQueue;
      case "recently-completed":
        return recentlyCompleted;
      case "task-templates":
        return [];
      case "my-tasks":
      default:
        return filtered;
    }
  }, [activeTab, blockedQueue, filtered, recentlyCompleted]);

  const sorted = useMemo(() => {
    return [...visibleSessions].sort((left, right) => compareTasks(left, right, sort));
  }, [visibleSessions, sort]);

  const kanbanGroups = useMemo(() => {
    return KANBAN_COLUMNS.reduce((acc, column) => {
      acc[column.key] = sorted.filter((task) => task.lane === column.key);
      return acc;
    }, {});
  }, [sorted]);

  const gittTimeline = useMemo(() => {
    return [...sorted].sort((left, right) => {
      const leftTime = getTaskTimestamp(left);
      const rightTime = getTaskTimestamp(right);
      return rightTime - leftTime;
    });
  }, [sorted]);

  const totalTokens = sessions.reduce((sum, s) => sum + (s.tokens || 0), 0);
  const totalBytes = sessions.reduce((sum, s) => sum + (s.sizeBytes || 0), 0);
  const totalCost = sessions.reduce((sum, s) => sum + (Number(s.totalCost) || 0), 0);
  const delegated = sessions.filter((s) => s.lane === "inprogress").length;
  const done = sessions.filter((s) => s.lane === "done").length;
  const cron = (acpSessions || []).filter((s) => s.isCron).length;

  const handleSort = (key) => {
    setSort((current) => (
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: key === "task" || key === "agent" || key === "status" || key === "model" ? "asc" : "desc" }
    ));
  };

  const handleAddTask = async () => {
    if (!newTask.trim()) return;
    setSubmitting(true);
    setSubmitResult(null);
    const MC_API = localStorage.getItem("mc-api-url") || "http://localhost:7070";
    try {
      const resp = await fetch(`${MC_API}/task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTask,
          description: newTaskDesc || "",
          agent: newAgent,
          priority: newPriority,
          status: "pending",
        }),
      });
      const data = await resp.json();
      if (data.ok) {
        setSubmitResult({ ok: true, message: `Task created: "${newTask}" → assigned to ${newAgent}. Synced to Mission Control.` });
        setNewTask("");
        setNewTaskDesc("");
        setTimeout(() => refresh(), 1000);
      } else {
        setSubmitResult({ ok: false, message: `Server error: ${data.error}. Fallback: run openclaw agent --agent ${newAgent} --message "${newTask}"` });
      }
    } catch (e) {
      setSubmitResult({ ok: false, message: `API unreachable (${MC_API}). Run manually: openclaw agent --agent ${newAgent} --message "${newTask.replace(/"/g, '\\"')}"` });
    }
    setSubmitting(false);
  };

  const tabTitle = activeTab === "blocked-queue"
    ? `Blocked Queue (${visibleSessions.length})`
    : activeTab === "recently-completed"
      ? `Recently Completed (${visibleSessions.length})`
      : activeTab === "task-templates"
        ? `Task Templates (${taskTemplates.length})`
        : `ACP Sessions (${visibleSessions.length})`;

  const tabDescription = activeTab === "blocked-queue"
    ? "Sessions currently marked blocked."
    : activeTab === "recently-completed"
      ? "Latest 30 completed tasks."
      : activeTab === "task-templates"
        ? "Reusable task definitions from the bundled templates file."
        : `Real ACP sessions from OpenClaw runtime — ${sessions.length} total across all agents.`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Tasks</h1>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>
            {tabDescription}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
          <button
            onClick={() => setShowAddTask(!showAddTask)}
            style={{ background: C.green, color: "#fff", border: "none", borderRadius: 10, padding: "10px 14px", fontWeight: 600, cursor: "pointer" }}
          >
            + Add Task
          </button>
          <button
            onClick={refresh}
            style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 10, padding: "10px 14px", fontWeight: 600, cursor: "pointer" }}
          >
            Refresh Tasks
          </button>
        </div>
      </div>

      <TaskSubTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      {showAddTask && (
        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>New Task</div>
            <input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Task name (required)"
              style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 13 }}
            />
            <textarea
              value={newTaskDesc}
              onChange={(e) => setNewTaskDesc(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 13, resize: "vertical" }}
            />
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <select
                value={newAgent}
                onChange={(e) => setNewAgent(e.target.value)}
                style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 13 }}
              >
                <option value="main">Jarvis (main)</option>
                <option value="worker">Worker</option>
                <option value="validation">Validator</option>
                <option value="executive-assistant">Victoria</option>
              </select>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 13 }}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              <button
                onClick={handleAddTask}
                disabled={submitting || !newTask.trim()}
                style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 600, cursor: "pointer", opacity: submitting ? 0.5 : 1 }}
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </div>
            {submitResult && (
              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: submitResult.ok ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                  border: `1px solid ${submitResult.ok ? C.green : C.red}`,
                  color: C.text,
                  fontSize: 12,
                  fontFamily: "monospace",
                  wordBreak: "break-all"
                }}
              >
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
        <KPI label="Total Cost" value={totalCost > 0 ? formatCurrency(totalCost) : "—"} sub="When available in session data" color={C.teal} />
        <KPI label="Transcript Size" value={formatBytes(totalBytes)} sub="Combined transcripts" color={C.pink} />
      </div>

      {activeTab === "my-tasks" && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["all", "done", "inprogress", "blocked", "main", "codex"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                background: filter === f ? C.accent : C.surface,
                color: filter === f ? "#fff" : C.muted,
                border: `1px solid ${filter === f ? C.accent : C.border}`,
                borderRadius: 8,
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              {f === "all" ? "All" : f === "inprogress" ? "In Progress" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      )}

      <Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
              {tabTitle}
            </div>
            <div style={{ fontSize: 12, color: C.muted }}>
              Source updated {formatDateTime(snapshot?.lastUpdated)}
            </div>
          </div>

          {activeTab === "task-templates" && (
            taskTemplates.length ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
                {taskTemplates.map((template) => (
                  <div
                    key={template.id}
                    style={{
                      border: `1px solid ${C.border}`,
                      borderRadius: 14,
                      background: "linear-gradient(135deg, rgba(31,41,55,0.98), rgba(17,24,39,0.92))",
                      padding: 14,
                      display: "flex",
                      flexDirection: "column",
                      gap: 10
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                      <div>
                        <div style={{ color: C.text, fontSize: 14, fontWeight: 700 }}>{template.name}</div>
                        <div style={{ color: C.muted, fontSize: 11, fontFamily: "monospace", marginTop: 4 }}>{template.id}</div>
                      </div>
                      <Badge color={template.priority === "critical" ? C.red : template.priority === "high" ? C.amber : template.priority === "low" ? C.teal : C.accent}>
                        {template.priority}
                      </Badge>
                    </div>
                    <div style={{ color: C.muted, fontSize: 13, lineHeight: 1.5 }}>{template.description}</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Badge color={template.agent === "worker" ? C.purple : C.accent}>{template.agent}</Badge>
                      <button
                        onClick={() => {
                          setShowAddTask(true);
                          setNewTask(template.name);
                          setNewTaskDesc(template.description || "");
                          setNewAgent(template.agent || "main");
                          setNewPriority(template.priority || "normal");
                        }}
                        style={{
                          background: C.green,
                          color: "#fff",
                          border: "none",
                          borderRadius: 8,
                          padding: "7px 12px",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                      >
                        Use Template
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : renderEmptyState("No task templates are available.")
          )}

          {activeTab !== "task-templates" && viewMode === "list" && (
            sorted.length ? (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1180 }}>
                  <thead>
                    <tr style={{ textAlign: "left", borderBottom: `1px solid ${C.border}` }}>
                      {SORTABLE_COLUMNS.map((column) => (
                        <SortableHeader key={column.key} column={column} sort={sort} onSort={handleSort} />
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((task) => (
                      <tr key={task.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "14px 10px", fontSize: 13, color: C.text, minWidth: 260, maxWidth: 360 }}>
                          <div style={{ fontWeight: 600 }}>{task.task}</div>
                          <div style={{ fontSize: 11, color: C.muted, fontFamily: "monospace", marginTop: 2 }}>
                            {task.sessionId ? task.sessionId.slice(0, 16) : "unsynced"}
                          </div>
                        </td>
                        <td style={{ padding: "14px 10px", fontSize: 13, color: C.text }}>
                          {task.projectName ? (
                            <button
                              onClick={() => navigate(`/projects?project=${encodeURIComponent(task.projectId)}`)}
                              style={{
                                background: "transparent",
                                border: "none",
                                color: C.accent,
                                cursor: "pointer",
                                fontSize: 13,
                                padding: 0
                              }}
                            >
                              {task.projectName}
                            </button>
                          ) : ""}
                        </td>
                        <td style={{ padding: "14px 10px" }}>
                          <Badge color={task.agent === "codex" ? C.purple : C.accent}>{task.agent}</Badge>
                        </td>
                        <td style={{ padding: "14px 10px" }}>
                          <Badge color={statusColor(task.status)}>{task.status}</Badge>
                        </td>
                        <td style={{ padding: "14px 10px", fontSize: 13, color: C.text }}>{task.model}</td>
                        <td style={{ padding: "14px 10px", fontSize: 13, color: C.text }}>{formatTokens(task.tokens)}</td>
                        <td style={{ padding: "14px 10px", fontSize: 13, color: C.text }}>{formatCurrency(task.totalCost)}</td>
                        <td style={{ padding: "14px 10px", fontSize: 13, color: C.text }}>{formatDateTime(task.dateCreated)}</td>
                        <td style={{ padding: "14px 10px", fontSize: 13, color: C.text }}>{formatDateTime(task.dateFinished)}</td>
                        <td style={{ padding: "14px 10px", fontSize: 13, color: C.text }}>{formatBytes(task.sizeBytes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : renderEmptyState(activeTab === "blocked-queue" ? "No blocked sessions right now." : "No sessions match the current selection.")
          )}

          {activeTab !== "task-templates" && viewMode === "kanban" && (
            sorted.length ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, alignItems: "start" }}>
                {KANBAN_COLUMNS.map((column) => (
                  <div
                    key={column.key}
                    style={{
                      background: `linear-gradient(180deg, rgba(31,41,55,0.92), rgba(17,24,39,0.88))`,
                      border: `1px solid ${C.border}`,
                      borderRadius: 16,
                      padding: 12,
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      minHeight: 220
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ color: C.text, fontSize: 13, fontWeight: 700 }}>{column.label}</div>
                      <div style={{ color: C.muted, fontSize: 12 }}>{kanbanGroups[column.key]?.length || 0}</div>
                    </div>
                    {(kanbanGroups[column.key] || []).length ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {kanbanGroups[column.key].map((task) => (
                          <TaskChip key={task.id} task={task} />
                        ))}
                      </div>
                    ) : (
                      renderEmptyState(`No tasks in ${column.label.toLowerCase()}.`)
                    )}
                  </div>
                ))}
              </div>
            ) : renderEmptyState(activeTab === "blocked-queue" ? "No blocked sessions right now." : "No sessions match the current selection.")
          )}

          {activeTab !== "task-templates" && viewMode === "gitt" && (
            gittTimeline.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {gittTimeline.map((task, index) => {
                  const hasNext = index < gittTimeline.length - 1;
                  const nodeColor = statusColor(task.status);

                  return (
                    <div key={task.id} style={{ display: "grid", gridTemplateColumns: "120px 56px minmax(0, 1fr)", gap: 0 }}>
                      <div style={{ padding: "8px 12px 18px 0", color: C.muted, fontSize: 12, textAlign: "right" }}>
                        {formatShortDate(task.dateCreated !== "—" ? task.dateCreated : task.dateFinished)}
                      </div>
                      <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
                        <div
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: "50%",
                            background: nodeColor,
                            border: `3px solid ${C.bg}`,
                            boxShadow: `0 0 0 2px ${nodeColor}55`,
                            marginTop: 10,
                            position: "relative",
                            zIndex: 1
                          }}
                        />
                        {hasNext && (
                          <div
                            style={{
                              position: "absolute",
                              top: 22,
                              bottom: -6,
                              left: "50%",
                              width: 2,
                              transform: "translateX(-50%)",
                              background: `linear-gradient(180deg, ${nodeColor}, ${C.border})`
                            }}
                          />
                        )}
                        <div
                          style={{
                            position: "absolute",
                            top: 16,
                            left: "50%",
                            width: 18,
                            height: 2,
                            transform: "translateX(0)",
                            background: hasNext ? C.border : "transparent"
                          }}
                        />
                      </div>
                      <div style={{ padding: "0 0 18px 16px" }}>
                        <div
                          style={{
                            border: `1px solid ${C.border}`,
                            borderRadius: 14,
                            background: "linear-gradient(135deg, rgba(31,41,55,0.98), rgba(17,24,39,0.92))",
                            padding: 14,
                            display: "flex",
                            flexDirection: "column",
                            gap: 10
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                            <div style={{ color: C.text, fontSize: 14, fontWeight: 700 }}>{task.task}</div>
                            <div style={{ color: C.muted, fontSize: 11, fontFamily: "monospace" }}>
                              {task.sessionId ? task.sessionId.slice(0, 16) : "unsynced"}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {task.projectName ? (
                              <button
                                onClick={() => navigate(`/projects?project=${encodeURIComponent(task.projectId)}`)}
                                style={{
                                  background: "transparent",
                                  border: `1px solid ${C.border}`,
                                  borderRadius: 999,
                                  color: C.text,
                                  cursor: "pointer",
                                  fontSize: 11,
                                  padding: "2px 8px"
                                }}
                              >
                                {task.projectName}
                              </button>
                            ) : null}
                            <Badge color={task.agent === "codex" ? C.purple : C.accent}>{task.agent}</Badge>
                            <Badge color={statusColor(task.status)}>{task.status}</Badge>
                            <Badge color={C.teal}>{task.model}</Badge>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                            <div style={{ fontSize: 12, color: C.muted }}>
                              Tokens
                              <div style={{ color: C.text, fontSize: 13, marginTop: 3 }}>{formatTokens(task.tokens)}</div>
                            </div>
                            <div style={{ fontSize: 12, color: C.muted }}>
                              Cost
                              <div style={{ color: C.text, fontSize: 13, marginTop: 3 }}>{formatCurrency(task.totalCost)}</div>
                            </div>
                            <div style={{ fontSize: 12, color: C.muted }}>
                              Finished
                              <div style={{ color: C.text, fontSize: 13, marginTop: 3 }}>{formatShortDate(task.dateFinished)}</div>
                            </div>
                            <div style={{ fontSize: 12, color: C.muted }}>
                              Transcript
                              <div style={{ color: C.text, fontSize: 13, marginTop: 3 }}>{formatBytes(task.sizeBytes)}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : renderEmptyState(activeTab === "blocked-queue" ? "No blocked sessions right now." : "No sessions match the current selection.")
          )}
        </div>
      </Card>
    </div>
  );
};

export default Tasks;
