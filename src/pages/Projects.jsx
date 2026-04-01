import { useState } from "react";
import { Badge, Card, KPI } from "../components/shared";
import { C } from "../data/constants";
import { useMissionControlData } from "../context/MissionControlDataContext";

const Projects = () => {
  const { projects, acpSessions, refresh } = useMissionControlData();
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  const totalTasks = projects.reduce((sum, p) => sum + (p.taskCount || 0), 0);
  const totalDone = projects.reduce((sum, p) => sum + (p.doneCount || 0), 0);
  const totalActive = projects.reduce((sum, p) => sum + (p.activeCount || 0), 0);

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
        <KPI label="Critical Items" value={projects.filter(p => p.status === "blocked").length || "0"} sub="Blocked projects" color={C.red} />
      </div>

      <Card>
        {projects.length ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
            {projects.map((project) => {
              const progress = project.taskCount > 0 ? Math.round((project.doneCount / project.taskCount) * 100) : 0;
              return (
                <div key={project.id} style={{ padding: 16, borderRadius: 12, background: C.surface, border: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{project.name}</div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                        Agents: {(project.agents || []).join(", ")}
                      </div>
                    </div>
                    <Badge color={project.status === "active" ? C.green : project.status === "blocked" ? C.red : C.cyan}>
                      {project.status}
                    </Badge>
                  </div>

                  {/* Progress bar */}
                  <div style={{ marginTop: 12, background: C.card, borderRadius: 4, height: 6, overflow: "hidden" }}>
                    <div style={{ width: `${progress}%`, height: "100%", background: C.green, borderRadius: 4, transition: "width 0.3s" }} />
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
