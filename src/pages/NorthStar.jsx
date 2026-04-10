import { useMemo } from "react";
import { Card, KPI } from "../components/shared";
import { C } from "../data/constants";
import { useMissionControlData } from "../context/MissionControlDataContext";

const ENTITIES = [
  { id: "cabo-tropic", name: "Cabo Tropic Horizon Enterprises", type: "LP", state: "CA" },
  { id: "culbertson", name: "Culbertson & Culbertson", type: "LLC", state: "CA" },
  { id: "xome-home", name: "Xome Home", type: "LLC", state: "CA" },
  { id: "ca-stays", name: "California Stays Holdings", type: "LP", state: "CA" },
  { id: "blc-ca", name: "BLC CA Properties", type: "LLC", state: "CA" },
  { id: "alabama-shores", name: "Alabama Shores Management", type: "LLC", state: "AL" },
  { id: "lincoln-hodl", name: "Lincoln Hodl", type: "LLC", state: "NV" },
];

const ACCOUNTS = [
  { name: "Business Adv Relationship", mask: "6502", type: "depository", bal: 165231.84, entity: "Xome Home" },
  { name: "Business Adv Relationship", mask: "9165", type: "depository", bal: 137863.33, entity: "Culbertson & Culbertson" },
  { name: "Acorns Investing", mask: "6adc", type: "investment", bal: 88015.35, entity: "Personal" },
  { name: "Business Gold Card", mask: "3009", type: "credit", bal: -71420.05, entity: "Culbertson & Culbertson" },
  { name: "Business Platinum Card", mask: "1005", type: "credit", bal: -31914.41, entity: "Xome Home" },
  { name: "Chanel's Early Account", mask: "b356", type: "investment", bal: 27312.86, entity: "Personal" },
  { name: "Cash's Early Account", mask: "ede0", type: "investment", bal: 24774.78, entity: "Personal" },
  { name: "Southwest Rapid Rewards", mask: "1944", type: "credit", bal: -18710.45, entity: "BLC CA Props" },
  { name: "CA Stays Holdings — Checking", mask: "7281", type: "depository", bal: 16317.21, entity: "CA Stays" },
  { name: "Marriott Bonvoy Boundless", mask: "3981", type: "credit", bal: -15665.57, entity: "Cabo Tropic" },
  { name: "Cabo Tropic — Owners Pay", mask: "7967", type: "depository", bal: 12022.27, entity: "Cabo Tropic" },
  { name: "Cabo Tropic — Taxes", mask: "7944", type: "depository", bal: 3651.58, entity: "Cabo Tropic" },
  { name: "Acorns Checking", mask: "6475", type: "depository", bal: 2906.97, entity: "Personal" },
  { name: "Cabo Tropic — Profit", mask: "2335", type: "depository", bal: 2455.33, entity: "Cabo Tropic" },
  { name: "Cabo Tropic — OpEx", mask: "7970", type: "depository", bal: 1893.42, entity: "Cabo Tropic" },
  { name: "Uriah's Early Account", mask: "48d8", type: "investment", bal: 1718.99, entity: "Personal" },
  { name: "Alabama Shores — Checking", mask: "2922", type: "depository", bal: 1000, entity: "Alabama Shores" },
  { name: "Lincoln Hodl — Checking", mask: "1868", type: "depository", bal: 1000, entity: "Lincoln Hodl" },
  { name: "Cabo Tropic — Revenue", mask: "2334", type: "depository", bal: 250, entity: "Cabo Tropic" },
];

const PROPERTIES = [
  { address: "7246 Orchard Cir", city: "Penryn", state: "CA", entity: "Cabo Tropic", value: 607400, ownedEquity: 607400, isRental: false },
  { address: "47 Shasta Trl", city: "Graeagle", state: "CA", entity: "BLC CA Props", value: 685900, ownedEquity: 342950, isRental: true },
  { address: "210 Bitter Brush Way", city: "Truckee", state: "CA", entity: "CA Stays", value: 2540600, ownedEquity: 1270300, isRental: true },
];

