import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Card, KPI } from "../components/shared";
import { C } from "../data/constants";
import { buildAgentRoster, isAgentOnline } from "../data/agentRoster";
import { useMissionControlData } from "../context/MissionControlDataContext";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, RadialBarChart, RadialBar, Legend } from "recharts";
import { statusColor } from "./liveViewUtils";
import { fmtDate, fmtCost } from "../utils/format";

const CHART_COLORS = ["#6366f1","#10b981","#f59e0b","#0ea5e9","#8b5cf6","#ec4899","#14b8a6","#ef4444"];
const TOOLTIP_STYLE = { backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8, color: "#f9fafb", fontSize: 12 };

const Home = () => {
  const navigate = useNavigate();
  const { acpSessions=[], projects=[], cronJobs=[], skills=[], agents, snapshot } = useMissionControlData();

  const allAgents = buildAgentRoster(agents, acpSessions);

  const totalCost = acpSessions.reduce((s,t) => s + (t.totalCost||0), 0);
  const totalTokens = acpSessions.reduce((s,t) => s + (t.tokens||0), 0);
  const doneTasks = acpSessions.filter(s => s.status==="done"||s.status==="completed").length;
  const activeTasks = acpSessions.filter(s => s.status==="delegated"||s.status==="pending").length;
  const blockedTasks = acpSessions.filter(s => s.status==="blocked").length;
  const activeProjects = projects.filter(p => p.status==="active").length;
  const enabledCrons = cronJobs.filter(j => j.enabled).length;
  const errorCrons = cronJobs.filter(j => j.consecutiveErrors > 0 || j.lastStatus==="error").length;
  const gatewayOk = snapshot?.health?.ok || snapshot?.health?.status==="live";
  const workerConnected = allAgents.some(agent => agent.id !== "main" && isAgentOnline(agent.status));

  // Chart data: sessions per day (7 days)
  const dailyActivity = useMemo(() => {
    const now = Date.now();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = now - i * 86400000;
      const d = new Date(dayStart);
      const label = d.toLocaleDateString("en-US",{weekday:"short"});
      const count = acpSessions.filter(s => {
        const ts = new Date(s.endTime||s.dateFinished||s.dateCreated).getTime();
        return ts && Math.abs(ts - dayStart) < 86400000;
      }).length;
      const cost = acpSessions.filter(s => {
        const ts = new Date(s.endTime||s.dateFinished||s.dateCreated).getTime();
        return ts && Math.abs(ts - dayStart) < 86400000;
      }).reduce((sum,s) => sum + (s.totalCost||0), 0);
      days.push({ name: label, sessions: count, cost: Math.round(cost*100)/100 });
    }
    return days;
  }, [acpSessions]);

  // Chart data: cost by model (pie)
  const costByModel = useMemo(() => {
    const map = {};
    acpSessions.forEach(s => {
      const m = (s.model||"unknown").replace("openai/","").replace("anthropic/","");
      map[m] = (map[m]||0) + (s.totalCost||0);
    });
    return Object.entries(map).map(([name,value]) => ({name, value: Math.round(value*100)/100})).filter(d => d.value > 0).sort((a,b) => b.value - a.value);
  }, [acpSessions]);

  // Chart data: tasks by agent (bar)
  const tasksByAgent = useMemo(() => {
    const map = {};
    acpSessions.forEach(s => { map[s.agent||"unknown"] = (map[s.agent||"unknown"]||0) + 1; });
    return Object.entries(map).map(([name,tasks]) => ({name, tasks})).sort((a,b) => b.tasks - a.tasks);
  }, [acpSessions]);

  // Project health radial
  const projectHealth = useMemo(() => projects.map((p,i) => ({
    name: p.name?.length > 20 ? p.name.slice(0,18)+"…" : p.name,
    value: p.taskCount > 0 ? Math.round((p.doneCount/p.taskCount)*100) : 0,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  })), [projects]);

  // Org health score
  const orgHealth = useMemo(() => {
    const up = (gatewayOk && workerConnected) ? 30 : gatewayOk ? 15 : 0;
    const task = acpSessions.length > 0 ? Math.min(30, Math.round((doneTasks/Math.max(acpSessions.length,1))*30)) : 0;
    const burn = totalCost < 10 ? 20 : totalCost < 50 ? 10 : 0;
    const proj = activeProjects > 0 ? 10 : 0;
    const err = (errorCrons===0 && blockedTasks===0) ? 10 : errorCrons > 2 ? 0 : 5;
    return up+task+burn+proj+err;
  }, [gatewayOk,workerConnected,acpSessions,doneTasks,totalCost,activeProjects,errorCrons,blockedTasks]);

  const healthColor = orgHealth >= 80 ? C.green : orgHealth >= 50 ? C.amber : C.red;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      {/* Hero + Health Score */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 160px", gap:16 }}>
        <div style={{ padding:"24px 28px", borderRadius:16, background:`linear-gradient(135deg, ${C.accent}15, ${C.purple}10, ${C.cyan}05)`, border:`1px solid ${C.border}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
            <h1 style={{ fontSize:28, fontWeight:800, color:C.text, margin:0 }}>Mission Control</h1>
            <Badge color={gatewayOk ? C.green : C.red}>{gatewayOk ? "Gateway Live" : "Gateway Down"}</Badge>
            <Badge color={workerConnected ? C.green : C.red}>{workerConnected ? "Worker Online" : "Worker Offline"}</Badge>
          </div>
          <div style={{ color:C.muted, fontSize:13, marginTop:8 }}>
            {allAgents.length} agents · {acpSessions.length} sessions · {projects.length} projects · {fmtCost(totalCost)} total spend
          </div>
          {/* System Health Strip */}
          <div style={{ display:"flex", gap:2, height:4, borderRadius:2, overflow:"hidden", marginTop:12 }}>
            <div style={{ flex:3, background:gatewayOk ? C.green : C.red }} title="Gateway" />
            <div style={{ flex:2, background:workerConnected ? C.green : C.red }} title="Worker" />
            <div style={{ flex:3, background:errorCrons===0 ? C.green : C.amber }} title="Cron" />
            <div style={{ flex:2, background:blockedTasks===0 ? C.green : C.red }} title="Tasks" />
          </div>
        </div>
        {/* Org Health Score */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:16, borderRadius:16, background:C.card, border:`1px solid ${C.border}` }}>
          <div style={{ fontSize:11, color:C.muted }}>Org Health</div>
          <div style={{ fontSize:52, fontWeight:800, color:healthColor, lineHeight:1 }}>{orgHealth}</div>
          <div style={{ fontSize:10, color:C.muted }}>/100</div>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(6, 1fr)", gap:10 }}>
        <KPI label="Sessions" value={acpSessions.length||"—"} sub="Total" color={C.accent} />
        <KPI label="Completed" value={doneTasks||"—"} sub={`${activeTasks} active`} color={C.green} />
        <KPI label="Blocked" value={blockedTasks||"0"} sub={blockedTasks?"Attention":"Clear"} color={blockedTasks?C.red:C.green} />
        <KPI label="Projects" value={projects.length||"—"} sub={`${activeProjects} active`} color={C.purple} />
        <KPI label="API Cost" value={fmtCost(totalCost)} sub={fmtTokens(totalTokens)+" tkns"} color={C.amber} />
        <KPI label="Agents" value={allAgents.length} sub={`${allAgents.filter(a=>isAgentOnline(a.status)).length} online`} color={C.cyan} />
      </div>

      {/* Charts Row 1: Activity Trend + Cost by Model */}
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:12 }}>
        <Card>
          <div style={{ fontSize:14, fontWeight:600, color:C.text, marginBottom:16 }}>7-Day Activity & Cost</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={dailyActivity}>
              <defs>
                <linearGradient id="gradSessions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.accent} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={C.accent} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gradCost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.green} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={C.green} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false} width={30} />
              <YAxis yAxisId="right" orientation="right" tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false} width={40} tickFormatter={v=>`$${v}`} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area yAxisId="left" type="monotone" dataKey="sessions" stroke={C.accent} fillOpacity={1} fill="url(#gradSessions)" strokeWidth={2} name="Sessions" />
              <Area yAxisId="right" type="monotone" dataKey="cost" stroke={C.green} fillOpacity={1} fill="url(#gradCost)" strokeWidth={2} name="Cost ($)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <div style={{ fontSize:14, fontWeight:600, color:C.text, marginBottom:16 }}>Cost by Model</div>
          {costByModel.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={costByModel} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" label={({name,value})=>`${name}: $${value}`} labelLine={false}>
                  {costByModel.map((_,i) => <Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v=>`$${v}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div style={{color:C.muted,textAlign:"center",padding:40}}>No cost data yet</div>}
        </Card>
      </div>

      {/* Charts Row 2: Tasks by Agent + Project Health */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <Card>
          <div style={{ fontSize:14, fontWeight:600, color:C.text, marginBottom:16 }}>Tasks by Agent</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={tasksByAgent} layout="vertical">
              <XAxis type="number" tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{fill:C.text,fontSize:12}} axisLine={false} tickLine={false} width={60} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="tasks" radius={[0,4,4,0]}>
                {tasksByAgent.map((_,i) => <Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <div style={{ fontSize:14, fontWeight:600, color:C.text, marginBottom:16 }}>Project Completion</div>
          {projectHealth.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" data={projectHealth} startAngle={180} endAngle={0}>
                <RadialBar background clockWise dataKey="value" cornerRadius={4} label={{fill:C.text,fontSize:10,position:"insideStart"}} />
                <Legend iconSize={8} layout="vertical" verticalAlign="bottom" wrapperStyle={{fontSize:11,color:C.muted}} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v=>`${v}%`} />
              </RadialBarChart>
            </ResponsiveContainer>
          ) : <div style={{color:C.muted,textAlign:"center",padding:40}}>No projects</div>}
        </Card>
      </div>

      {/* Quick Actions + Agents */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        <button onClick={()=>navigate("/tasks")} style={{background:C.accent,color:"#fff",border:"none",borderRadius:8,padding:"8px 14px",fontWeight:600,cursor:"pointer",fontSize:12}}>+ New Task</button>
        <button onClick={()=>navigate("/projects")} style={{background:C.purple,color:"#fff",border:"none",borderRadius:8,padding:"8px 14px",fontWeight:600,cursor:"pointer",fontSize:12}}>+ New Project</button>
        <button onClick={()=>navigate("/team")} style={{background:C.green+"dd",color:"#fff",border:"none",borderRadius:8,padding:"8px 14px",fontWeight:600,cursor:"pointer",fontSize:12}}>Team</button>
        <button onClick={()=>navigate("/incidents")} style={{background:C.red+"dd",color:"#fff",border:"none",borderRadius:8,padding:"8px 14px",fontWeight:600,cursor:"pointer",fontSize:12}}>Incidents</button>
        <button onClick={()=>navigate("/finance")} style={{background:C.amber+"dd",color:"#fff",border:"none",borderRadius:8,padding:"8px 14px",fontWeight:600,cursor:"pointer",fontSize:12}}>Finance</button>
      </div>

      {/* Bottom Row: Projects + Recent Tasks */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <Card>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
            <div style={{fontSize:14,fontWeight:600,color:C.text}}>Projects</div>
            <button onClick={()=>navigate("/projects")} style={{background:"transparent",border:"none",color:C.accent,fontSize:12,cursor:"pointer"}}>View all →</button>
          </div>
          {projects.map(p => {
            const pct = p.taskCount>0 ? Math.round((p.doneCount/p.taskCount)*100) : 0;
            return (
              <div key={p.id} style={{padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:13,fontWeight:600,color:C.text}}>{p.name}</span>
                  <Badge color={p.status==="active"?C.green:p.status==="blocked"?C.red:C.cyan}>{p.status}</Badge>
                </div>
                <div style={{marginTop:6,background:C.bg,borderRadius:3,height:6,overflow:"hidden"}}>
                  <div style={{width:`${pct}%`,height:"100%",background:C.green,borderRadius:3,transition:"width 0.5s"}} />
                </div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.muted,marginTop:4}}>
                  <span>{p.doneCount}/{p.taskCount} tasks</span>
                  <span>{pct}% · {fmtCost(p.totalCost)}</span>
                </div>
              </div>
            );
          })}
        </Card>

        <Card>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
            <div style={{fontSize:14,fontWeight:600,color:C.text}}>Recent Activity</div>
            <button onClick={()=>navigate("/tasks")} style={{background:"transparent",border:"none",color:C.accent,fontSize:12,cursor:"pointer"}}>View all →</button>
          </div>
          {acpSessions.slice(0,8).map(s => (
            <div key={s.sessionId||s.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${C.border}`}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:500,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(s.task||"Session").slice(0,45)}</div>
                <div style={{fontSize:11,color:C.muted}}>{s.agent} · {fmtDate(s.endTime||s.dateFinished)}</div>
              </div>
              <Badge color={statusColor(s.status)}>{s.status}</Badge>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
};

export default Home;
