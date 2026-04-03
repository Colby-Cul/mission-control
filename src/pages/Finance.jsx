import { useMemo } from "react";
import { Badge, Card, KPI } from "../components/shared";
import { C, AGENTS } from "../data/constants";
import { useMissionControlData } from "../context/MissionControlDataContext";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from "recharts";

const HUMAN_RATE = 75;
const CHART_COLORS = ["#6366f1","#10b981","#f59e0b","#0ea5e9","#8b5cf6","#ec4899","#14b8a6","#ef4444","#D4AF37","#1E3A5F"];
const TT = { backgroundColor:"#1f2937", border:"1px solid #374151", borderRadius:8, color:"#f9fafb", fontSize:12 };
function fmtCost(v) { const n=Number(v); return isFinite(n)?`$${n.toFixed(2)}`:"$0.00"; }

const Finance = () => {
  const { acpSessions=[], projects=[], agents } = useMissionControlData();

  const totalCost = acpSessions.reduce((s,t) => s+(t.totalCost||0), 0);
  const totalTokens = acpSessions.reduce((s,t) => s+(t.tokens||0), 0);
  const estHours = acpSessions.length * 0.15;
  const humanEquiv = estHours * HUMAN_RATE;
  const savings = humanEquiv - totalCost;
  const roi = totalCost > 0 ? Math.round(((humanEquiv-totalCost)/totalCost)*100) : 0;
  const dailyBurn = totalCost / 30;
  const monthlyBudget = 5000;
  const budgetPct = Math.min(Math.round((totalCost/monthlyBudget)*100),100);

  // Cost by agent
  const costByAgent = useMemo(() => AGENTS.map((a,i) => {
    const sessions = acpSessions.filter(s => s.agent===a.id);
    const cost = sessions.reduce((sum,s) => sum+(s.totalCost||0),0);
    return { name: a.name||a.id, cost: Math.round(cost*100)/100, sessions: sessions.length, fill: a.color||CHART_COLORS[i%CHART_COLORS.length] };
  }).filter(a => a.cost > 0 || a.sessions > 0).sort((a,b) => b.cost-a.cost), [acpSessions]);

  // Cost by model (pie)
  const costByModel = useMemo(() => {
    const map = {};
    acpSessions.forEach(s => {
      const m = (s.model||"unknown").replace("openai/","").replace("anthropic/","");
      map[m] = (map[m]||0) + (s.totalCost||0);
    });
    return Object.entries(map).map(([name,value]) => ({name,value:Math.round(value*100)/100})).filter(d=>d.value>0);
  }, [acpSessions]);

  // Cost by project
  const costByProject = useMemo(() => projects.map((p,i) => ({
    name: p.name?.length > 25 ? p.name.slice(0,23)+"…" : p.name,
    cost: Math.round((p.totalCost||0)*100)/100,
    fill: CHART_COLORS[i%CHART_COLORS.length]
  })).filter(p=>p.cost>0), [projects]);

  // Forecast
  const forecast = [30,60,90].map(d => ({ days: `${d}d`, cost: Math.round(dailyBurn*d*100)/100, savings: Math.round(((humanEquiv/30)*d - dailyBurn*d)*100)/100 }));

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <h1 style={{fontSize:24,fontWeight:700,color:C.text,margin:0}}>Finance</h1>
      <div style={{fontSize:13,color:C.muted}}>AI cost tracking · ROI analysis · Budget monitoring</div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(6, 1fr)",gap:10}}>
        <KPI label="AI Spend" value={fmtCost(totalCost)} sub="All sessions" color={C.purple} />
        <KPI label="Human Equiv" value={fmtCost(humanEquiv)} sub={`${estHours.toFixed(1)}h × $${HUMAN_RATE}`} color={C.amber} />
        <KPI label="Savings" value={fmtCost(savings)} sub={savings>0?"Advantage":"Over"} color={savings>0?C.green:C.red} />
        <KPI label="ROI" value={`${roi}%`} sub="AI vs Human" color={roi>0?C.green:C.red} />
        <KPI label="Daily Burn" value={fmtCost(dailyBurn)} sub="Avg/day" color={C.cyan} />
        <KPI label="Budget" value={`${budgetPct}%`} sub={`${fmtCost(totalCost)} / ${fmtCost(monthlyBudget)}`} color={budgetPct>80?C.red:C.green} />
      </div>

      {/* Budget bar */}
      <Card>
        <div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:10}}>Budget vs Actual</div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{flex:1,background:C.bg,borderRadius:6,height:24,overflow:"hidden"}}>
            <div style={{width:`${budgetPct}%`,height:"100%",background:budgetPct>80?C.red:C.green,borderRadius:6,transition:"width 0.5s"}} />
          </div>
          <span style={{fontSize:14,fontWeight:700,color:C.text}}>{budgetPct}%</span>
        </div>
      </Card>

      {/* Charts */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Card>
          <div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:16}}>Cost by Agent</div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={costByAgent} layout="vertical">
              <XAxis type="number" tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}`} />
              <YAxis type="category" dataKey="name" tick={{fill:C.text,fontSize:11}} axisLine={false} tickLine={false} width={100} />
              <Tooltip contentStyle={TT} formatter={v=>`$${v}`} />
              <Bar dataKey="cost" radius={[0,4,4,0]}>
                {costByAgent.map((entry,i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:16}}>Cost by Model</div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={costByModel} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                {costByModel.map((_,i) => <Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={TT} formatter={v=>`$${v}`} />
              <Legend wrapperStyle={{fontSize:11,color:C.muted}} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Card>
          <div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:16}}>Cost by Project</div>
          {costByProject.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={costByProject}>
                <XAxis dataKey="name" tick={{fill:C.muted,fontSize:10}} axisLine={false} tickLine={false} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}`} />
                <Tooltip contentStyle={TT} formatter={v=>`$${v}`} />
                <Bar dataKey="cost" radius={[4,4,0,0]}>
                  {costByProject.map((entry,i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div style={{color:C.muted,textAlign:"center",padding:30}}>No project cost data</div>}
        </Card>

        <Card>
          <div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:16}}>Cash Flow Forecast</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={forecast}>
              <XAxis dataKey="days" tick={{fill:C.muted,fontSize:12}} axisLine={false} tickLine={false} />
              <YAxis tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}`} />
              <Tooltip contentStyle={TT} formatter={v=>`$${v}`} />
              <Bar dataKey="cost" fill={C.red} radius={[4,4,0,0]} name="Projected Cost" />
              <Bar dataKey="savings" fill={C.green} radius={[4,4,0,0]} name="Projected Savings" />
              <Legend wrapperStyle={{fontSize:11}} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
};
export default Finance;