const PRIORITY_ACTIONS = [
  { icon: "\u{1F534}", text: "Q2 Estimated Taxes due Jun 15 \u2014 $31,450 across all entities", tag: "Tax", tagColor: "#fb7185" },
  { icon: "\u{1F7E1}", text: "Cabo Tropic OpEx account low ($1,893) \u2014 transfer needed", tag: "Cash Flow", tagColor: "#fbbf24" },
  { icon: "\u{1F7E2}", text: "STR Website 3 tasks from launch \u2014 unblocks Welcome Book project", tag: "Projects", tagColor: "#34d399" },
  { icon: "\u{1F4B0}", text: "Cost Segregation study on Truckee property saves $35K-$55K in taxes", tag: "Tax Strategy", tagColor: "#f97316" },
  { icon: "\u{1F4CA}", text: "Credit card balances at $138K \u2014 review for balance transfer opportunities", tag: "Debt", tagColor: "#818cf8" },
];

const fmtMoney = (v) => {
  const a = Math.abs(v);
  if (a >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
};

const fmtFull = (v) => `$${v.toLocaleString("en", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

function GradientBar({ pct, height = 5 }) {
  return (
    <div style={{ height, background: "rgba(255,255,255,.06)", borderRadius: height, width: "100%", overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: "linear-gradient(90deg, #f97316, #ec4899, #8b5cf6)", borderRadius: height, transition: "width .6s ease" }} />
    </div>
  );
}

function MiniAreaChart({ data, width = 120, height = 40, c1 = "#f97316", c2 = "#ec4899" }) {
  if (!data?.length) return null;
  const mx = Math.max(...data), mn = Math.min(...data), rg = mx - mn || 1;
  const pts = data.map((v, i) => [i / (data.length - 1) * width, (1 - (v - mn) / rg) * (height - 6) + 3]);
  const path = "M" + pts.map(p => p.join(",")).join("L");
  const uid = "ns" + Math.random().toString(36).slice(2, 6);
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c1} stopOpacity=".25" /><stop offset="100%" stopColor={c2} stopOpacity=".02" /></linearGradient>
        <linearGradient id={uid + "s"} x1="0%" y1="0%" x2="100%"><stop offset="0%" stopColor={c1} /><stop offset="100%" stopColor={c2} /></linearGradient>
      </defs>
      <path d={`${path}L${width},${height}L0,${height}Z`} fill={`url(#${uid})`} />
      <path d={path} fill="none" stroke={`url(#${uid}s)`} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function Donut({ pct, size = 100, sw = 8, children }) {
  const r = (size - sw) / 2, c = 2 * Math.PI * r, off = c - (pct / 100) * c;
  return (
    <div style={{ position: "relative", width: size, height: size, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={size} height={size} style={{ position: "absolute", transform: "rotate(-90deg)" }}>
        <defs><linearGradient id="ns-dg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f97316" /><stop offset="50%" stopColor="#ec4899" /><stop offset="100%" stopColor="#8b5cf6" /></linearGradient></defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.05)" strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#ns-dg)" strokeWidth={sw} strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)" }} />
      </svg>
      <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}

const NorthStar = () => {
  const liquid = ACCOUNTS.filter(a => a.type === "depository").reduce((s, a) => s + a.bal, 0);
  const investments = ACCOUNTS.filter(a => a.type === "investment").reduce((s, a) => s + a.bal, 0);
  const creditDebt = ACCOUNTS.filter(a => a.type === "credit").reduce((s, a) => s + Math.abs(a.bal), 0);
  const realEstateEquity = PROPERTIES.reduce((s, p) => s + p.ownedEquity, 0);
  const netWorth = liquid + investments + realEstateEquity - creditDebt;
  const monthlyPropertyIncome = 8200;
  const monthlyBusinessIncome = 22000;
  const monthlyExpenses = 23250;
  const monthlyCashFlow = monthlyPropertyIncome + monthlyBusinessIncome - monthlyExpenses;

  const wealthData = [1800, 1950, 2100, 2050, 2200, 2350, 2280, 2420, 2510, 2571];
  const cashData = [14, 16, 12, 19, 17, 22, 18, 21, 25, 19];
  const yearPct = ((netWorth / 10000000) * 100).toFixed(1);

  const totalAssets = realEstateEquity + investments + liquid;
  const portfolio = [
    { label: "Real Estate (Owned Equity)", val: realEstateEquity, color: "#f97316", pct: Math.round(realEstateEquity / totalAssets * 100) },
    { label: "Liquid Cash", val: liquid, color: "#34d399", pct: Math.round(liquid / totalAssets * 100) },
    { label: "Investments", val: investments, color: "#818cf8", pct: Math.round(investments / totalAssets * 100) },
  ];

  return (
    <div>
      {/* Hero KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 20 }}>
        <Card style={{ position: "relative", overflow: "hidden" }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#8b5cf6" }} />Net Worth
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, background: "linear-gradient(135deg, #f97316, #ec4899, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: -1 }}>{fmtFull(netWorth)}</div>
          <div style={{ fontSize: 12, color: "#34d399" }}>+$48K this month</div>
          <div style={{ position: "absolute", bottom: 0, right: 0, opacity: 0.5 }}><MiniAreaChart data={wealthData} c1="#8b5cf6" c2="#ec4899" /></div>
        </Card>
        <Card style={{ position: "relative", overflow: "hidden" }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399" }} />Monthly Cash Flow
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#34d399", letterSpacing: -1 }}>{fmtFull(monthlyCashFlow)}</div>
          <div style={{ fontSize: 12, color: C.muted }}>income − expenses</div>
          <div style={{ position: "absolute", bottom: 0, right: 0, opacity: 0.5 }}><MiniAreaChart data={cashData} c1="#34d399" c2="#06b6d4" /></div>
        </Card>
        <Card>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f97316" }} />Liquid Cash
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: C.text, letterSpacing: -1 }}>{fmtFull(Math.round(liquid))}</div>
          <div style={{ fontSize: 12, color: C.muted }}>across all accounts</div>
        </Card>
        <Card>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fb7185" }} />Total Debt
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#fb7185", letterSpacing: -1 }}>{fmtFull(Math.round(creditDebt))}</div>
          <div style={{ fontSize: 12, color: C.muted }}>credit cards</div>
        </Card>
        <Card>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fbbf24" }} />Real Estate Equity
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#fbbf24", letterSpacing: -1 }}>{fmtMoney(realEstateEquity)}</div>
          <div style={{ fontSize: 12, color: C.muted }}>3 properties (owned share)</div>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Left column */}
        <div>
          {/* Goal Tracker */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 10 }}>50-Year Goal: Billionaire</div>
            <Card style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <Donut pct={Number(yearPct) > 100 ? 100 : Number(yearPct)}>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "monospace" }}>{yearPct}%</div>
                <div style={{ fontSize: 9, color: C.muted }}>TO $10M</div>
              </Donut>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 8 }}>Next milestone: <b style={{ color: C.text }}>$10M by 2030</b></div>
                <GradientBar pct={Number(yearPct)} height={6} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted, marginTop: 6 }}>
                  <span>Current: {fmtMoney(netWorth)}</span>
                  <span>Gap: {fmtMoney(10000000 - netWorth)}</span>
                </div>
                <div style={{ marginTop: 10, fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
                  At current growth rate of <b style={{ color: "#fbbf24" }}>18% annually</b>, you'll reach $10M by <b style={{ color: "#34d399" }}>2031</b>.
                  Increasing cash flow by $8K/mo accelerates this to <b style={{ color: "#f97316" }}>2029</b>.
                </div>
              </div>
            </Card>
          </div>

          {/* Priority Actions */}
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 10 }}>Today's Priority Actions</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {PRIORITY_ACTIONS.map((a, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: C.card, borderRadius: 8, border: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 16 }}>{a.icon}</span>
                  <span style={{ flex: 1, fontSize: 13, color: C.muted, lineHeight: 1.5 }}>{a.text}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: a.tagColor + "15", color: a.tagColor, border: `1px solid ${a.tagColor}25` }}>{a.tag}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div>
          {/* Portfolio Breakdown */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 10 }}>Portfolio Breakdown</div>
            <Card>
              {portfolio.map((r, i) => (
                <div key={i} style={{ marginBottom: i < portfolio.length - 1 ? 14 : 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: C.muted, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: r.color }} />{r.label}
                    </span>
                    <span style={{ fontSize: 13, fontFamily: "monospace", color: C.text }}>
                      {fmtFull(Math.round(r.val))} <span style={{ color: C.muted, fontSize: 11 }}>{r.pct}%</span>
                    </span>
                  </div>
                  <div style={{ height: 4, background: "rgba(255,255,255,.05)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${r.pct}%`, background: r.color, borderRadius: 2, transition: "width .5s ease" }} />
                  </div>
                </div>
              ))}
            </Card>
          </div>

          {/* Entities */}
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 10 }}>Entities</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {ENTITIES.map(e => (
                <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: C.card, borderRadius: 8, border: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 11, fontFamily: "monospace", color: C.muted, background: C.surface, padding: "2px 6px", borderRadius: 4, minWidth: 24, textAlign: "center" }}>{e.state}</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.text }}>{e.name}</span>
                  <span style={{ fontSize: 12, color: C.muted }}>{e.type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NorthStar;
