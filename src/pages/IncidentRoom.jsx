import { useState } from "react";
import { Badge, Card, KPI } from "../components/shared";
import { C } from "../data/constants";
import { useMissionControlData } from "../context/MissionControlDataContext";
import { getApiUrl } from "../utils/api";
import { fmtDate, fmtDuration } from "../utils/format";

const SEVERITY = { P1: C.red, P2: C.amber, P3: C.cyan, P4: C.muted };
const STATUS_COLORS = { open: C.red, investigating: C.amber, resolved: C.green, monitoring: C.cyan };

// Sample incidents derived from cron errors and system state
function deriveIncidents(cronJobs, acpSessions) {
  const incidents = [];
  const now = Date.now();
  cronJobs.forEach(j => {
    if (j.consecutiveErrors > 0 || j.lastStatus === "error") {
      incidents.push({
        id: `cron-${j.name}`, severity: j.consecutiveErrors > 2 ? "P2" : "P3",
        title: `Cron job failing: ${j.name}`, status: "open",
        affected: `Cron: ${j.name}`, responder: "main",
        startTime: new Date(now - 3600000).toISOString(),
        description: `${j.consecutiveErrors} consecutive errors. Last status: ${j.lastStatus}`,
      });
    }
  });
  const blocked = acpSessions.filter(s => s.status === "blocked");
  blocked.forEach(s => {
    incidents.push({
      id: `blocked-${s.id}`, severity: "P3",
      title: `Task blocked: ${(s.task||"").slice(0,50)}`, status: "open",
      affected: `Task: ${s.id}`, responder: s.agent || "main",
      startTime: s.dateCreated, description: s.description || "Task is blocked",
    });
  });
  return incidents;
}

const RUNBOOKS = [
  { id: "rb1", name: "Agent Crash Recovery", steps: ["Check agent process status", "Review last session logs", "Restart agent via openclaw agent", "Verify health", "Update Mission Control"] },
  { id: "rb2", name: "Gateway Connection Lost", steps: ["Check gateway health endpoint", "Verify LaunchAgent running", "Restart via launchctl", "Check worker tunnel", "Confirm Discord/Telegram connected"] },
  { id: "rb3", name: "Cron Job Failure", steps: ["Check cron job logs", "Verify delivery channel configured", "Trigger manual run", "Check for rate limits", "Reset error count"] },
  { id: "rb4", name: "API Rate Limit", steps: ["Identify which API", "Check current usage", "Pause non-critical requests", "Wait for cooldown", "Resume with backoff"] },
];

const IncidentRoom = () => {
  const { cronJobs = [], acpSessions = [] } = useMissionControlData();
  const [selectedRunbook, setSelectedRunbook] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSeverity, setNewSeverity] = useState("P3");
  const [createResult, setCreateResult] = useState(null);

  const incidents = deriveIncidents(cronJobs, acpSessions);
  const open = incidents.filter(i => i.status === "open").length;
  const p1p2 = incidents.filter(i => i.severity === "P1" || i.severity === "P2").length;

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    try {
      await fetch(`/api/tasks`, { method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({name:`INCIDENT: ${newTitle}`,agent:"main",status:"blocked",priority:"critical",description:`Severity: ${newSeverity}`})});
      setNewTitle(""); setShowCreate(false);
      setCreateResult({ ok: true, msg: "Incident created" }); setTimeout(() => setCreateResult(null), 4000);
    } catch(e) {
      setCreateResult({ ok: false, msg: "Failed to create incident. Try: openclaw agent --agent main" }); setTimeout(() => setCreateResult(null), 5000);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Incident Room</h1>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>Active incidents, runbooks, and war room operations</div>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} style={{ background: C.red, color: "#fff", border: "none", borderRadius: 10, padding: "10px 14px", fontWeight: 600, cursor: "pointer" }}>
          🚨 Declare Incident
        </button>
      </div>

      {showCreate && (
        <Card>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Incident title..." style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13 }} />
            <select value={newSeverity} onChange={e => setNewSeverity(e.target.value)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13 }}>
              <option value="P1">P1 Critical</option><option value="P2">P2 High</option><option value="P3">P3 Medium</option><option value="P4">P4 Low</option>
            </select>
            <button onClick={handleCreate} style={{ background: C.red, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 600, cursor: "pointer" }}>Create</button>
          </div>
        </Card>
      )}

      {createResult && <div style={{ padding: 8, borderRadius: 8, background: createResult.ok ? C.green+"22" : C.red+"22", color: createResult.ok ? C.green : C.red, fontSize: 12 }}>{createResult.msg}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        <KPI label="Open Incidents" value={open} sub={p1p2 ? `${p1p2} critical/high` : "All low"} color={open > 0 ? C.red : C.green} />
        <KPI label="P1/P2" value={p1p2} sub="Critical + High" color={p1p2 > 0 ? C.red : C.green} />
        <KPI label="Runbooks" value={RUNBOOKS.length} sub="Response procedures" color={C.cyan} />
      </div>

      {/* Active Incidents */}
      <Card>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Active Incidents</div>
        {incidents.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {incidents.map(inc => (
              <div key={inc.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 12, borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`, borderLeft: `3px solid ${SEVERITY[inc.severity] || C.muted}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Badge color={SEVERITY[inc.severity]}>{inc.severity}</Badge>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{inc.title}</span>
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{inc.description}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Affected: {inc.affected} · Responder: {inc.responder} · Since: {fmtDate(inc.startTime)}</div>
                </div>
                <Badge color={STATUS_COLORS[inc.status] || C.cyan}>{inc.status}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: 20, textAlign: "center", color: C.green, fontSize: 14 }}>✅ No active incidents — all systems operational</div>
        )}
      </Card>

      {/* Runbooks */}
      <Card>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Runbooks</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 8 }}>
          {RUNBOOKS.map(rb => (
            <div key={rb.id} onClick={() => setSelectedRunbook(selectedRunbook?.id === rb.id ? null : rb)} style={{ padding: 12, borderRadius: 8, background: selectedRunbook?.id === rb.id ? C.accent + "22" : C.surface, border: `1px solid ${selectedRunbook?.id === rb.id ? C.accent : C.border}`, cursor: "pointer" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>📋 {rb.name}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{rb.steps.length} steps</div>
              {selectedRunbook?.id === rb.id && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
                  {rb.steps.map((step, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", fontSize: 12, color: C.text }}>
                      <span style={{ color: C.muted, fontWeight: 600, minWidth: 20 }}>{i+1}.</span> {step}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default IncidentRoom;
