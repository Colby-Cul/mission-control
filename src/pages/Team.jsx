import { useState, useMemo } from 'react';
import { Badge, Card, KPI } from '../components/shared';
import { C, AGENTS } from '../data/constants';
import { useMissionControlData } from '../context/MissionControlDataContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";

const DEPTS = [
  { id: "ops", name: "Operations", lead: "executive-assistant", agents: ["executive-assistant"], color: C.accent },
  { id: "eng", name: "Engineering", lead: "coding-agent", agents: ["coding-agent", "validation", "designer"], color: C.green },
  { id: "fin", name: "Finance", lead: "cfo", agents: ["cfo", "bookkeeper", "fin-researcher", "tax-advisor", "crypto-analyst", "stock-analyst"], color: "#D4AF37" },
];

function statusColor(s) {
  const v = String(s || "").toLowerCase();
  if (["online","connected","active","running"].includes(v)) return C.green;
  if (["busy","warning","learning"].includes(v)) return C.amber;
  if (["offline","error"].includes(v)) return C.red;
  return C.cyan;
}

function getAgentActivity(agent, acpSessions) {
  const active = acpSessions.find(s => s.agent === agent.id && s.status !== "done" && s.status !== "completed");
  if (active) return { type: "task", label: (active.task || "Active task").slice(0, 55), color: C.amber };
  return { type: "learning", label: "Self-improving · Doctorate research", color: C.purple };
}

const CHART_COLORS = ["#6366f1","#10b981","#f59e0b","#0ea5e9","#8b5cf6","#ec4899","#14b8a6","#ef4444","#D4AF37","#1E3A5F"];
const TT = { backgroundColor:"#1f2937", border:"1px solid #374151", borderRadius:8, color:"#f9fafb", fontSize:12 };
const MC_API = () => localStorage.getItem("mc-api-url") || "http://localhost:7070";

