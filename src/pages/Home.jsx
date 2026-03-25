import { useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area
} from "recharts";

import { 
  C, 
  AGENTS, 
  ACTIVITIES, 
  PROJECTS, 
  TASKS_DATA, 
  COST_TREND, 
  DEPARTMENTS 
} from '../data/constants';
import { Avatar, Badge, Card, KPI } from '../components/shared';

const Home = () => {
  const onlineAgents = AGENTS.filter(a => a.status === "online").length;
  const busyAgents = AGENTS.filter(a => a.status === "busy").length;
  const totalTasks = TASKS_DATA.length;
  const activeTasks = TASKS_DATA.filter(t => t.status === "working").length;
  const stuckTasks = TASKS_DATA.filter(t => t.status === "stuck").length;
  const doneTasks = TASKS_DATA.filter(t => t.status === "done").length;
  const totalCostToday = AGENTS.reduce((s, a) => s + a.costDay, 0);

  const statusDist = useMemo(() => {
    const counts = {};
    TASKS_DATA.forEach(t => { counts[t.status] = (counts[t.status] || 0) + 1; });
    return Object.entries(counts).map(([k, v]) => ({
      name: k.charAt(0).toUpperCase() + k.slice(1), value: v,
      color: { todo: C.muted, working: C.amber, stuck: C.red, review: C.purple, done: C.green }[k] || C.accent,
    }));
  }, []);

  const deptLoad = useMemo(() =>
    DEPARTMENTS.map(d => ({
      name: d, 
      agents: AGENTS.filter(a => a.dept === d).length,
      tasks: TASKS_DATA.filter(t => t.agents.some(aid => AGENTS.find(a => a.id === aid)?.dept === d)).length,
    })), []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Time + Weather */}
      <Card style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        background: `linear-gradient(135deg, ${C.accent}15, ${C.purple}15)` 
      }}>
        <div>
          <div style={{ fontSize: 32, fontWeight: 700, color: C.text }}>
            {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
          </div>
          <div style={{ color: C.muted, fontSize: 14 }}>Saturday, March 21, 2026</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 24, fontWeight: 600, color: C.text }}>72°F</div>
          <div style={{ color: C.muted, fontSize: 13 }}>Clear skies — Austin, TX</div>
        </div>
      </Card>

      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <KPI label="Agents Online" value={`${onlineAgents}/${AGENTS.length}`} sub={`${busyAgents} busy`} color={C.green} />
        <KPI label="Active Tasks" value={activeTasks} sub={`${stuckTasks} stuck`} color={C.amber} />
        <KPI label="Completed" value={doneTasks} sub={`of ${totalTasks} total`} color={C.green} />
        <KPI label="Projects" value={PROJECTS.length} sub="2 on track, 1 at risk" color={C.accent} />
        <KPI label="Today's AI Cost" value={`$${totalCostToday.toFixed(2)}`} sub="across all agents" color={C.cyan} />
        <KPI label="Sessions Today" value="47" sub="avg 12 min each" color={C.purple} />
      </div>

      {/* Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Cost Trend (14 days)</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={COST_TREND}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="date" tick={{ fill: C.muted, fontSize: 11 }} />
              <YAxis tick={{ fill: C.muted, fontSize: 11 }} tickFormatter={v => `$${v}`} />
              <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }} />
              <Area type="monotone" dataKey="total" stroke={C.accent} fill={C.accent + "33"} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Task Distribution</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusDist} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                {statusDist.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }} />
              <Legend wrapperStyle={{ fontSize: 11, color: C.muted }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Agent Status + Activity */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Agent Status</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {AGENTS.map(a => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar agent={a} size={28} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{a.role}</div>
                </div>
                <Badge color={a.status === "online" ? C.green : a.status === "busy" ? C.amber : C.muted}>
                  {a.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Recent Activity</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {ACTIVITIES.slice(0, 8).map(act => {
              const ag = AGENTS.find(a => a.id === act.agent);
              const typeColor = { success: C.green, info: C.cyan, warning: C.amber, error: C.red }[act.type];
              return (
                <div key={act.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                  <Avatar agent={ag} size={22} />
                  <span style={{ color: typeColor, fontWeight: 600, minWidth: 0 }}>{act.action}</span>
                  <span style={{ color: C.muted, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{act.target}</span>
                  <span style={{ color: C.muted, fontSize: 11, whiteSpace: "nowrap" }}>{act.time}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Department Load */}
      <Card>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Department Workload</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={deptLoad}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="name" tick={{ fill: C.muted, fontSize: 11 }} />
            <YAxis tick={{ fill: C.muted, fontSize: 11 }} />
            <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }} />
            <Bar dataKey="agents" fill={C.accent} radius={[4, 4, 0, 0]} name="Agents" />
            <Bar dataKey="tasks" fill={C.cyan} radius={[4, 4, 0, 0]} name="Tasks" />
            <Legend wrapperStyle={{ fontSize: 11, color: C.muted }} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};

export default Home;