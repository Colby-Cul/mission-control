import { Badge, Card, KPI } from "../components/shared";
import { C } from "../data/constants";
import { useMissionControlData } from "../context/MissionControlDataContext";
import { priorityColor, statusColor } from "./liveViewUtils";

const Projects = () => {
  const { mondayItems, metrics } = useMissionControlData();
  const groupedProjects = Array.from(
    mondayItems.reduce((map, item) => {
      const key = `${item.boardName}:${item.group}`;
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          name: item.group,
          boardName: item.boardName,
          total: 0,
          completed: 0,
          owners: new Set(),
          critical: 0,
          active: 0
        });
      }
      const entry = map.get(key);
      entry.total += 1;
      entry.owners.add(item.owner);
      if (["done", "complete", "completed"].includes(item.status)) {
        entry.completed += 1;
      } else {
        entry.active += 1;
      }
      if (item.priority === "critical" || item.priority === "high") {
        entry.critical += 1;
      }
      return map;
    }, new Map()).values()
  ).map((entry) => ({
    ...entry,
    owners: entry.owners.size
  })).sort((left, right) => right.active - left.active || right.critical - left.critical);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Projects</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <KPI label="Project Lanes" value={groupedProjects.length || "--"} sub={mondayItems.length ? "Derived from Monday groups" : "Waiting for Monday data"} color={C.accent} />
        <KPI label="Active Work" value={metrics.activeTasks || "--"} sub={`${metrics.completedTasks} tasks complete`} color={C.cyan} />
        <KPI label="Critical Items" value={mondayItems.filter((item) => item.priority === "critical").length || "--"} sub="High-signal backlog items" color={C.red} />
      </div>
      <Card>
        {groupedProjects.length ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
            {groupedProjects.map((project) => (
              <div key={project.id} style={{ padding: 16, borderRadius: 12, background: C.surface, border: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{project.name}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{project.boardName}</div>
                  </div>
                  <Badge color={statusColor(project.active ? "active" : "completed")}>{project.active ? "active" : "completed"}</Badge>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, marginTop: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, color: C.muted }}>Open items</div>
                    <div style={{ fontSize: 18, color: C.text, fontWeight: 700 }}>{project.active}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: C.muted }}>Completed</div>
                    <div style={{ fontSize: 18, color: C.text, fontWeight: 700 }}>{project.completed}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 12 }}>
                  <span style={{ fontSize: 12, color: C.muted }}>{project.owners} owners</span>
                  <Badge color={priorityColor(project.critical ? "high" : "medium")}>{project.critical} priority items</Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: "center", color: C.muted }}>
            No project lanes available yet. Connect Monday to derive project groupings.
          </div>
        )}
      </Card>
    </div>
  );
};

export default Projects;
