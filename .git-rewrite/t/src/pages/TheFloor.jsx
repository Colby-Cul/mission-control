import { useState } from "react";
import { Card, KPI } from "../components/shared";
import { C, AGENTS } from "../data/constants";
import { useMissionControlData } from "../context/MissionControlDataContext";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { statusColor } from "./liveViewUtils";
import { fmtCost, fmtTokens } from "../utils/format";
import AgentAvatar from "../components/shared/AgentAvatar";

const DEPARTMENTS = [
  { id: "all", name: "All", icon: "grid" },
  { id: "exec", name: "Executive", agents: ["main", "executive-assistant", "ops-runner"], color: "#8b5cf6" },
  { id: "eng", name: "Engineering", agents: ["coding-agent", "validation", "designer"], color: "#10b981" },
  { id: "fin", name: "Finance", agents: ["cfo", "bookkeeper", "fin-researcher", "tax-advisor", "crypto-analyst", "stock-analyst"], color: "#D4AF37" },
  { id: "mkt", name: "Marketing", agents: ["maven", "quill", "echo", "spark", "beacon", "lens", "pulse", "sentinel", "herald", "scribe"], color: "#e11d48" },
];

function getAgentActivity(agent, allSessions) {
  const agentSessions = allSessions.filter(s => s.agent === agent.id);
  const active = agentSessions.find(s => s.status !== "done" && s.status !== "completed");
  if (active) {
    const label = (active.task || "Active task").slice(0, 55);
    return { type: "active", label, color: C.amber };
  }
  if (agentSessions.length > 0) {
    const latest = agentSessions[0];
    const task = (latest.task || "").slice(0, 55);
    const isLearning = /learning|study|research|self-improv|doctorate/i.test(task);
    if (isLearning) return { type: "learning", label: task, color: C.purple };
    return { type: "done", label: task, color: C.green };
  }
  return { type: "idle", label: "Awaiting dispatch", color: "#64748b" };
}

function knowledgeBadgeColor(levelName) {
  const l = (levelName || "").toLowerCase();
  if (l.includes("doctorate")) return "#D4AF37";
  if (l.includes("phd")) return "#f97316";
  if (l.includes("master") || l.includes("bachelor")) return "#8b5cf6";
  if (l.includes("high") || l.includes("associate")) return "#10b981";
  if (l.includes("elementary") || l.includes("middle")) return "#0ea5e9";
  if (l.includes("kindergarten")) return "#6366f1";
  return "#6b7280";
}

function knowledgeBadgeLabel(name) {
  if (!name) return "Unranked";
  if (name === "PhD Candidate") return "PhD";
  return name;
}

const HUMAN_RATE = 75;
const CHART_COLORS = [
  "#6366f1","#10b981","#f59e0b","#0ea5e9","#8b5cf6","#ec4899","#14b8a6","#ef4444",
  "#D4AF37","#2DD4BF","#3b82f6","#F59E0B","#a855f7","#22d3ee","#e11d48","#7c3aed",
  "#0891b2","#ea580c","#059669","#4f46e5","#0d9488","#b91c1c","#a16207","#6d28d9",
];
const TT = { backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8, color: "#f9fafb", fontSize: 12 };

