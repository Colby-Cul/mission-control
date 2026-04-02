import { useState } from 'react';
import { Badge, Card, KPI } from '../components/shared';
import { C } from '../data/constants';
import { useMissionControlData } from '../context/MissionControlDataContext';

function fmtDate(v) { if (!v) return "—"; const d = new Date(v); return isNaN(d) ? "—" : d.toLocaleString("en-US", { month:"short", day:"numeric", hour:"numeric", minute:"2-digit" }); }
function fmtBytes(v) { const n = Number(v); return n < 1024 ? `${n} B` : n < 1048576 ? `${(n/1024).toFixed(1)} KB` : `${(n/1048576).toFixed(1)} MB`; }
function fmtTokens(v) { const n = Number(v); return n >= 1e6 ? `${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `${(n/1e3).toFixed(1)}K` : String(n); }

const Sessions = () => {
  const { acpSessions = [], refresh } = useMissionControlData();
  const [selected, setSelected] = useState(null);
  const totalBytes = acpSessions.reduce((s, t) => s + (t.sizeBytes || 0), 0);
  const totalTokens = acpSessions.reduce((s, t) => s + (t.tokens || 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Sessions</h1>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>{acpSessions.length} ACP session transcripts</div>
        </div>
        <button onClick={refresh} style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 10, padding: "10px 14px", fontWeight: 600, cursor: "pointer" }}>Refresh</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <KPI label="Sessions" value={acpSessions.length} sub="Total transcripts" color={C.accent} />
        <KPI label="Storage" value={fmtBytes(totalBytes)} sub="Transcript size" color={C.cyan} />
        <KPI label="Tokens" value={fmtTokens(totalTokens)} sub="Total processed" color={C.purple} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1fr" : "1fr", gap: 12 }}>
        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {acpSessions.slice(0, 25).map(s => (
              <button key={s.sessionId || s.id} onClick={() => setSelected(s)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 8, background: selected?.sessionId === s.sessionId ? C.accent + "22" : C.surface, border: `1px solid ${selected?.sessionId === s.sessionId ? C.accent : C.border}`, cursor: "pointer", textAlign: "left", color: C.text, fontSize: 13 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(s.task || "Session").slice(0, 50)}</div>
                  <div style={{ fontSize: 11, color: C.muted, fontFamily: "monospace" }}>{(s.sessionId || s.id || "").slice(0, 16)}</div>
                </div>
                <Badge color={s.status === "done" ? C.green : s.status === "delegated" ? C.amber : C.cyan}>{s.status}</Badge>
              </button>
            ))}
          </div>
        </Card>
        {selected && (
          <Card>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Session Detail</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                ["Task", selected.task],
                ["Session ID", selected.sessionId],
                ["Agent", selected.agent],
                ["Status", selected.status],
                ["Model", selected.model],
                ["Tokens", fmtTokens(selected.tokens)],
                ["Cost", `$${(selected.totalCost || 0).toFixed(4)}`],
                ["Size", fmtBytes(selected.sizeBytes)],
                ["Created", fmtDate(selected.dateCreated)],
                ["Finished", fmtDate(selected.dateFinished)],
                ["Transcript", selected.transcriptPath],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 12, color: C.muted }}>{label}</span>
                  <span style={{ fontSize: 12, color: C.text, textAlign: "right", maxWidth: "60%", wordBreak: "break-all" }}>{value || "—"}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
export default Sessions;
