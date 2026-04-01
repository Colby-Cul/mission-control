import { useState } from "react";
import { Avatar, Badge, Card, KPI, ProgressBar } from "../components/shared";
import { AGENTS, C } from "../data/constants";
import { useMissionControlData } from "../context/MissionControlDataContext";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatUsd = (value) => (typeof value === "number" ? usd.format(value) : "—");

const formatModelLabel = (model) =>
  String(model || "")
    .replace(/^openai\//, "")
    .replace(/^anthropic\//, "")
    .replace(/^google\//, "");

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

const Projects = () => {
  const { projects, refresh } = useMissionControlData();
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  const totalTasks = projects.reduce((sum, p) => sum + (p.taskCount || 0), 0);
  const totalDone = projects.reduce((sum, p) => sum + (p.doneCount || 0), 0);
  const totalActive = projects.reduce((sum, p) => sum + (p.activeCount || 0), 0);
  const totalCost = projects.reduce((sum, p) => sum + (p.totalCost || 0), 0);
  const totalEstCost = projects.reduce((sum, p) => sum + (p.estCostToCompletion || 0), 0);
  const activeProjects = projects.filter((p) => p.status === "active").length;

  const handleNewProject = () => {
    if (!newProjectName.trim()) return;
    alert(`Run: openclaw agent --agent main --message "Create a new project: ${newProjectName}"`);
    setNewProjectName("");
    setShowNewProject(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Projects</h1>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>
            Real project data derived from OpenClaw runtime — {projects.length} active projects.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowNewProject(!showNewProject)}
            style={{ background: C.green, color: "#fff", border: "none", borderRadius: 10, padding: "10px 14px", fontWeight: 600, cursor: "pointer" }}>
            + New Project
          </button>
          <button onClick={refresh}
            style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 10, padding: "10px 14px", fontWeight: 600, cursor: "pointer" }}>
            Refresh
          </button>
        </div>
      </div>

      {showNewProject && (
        <Card>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="Project name..."
              style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 13 }} />
            <button onClick={handleNewProject}
              style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 600, cursor: "pointer" }}>
              Create
            </button>
          </div>
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <KPI label="Project Lanes" value={projects.length || "—"} sub="Active OpenClaw projects" color={C.accent} />
        <KPI label="Total Tasks" value={totalTasks || "—"} sub={`${totalDone} completed`} color={C.cyan} />
        <KPI label="Active Work" value={totalActive || "—"} sub="In-progress delegations" color={C.amber} />
        <KPI label="Project Spend" value={formatUsd(totalCost)} sub={activeProjects ? `${formatUsd(totalEstCost)} to complete active work` : "No active completion estimate"} color={C.green} />
        <KPI label="Critical Items" value={projects.filter(p => p.status === "blocked").length || "0"} sub="Blocked projects" color={C.red} />
      </div>

      <Card>
        {projects.length ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
            {projects.map((project) => {
              const progress = project.taskCount > 0 ? Math.round((project.doneCount / project.taskCount) * 100) : 0;
              const workedAgents = (project.agentsWorkedOn || project.agents || []).map((agentId) => (
                AGENTS.find((agent) => agent.id === agentId) || avatarFallback(agentId)
              ));
              return (
                <div key={project.id} style={{ padding: 16, borderRadius: 12, background: C.surface, border: `1px solid ${C.border}` }}>
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
                          {formatUsd(project.estCostToCompletion)}
                        </div>
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                          {project.estTimeToCompletion || "No ETA"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>Models</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {(project.modelsUsed || []).length ? (
                        project.modelsUsed.map((model) => (
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
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>Agents Worked On</div>
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
              );
            })}
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: "center", color: C.muted }}>
            No projects found. Run generate-live-data.sh to scan OpenClaw runtime state.
          </div>
        )}
      </Card>
    </div>
  );
};

export default Projects;
