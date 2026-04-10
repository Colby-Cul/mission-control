import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Card, KPI } from "../components/shared";
import { C } from "../data/constants";
import { buildAgentRoster } from "../data/agentRoster";
import { useMissionControlData } from "../context/MissionControlDataContext";
import { fmtCost } from "../utils/format";
import { fetchWithMockFallback } from "../utils/mockApi";
import { useQBReport } from "../hooks/useQBReport";
import financeConfig from "../data/finance-config.json";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, AreaChart, Area, Legend,
} from "recharts";

const HUMAN_RATE = financeConfig.companies?.[0]?.humanEquivRate || 75;
const CHART_COLORS = ["#6366f1","#10b981","#f59e0b","#0ea5e9","#8b5cf6","#ec4899","#14b8a6","#ef4444","#D4AF37","#1E3A5F"];
const TT = { backgroundColor:"#1f2937", border:"1px solid #374151", borderRadius:8, color:"#f9fafb", fontSize:12 };

const FINANCE_TABS = [
  { key: "overview", label: "Overview" },
  { key: "pnl", label: "P&L" },
  { key: "cashflow", label: "Cash Flow" },
  { key: "burnrate", label: "Burn Rate" },
  { key: "ai-costs", label: "AI Costs" },
  { key: "accounts", label: "Accounts" },
];

const PERIOD_OPTIONS = [
  { key: "month", label: "This Month" },
  { key: "quarter", label: "This Quarter" },
  { key: "ytd", label: "Year to Date" },
  { key: "year", label: "Last 12 Months" },
];

function getDateRange(period) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  switch (period) {
    case "month": return { start: `${y}-${String(m+1).padStart(2,"0")}-01`, end: now.toISOString().slice(0,10) };
    case "quarter": {
      const qStart = new Date(y, Math.floor(m/3)*3, 1);
      return { start: qStart.toISOString().slice(0,10), end: now.toISOString().slice(0,10) };
    }
    case "ytd": return { start: `${y}-01-01`, end: now.toISOString().slice(0,10) };
    case "year": {
      const lastYear = new Date(y-1, m, now.getDate());
      return { start: lastYear.toISOString().slice(0,10), end: now.toISOString().slice(0,10) };
    }
    default: return { start: `${y}-01-01`, end: now.toISOString().slice(0,10) };
  }
}

// Parse QB report rows into flat data
function parseQBReportRows(report) {
  if (!report?.Rows?.Row) return [];
  const rows = [];
  const walk = (rowArr, depth = 0) => {
    (rowArr || []).forEach(row => {
      if (row.Header?.ColData) {
        rows.push({ name: row.Header.ColData[0]?.value || "", value: parseFloat(row.Header.ColData[1]?.value) || 0, depth, type: "header" });
      }
      if (row.ColData) {
        rows.push({ name: row.ColData[0]?.value || "", value: parseFloat(row.ColData[1]?.value) || 0, depth, type: "row" });
      }
      if (row.Rows?.Row) walk(row.Rows.Row, depth + 1);
      if (row.Summary?.ColData) {
        rows.push({ name: row.Summary.ColData[0]?.value || "", value: parseFloat(row.Summary.ColData[1]?.value) || 0, depth, type: "summary" });
      }
    });
  };
  walk(report.Rows.Row);
  return rows;
}

const fmtBigMoney = (v) => {
  const n = Number(v);
  if (!isFinite(n) || n === 0) return "$0";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  return abs >= 1000000 ? `${sign}$${(abs/1000000).toFixed(2)}M`
    : abs >= 1000 ? `${sign}$${(abs/1000).toFixed(1)}K`
    : `${sign}$${abs.toFixed(0)}`;
};