const Team = () => {
  const { agents, acpSessions = [] } = useMissionControlData();
  const [view, setView] = useState("org"); // org | grid | squads
  const [actionResult, setActionResult] = useState(null);

  const allAgents = AGENTS.map(ca => {
    const live = agents.find(a => a.id === ca.id);
    return { ...ca, ...(live || {}), sessions: live?.sessions || ca.sessions || 0, status: live?.status || "online" };
  });
  const online = allAgents.filter(a => ["online","active","running","busy","connected"].includes(String(a.status).toLowerCase())).length;

  // Chart data
  const sessionsByAgent = useMemo(() => allAgents.map((a, i) => ({
    name: a.name, sessions: a.sessions || 0, fill: a.color || CHART_COLORS[i % CHART_COLORS.length]
  })).filter(a => a.sessions > 0).sort((a, b) => b.sessions - a.sessions), [allAgents]);

  const deptDistribution = useMemo(() => {
    const map = {};
    allAgents.forEach(a => { const d = a.dept || "Other"; map[d] = (map[d] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [allAgents]);

  const agentCapabilities = useMemo(() => allAgents.filter(a => a.sessions > 0).slice(0, 5).map(a => {
    const sessions = acpSessions.filter(s => s.agent === a.id);
    const done = sessions.filter(s => s.status === "done").length;
    const total = sessions.length;
    return {
      name: a.name,
      sessions: Math.min(a.sessions || 0, 100),
      completion: total > 0 ? Math.round((done / total) * 100) : 50,
    };
  }), [allAgents, acpSessions]);

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

  // Shared agent card renderer
  const AgentCard = ({ agent, compact }) => {
    const activity = getAgentActivity(agent, acpSessions);
    const isLead = agent.id === "main" || agent.id === "cfo";
    return (
      <div style={{
        padding: compact ? 10 : 14, borderRadius: 10,
        background: isLead ? C.accent + "11" : C.surface,
        border: `1px solid ${isLead ? C.accent + "44" : C.border}`,
        display: "flex", flexDirection: "column", gap: 8,
        minWidth: compact ? 150 : 260,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: compact ? 32 : 38, height: compact ? 32 : 38, borderRadius: "50%",
            background: agent.color || C.accent, display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 700, fontSize: compact ? 11 : 13,
            border: `2px solid ${statusColor(agent.status)}`,
          }}>
            {agent.initials || agent.name?.slice(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: compact ? 13 : 14, fontWeight: 700, color: C.text }}>{agent.name}</div>
            <div style={{ fontSize: 11, color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {agent.role || agent.dept} · {agent.model}
            </div>
          </div>
          <Badge color={statusColor(agent.status)}>{agent.status}</Badge>
        </div>
        {/* Activity / Learning status */}
        <div style={{
          padding: "6px 8px", borderRadius: 6,
          background: activity.type === "task" ? C.amber + "11" : C.purple + "11",
          border: `1px solid ${activity.color}22`,
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: activity.color,
            boxShadow: `0 0 6px ${activity.color}`,
          }} />
          <div style={{ fontSize: 11, color: activity.color, fontWeight: 500 }}>
            {activity.type === "task" ? "Working: " : ""}{activity.label}
          </div>
        </div>
        {!compact && (
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => handleAction(agent.id, "Reassign")} style={{ flex: 1, background: C.bg, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 6, padding: "5px 0", fontSize: 10, cursor: "pointer" }}>Reassign</button>
            <button onClick={() => handleAction(agent.id, "Spin up")} style={{ flex: 1, background: C.green + "11", color: C.green, border: `1px solid ${C.green}22`, borderRadius: 6, padding: "5px 0", fontSize: 10, cursor: "pointer" }}>Spin Up</button>
            <button onClick={() => handleAction(agent.id, "Shut down")} style={{ flex: 1, background: C.red + "11", color: C.red, border: `1px solid ${C.red}22`, borderRadius: 6, padding: "5px 0", fontSize: 10, cursor: "pointer" }}>Shut Down</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Team</h1>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>{allAgents.length} agents · {online} online</div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {["org", "grid", "squads"].map(v => (
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

      {/* Team Analytics */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Sessions by Agent</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={sessionsByAgent} layout="vertical">
              <XAxis type="number" tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: C.text, fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
              <Tooltip contentStyle={TT} />
              <Bar dataKey="sessions" radius={[0, 4, 4, 0]}>
                {sessionsByAgent.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Department Distribution</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={deptDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={4} dataKey="value">
                {deptDistribution.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={TT} />
              <Legend wrapperStyle={{ fontSize: 10, color: C.muted }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Agent Capabilities</div>
          {agentCapabilities.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={agentCapabilities}>
                <PolarGrid stroke={C.border} />
                <PolarAngleAxis dataKey="name" tick={{ fill: C.muted, fontSize: 9 }} />
                <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                <Radar name="Sessions" dataKey="sessions" stroke={C.accent} fill={C.accent} fillOpacity={0.2} />
                <Radar name="Completion %" dataKey="completion" stroke={C.green} fill={C.green} fillOpacity={0.2} />
                <Tooltip contentStyle={TT} />
              </RadarChart>
            </ResponsiveContainer>
          ) : <div style={{ color: C.muted, textAlign: "center", padding: 30 }}>No session data yet</div>}
        </Card>
      </div>

      {/* ORG CHART VIEW — True reporting hierarchy */}
      {view === "org" && (() => {
        const OrgNode = ({ agent, borderColor, size, isLead }) => {
          if (!agent) return null;
          const activity = getAgentActivity(agent, acpSessions);
          const sz = size || 36;
          return (
            <div style={{ padding: isLead ? 12 : 10, borderRadius: 10, background: isLead ? (borderColor || C.accent) + "11" : C.surface, border: `${isLead ? 2 : 1}px solid ${isLead ? (borderColor || C.accent) + "55" : C.border}`, textAlign: "center", minWidth: isLead ? 180 : 155 }}>
              <div style={{ width: sz, height: sz, borderRadius: "50%", background: agent.color || C.accent, margin: "0 auto 6px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: sz * 0.35, border: `2px solid ${statusColor(agent.status)}` }}>
                {agent.initials}
              </div>
              <div style={{ fontSize: isLead ? 14 : 12, fontWeight: 700, color: C.text }}>{agent.name}</div>
              <div style={{ fontSize: 10, color: C.muted }}>{agent.role}</div>
              <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>{agent.model}</div>
              <Badge color={statusColor(agent.status)}>{agent.status}</Badge>
              <div style={{ marginTop: 4, padding: "3px 6px", borderRadius: 4, background: activity.color + "11", fontSize: 9, color: activity.color, lineHeight: 1.3 }}>
                {activity.type === "task" ? `Working: ${activity.label}` : activity.label}
              </div>
            </div>
          );
        };
        const VLine = ({ h }) => <div style={{ width: 2, height: h || 16, background: C.border, margin: "0 auto" }} />;
        const HLine = ({ w }) => <div style={{ width: w || "80%", height: 2, background: C.border, margin: "0 auto" }} />;

        const jarvis = allAgents.find(a => a.id === "main");
        return (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
            {/* CEO */}
            <div style={{ padding: 16, borderRadius: 12, background: `linear-gradient(135deg, ${C.accent}22, ${C.purple}22)`, border: `2px solid ${C.accent}`, textAlign: "center", minWidth: 220 }}>
              <div style={{ fontSize: 10, color: C.accent, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Executive</div>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: C.accent, margin: "0 auto 8px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 18 }}>CC</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Colby Culbertson</div>
              <div style={{ fontSize: 12, color: C.muted }}>CEO & Owner</div>
            </div>
            <VLine h={20} />
            {/* Jarvis */}
            <OrgNode agent={jarvis} borderColor={C.accent} size={44} isLead />
            <VLine h={20} />
            <HLine w="85%" />

            {/* 3 Department columns */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, width: "100%" }}>
              {DEPTS.map(dept => {
                const members = dept.agents.filter(id => id !== "main").map(id => allAgents.find(a => a.id === id)).filter(Boolean);
                const lead = members.find(m => m.id === dept.lead);
                const reports = members.filter(m => m.id !== dept.lead);
                return (
                  <div key={dept.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
                    <VLine h={14} />
                    {/* Department label */}
                    <div style={{ padding: "6px 14px", borderRadius: 6, background: dept.color + "22", border: `1px solid ${dept.color}33`, marginBottom: 6 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: dept.color, textAlign: "center" }}>{dept.name}</div>
                    </div>
                    {/* Department lead */}
                    {lead && (
                      <>
                        <VLine h={8} />
                        <OrgNode agent={lead} borderColor={dept.color} size={38} isLead />
                      </>
                    )}
                    {/* Reports under lead */}
                    {reports.length > 0 && (
                      <>
                        <VLine h={10} />
                        {reports.length > 1 && <HLine w={`${Math.min(reports.length * 120, 280)}px`} />}
                        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                          {reports.map(agent => (
                            <div key={agent.id} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                              <VLine h={8} />
                              <OrgNode agent={agent} size={30} />
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* GRID VIEW */}
      {view === "grid" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
          {allAgents.map(agent => <AgentCard key={agent.id} agent={agent} />)}
        </div>
      )}

      {/* SQUADS VIEW */}
      {view === "squads" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
          {DEPTS.map(squad => {
            const members = squad.agents.map(id => allAgents.find(a => a.id === id)).filter(Boolean);
            return (
              <Card key={squad.id}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: squad.color }} />
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{squad.name}</div>
                  <Badge color={squad.color}>{members.length} agents</Badge>
                </div>
                {members.map(m => {
                  const activity = getAgentActivity(m, acpSessions);
                  return (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: m.color || C.cyan, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 600, fontSize: 11, flexShrink: 0 }}>{m.initials}</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{m.name}</div>
                          <div style={{ fontSize: 10, color: activity.color }}>{activity.type === "task" ? "Working: " : ""}{activity.label}</div>
                        </div>
                      </div>
                      <Badge color={statusColor(m.status)}>{m.status}</Badge>
                    </div>
                  );
                })}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Team;
