import { useState, useEffect } from "react";
import { Card } from "../components/shared";
import { C } from "../data/constants";
import { supabase } from "../lib/supabase";

const fmtMoney = (v) => {
  const a = Math.abs(v);
  if (a >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
};

const fmtFull = (v) => `$${Math.abs(v).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function MiniAreaChart({ data, width = 110, height = 36, c1 = "#f97316", c2 = "#ec4899" }) {
  if (!data?.length) return null;
  const mx = Math.max(...data), mn = Math.min(...data), rg = mx - mn || 1;
  const pts = data.map((v, i) => [i / (data.length - 1) * width, (1 - (v - mn) / rg) * (height - 6) + 3]);
  const path = "M" + pts.map(p => p.join(",")).join("L");
  const uid = "cf" + Math.random().toString(36).slice(2, 6);
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

const CashFlowPage = () => {
  const [accounts, setAccounts] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [acctRes, propRes] = await Promise.all([
          supabase.from("financial_accounts").select("*"),
          supabase.from("property_assets").select("*"),
        ]);
        if (acctRes.error) throw acctRes.error;
        if (propRes.error) throw propRes.error;
        setAccounts(acctRes.data || []);
        setProperties(propRes.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const depository = accounts.filter(a => a.type === "depository");
  const investmentAccts = accounts.filter(a => a.type === "investment" || a.type === "brokerage");
  const creditAccts = accounts.filter(a => a.type === "credit");

  const liquidTotal = depository.reduce((s, a) => s + (a.balance_current || 0), 0);
  const investmentTotal = investmentAccts.reduce((s, a) => s + (a.balance_current || 0), 0);
  const creditTotal = creditAccts.reduce((s, a) => s + Math.abs(a.balance_current || 0), 0);

  const monthlyPropertyIncome = 8200;
  const monthlyBusinessIncome = 22000;
  const monthlyExpenses = 23250;
  const monthlyCashFlow = monthlyPropertyIncome + monthlyBusinessIncome - monthlyExpenses;
  const savingsRate = Math.round(monthlyCashFlow / (monthlyBusinessIncome + monthlyPropertyIncome) * 100);

  const incomeData = [18, 22, 19, 26, 24, 28, 22, 30, 25, 28];
  const expenseData = [14, 16, 15, 18, 17, 19, 16, 20, 18, 23];

  const typeBadge = (type, subtype) => {
    const colors = {
      credit: { bg: "rgba(248,113,113,.08)", color: "#fb7185" },
      investment: { bg: "rgba(129,140,248,.08)", color: "#818cf8" },
      brokerage: { bg: "rgba(129,140,248,.08)", color: "#818cf8" },
      depository: { bg: "rgba(52,211,153,.08)", color: "#34d399" },
    };
    const c = colors[type] || colors.depository;
    return (
      <span style={{ fontSize: 11, fontFamily: "monospace", background: c.bg, color: c.color, padding: "2px 6px", borderRadius: 4 }}>
        {subtype || type}
      </span>
    );
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: C.muted }}>Loading financial data...</div>;
  }

  if (error) {
    return <div style={{ padding: 40, textAlign: "center", color: C.red }}>Error loading data: {error}</div>;
  }

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        <Card style={{ position: "relative", overflow: "hidden" }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399" }} />Monthly Income
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#34d399", letterSpacing: -1 }}>{fmtFull(monthlyBusinessIncome + monthlyPropertyIncome)}</div>
          <div style={{ fontSize: 12, color: C.muted }}>business + rental</div>
          <div style={{ position: "absolute", bottom: 0, right: 0, opacity: 0.5 }}><MiniAreaChart data={incomeData} c1="#34d399" c2="#06b6d4" /></div>
        </Card>
        <Card style={{ position: "relative", overflow: "hidden" }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fb7185" }} />Monthly Expenses
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#fb7185", letterSpacing: -1 }}>{fmtFull(monthlyExpenses)}</div>
          <div style={{ fontSize: 12, color: C.muted }}>property + personal</div>
          <div style={{ position: "absolute", bottom: 0, right: 0, opacity: 0.5 }}><MiniAreaChart data={expenseData} c1="#fb7185" c2="#f43f5e" /></div>
        </Card>
        <Card>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fbbf24" }} />Net Cash Flow
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, background: "linear-gradient(135deg, #f97316, #ec4899, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: -1 }}>{fmtFull(monthlyCashFlow)}</div>
          <div style={{ fontSize: 12, color: C.muted }}>available to invest/save</div>
        </Card>
        <Card>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#818cf8" }} />Savings Rate
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#818cf8", letterSpacing: -1 }}>{savingsRate}%</div>
          <div style={{ fontSize: 12, color: C.muted }}>of gross income</div>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Accounts Table */}
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 10 }}>
            Accounts <span style={{ fontSize: 12, color: C.muted, fontWeight: 400 }}>({accounts.length})</span>
          </div>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Account", "Entity", "Type", "Balance"].map(h => (
                    <th key={h} style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: ".5px", padding: "10px 12px", textAlign: h === "Balance" ? "right" : "left", borderBottom: `1px solid ${C.border}`, fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {accounts.sort((a, b) => Math.abs(b.balance_current || 0) - Math.abs(a.balance_current || 0)).map((a, i) => (
                  <tr key={a.id || i} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,.02)" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 500, color: C.text, fontSize: 13 }}>
                      {a.name} <span style={{ color: C.muted, fontSize: 11 }}>{a.mask ? `\u00B7\u00B7\u00B7${a.mask}` : ""}</span>
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: 12, color: C.muted }}>{a.entity_id || a.account_scope || "\u2014"}</td>
                    <td style={{ padding: "10px 12px" }}>{typeBadge(a.type, a.subtype)}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "monospace", fontSize: 13, color: (a.balance_current || 0) < 0 ? "#fb7185" : C.text }}>
                      {(a.balance_current || 0) < 0 ? `-${fmtFull(a.balance_current)}` : fmtFull(a.balance_current || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {accounts.length === 0 && (
              <div style={{ padding: 30, textAlign: "center", color: C.muted, fontSize: 13 }}>No financial accounts connected yet. Connect via Plaid on the Accounts page.</div>
            )}
          </Card>
        </div>

        {/* Properties */}
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 10 }}>
            Properties <span style={{ fontSize: 12, color: C.muted, fontWeight: 400 }}>({properties.length})</span>
          </div>
          {properties.length === 0 && (
            <Card><div style={{ textAlign: "center", color: C.muted, fontSize: 13 }}>No properties added yet.</div></Card>
          )}
          {properties.map((p, i) => {
            const val = p.current_value || p.zestimate || p.purchase_price || 0;
            const mort = p.mortgage_balance || 0;
            const pct = p.ownership_pct || 100;
            const ownedEquity = (val - mort) * pct / 100;
            const monthlyPayment = p.monthly_payment || 0;
            const monthlyExpenses = p.monthly_expenses || 0;
            return (
              <Card key={p.id || i} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{p.address || "Property"}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>{[p.city, p.state].filter(Boolean).join(", ")}{p.entity ? ` \u2014 ${p.entity}` : ""}</div>
                  </div>
                  {p.is_rental && (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 4, background: "rgba(251,191,36,.1)", color: "#fbbf24" }}>STR</span>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 11, color: C.muted }}>Value</div>
                    <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "monospace", color: C.text }}>{fmtMoney(val)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: C.muted }}>Owned Equity</div>
                    <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "monospace", color: "#34d399" }}>{fmtMoney(ownedEquity)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: C.muted }}>Mortgage Pmt</div>
                    <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "monospace", color: C.text }}>{monthlyPayment ? `$${monthlyPayment.toLocaleString()}/mo` : "\u2014"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: C.muted }}>Monthly Exp</div>
                    <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "monospace", color: "#fb7185" }}>{monthlyExpenses ? `$${monthlyExpenses.toLocaleString()}/mo` : "\u2014"}</div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CashFlowPage;
