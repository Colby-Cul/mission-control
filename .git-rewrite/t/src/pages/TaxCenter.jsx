import { Card } from "../components/shared";
import { C } from "../data/constants";

const TAX_DATA = {
  entities: [
    { name: "Cabo Tropic (LP)", state: "CA", type: "Partnership", filingFreq: "Quarterly", nextDue: "Jun 15, 2026", estOwed: 4200, ytdPaid: 8400, ytdIncome: 82000, deductions: 24600 },
    { name: "Culbertson & Culbertson", state: "CA", type: "LLC", filingFreq: "Quarterly", nextDue: "Jun 15, 2026", estOwed: 3100, ytdPaid: 6200, ytdIncome: 65000, deductions: 18200 },
    { name: "Xome Home", state: "CA", type: "LLC", filingFreq: "Quarterly", nextDue: "Jun 15, 2026", estOwed: 2800, ytdPaid: 5600, ytdIncome: 58000, deductions: 15400 },
    { name: "CA Stays Holdings (LP)", state: "CA", type: "Partnership", filingFreq: "Quarterly", nextDue: "Jun 15, 2026", estOwed: 1900, ytdPaid: 3800, ytdIncome: 42000, deductions: 28600 },
    { name: "BLC CA Properties", state: "CA", type: "LLC", filingFreq: "Quarterly", nextDue: "Jun 15, 2026", estOwed: 850, ytdPaid: 1700, ytdIncome: 18000, deductions: 12400 },
    { name: "Alabama Shores Mgmt", state: "AL", type: "LLC", filingFreq: "Quarterly", nextDue: "Jun 15, 2026", estOwed: 0, ytdPaid: 0, ytdIncome: 0, deductions: 0 },
    { name: "Lincoln Hodl", state: "NV", type: "LLC", filingFreq: "Annual", nextDue: "Mar 15, 2027", estOwed: 0, ytdPaid: 0, ytdIncome: 0, deductions: 0 },
    { name: "Personal (Federal)", state: "Federal", type: "Individual", filingFreq: "Quarterly", nextDue: "Jun 15, 2026", estOwed: 12400, ytdPaid: 24800, ytdIncome: 245000, deductions: 86000 },
    { name: "Personal (CA State)", state: "CA", type: "Individual", filingFreq: "Quarterly", nextDue: "Jun 15, 2026", estOwed: 6200, ytdPaid: 12400, ytdIncome: 245000, deductions: 86000 },
  ],
  moves: [
    { action: "Max SEP-IRA Contribution", deadline: "Apr 15, 2027", savings: "$18,000 \u2014 $24,000", priority: "critical", status: "open", detail: "Contribute max to SEP-IRA through Cabo Tropic before tax filing deadline. Reduces self-employment income." },
    { action: "Cost Segregation Study \u2014 Truckee", deadline: "Q2 2026", savings: "$35,000 \u2014 $55,000", priority: "critical", status: "open", detail: "Accelerate depreciation on Bitter Brush Way. Reclassify components to 5/7/15 year vs 27.5 year." },
    { action: "Elect S-Corp for Cabo Tropic", deadline: "Mar 15, 2027", savings: "$8,000 \u2014 $14,000/yr", priority: "high", status: "evaluate", detail: "S-Corp election saves self-employment tax on distributions above reasonable salary." },
    { action: "Set Up Solo 401(k)", deadline: "Dec 31, 2026", savings: "$66,000/yr shelter", priority: "high", status: "open", detail: "Higher contribution limits than SEP-IRA. Must establish before year-end." },
    { action: "Harvest Acorns Losses", deadline: "Dec 2026", savings: "$3,000+ offset", priority: "normal", status: "monitor", detail: "Review Acorns positions for tax-loss harvesting opportunities before year-end." },
    { action: "Quarterly Estimated \u2014 Q2", deadline: "Jun 15, 2026", savings: "Avoid penalties", priority: "critical", status: "upcoming", detail: "Pay Q2 estimated taxes across all entities to avoid underpayment penalties." },
    { action: "Depreciation on STR Properties", deadline: "Annual", savings: "$22,000 \u2014 $30,000", priority: "high", status: "active", detail: "Ensure proper depreciation schedules on both Graeagle and Truckee STR properties." },
    { action: "QBI Deduction Optimization", deadline: "Year-end", savings: "Up to 20% of income", priority: "high", status: "evaluate", detail: "Structure income across entities to maximize Qualified Business Income deduction." },
  ]
};

