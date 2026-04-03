import { useState } from "react";
import { Badge, Card, KPI } from "../components/shared";
import { C, AGENTS } from "../data/constants";
import { useMissionControlData } from "../context/MissionControlDataContext";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, PieChart, Pie, Cell, Legend } from "recharts";

const DEPARTMENTS = [
  { id: "all", name: "All Departments" },
  { id: "ops", name: "Operations", agents: ["main", "executive-assistant"] },
  { id: "eng", name: "Engineering", agents: ["coding-agent", "validation", "designer"] },
  { id: "fin", name: "Finance", agents: ["cfo", "bookkeeper", "fin-researcher", "tax-advisor", "crypto-analyst", "stock-analyst"] },
];

function statusColor(s) {
  const v = String(s || "").toLowerCase();
  if (["online","connected","active","running","ok"].includes(v)) return C.green;
  if (["busy","warning"].includes(v)) return C.amber;
  if (["offline","error","blocked"].includes(v)) return C.red;
  return C.cyan;
}

function fmtCost(v) { const n = Number(v); return isFinite(n) && n > 0 ? `$${n.toFixed(2)}` : "$0.00"; }
function fmtTokens(v) { const n = Number(v); return n >= 1e6 ? `${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `${(n/1e3).toFixed(1)}K` : isFinite(n) ? String(n) : "0"; }

const HUMAN_RATE = 75; // $/hr equivalent
const CHART_COLORS = ["#6366f1","#10b981","#f59e0b","#0ea5e9","#8b5cf6","#ec4899","#14b8a6","#ef4444","#D4AF37","#1E3A5F"];
const TT = { backgroundColor:"#1f2937", border:"1px solid #374151", borderRadius:8, color:"#f9fafb", fontSize:12 };

const TheFloor = () => {
  const { agents, acpSessions = [], cronJobs = [], metrics } = useMissionControlData();
  const [dept, setDept] = useState("all");

  const allAgents = AGENTS.map(ca => {
    const live = agents.find(a => a.id === ca.id);
    return { ...ca, ...(live || {}), sessions: live?.sessions || ca.sessions || 0, status: live?.status || "online" };
  });

  const filteredAgents = dept === "all" ? allAgents : allAgents.filter(a => {
    const d = DEPARTMENTS.find(dd => dd.id === dept);
    return d?.agents?.includes(a.id);
  });

  // Calculate per-agent stats from sessions
  const agentStats = filteredAgents.map(agent => {
    const sessions = acpSessions.filter(s => s.agent === agent.id);
    const totalCost = sessions.reduce((sum, s) => sum + (s.totalCost || 0), 0);
    const totalTokens = sessions.reduce((sum, s) => sum + (s.tokens || 0), 0);
    const done = sessions.filter(s => s.status === "done").length;
    const total = sessions.length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    const grade = completionRate >= 90 ? "A" : completionRate >= 75 ? "B" : completionRate >= 60 ? "C" : completionRate >= 40 ? "D" : "F";
    const currentTask = sessions.find(s => s.status !== "done" && s.status !== "completed");
    const hoursActive = total * 0.15; // rough estimate: 9 min avg per session
    const humanCost = hoursActive * HUMAN_RATE;
    return { ...agent, totalCost, totalTokens, done, total, completionRate, grade, currentTask, hoursActive, humanCost };
  });

  const totalBotCost = agentStats.reduce((s, a) => s + a.totalCost, 0);
  const totalHumanCost = agentStats.reduce((s, a) => s + a.humanCost, 0);
  const savings = totalHumanCost - totalBotCost;
  const topPerformer = [...agentStats].sort((a, b) => b.completionRate - a.completionRate)[0];
  const bottomPerformer = [...agentStats].sort((a, b) => a.completionRate - b.completionRate)[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>The Floor</h1>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>Agent workstations · Real-time department view</div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {DEPARTMENTS.map(d => (
            <button key={d.id} onClick={() => setDept(d.id)} style={{ background: dept === d.id ? C.accent : C.surface, color: dept === d.id ? "#fff" : C.muted, border: `1px solid ${dept === d.id ? C.accent : C.border}`, borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              {d.name}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <KPI label="Agents" value={filteredAgents.length} sub={`${filteredAgents.filter(a => a.status === "online").length} online`} color={C.accent} />
        <KPI label="Bot Cost" value={fmtCost(totalBotCost)} sub="Total API spend" color={C.purple} />
        <KPI label="Human Equiv" value={fmtCost(totalHumanCost)} sub={`@$${HUMAN_RATE}/hr`} color={C.amber} />
        <KPI label="Net Savings" value={fmtCost(savings)} sub={savings > 0 ? "AI cost advantage" : "Over budget"} color={savings > 0 ? C.green : C.red} />
        <KPI label="Cron Jobs" value={cronJobs.length} sub={`${cronJobs.filter(j => j.enabled).length} active`} color={C.cyan} />
      </div>

      {/* Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        {/* Agent Utilization Gauges */}
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 8 }}>Completion Rate</div>
          <ResponsiveContainer width="100%" height={220}>
            <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" data={agentStats.filter(a => a.total > 0).slice(0, 6).map((a, i) => ({ name: a.name, value: a.completionRate, fill: a.color || CHART_COLORS[i % CHART_COLORS.length] }))} startAngle={180} endAngle={0}>
              <RadialBar dataKey="value" background={{ fill: C.surface }} cornerRadius={4} />
              <Tooltip contentStyle={TT} formatter={v => `${v}%`} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 10, color: C.muted }} />
            </RadialBarChart>
          </ResponsiveContainer>
        </Card>

        {/* Bot Cost vs Human Cost */}
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 8 }}>Bot vs Human Cost</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={agentStats.filter(a => a.totalCost > 0 || a.humanCost > 0).slice(0, 6)} layout="vertical">
              <XAxis type="number" tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <YAxis type="category" dataKey="name" tick={{ fill: C.text, fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
              <Tooltip contentStyle={TT} formatter={v => `$${v.toFixed(2)}`} />
              <Bar dataKey="totalCost" fill={C.purple} radius={[0, 3, 3, 0]} name="Bot Cost" />
              <Bar dataKey="humanCost" fill={C.amber} radius={[0, 3, 3, 0]} name="Human Equiv" />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Task Distribution Pie */}
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 8 }}>Task Distribution</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={agentStats.filter(a => a.total > 0).map((a, i) => ({ name: a.name, value: a.total, fill: a.color || CHART_COLORS[i % CHART_COLORS.length] }))} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                {agentStats.filter(a => a.total > 0).map((a, i) => <Cell key={i} fill={a.color || CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={TT} />
              <Legend wrapperStyle={{ fontSize: 10, color: C.muted }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Agent Workstations Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
        {agentStats.map(agent => (
          <Card key={agent.id}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: agent.color || C.accent, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 15, border: `3px solid ${statusColor(agent.status)}` }}>
                  {agent.initials || agent.name?.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{agent.name}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{agent.role || agent.dept || "Agent"} · {agent.model}</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: agent.grade === "A" ? C.green : agent.grade === "B" ? C.cyan : agent.grade === "C" ? C.amber : C.red }}>{agent.grade}</div>
                <div style={{ fontSize: 10, color: C.muted }}>{agent.completionRate}% done</div>
              </div>
            </div>

            {agent.currentTask && (
              <div style={{ marginTop: 10, padding: 8, borderRadius: 6, background: C.amber + "11", border: `1px solid ${C.amber}33` }}>
                <div style={{ fontSize: 11, color: C.amber, fontWeight: 600 }}>Working on:</div>
                <div style={{ fontSize: 12, color: C.text, marginTop: 2 }}>{(agent.currentTask.task || "").slice(0, 70)}</div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 12 }}>
              <div><div style={{ fontSize: 10, color: C.muted }}>Tasks</div><div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{agent.total}</div></div>
              <div><div style={{ fontSize: 10, color: C.muted }}>Done</div><div style={{ fontSize: 16, fontWeight: 700, color: C.green }}>{agent.done}</div></div>
              <div><div style={{ fontSize: 10, color: C.muted }}>Cost</div><div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{fmtCost(agent.totalCost)}</div></div>
              <div><div style={{ fontSize: 10, color: C.muted }}>Tokens</div><div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{fmtTokens(agent.totalTokens)}</div></div>
            </div>

            <div style={{ marginTop: 10, padding: 8, borderRadius: 6, background: C.bg }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                <span style={{ color: C.muted }}>Opportunity cost ({agent.hoursActive.toFixed(1)}h × ${HUMAN_RATE}/hr)</span>
                <span style={{ color: C.green, fontWeight: 600 }}>{fmtCost(agent.humanCost - agent.totalCost)} saved</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Performance Rankings */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Card>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}>Top Performer</div>
          {topPerformer && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.green, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700 }}>{topPerformer.initials}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{topPerformer.name}</div>
                <div style={{ fontSize: 12, color: C.green }}>{topPerformer.completionRate}% completion · {topPerformer.done}/{topPerformer.total} tasks</div>
              </div>
            </div>
          )}
        </Card>
        <Card>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}>Needs Attention</div>
          {bottomPerformer && bottomPerformer.id !== topPerformer?.id && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.red, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700 }}>{bottomPerformer.initials}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{bottomPerformer.name}</div>
                <div style={{ fontSize: 12, color: C.red }}>{bottomPerformer.completionRate}% completion · {bottomPerformer.done}/{bottomPerformer.total} tasks</div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default TheFloor;
