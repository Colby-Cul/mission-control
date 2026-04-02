import { useState } from 'react';
import { Badge, Card, KPI } from '../components/shared';
import { C, AGENTS } from '../data/constants';
import { useMissionControlData } from '../context/MissionControlDataContext';

const SQUADS = [
  { id: "ops", name: "Operations", agents: ["main", "executive-assistant"], color: C.accent },
  { id: "eng", name: "Engineering", agents: ["worker", "validation"], color: C.green },
];

function statusColor(s) {
  const v = String(s || "").toLowerCase();
  if (["online","connected","active","running"].includes(v)) return C.green;
  if (["busy","warning"].includes(v)) return C.amber;
  if (["offline","error"].includes(v)) return C.red;
  return C.cyan;
}

const MC_API = () => localStorage.getItem("mc-api-url") || "http://localhost:7070";

const Team = () => {
  const { agents, acpSessions = [] } = useMissionControlData();
  const [view, setView] = useState("grid"); // grid | org | squads
  const [actionResult, setActionResult] = useState(null);

  const allAgents = AGENTS.map(ca => {
    const live = agents.find(a => a.id === ca.id);
    return { ...ca, ...(live || {}), sessions: live?.sessions || ca.sessions || 0, status: live?.status || "online" };
  });
  const online = allAgents.filter(a => ["online","active","running","busy","connected"].includes(String(a.status).toLowerCase())).length;

  const handleAction = async (agentId, action) => {
    setActionResult(null);
    try {
      const resp = await fetch(`${MC_API()}/task`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `${action} agent ${agentId}`, agent: "main", status: "pending", description: `Agent action: ${action} on ${agentId}` }),
      });
      const data = await resp.json();
      setActionResult({ ok: data.ok, message: data.ok ? `${action} dispatched for ${agentId}` : data.error });
    } catch (e) {
      setActionResult({ ok: false, message: `Run: openclaw agent --agent main --message "${action} agent ${agentId}"` });
    }
    setTimeout(() => setActionResult(null), 5000);
  };

  // Org chart data
  const orgChart = [
    { agent: allAgents.find(a => a.id === "main"), children: allAgents.filter(a => a.id !== "main") }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Team</h1>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>{allAgents.length} agents · {online} online</div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {["grid", "org", "squads"].map(v => (
            <button key={v} onClick={() => setView(v)} style={{ background: view === v ? C.accent : C.surface, color: view === v ? "#fff" : C.muted, border: `1px solid ${view === v ? C.accent : C.border}`, borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              {v === "grid" ? "Grid" : v === "org" ? "Org Chart" : "Squads"}
            </button>
          ))}
        </div>
      </div>

      {actionResult && (
        <div style={{ padding: 10, borderRadius: 8, background: actionResult.ok ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${actionResult.ok ? C.green : C.red}`, color: C.text, fontSize: 12 }}>
          {actionResult.message}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <KPI label="Total Agents" value={allAgents.length} sub="Registered" color={C.accent} />
        <KPI label="Online" value={online} sub={`${allAgents.length - online} idle/offline`} color={C.green} />
        <KPI label="Total Sessions" value={allAgents.reduce((s, a) => s + (a.sessions || 0), 0)} sub="All time" color={C.cyan} />
        <KPI label="Active Tasks" value={acpSessions.filter(s => s.status === "delegated" || s.status === "pending").length} sub="In progress" color={C.amber} />
      </div>

      {/* GRID VIEW */}
      {view === "grid" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
          {allAgents.map(agent => {
            const currentTask = acpSessions.find(s => s.agent === agent.id && s.status !== "done");
            return (
              <Card key={agent.id}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: agent.color || C.accent, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14 }}>
                      {agent.initials || agent.name?.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{agent.name}</div>
                      <div style={{ fontSize: 12, color: C.muted }}>{agent.role || agent.dept || "Agent"}</div>
                    </div>
                  </div>
                  <Badge color={statusColor(agent.status)}>{agent.status}</Badge>
                </div>
                <div style={{ marginTop: 12, fontSize: 12, color: C.muted }}>
                  <div>Model: <span style={{ color: C.text }}>{agent.model}</span></div>
                  <div style={{ marginTop: 4 }}>Sessions: <span style={{ color: C.text }}>{agent.sessions}</span></div>
                  {currentTask && (
                    <div style={{ marginTop: 6, padding: 8, borderRadius: 6, background: C.bg, border: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 11, color: C.amber }}>Current task:</div>
                      <div style={{ fontSize: 12, color: C.text, marginTop: 2 }}>{(currentTask.task || "").slice(0, 60)}</div>
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                  <button onClick={() => handleAction(agent.id, "Reassign")} style={{ flex: 1, background: C.surface, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 0", fontSize: 11, cursor: "pointer" }}>Reassign</button>
                  <button onClick={() => handleAction(agent.id, "Spin up")} style={{ flex: 1, background: C.green + "22", color: C.green, border: `1px solid ${C.green}33`, borderRadius: 6, padding: "6px 0", fontSize: 11, cursor: "pointer" }}>Spin Up</button>
                  <button onClick={() => handleAction(agent.id, "Shut down")} style={{ flex: 1, background: C.red + "22", color: C.red, border: `1px solid ${C.red}33`, borderRadius: 6, padding: "6px 0", fontSize: 11, cursor: "pointer" }}>Shut Down</button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ORG CHART VIEW */}
      {view === "org" && (
        <Card>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
            {orgChart.map(({ agent: lead, children }) => (
              <div key={lead.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
                {/* Lead */}
                <div style={{ padding: 16, borderRadius: 12, background: C.accent + "22", border: `2px solid ${C.accent}`, textAlign: "center", minWidth: 200 }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: C.accent, margin: "0 auto 8px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 16 }}>{lead.initials}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{lead.name}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{lead.role || "Chief of Staff"}</div>
                  <Badge color={statusColor(lead.status)}>{lead.status}</Badge>
                </div>
                {/* Connector line */}
                <div style={{ width: 2, height: 24, background: C.border }} />
                <div style={{ width: `${Math.min(children.length * 160, 600)}px`, height: 2, background: C.border }} />
                {/* Children */}
                <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginTop: 0 }}>
                  {children.map(child => (
                    <div key={child.id} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{ width: 2, height: 20, background: C.border }} />
                      <div style={{ padding: 12, borderRadius: 10, background: C.surface, border: `1px solid ${C.border}`, textAlign: "center", minWidth: 140 }}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: child.color || C.cyan, margin: "0 auto 6px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13 }}>{child.initials}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{child.name}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>{child.role || "Agent"}</div>
                        <Badge color={statusColor(child.status)}>{child.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* SQUADS VIEW */}
      {view === "squads" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
          {SQUADS.map(squad => {
            const members = squad.agents.map(id => allAgents.find(a => a.id === id)).filter(Boolean);
            return (
              <Card key={squad.id}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: squad.color }} />
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{squad.name}</div>
                  <Badge color={squad.color}>{members.length} agents</Badge>
                </div>
                {members.map(m => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: m.color || C.cyan, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 600, fontSize: 11 }}>{m.initials}</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{m.name}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>{m.model}</div>
                      </div>
                    </div>
                    <Badge color={statusColor(m.status)}>{m.status}</Badge>
                  </div>
                ))}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Team;
