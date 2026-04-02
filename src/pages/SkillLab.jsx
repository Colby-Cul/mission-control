import { useState } from 'react';
import { Badge, Card, KPI } from '../components/shared';
import { C } from '../data/constants';
import { useMissionControlData } from '../context/MissionControlDataContext';

const MC_API = () => localStorage.getItem("mc-api-url") || "http://localhost:7070";

const SkillLab = () => {
  const { skills = [], refresh } = useMissionControlData();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshResult(null);
    try {
      const resp = await fetch(`${MC_API()}/sync`, { method: "POST" });
      const data = await resp.json();
      setRefreshResult(data.ok ? { ok: true, msg: `Synced — rescanning skills directory` } : { ok: false, msg: data.error });
      setTimeout(() => refresh(), 1500);
    } catch (e) {
      setRefreshResult({ ok: false, msg: `Run: bash ~/.openclaw/scripts/mc-sync.sh refresh` });
    }
    setRefreshing(false);
    setTimeout(() => setRefreshResult(null), 5000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Skill Lab</h1>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>Installed OpenClaw skills and capabilities — scanned from ~/.openclaw/skills/</div>
        </div>
        <button onClick={handleRefresh} disabled={refreshing} style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 10, padding: "10px 14px", fontWeight: 600, cursor: "pointer", opacity: refreshing ? 0.5 : 1 }}>
          {refreshing ? "Refreshing..." : "🔄 Refresh Skills"}
        </button>
      </div>

      {refreshResult && (
        <div style={{ padding: 10, borderRadius: 8, background: refreshResult.ok ? C.green+"22" : C.red+"22", color: refreshResult.ok ? C.green : C.red, fontSize: 12 }}>
          {refreshResult.msg}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        <KPI label="Installed Skills" value={skills.length} sub="Active in runtime" color={C.accent} />
        <KPI label="Unique" value={skills.length} sub="Deduplicated by name" color={C.cyan} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
        {skills.map(s => (
          <Card key={s.id}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{s.name}</div>
              <Badge color={C.green}>installed</Badge>
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 6, fontFamily: "monospace" }}>~/.openclaw/skills/{s.id}/</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>ID: {s.id}</div>
          </Card>
        ))}
      </div>

      {!skills.length && (
        <Card><div style={{ padding: 20, textAlign: "center", color: C.muted }}>No skills found. Click Refresh to rescan.</div></Card>
      )}
    </div>
  );
};
export default SkillLab;
