import { Badge, Card, KPI } from '../components/shared';
import { C } from '../data/constants';
import { useMissionControlData } from '../context/MissionControlDataContext';

const SkillLab = () => {
  const { skills } = useMissionControlData();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Skill Lab</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <KPI label="Installed Skills" value={skills.length || "--"} sub="From bundled or live OpenClaw inventory" color={C.accent} />
      </div>
      <Card>
        {skills.length ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
            {skills.map((skill) => (
              <div key={skill.id} style={{ padding: 16, borderRadius: 12, background: C.surface, border: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{skill.name}</div>
                  <Badge color={C.cyan}>{skill.version}</Badge>
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>{skill.path || "No path metadata"}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: "center", color: C.muted }}>
            No skill inventory available in the current snapshot.
          </div>
        )}
      </Card>
    </div>
  );
};

export default SkillLab;