const TheFloor = () => {
  const { agents, acpSessions = [], cronJobs = [] } = useMissionControlData();
  const [dept, setDept] = useState("all");

  const allAgents = AGENTS.map(ca => {
    const live = agents.find(a => a.id === ca.id);
    const k = live ? (live.knowledge || (live.raw ? live.raw.knowledge : null)) : null;
    const merged = { ...ca };
    if (live) {
      Object.assign(merged, live);
      merged.sessions = live.sessions || ca.sessions || 0;
      merged.status = live.status || "online";
    }
    merged.knowledge = k;
    return merged;
  });

  const filteredAgents = dept === "all" ? allAgents : allAgents.filter(a => {
    const d = DEPARTMENTS.find(dd => dd.id === dept);
    return d?.agents?.includes(a.id);
  });

  const agentStats = filteredAgents.map(agent => {
    const sessions = acpSessions.filter(s => s.agent === agent.id);
    const totalCost = sessions.reduce((sum, s) => sum + (s.totalCost || 0), 0);
    const totalTokens = sessions.reduce((sum, s) => sum + (s.tokens || 0), 0);
    const done = sessions.filter(s => s.status === "done").length;
    const total = sessions.length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    const currentTask = sessions.find(s => s.status !== "done" && s.status !== "completed");
    const hoursActive = total * 0.15;
    const humanCost = hoursActive * HUMAN_RATE;
    return { ...agent, totalCost, totalTokens, done, total, completionRate, currentTask, hoursActive, humanCost };
  });

  // Sort: agents with most activity first
  const sortedStats = [...agentStats].sort((a, b) => (b.total + (b.knowledge?.xp || 0)) - (a.total + (a.knowledge?.xp || 0)));

  const totalBotCost = agentStats.reduce((s, a) => s + a.totalCost, 0);
  const totalHumanCost = agentStats.reduce((s, a) => s + a.humanCost, 0);
  const savings = totalHumanCost - totalBotCost;
  const activeCount = agentStats.filter(a => {
    const activity = getAgentActivity(a, acpSessions);
    return activity.type === "active";
  }).length;

  const deptColor = DEPARTMENTS.find(d => d.id === dept)?.color || C.accent;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>The Floor</h1>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Agent workstations — real-time operations view</div>
        </div>
        <div style={{ display: "flex", gap: 3, background: C.surface, borderRadius: 10, padding: 3, border: `1px solid ${C.border}` }}>
          {DEPARTMENTS.map(d => (
            <button key={d.id} onClick={() => setDept(d.id)} style={{
              background: dept === d.id ? (d.color || C.accent) : "transparent",
              color: dept === d.id ? "#fff" : C.muted,
              border: "none",
              borderRadius: 8,
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s",
            }}>
              {d.name}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
        <KPI label="Agents" value={filteredAgents.length} sub={`${activeCount} active`} color={deptColor} />
        <KPI label="Bot Cost" value={fmtCost(totalBotCost)} sub="Total API spend" color={C.purple} />
        <KPI label="Human Equiv" value={fmtCost(totalHumanCost)} sub={`@$${HUMAN_RATE}/hr`} color={C.amber} />
        <KPI label="Net Savings" value={fmtCost(Math.abs(savings))} sub={savings > 0 ? "Under budget" : "Over budget"} color={savings > 0 ? C.green : C.red} />
        <KPI label="Cron Jobs" value={cronJobs.length} sub={`${cronJobs.filter(j => j.enabled).length} active`} color={C.cyan} />
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 8 }}>Bot vs Human Cost</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={agentStats.filter(a => a.totalCost > 0 || a.humanCost > 0).slice(0, 8)} layout="vertical">
              <XAxis type="number" tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <YAxis type="category" dataKey="name" tick={{ fill: C.text, fontSize: 10 }} axisLine={false} tickLine={false} width={70} />
              <Tooltip contentStyle={TT} formatter={v => `$${v.toFixed(2)}`} />
              <Bar dataKey="totalCost" fill={C.purple} radius={[0, 3, 3, 0]} name="Bot Cost" />
              <Bar dataKey="humanCost" fill={C.amber} radius={[0, 3, 3, 0]} name="Human Equiv" />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 8 }}>Task Distribution</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={agentStats.filter(a => a.total > 0).map((a, i) => ({ name: a.name, value: a.total, fill: a.color || CHART_COLORS[i % CHART_COLORS.length] }))} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value">
                {agentStats.filter(a => a.total > 0).map((a, i) => <Cell key={i} fill={a.color || CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={TT} />
              <Legend wrapperStyle={{ fontSize: 9, color: C.muted }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Agent Workstations Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
        {sortedStats.map(agent => {
          const activity = getAgentActivity(agent, acpSessions);
          const k = agent.knowledge;
          const badgeColor = k ? knowledgeBadgeColor(k.level_name) : "#6b7280";

          return (
            <Card key={agent.id} style={{ position: "relative", overflow: "hidden" }}>
              {/* Subtle top accent bar */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${agent.color || C.accent}, transparent)` }} />

              {/* Header: Avatar + Name + Badge */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 4 }}>
                <AgentAvatar agent={agent} size={46} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{agent.name}</span>
                    {k && (
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: badgeColor,
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: badgeColor + "18",
                        border: `1px solid ${badgeColor}33`,
                        whiteSpace: "nowrap",
                      }}>
                        {knowledgeBadgeLabel(k.level_name)}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                    {agent.role || "Agent"} · <span style={{ color: agent.color || C.accent }}>{agent.dept}</span>
                  </div>
                </div>
                {k && (
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: badgeColor }}>{(k.xp || 0).toLocaleString()}</div>
                    <div style={{ fontSize: 9, color: C.muted }}>XP</div>
                  </div>
                )}
              </div>

              {/* Activity Status */}
              <div style={{
                marginTop: 10,
                padding: "6px 10px",
                borderRadius: 6,
                background: activity.color + "0c",
                border: `1px solid ${activity.color}18`,
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: activity.color,
                  boxShadow: activity.type === "active" ? `0 0 6px ${activity.color}` : "none",
                  flexShrink: 0, marginTop: 4,
                }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: activity.color, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    {activity.type === "active" ? "Working on" : activity.type === "learning" ? "Learning" : activity.type === "done" ? "Last completed" : "Status"}
                  </div>
                  <div style={{ fontSize: 12, color: C.text, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activity.label}</div>
                </div>
              </div>

              {/* Knowledge Progress Bar */}
              {k && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 10, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>
                      {k.domain}
                    </span>
                    <span style={{ fontSize: 9, color: C.muted, flexShrink: 0 }}>{k.level_progress_pct}%</span>
                  </div>
                  <div style={{ height: 3, borderRadius: 2, background: C.bg, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${k.level_progress_pct}%`, borderRadius: 2, background: `linear-gradient(90deg, ${badgeColor}, ${badgeColor}88)`, transition: "width 0.5s" }} />
                  </div>
                </div>
              )}

              {/* Stats Row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}44` }}>
                <div>
                  <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase" }}>Tasks</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{agent.total}</div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase" }}>Done</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: agent.done > 0 ? C.green : C.muted }}>{agent.done}</div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase" }}>Cost</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{fmtCost(agent.totalCost)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase" }}>Tokens</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{fmtTokens(agent.totalTokens)}</div>
                </div>
              </div>

              {/* Savings footer — only show if there's actual activity */}
              {agent.total > 0 && (
                <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", fontSize: 10, color: C.muted }}>
                  <span>Opp. cost ({agent.hoursActive.toFixed(1)}h x ${HUMAN_RATE}/hr)</span>
                  <span style={{ color: (agent.humanCost - agent.totalCost) >= 0 ? C.green : C.red, fontWeight: 600 }}>
                    {fmtCost(agent.humanCost - agent.totalCost)} saved
                  </span>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default TheFloor;
