import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Avatar, Badge, Card, KPI, ProgressBar } from "../components/shared";
import { AGENTS, C } from "../data/constants";
import { useMissionControlData } from "../context/MissionControlDataContext";
import { getApiUrl } from "../utils/api";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatUsd = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? usd.format(amount) : "—";
};

const formatModelLabel = (model) =>
  String(model || "")
    .replace(/^openai\//, "")
    .replace(/^anthropic\//, "")
    .replace(/^google\//, "");

const formatDateLabel = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const avatarFallback = (agentId) => {
  const label = String(agentId || "agent");
  return {
    id: label,
    name: label,
    initials: label
      .split(/[-_\s]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "AG",
    color: C.cyan,
    ring: C.accentLight,
    status: "active",
  };
};

const laneDefinitions = [
  { key: "todo", label: "To Do", color: C.cyan },
  { key: "inprogress", label: "In Progress", color: C.amber },
  { key: "blocked", label: "Blocked", color: C.red },
  { key: "done", label: "Done", color: C.green },
];

function normalizeLane(status) {
  const value = String(status || "").toLowerCase();
  if (["done", "complete", "completed", "success"].includes(value)) return "done";
  if (["blocked", "failed", "error", "stalled"].includes(value)) return "blocked";
  if (["delegated", "working", "running", "busy", "active", "pending", "in progress", "in_progress"].includes(value)) return "inprogress";
  return "todo";
}

function buildGanttRows(sessions) {
  const dated = sessions
    .map((session) => {
      const start = new Date(session.startTime || session.dateCreated || session.lastModified || 0).getTime();
      const end = new Date(session.endTime || session.dateFinished || session.lastModified || session.startTime || 0).getTime();
      return {
        ...session,
        start: Number.isFinite(start) && start > 0 ? start : null,
        end: Number.isFinite(end) && end > 0 ? end : Number.isFinite(start) && start > 0 ? start : null,
      };
    })
    .filter((session) => session.start && session.end)
    .sort((left, right) => left.start - right.start);

  if (!dated.length) {
    return { rows: [], span: 1 };
  }

  const minStart = Math.min(...dated.map((session) => session.start));
  const maxEnd = Math.max(...dated.map((session) => session.end));
  const span = Math.max(maxEnd - minStart, 60 * 60 * 1000);
  const rows = dated.map((session) => ({
    ...session,
    offset: ((session.start - minStart) / span) * 100,
    width: Math.max(((Math.max(session.end - session.start, 30 * 60 * 1000)) / span) * 100, 3),
  }));

  return { rows, span };
}

const Projects = () => {
  const { projects, refresh } = useMissionControlData();
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [newProjectAgent, setNewProjectAgent] = useState("main");
  const [newProjectPriority, setNewProjectPriority] = useState("normal");
  const [projectSubmitting, setProjectSubmitting] = useState(false);
  const [projectResult, setProjectResult] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedProjectId = searchParams.get("project") || "";
  const selectedView = searchParams.get("view") || "kanban";
  const selectedProject = projects.find((project) => project.id === selectedProjectId) || null;

  const activeProjects = projects.filter((p) => p.status !== "archived");
  const archivedProjects = projects.filter((p) => p.status === "archived");
  const [showArchived, setShowArchived] = useState(false);

  const totalTasks = activeProjects.reduce((sum, p) => sum + (p.taskCount || 0), 0);
  const totalDone = activeProjects.reduce((sum, p) => sum + (p.doneCount || 0), 0);
  const totalActive = activeProjects.reduce((sum, p) => sum + (p.activeCount || 0), 0);
  const totalCost = activeProjects.reduce((sum, p) => sum + (p.totalCost || 0), 0);
  const totalEstCost = activeProjects.reduce((sum, p) => sum + (p.estimatedCostToCompletion || 0), 0);
  const activeProjectCount = activeProjects.filter((p) => p.status === "active").length;

  const handleSelectProject = (projectId, view = "kanban") => {
    const next = new URLSearchParams(searchParams);
    next.set("project", projectId);
    next.set("view", view);
    setSearchParams(next);
  };

  const clearSelection = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("project");
    next.delete("view");
    setSearchParams(next);
  };

  const handleViewChange = (view) => {
    if (!selectedProjectId) return;
    const next = new URLSearchParams(searchParams);
    next.set("project", selectedProjectId);
    next.set("view", view);
    setSearchParams(next);
  };

  const handleNewProject = async () => {
    if (!newProjectName.trim()) return;
    setProjectSubmitting(true);
    setProjectResult(null);
    try {
      const resp = await fetch(`/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProjectName,
          description: newProjectDesc,
          agents: [newProjectAgent],
          priority: newProjectPriority,
          status: "active",
        }),
      });
      const data = await resp.json();
      if (data.ok) {
        setProjectResult({ ok: true, message: `Project "${newProjectName}" created and synced.` });
        setNewProjectName("");
        setNewProjectDesc("");
        setTimeout(() => refresh(), 1000);
      } else {
        setProjectResult({ ok: false, message: `Error: ${data.error}` });
      }
    } catch {
      setProjectResult({ ok: false, message: `API unreachable. Run: openclaw agent --agent main --message "Create project: ${newProjectName}"` });
    }
    setProjectSubmitting(false);
  };

  const detail = useMemo(() => {
    if (!selectedProject) return null;
    const sessions = Array.isArray(selectedProject.sessions) ? selectedProject.sessions : [];
    const grouped = laneDefinitions.reduce((acc, lane) => {
      acc[lane.key] = sessions.filter((session) => normalizeLane(session.status) === lane.key);
      return acc;
    }, {});
    const gantt = buildGanttRows(sessions);
    return { sessions, grouped, gantt };
  }, [selectedProject]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Projects</h1>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>
            Real project data derived from OpenClaw runtime — {activeProjects.length} active projects{archivedProjects.length > 0 ? `, ${archivedProjects.length} archived` : ""}.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setShowNewProject(!showNewProject)}
            style={{ background: C.green, color: "#fff", border: "none", borderRadius: 10, padding: "10px 14px", fontWeight: 600, cursor: "pointer" }}
          >
            + New Project
          </button>
          <button
            onClick={refresh}
            style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 10, padding: "10px 14px", fontWeight: 600, cursor: "pointer" }}
          >
            Refresh
          </button>
        </div>
      </div>

      {showNewProject && (
        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>New Project</div>
            <input
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Project name (required)"
              style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 13 }}
            />
            <textarea
              value={newProjectDesc}
              onChange={(e) => setNewProjectDesc(e.target.value)}
              placeholder="Description (required)"
              rows={2}
              style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 13, resize: "vertical" }}
            />
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <select
                value={newProjectAgent}
                onChange={(e) => setNewProjectAgent(e.target.value)}
                style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 13 }}
              >
                <option value="main">Jarvis (main)</option>
                <option value="worker">Worker</option>
                <option value="validation">Validator</option>
                <option value="executive-assistant">Victoria</option>
              </select>
              <select
                value={newProjectPriority}
                onChange={(e) => setNewProjectPriority(e.target.value)}
                style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 13 }}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              <button
                onClick={handleNewProject}
                disabled={projectSubmitting || !newProjectName.trim()}
                style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 600, cursor: "pointer", opacity: projectSubmitting ? 0.5 : 1 }}
              >
                {projectSubmitting ? "Creating..." : "Create Project"}
              </button>
            </div>
            {projectResult && (
              <div style={{ padding: 12, borderRadius: 8, background: projectResult.ok ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${projectResult.ok ? C.green : C.red}`, color: C.text, fontSize: 12, fontFamily: "monospace" }}>
                {projectResult.message}
              </div>
            )}
          </div>
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <KPI label="Project Lanes" value={projects.length || "—"} sub="Active OpenClaw projects" color={C.accent} />
        <KPI label="Total Tasks" value={totalTasks || "—"} sub={`${totalDone} completed`} color={C.cyan} />
        <KPI label="Active Work" value={totalActive || "—"} sub="In-progress delegations" color={C.amber} />
        <KPI label="Project Spend" value={formatUsd(totalCost)} sub={activeProjects ? `${formatUsd(totalEstCost)} to complete active work` : "No active completion estimate"} color={C.green} />
        <KPI label="Critical Items" value={activeProjects.filter((p) => p.status === "blocked").length || "0"} sub="Blocked projects" color={C.red} />
      </div>

      {selectedProject && detail ? (
        <>
          <button
            onClick={clearSelection}
            style={{ alignSelf: "flex-start", background: "transparent", border: "none", color: C.accent, padding: 0, cursor: "pointer", fontSize: 13 }}
          >
            ← Back to all projects
          </button>

          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: C.text }}>{selectedProject.name}</div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>
                  {detail.sessions.length} associated tasks · {formatUsd(selectedProject.totalCost)} spend to date
                </div>
              </div>
              <Badge color={selectedProject.status === "active" ? C.green : selectedProject.status === "blocked" ? C.red : C.cyan}>
                {selectedProject.status}
              </Badge>
            </div>

            <div style={{ marginTop: 14 }}>
              <ProgressBar
                value={selectedProject.taskCount > 0 ? Math.round((selectedProject.doneCount / selectedProject.taskCount) * 100) : 0}
                color={selectedProject.status === "done" ? C.cyan : C.green}
                height={8}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginTop: 16 }}>
              <KPI label="Total Tasks" value={selectedProject.taskCount || detail.sessions.length || "—"} color={C.cyan} />
              <KPI label="Completed" value={selectedProject.doneCount || "0"} color={C.green} />
              <KPI label="In Progress" value={selectedProject.activeCount || "0"} color={C.amber} />
              <KPI label="Models" value={selectedProject.apiModelsUsed?.length || selectedProject.modelsUsed?.length || "0"} color={C.purple} />
              <KPI label="ETA" value={selectedProject.estimatedTimeToCompletion || "—"} color={C.teal} />
            </div>
          </Card>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["kanban", "gantt", "tasks"].map((view) => (
              <button
                key={view}
                onClick={() => handleViewChange(view)}
                style={{
                  background: selectedView === view ? C.accent : C.surface,
                  color: selectedView === view ? "#fff" : C.muted,
                  border: `1px solid ${selectedView === view ? C.accent : C.border}`,
                  borderRadius: 10,
                  padding: "8px 14px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </button>
            ))}
          </div>

          {selectedView === "kanban" && (
            <Card>
              {detail.sessions.length ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, alignItems: "start" }}>
                  {laneDefinitions.map((lane) => (
                    <div key={lane.key} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 12, minHeight: 220 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <div style={{ color: lane.color, fontSize: 13, fontWeight: 700 }}>{lane.label}</div>
                        <div style={{ color: C.muted, fontSize: 12 }}>{detail.grouped[lane.key].length}</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {detail.grouped[lane.key].length ? detail.grouped[lane.key].map((session) => (
                          <div key={session.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12 }}>
                            <div style={{ fontSize: 13, color: C.text, fontWeight: 600, lineHeight: 1.4 }}>{session.task}</div>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                              <Badge color={session.agent === "codex" ? C.purple : C.accent}>{session.agent}</Badge>
                              <Badge color={lane.color}>{session.status}</Badge>
                            </div>
                            <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>
                              {formatModelLabel(session.model)} · {formatUsd(session.totalCost)}
                            </div>
                          </div>
                        )) : (
                          <div style={{ color: C.muted, fontSize: 12 }}>No tasks in this lane.</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: C.muted, fontSize: 13 }}>No sessions are associated with this project yet.</div>
              )}
            </Card>
          )}

          {selectedView === "gantt" && (
            <Card>
              {detail.gantt.rows.length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {detail.gantt.rows.map((session) => (
                    <div key={session.id} style={{ display: "grid", gridTemplateColumns: "280px minmax(0, 1fr)", gap: 12, alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 13, color: C.text, fontWeight: 600, lineHeight: 1.4 }}>{session.task}</div>
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                          {formatDateLabel(session.startTime || session.dateCreated)} → {formatDateLabel(session.endTime || session.dateFinished)}
                        </div>
                      </div>
                      <div style={{ position: "relative", height: 32, borderRadius: 999, background: C.surface, border: `1px solid ${C.border}` }}>
                        <div
                          style={{
                            position: "absolute",
                            left: `${session.offset}%`,
                            width: `${session.width}%`,
                            top: 5,
                            bottom: 5,
                            minWidth: 10,
                            borderRadius: 999,
                            background: normalizeLane(session.status) === "done" ? C.green : normalizeLane(session.status) === "blocked" ? C.red : C.accent,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: C.muted, fontSize: 13 }}>Not enough timing data is available to render a Gantt view for this project.</div>
              )}
            </Card>
          )}

          {selectedView === "tasks" && (
            <Card>
              {detail.sessions.length ? (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
                    <thead>
                      <tr style={{ textAlign: "left", borderBottom: `1px solid ${C.border}` }}>
                        {["Task", "Agent", "Status", "Model", "Tokens", "Cost", "Finished"].map((label) => (
                          <th key={label} style={{ padding: "12px 10px", fontSize: 12, color: C.muted, fontWeight: 600 }}>{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {detail.sessions.map((session) => (
                        <tr key={session.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={{ padding: "14px 10px", fontSize: 13, color: C.text, fontWeight: 600 }}>{session.task}</td>
                          <td style={{ padding: "14px 10px" }}>
                            <Badge color={session.agent === "codex" ? C.purple : C.accent}>{session.agent}</Badge>
                          </td>
                          <td style={{ padding: "14px 10px" }}>
                            <Badge color={normalizeLane(session.status) === "done" ? C.green : normalizeLane(session.status) === "blocked" ? C.red : C.amber}>
                              {session.status}
                            </Badge>
                          </td>
                          <td style={{ padding: "14px 10px", fontSize: 13, color: C.text }}>{formatModelLabel(session.model)}</td>
                          <td style={{ padding: "14px 10px", fontSize: 13, color: C.text }}>{Number(session.tokens || 0).toLocaleString("en-US")}</td>
                          <td style={{ padding: "14px 10px", fontSize: 13, color: C.text }}>{formatUsd(session.totalCost)}</td>
                          <td style={{ padding: "14px 10px", fontSize: 13, color: C.text }}>{formatDateLabel(session.endTime || session.dateFinished || session.lastModified)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ color: C.muted, fontSize: 13 }}>No tasks are associated with this project yet.</div>
              )}
            </Card>
          )}
        </>
      ) : (
        <Card>
          {activeProjects.length ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
              {activeProjects.map((project) => {
                const progress = project.taskCount > 0 ? Math.round((project.doneCount / project.taskCount) * 100) : 0;
                const workedAgents = (project.agentsWorkedOn || project.agents || []).map((agentId) => (
                  AGENTS.find((agent) => agent.id === agentId) || avatarFallback(agentId)
                ));
                return (
                  <button
                    key={project.id}
                    onClick={() => handleSelectProject(project.id)}
                    style={{ padding: 0, border: "none", background: "transparent", textAlign: "left", cursor: "pointer" }}
                  >
                    <div style={{ padding: 16, borderRadius: 12, background: C.surface, border: `1px solid ${C.border}`, height: "100%" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{project.name}</div>
                          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                            {project.activeCount > 0 ? `${project.activeCount} active tasks in flight` : "No active tasks"}
                          </div>
                        </div>
                        <Badge color={project.status === "active" ? C.green : project.status === "blocked" ? C.red : C.cyan}>
                          {project.status}
                        </Badge>
                      </div>

                      <div style={{ marginTop: 12 }}>
                        <ProgressBar value={progress} color={project.status === "done" ? C.cyan : C.green} height={8} />
                      </div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{progress}% complete</div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, marginTop: 12 }}>
                        <div>
                          <div style={{ fontSize: 12, color: C.muted }}>Total</div>
                          <div style={{ fontSize: 18, color: C.text, fontWeight: 700 }}>{project.taskCount}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 12, color: C.muted }}>Done</div>
                          <div style={{ fontSize: 18, color: C.green, fontWeight: 700 }}>{project.doneCount}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 12, color: C.muted }}>Active</div>
                          <div style={{ fontSize: 18, color: C.amber, fontWeight: 700 }}>{project.activeCount}</div>
                        </div>
                      </div>

                      <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: C.card, border: `1px solid ${C.border}` }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                          <div>
                            <div style={{ fontSize: 11, color: C.muted }}>Spend to date</div>
                            <div style={{ fontSize: 20, color: C.text, fontWeight: 700 }}>{formatUsd(project.totalCost)}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 11, color: C.muted }}>Est. to completion</div>
                            <div style={{ fontSize: 16, color: C.green, fontWeight: 700 }}>
                              {formatUsd(project.estimatedCostToCompletion)}
                            </div>
                            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                              {project.estimatedTimeToCompletion || "No ETA"}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div style={{ marginTop: 14 }}>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>Models</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {(project.apiModelsUsed || project.modelsUsed || []).length ? (
                            (project.apiModelsUsed || project.modelsUsed || []).map((model) => (
                              <Badge key={model} color={model.includes("mini") ? C.cyan : model.includes("runtime") ? C.amber : C.purple}>
                                {formatModelLabel(model)}
                              </Badge>
                            ))
                          ) : (
                            <Badge color={C.border}>No models reported</Badge>
                          )}
                        </div>
                      </div>

                      <div style={{ marginTop: 14 }}>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>Agents That Worked On It</div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                          <div style={{ display: "flex", alignItems: "center" }}>
                            {workedAgents.length ? (
                              workedAgents.map((agent, index) => (
                                <div key={`${project.id}-${agent.id}`} style={{ marginLeft: index === 0 ? 0 : -8 }}>
                                  <Avatar agent={agent} size={30} />
                                </div>
                              ))
                            ) : (
                              <div style={{ fontSize: 12, color: C.muted }}>No agents reported</div>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: C.muted, textAlign: "right" }}>
                            {workedAgents.map((agent) => agent.name).join(", ") || "—"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: "center", color: C.muted }}>
              No projects found. Run generate-live-data.sh to scan OpenClaw runtime state.
            </div>
          )}

          {archivedProjects.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <button
                onClick={() => setShowArchived(!showArchived)}
                style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 14px", color: C.muted, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
              >
                {showArchived ? "▼" : "▶"} Archived ({archivedProjects.length})
              </button>
              {showArchived && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, marginTop: 12, opacity: 0.6 }}>
                  {archivedProjects.map((project) => {
                    const progress = project.taskCount > 0 ? Math.round((project.doneCount / project.taskCount) * 100) : 0;
                    const workedAgents = (project.agentsWorkedOn || project.agents || []).map((agentId) => (
                      AGENTS.find((agent) => agent.id === agentId) || avatarFallback(agentId)
                    ));
                    return (
                      <button
                        key={project.id}
                        onClick={() => handleSelectProject(project.id)}
                        style={{ padding: 0, border: "none", background: "transparent", textAlign: "left", cursor: "pointer" }}
                      >
                        <div style={{ padding: 16, borderRadius: 12, background: C.surface, border: `1px solid ${C.border}`, height: "100%" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 600, color: C.muted }}>{project.name}</div>
                              <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Archived</div>
                            </div>
                            <Badge color={C.muted}>archived</Badge>
                          </div>
                          <div style={{ marginTop: 12 }}>
                            <ProgressBar value={progress} color={C.muted} height={8} />
                          </div>
                          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{progress}% complete · {formatUsd(project.totalCost)} spent</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default Projects;