const Finance = () => {
  const navigate = useNavigate();
  const { acpSessions=[], projects=[], agents } = useMissionControlData();
  const allAgents = buildAgentRoster(agents, acpSessions);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [period, setPeriod] = useState("ytd");
  const companies = financeConfig.companies || [];

  // Date range for QB reports
  const { start: startDate, end: endDate } = useMemo(() => getDateRange(period), [period]);

  // QB company key for selected company
  const qbKey = useMemo(() => {
    if (selectedCompany === "all") return companies.find(c => c.qbCompanyKey)?.qbCompanyKey || "cg";
    return companies.find(c => c.id === selectedCompany)?.qbCompanyKey || null;
  }, [selectedCompany, companies]);

  // QB Reports
  const pnlReport = useQBReport("ProfitAndLoss", { companyKey: qbKey, startDate, endDate, enabled: !!qbKey && (activeTab === "overview" || activeTab === "pnl") });
  const cashFlowReport = useQBReport("CashFlow", { companyKey: qbKey, startDate, endDate, enabled: !!qbKey && (activeTab === "overview" || activeTab === "cashflow") });
  // Parsed QB data
  const pnlRows = useMemo(() => parseQBReportRows(pnlReport.data?.report), [pnlReport.data]);
  const cashFlowRows = useMemo(() => parseQBReportRows(cashFlowReport.data?.report), [cashFlowReport.data]);

  // Extract key financials from P&L
  const pnlSummary = useMemo(() => {
    const find = (keyword) => pnlRows.find(r => r.type === "summary" && r.name.toLowerCase().includes(keyword))?.value || 0;
    const revenue = find("total income") || find("income");
    const expenses = find("total expense") || find("expense");
    const netIncome = find("net income") || find("net operating") || (revenue - Math.abs(expenses));
    return { revenue, expenses: Math.abs(expenses), netIncome };
  }, [pnlRows]);

  // AI cost metrics (existing functionality preserved)
  const totalCost = acpSessions.reduce((s,t) => s+(t.totalCost||0), 0);
  const totalTokens = acpSessions.reduce((s,t) => s+(t.tokens||0), 0);
  const estHours = acpSessions.length * 0.15;
  const humanEquiv = estHours * HUMAN_RATE;
  const savings = humanEquiv - totalCost;
  const roi = totalCost > 0 ? Math.round(((humanEquiv-totalCost)/totalCost)*100) : 0;
  const dailyBurn = totalCost / 30;
  const monthlyBudget = financeConfig.companies?.[0]?.monthlyBudget || 5000;
  const budgetPct = Math.min(Math.round((totalCost/monthlyBudget)*100),100);

  // Cost by agent
  const costByAgent = useMemo(() => allAgents.map((a,i) => {
    const sessions = acpSessions.filter(s => s.agent===a.id);
    const cost = sessions.reduce((sum,s) => sum+(s.totalCost||0),0);
    return { name: a.name||a.id, cost: Math.round(cost*100)/100, sessions: sessions.length, fill: a.color||CHART_COLORS[i%CHART_COLORS.length] };
  }).filter(a => a.cost > 0 || a.sessions > 0).sort((a,b) => b.cost-a.cost), [acpSessions, allAgents]);

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
    name: p.name?.length > 25 ? p.name.slice(0,23)+"\u2026" : p.name,
    cost: Math.round((p.totalCost||0)*100)/100,
    fill: CHART_COLORS[i%CHART_COLORS.length]
  })).filter(p=>p.cost>0), [projects]);

  // Burn rate data (daily over last 30 days)
  const burnRateData = useMemo(() => {
    const dailyMap = {};
    acpSessions.forEach(s => {
      const d = (s.dateCreated || s.dateFinished || "").slice(0, 10);
      if (d) dailyMap[d] = (dailyMap[d] || 0) + (s.totalCost || 0);
    });
    return Object.entries(dailyMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-30)
      .map(([date, cost]) => ({ date: date.slice(5), cost: Math.round(cost * 100) / 100 }));
  }, [acpSessions]);

  // Forecast
  const forecast = [30,60,90].map(d => ({ days: `${d}d`, cost: Math.round(dailyBurn*d*100)/100, savings: Math.round(((humanEquiv/30)*d - dailyBurn*d)*100)/100 }));

  // Financial accounts summary
  const [finSummary, setFinSummary] = useState(null);
  useEffect(() => {
    fetchWithMockFallback("/api/plaid/summary")
      .then(r => r.json())
      .then(data => { if (data && !data.error) setFinSummary(data); })
      .catch(() => {});
  }, []);

  // QB connection status
  const qbConnected = !pnlReport.error || pnlReport.loading;
  const hasQBData = pnlRows.length > 0;

  // Runway calculation
  const monthlyBurn = dailyBurn * 30;
  const cashOnHand = finSummary?.banking?.total || 0;
  const runwayMonths = monthlyBurn > 0 ? Math.round(cashOnHand / monthlyBurn) : Infinity;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{fontSize:24,fontWeight:700,color:C.text,margin:0}}>Finance</h1>
          <div style={{fontSize:13,color:C.muted,marginTop:4}}>Financial reporting, cash flow, and cost management</div>
        </div>
      </div>

      {/* Company selector */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>Company:</span>
        <button onClick={() => setSelectedCompany("all")} style={{
          background: selectedCompany === "all" ? C.accent : C.surface,
          color: selectedCompany === "all" ? "#fff" : C.muted,
          border: `1px solid ${selectedCompany === "all" ? C.accent : C.border}`,
          borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>All Companies</button>
        {companies.map(co => (
          <button key={co.id} onClick={() => setSelectedCompany(co.id)} style={{
            background: selectedCompany === co.id ? C.accent : C.surface,
            color: selectedCompany === co.id ? "#fff" : C.muted,
            border: `1px solid ${selectedCompany === co.id ? C.accent : C.border}`,
            borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>{co.shortName || co.name}</button>
        ))}
      </div>

      {/* Tab navigation */}
      <div style={{ display: "flex", gap: 4, padding: 4, background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, flexWrap: "wrap" }}>
        {FINANCE_TABS.map(tab => (
          <button key={tab.key} onClick={() => tab.key === "accounts" ? navigate("/accounts") : setActiveTab(tab.key)} style={{
            background: activeTab === tab.key ? C.accent : "transparent",
            color: activeTab === tab.key ? "#fff" : C.muted,
            border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}>{tab.label}</button>
        ))}
      </div>

      {/* ═══════ OVERVIEW TAB ═══════ */}
      {activeTab === "overview" && (
        <>
          {/* KPI Row */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))",gap:10}}>
            {hasQBData ? (
              <>
                <KPI label="Revenue" value={fmtBigMoney(pnlSummary.revenue)} sub={PERIOD_OPTIONS.find(p=>p.key===period)?.label} color={C.green} />
                <KPI label="Expenses" value={fmtBigMoney(pnlSummary.expenses)} sub={PERIOD_OPTIONS.find(p=>p.key===period)?.label} color={C.red} />
                <KPI label="Net Income" value={fmtBigMoney(pnlSummary.netIncome)} sub={pnlSummary.netIncome >= 0 ? "Profitable" : "Loss"} color={pnlSummary.netIncome >= 0 ? C.green : C.red} />
              </>
            ) : (
              <>
                <KPI label="AI Spend" value={fmtCost(totalCost)} sub="All sessions" color={C.purple} />
                <KPI label="Human Equiv" value={fmtCost(humanEquiv)} sub={`${estHours.toFixed(1)}h x $${HUMAN_RATE}`} color={C.amber} />
                <KPI label="ROI" value={`${roi}%`} sub="AI vs Human" color={roi>0?C.green:C.red} />
              </>
            )}
            <KPI label="Cash on Hand" value={fmtBigMoney(cashOnHand)} sub={finSummary ? "Banking total" : "Connect Plaid"} color={C.cyan} />
            <KPI label="Burn Rate" value={fmtCost(monthlyBurn)} sub="Monthly AI cost" color={C.amber} />
            <KPI label="Runway" value={runwayMonths === Infinity ? "\u221E" : `${runwayMonths}mo`} sub="At current burn" color={runwayMonths > 12 ? C.green : runwayMonths > 6 ? C.amber : C.red} />
          </div>

          {/* Period selector */}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>Period:</span>
            {PERIOD_OPTIONS.map(p => (
              <button key={p.key} onClick={() => setPeriod(p.key)} style={{
                background: period === p.key ? C.accent + "22" : C.surface,
                color: period === p.key ? C.accentLight : C.muted,
                border: `1px solid ${period === p.key ? C.accent : C.border}`,
                borderRadius: 6, padding: "4px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>{p.label}</button>
            ))}
          </div>

          {/* Financial Accounts Summary */}
          {finSummary && finSummary.linked_institutions > 0 && (
            <Card>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div style={{fontSize:14,fontWeight:600,color:C.text}}>Financial Accounts</div>
                <button onClick={() => navigate("/accounts")} style={{color:C.accent,fontSize:13,textDecoration:"none",background:"none",border:"none",cursor:"pointer",padding:0}}>View All \u2192</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))",gap:10}}>
                <KPI label="Net Worth" value={fmtBigMoney(finSummary.net_worth)} sub="All accounts" color={C.green} />
                <KPI label="Banking" value={fmtBigMoney(finSummary.banking?.total)} sub={`${finSummary.banking?.accounts?.length || 0} accounts`} color={C.cyan} />
                <KPI label="Investments" value={fmtBigMoney(finSummary.investments?.total)} sub={`${finSummary.investments?.accounts?.length || 0} accounts`} color={C.purple} />
                <KPI label="Crypto" value={fmtBigMoney(finSummary.crypto?.total || 0)} sub="Coinbase" color={C.amber} />
              </div>
            </Card>
          )}

          {/* QB Status / P&L Preview */}
          {!qbKey && selectedCompany !== "all" && (
            <Card>
              <div style={{ textAlign: "center", padding: 20, color: C.muted }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>QuickBooks Not Connected</div>
                <div style={{ fontSize: 13, lineHeight: 1.6 }}>This entity doesn't have a QuickBooks connection yet. Connect it to see P&L, Cash Flow, and Balance Sheet data.</div>
              </div>
            </Card>
          )}

          {/* Charts Grid */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {/* Burn Rate Trend */}
            <Card>
              <div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:16}}>Daily AI Burn Rate (30d)</div>
              {burnRateData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={burnRateData}>
                    <XAxis dataKey="date" tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false} />
                    <YAxis tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}`} />
                    <Tooltip contentStyle={TT} formatter={v=>`$${v}`} />
                    <Area type="monotone" dataKey="cost" stroke={C.accent} fill={C.accent + "33"} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <div style={{color:C.muted,textAlign:"center",padding:30,fontSize:13}}>No burn data yet</div>}
            </Card>

            {/* Cost by Model Pie */}
            <Card>
              <div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:16}}>Cost by Model</div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={costByModel} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                    {costByModel.map((_,i) => <Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={TT} formatter={v=>`$${v}`} />
                  <Legend wrapperStyle={{fontSize:11,color:C.muted}} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {/* Cost by Agent */}
            <Card>
              <div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:16}}>Cost by Agent</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={costByAgent.slice(0, 8)} layout="vertical">
                  <XAxis type="number" tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}`} />
                  <YAxis type="category" dataKey="name" tick={{fill:C.text,fontSize:11}} axisLine={false} tickLine={false} width={90} />
                  <Tooltip contentStyle={TT} formatter={v=>`$${v}`} />
                  <Bar dataKey="cost" radius={[0,4,4,0]}>
                    {costByAgent.map((entry,i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Cash Flow Forecast */}
            <Card>
              <div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:16}}>Cash Flow Forecast</div>
              <ResponsiveContainer width="100%" height={220}>
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
        </>
      )}

      {/* ═══════ P&L TAB ═══════ */}
      {activeTab === "pnl" && (
        <>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>Period:</span>
            {PERIOD_OPTIONS.map(p => (
              <button key={p.key} onClick={() => setPeriod(p.key)} style={{
                background: period === p.key ? C.accent + "22" : C.surface,
                color: period === p.key ? C.accentLight : C.muted,
                border: `1px solid ${period === p.key ? C.accent : C.border}`,
                borderRadius: 6, padding: "4px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>{p.label}</button>
            ))}
          </div>

          {pnlReport.loading && <Card><div style={{ padding: 30, textAlign: "center", color: C.muted, fontSize: 14 }}>Loading P&L report...</div></Card>}
          {pnlReport.error && (
            <Card>
              <div style={{ padding: 20, textAlign: "center" }}>
                <div style={{ color: C.amber, fontSize: 14, fontWeight: 600, marginBottom: 8 }}>QuickBooks Not Available</div>
                <div style={{ color: C.muted, fontSize: 13, lineHeight: 1.6 }}>{pnlReport.error}</div>
                <div style={{ color: C.muted, fontSize: 13, marginTop: 8 }}>Connect QuickBooks via Settings &gt; Integrations to see live P&L data.</div>
              </div>
            </Card>
          )}

          {hasQBData && (
            <>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3, 1fr)",gap:10}}>
                <KPI label="Total Revenue" value={fmtBigMoney(pnlSummary.revenue)} sub="Income" color={C.green} />
                <KPI label="Total Expenses" value={fmtBigMoney(pnlSummary.expenses)} sub="Costs" color={C.red} />
                <KPI label="Net Income" value={fmtBigMoney(pnlSummary.netIncome)} sub={pnlSummary.netIncome >= 0 ? "Profit" : "Loss"} color={pnlSummary.netIncome >= 0 ? C.green : C.red} />
              </div>

              {/* P&L Chart */}
              <Card>
                <div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:16}}>Profit & Loss Summary</div>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={[
                    { name: "Revenue", amount: pnlSummary.revenue, fill: C.green },
                    { name: "Expenses", amount: pnlSummary.expenses, fill: C.red },
                    { name: "Net Income", amount: pnlSummary.netIncome, fill: pnlSummary.netIncome >= 0 ? C.cyan : C.red },
                  ]}>
                    <XAxis dataKey="name" tick={{fill:C.text,fontSize:13}} axisLine={false} tickLine={false} />
                    <YAxis tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>fmtBigMoney(v)} />
                    <Tooltip contentStyle={TT} formatter={v=>fmtBigMoney(v)} />
                    <Bar dataKey="amount" radius={[6,6,0,0]}>
                      {[C.green, C.red, pnlSummary.netIncome >= 0 ? C.cyan : C.red].map((c,i) => <Cell key={i} fill={c} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* P&L Detail Table */}
              <Card>
                <div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:12}}>P&L Detail</div>
                <div style={{ maxHeight: 400, overflowY: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <tbody>
                      {pnlRows.map((row, i) => (
                        <tr key={i} style={{
                          borderBottom: `1px solid ${row.type === "summary" ? C.border : C.border + "44"}`,
                          background: row.type === "summary" ? C.surface : i % 2 === 0 ? "transparent" : C.surface + "22",
                        }}>
                          <td style={{
                            padding: "8px 8px 8px " + (16 + row.depth * 20) + "px",
                            color: row.type === "summary" ? C.text : row.type === "header" ? C.accentLight : C.muted,
                            fontWeight: row.type === "summary" ? 700 : row.type === "header" ? 600 : 400,
                            fontSize: row.type === "summary" ? 14 : 13,
                          }}>{row.name}</td>
                          <td style={{
                            padding: "8px", textAlign: "right", width: 120,
                            color: row.value >= 0 ? C.text : C.red,
                            fontWeight: row.type === "summary" ? 700 : 400,
                            fontSize: row.type === "summary" ? 14 : 13,
                          }}>{row.value !== 0 ? fmtBigMoney(row.value) : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </>
      )}

      {/* ═══════ CASH FLOW TAB ═══════ */}
      {activeTab === "cashflow" && (
        <>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>Period:</span>
            {PERIOD_OPTIONS.map(p => (
              <button key={p.key} onClick={() => setPeriod(p.key)} style={{
                background: period === p.key ? C.accent + "22" : C.surface,
                color: period === p.key ? C.accentLight : C.muted,
                border: `1px solid ${period === p.key ? C.accent : C.border}`,
                borderRadius: 6, padding: "4px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>{p.label}</button>
            ))}
          </div>

          {cashFlowReport.loading && <Card><div style={{ padding: 30, textAlign: "center", color: C.muted, fontSize: 14 }}>Loading Cash Flow report...</div></Card>}
          {cashFlowReport.error && (
            <Card>
              <div style={{ padding: 20, textAlign: "center" }}>
                <div style={{ color: C.amber, fontSize: 14, fontWeight: 600, marginBottom: 8 }}>QuickBooks Not Available</div>
                <div style={{ color: C.muted, fontSize: 13, lineHeight: 1.6 }}>{cashFlowReport.error}</div>
              </div>
            </Card>
          )}

          {cashFlowRows.length > 0 && (
            <>
              {/* Cash Flow Summary KPIs */}
              {(() => {
                const operating = cashFlowRows.find(r => r.type === "summary" && r.name.toLowerCase().includes("operating"))?.value || 0;
                const investing = cashFlowRows.find(r => r.type === "summary" && r.name.toLowerCase().includes("investing"))?.value || 0;
                const financing = cashFlowRows.find(r => r.type === "summary" && r.name.toLowerCase().includes("financing"))?.value || 0;
                const netChange = operating + investing + financing;
                return (
                  <>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(4, 1fr)",gap:10}}>
                      <KPI label="Operating" value={fmtBigMoney(operating)} sub="Day-to-day" color={operating >= 0 ? C.green : C.red} />
                      <KPI label="Investing" value={fmtBigMoney(investing)} sub="Investments" color={investing >= 0 ? C.green : C.amber} />
                      <KPI label="Financing" value={fmtBigMoney(financing)} sub="Debt & equity" color={financing >= 0 ? C.green : C.amber} />
                      <KPI label="Net Change" value={fmtBigMoney(netChange)} sub="Cash position" color={netChange >= 0 ? C.green : C.red} />
                    </div>
                    <Card>
                      <div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:16}}>Cash Flow Breakdown</div>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={[
                          { name: "Operating", amount: operating, fill: operating >= 0 ? C.green : C.red },
                          { name: "Investing", amount: investing, fill: investing >= 0 ? C.cyan : C.amber },
                          { name: "Financing", amount: financing, fill: financing >= 0 ? C.purple : C.amber },
                          { name: "Net Change", amount: netChange, fill: netChange >= 0 ? C.green : C.red },
                        ]}>
                          <XAxis dataKey="name" tick={{fill:C.text,fontSize:13}} axisLine={false} tickLine={false} />
                          <YAxis tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>fmtBigMoney(v)} />
                          <Tooltip contentStyle={TT} formatter={v=>fmtBigMoney(v)} />
                          <Bar dataKey="amount" radius={[6,6,0,0]}>
                            {[operating >= 0 ? C.green : C.red, investing >= 0 ? C.cyan : C.amber, financing >= 0 ? C.purple : C.amber, netChange >= 0 ? C.green : C.red].map((c,i) => <Cell key={i} fill={c} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </Card>
                  </>
                );
              })()}

              {/* Cash Flow Detail Table */}
              <Card>
                <div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:12}}>Cash Flow Detail</div>
                <div style={{ maxHeight: 400, overflowY: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <tbody>
                      {cashFlowRows.map((row, i) => (
                        <tr key={i} style={{
                          borderBottom: `1px solid ${row.type === "summary" ? C.border : C.border + "44"}`,
                          background: row.type === "summary" ? C.surface : i % 2 === 0 ? "transparent" : C.surface + "22",
                        }}>
                          <td style={{
                            padding: "8px 8px 8px " + (16 + row.depth * 20) + "px",
                            color: row.type === "summary" ? C.text : C.muted,
                            fontWeight: row.type === "summary" ? 700 : 400, fontSize: 13,
                          }}>{row.name}</td>
                          <td style={{
                            padding: "8px", textAlign: "right", width: 120,
                            color: row.value >= 0 ? C.text : C.red,
                            fontWeight: row.type === "summary" ? 700 : 400, fontSize: 13,
                          }}>{row.value !== 0 ? fmtBigMoney(row.value) : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </>
      )}

      {/* ═══════ BURN RATE TAB ═══════ */}
      {activeTab === "burnrate" && (
        <>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))",gap:10}}>
            <KPI label="Daily Burn" value={fmtCost(dailyBurn)} sub="Avg/day" color={C.amber} />
            <KPI label="Weekly Burn" value={fmtCost(dailyBurn * 7)} sub="Avg/week" color={C.amber} />
            <KPI label="Monthly Burn" value={fmtCost(monthlyBurn)} sub="Avg/month" color={C.red} />
            <KPI label="Budget Used" value={`${budgetPct}%`} sub={`${fmtCost(totalCost)} / ${fmtCost(monthlyBudget)}`} color={budgetPct>80?C.red:C.green} />
            <KPI label="Cash on Hand" value={fmtBigMoney(cashOnHand)} sub="Banking" color={C.cyan} />
            <KPI label="Runway" value={runwayMonths === Infinity ? "\u221E" : `${runwayMonths} months`} sub="At current burn" color={runwayMonths > 12 ? C.green : runwayMonths > 6 ? C.amber : C.red} />
          </div>

          {/* Budget bar */}
          <Card>
            <div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:10}}>Budget vs Actual</div>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{flex:1,background:C.bg,borderRadius:6,height:28,overflow:"hidden"}}>
                <div style={{width:`${budgetPct}%`,height:"100%",background:budgetPct>80?C.red:C.green,borderRadius:6,transition:"width 0.5s"}} />
              </div>
              <span style={{fontSize:15,fontWeight:700,color:C.text,minWidth:50}}>{budgetPct}%</span>
            </div>
          </Card>

          {/* Burn trend */}
          <Card>
            <div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:16}}>Daily Burn Trend (30 Days)</div>
            {burnRateData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={burnRateData}>
                  <XAxis dataKey="date" tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}`} />
                  <Tooltip contentStyle={TT} formatter={v=>`$${v.toFixed(2)}`} />
                  <Area type="monotone" dataKey="cost" stroke={C.red} fill={C.red + "22"} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div style={{color:C.muted,textAlign:"center",padding:30,fontSize:13}}>No burn data available</div>}
          </Card>

          {/* Per-company burn breakdown */}
          <Card>
            <div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:16}}>Burn by Project</div>
            {costByProject.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={costByProject}>
                  <XAxis dataKey="name" tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false} angle={-15} textAnchor="end" height={50} />
                  <YAxis tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}`} />
                  <Tooltip contentStyle={TT} formatter={v=>`$${v}`} />
                  <Bar dataKey="cost" radius={[4,4,0,0]}>
                    {costByProject.map((entry,i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div style={{color:C.muted,textAlign:"center",padding:30,fontSize:13}}>No project cost data</div>}
          </Card>

          {/* Forecast */}
          <Card>
            <div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:16}}>Cost Forecast (30/60/90 Day)</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={forecast}>
                <XAxis dataKey="days" tick={{fill:C.muted,fontSize:13}} axisLine={false} tickLine={false} />
                <YAxis tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}`} />
                <Tooltip contentStyle={TT} formatter={v=>`$${v}`} />
                <Bar dataKey="cost" fill={C.red} radius={[4,4,0,0]} name="Projected Cost" />
                <Bar dataKey="savings" fill={C.green} radius={[4,4,0,0]} name="Projected Savings" />
                <Legend wrapperStyle={{fontSize:11}} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}

      {/* ═══════ AI COSTS TAB (existing functionality preserved) ═══════ */}
      {activeTab === "ai-costs" && (
        <>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))",gap:10}}>
            <KPI label="AI Spend" value={fmtCost(totalCost)} sub="All sessions" color={C.purple} />
            <KPI label="Human Equiv" value={fmtCost(humanEquiv)} sub={`${estHours.toFixed(1)}h x $${HUMAN_RATE}`} color={C.amber} />
            <KPI label="Savings" value={fmtCost(savings)} sub={savings>0?"Advantage":"Over"} color={savings>0?C.green:C.red} />
            <KPI label="ROI" value={`${roi}%`} sub="AI vs Human" color={roi>0?C.green:C.red} />
            <KPI label="Daily Burn" value={fmtCost(dailyBurn)} sub="Avg/day" color={C.cyan} />
            <KPI label="Budget" value={`${budgetPct}%`} sub={`${fmtCost(totalCost)} / ${fmtCost(monthlyBudget)}`} color={budgetPct>80?C.red:C.green} />
          </div>

          <Card>
            <div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:10}}>Budget vs Actual</div>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{flex:1,background:C.bg,borderRadius:6,height:24,overflow:"hidden"}}>
                <div style={{width:`${budgetPct}%`,height:"100%",background:budgetPct>80?C.red:C.green,borderRadius:6,transition:"width 0.5s"}} />
              </div>
              <span style={{fontSize:14,fontWeight:700,color:C.text}}>{budgetPct}%</span>
            </div>
          </Card>

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
        </>
      )}
    </div>
  );
};
export default Finance;
