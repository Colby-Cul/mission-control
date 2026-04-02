import { Card, KPI } from '../components/shared';
import { C } from '../data/constants';
import { useMissionControlData } from '../context/MissionControlDataContext';

const SkillLab = () => {
  const { skills = [] } = useMissionControlData();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Skill Lab</h1>
      <div style={{ fontSize: 13, color: C.muted }}>Installed OpenClaw skills and capabilities</div>
      <KPI label="Installed Skills" value={skills.length} sub="Active in runtime" color={C.accent} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        {skills.map(s => (
          <Card key={s.id}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{s.name}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4, fontFamily: "monospace" }}>~/.openclaw/skills/{s.id}/</div>
          </Card>
        ))}
      </div>
    </div>
  );
};
export default SkillLab;
