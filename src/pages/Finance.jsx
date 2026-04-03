import { Badge, Card, KPI } from "../components/shared";
import { C, AGENTS } from "../data/constants";
import { useMissionControlData } from "../context/MissionControlDataContext";

const HUMAN_RATE = 75;
function fmtCost(v) { const n = Number(v); return isFinite(n) ? `$${n.toFixed(2)}` : "$0.00"; }

const Finance = () => {
  const { acpSessions = [], projects = [], agents } = useMissionControlData();

  const totalCost = acpSessions.reduce((s, t) => s + (t.totalCost || 0), 0);
  const totalSessions = acpSessions.length;
  const estHours = totalSessions * 0.15;
  const humanEquiv = estHours * HUMAN_RATE;
  const savings = humanEquiv - totalCost;
  const roi = totalCost > 0 ? Math.round(((humanEquiv - totalCost) / totalCost) * 100) : 0;
  const dailyBurn = totalCost / 30;
  const monthlyBudget = 5000;
  const budgetPct = monthlyBudget > 0 ? Math.min(Math.round((totalCost / monthlyBudget) * 100), 100) : 0;

  const agentCosts = AGENTS.map(a => {
    const sessions = acpSessions.filter(s => s.agent === a.id);
    return { ...a, cost: sessions.reduce((sum, s) => sum + (s.totalCost || 0), 0), sessionCount: sessions.length };
  }).sort((a, b) => b.cost - a.cost);

  const forecast = [
    { label: "30 days", cost: dailyBurn * 30, save: (humanEquiv / 30) * 30 - dailyBurn * 30 },
    { label: "60 days", cost: dailyBurn * 60, save: (humanEquiv / 30) * 60 - dailyBurn * 60 },
    { label: "90 days", cost: dailyBurn * 90, save: (humanEquiv / 30) * 90 - dailyBurn * 90 },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Finance</h1>
      <div style={{ fontSize: 13, color: C.muted }}>AI cost tracking · ROI analysis · Budget monitoring</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        <KPI label="Total AI Spend" value={fmtCost(totalCost)} sub="All sessions" color={C.purple} />
        <KPI label="Human Equivalent" value={fmtCost(humanEquiv)} sub={`${estHours.toFixed(1)}h × $${HUMAN_RATE}/hr`} color={C.amber} />
        <KPI label="Net Savings" value={fmtCost(savings)} sub={savings > 0 ? "Cost advantage" : "Over"} color={savings > 0 ? C.green : C.red} />
        <KPI label="ROI" value={`${roi}%`} sub="AI vs Human" color={roi > 0 ? C.green : C.red} />
        <KPI label="Daily Burn" value={fmtCost(dailyBurn)} sub="Avg/day" color={C.cyan} />
        <KPI label="Budget" value={`${budgetPct}%`} sub={`${fmtCost(totalCost)} / ${fmtCost(monthlyBudget)}`} color={budgetPct > 80 ? C.red : C.green} />
      </div>

      <Card>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Budget vs Actual</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, background: C.bg, borderRadius: 6, height: 20, overflow: "hidden" }}>
            <div style={{ width: `${budgetPct}%`, height: "100%", background: budgetPct > 80 ? C.red : C.green, borderRadius: 6 }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{budgetPct}%</span>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Cost by Agent</div>
          {agentCosts.map(a => (
            <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: a.color || C.cyan, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 600, fontSize: 10 }}>{a.initials}</div>
                <span style={{ fontSize: 13, color: C.text }}>{a.name}</span>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{fmtCost(a.cost)}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{a.sessionCount} sessions</div>
              </div>
            </div>
          ))}
        </Card>

        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Cost by Project</div>
          {projects.map(p => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 13, color: C.text }}>{p.name}</span>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{fmtCost(p.totalCost)}</div>
            </div>
          ))}
        </Card>
      </div>

      <Card>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Cash Flow Forecast</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {forecast.map(f => (
            <div key={f.label} style={{ padding: 12, borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`, textAlign: "center" }}>
              <div style={{ fontSize: 12, color: C.muted }}>{f.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginTop: 4 }}>{fmtCost(f.cost)}</div>
              <div style={{ fontSize: 12, color: f.save > 0 ? C.green : C.red, marginTop: 4 }}>{fmtCost(f.save)} {f.save > 0 ? "saved" : "over"}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default Finance;