const fmtMoney = (v) => {
  const a = Math.abs(v);
  if (a >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
};

const fmtFull = (v) => `$${v.toLocaleString("en", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const stateColors = {
  CA: { bg: "rgba(249,115,22,.08)", color: "#fb923c" },
  AL: { bg: "rgba(52,211,153,.08)", color: "#34d399" },
  NV: { bg: "rgba(129,140,248,.08)", color: "#818cf8" },
  Federal: { bg: "rgba(251,191,36,.08)", color: "#fbbf24" },
};

const statusColors = {
  open: { bg: "rgba(52,211,153,.1)", color: "#34d399" },
  upcoming: { bg: "rgba(251,191,36,.1)", color: "#fbbf24" },
  evaluate: { bg: "rgba(129,140,248,.1)", color: "#818cf8" },
  active: { bg: "rgba(249,115,22,.1)", color: "#f97316" },
  monitor: { bg: "rgba(100,116,139,.06)", color: C.muted },
};

const priorityColors = {
  critical: "#f43f5e",
  high: "#f97316",
  normal: "#818cf8",
};

const TaxCenter = () => {
  const totalOwed = TAX_DATA.entities.reduce((s, e) => s + e.estOwed, 0);
  const totalPaid = TAX_DATA.entities.reduce((s, e) => s + e.ytdPaid, 0);
  const totalIncome = TAX_DATA.entities.reduce((s, e) => s + e.ytdIncome, 0);
  const totalDeductions = TAX_DATA.entities.reduce((s, e) => s + e.deductions, 0);
  const potentialSavings = TAX_DATA.moves.filter(m => m.status !== "upcoming").reduce((s, m) => {
    const match = m.savings.match(/\$([\d,]+)/);
    return s + (match ? parseInt(match[1].replace(/,/g, "")) : 0);
  }, 0);

  const actionableCount = TAX_DATA.moves.filter(m => m.status === "open" || m.status === "upcoming").length;

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 20 }}>
        <Card>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fb7185" }} />Next Quarter Due
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#fb7185", letterSpacing: -1 }}>{fmtFull(totalOwed)}</div>
          <div style={{ fontSize: 12, color: C.muted }}>due Jun 15, 2026</div>
        </Card>
        <Card>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399" }} />YTD Taxes Paid
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#34d399", letterSpacing: -1 }}>{fmtFull(totalPaid)}</div>
          <div style={{ fontSize: 12, color: C.muted }}>across all entities</div>
        </Card>
        <Card>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fbbf24" }} />YTD Income
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: C.text, letterSpacing: -1 }}>{fmtFull(totalIncome)}</div>
          <div style={{ fontSize: 12, color: C.muted }}>all sources</div>
        </Card>
        <Card>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#818cf8" }} />YTD Deductions
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#818cf8", letterSpacing: -1 }}>{fmtFull(totalDeductions)}</div>
          <div style={{ fontSize: 12, color: C.muted }}>claimed so far</div>
        </Card>
        <Card>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f97316" }} />Potential Savings
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, background: "linear-gradient(135deg, #f97316, #ec4899, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: -1 }}>{fmtMoney(potentialSavings)}+</div>
          <div style={{ fontSize: 12, color: C.muted }}>from open tax moves</div>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Quarterly Estimates Table */}
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 10 }}>Quarterly Estimates by Entity</div>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Entity", "State", "Type", "Q2 Est.", "YTD Paid", "Next Due"].map(h => (
                    <th key={h} style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: ".5px", padding: "10px 12px", textAlign: "left", borderBottom: `1px solid ${C.border}`, fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TAX_DATA.entities.map((e, i) => {
                  const sc = stateColors[e.state] || stateColors.CA;
                  return (
                    <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,.02)" }}>
                      <td style={{ padding: "10px 12px", fontWeight: 600, color: C.text, fontSize: 13 }}>{e.name}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ fontFamily: "monospace", fontSize: 11, background: sc.bg, color: sc.color, padding: "2px 6px", borderRadius: 4 }}>{e.state}</span>
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: C.muted }}>{e.type}</td>
                      <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: 13, color: e.estOwed > 0 ? "#fb7185" : C.muted }}>{e.estOwed > 0 ? `$${e.estOwed.toLocaleString()}` : "\u2014"}</td>
                      <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: 13, color: C.text }}>{e.ytdPaid > 0 ? `$${e.ytdPaid.toLocaleString()}` : "\u2014"}</td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: C.muted }}>{e.nextDue}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>

        {/* Tax Strategy Moves */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Tax Strategy Moves</div>
            <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 4, background: "rgba(249,115,22,.1)", color: "#fb923c" }}>{actionableCount} actionable</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {TAX_DATA.moves.map((m, i) => {
              const sc = statusColors[m.status] || statusColors.monitor;
              return (
                <div key={i} style={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderLeft: `3px solid ${priorityColors[m.priority] || "#818cf8"}`,
                  borderRadius: 10,
                  padding: "14px 16px",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{m.action}</div>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4, background: sc.bg, color: sc.color, flexShrink: 0, marginLeft: 8 }}>{m.status}</span>
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontFamily: "monospace", background: "rgba(249,115,22,.08)", color: "#fb923c", padding: "2px 6px", borderRadius: 4 }}>Saves {m.savings}</span>
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, marginBottom: 6 }}>{m.detail}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>Deadline: {m.deadline}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaxCenter;
