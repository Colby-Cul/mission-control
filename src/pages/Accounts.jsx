import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, KPI, Badge, Table } from "../components/shared";
import { C } from "../data/constants";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import PlaidLink from "../components/PlaidLink";
import entityData from "../data/entity-data.json";

const TABS = ["Overview", "Banking", "Investments", "Real Estate", "Crypto"];
const CHART_COLORS = ["#10b981","#0ea5e9","#8b5cf6","#f59e0b","#ec4899","#6366f1","#14b8a6","#ef4444","#D4AF37","#1E3A5F"];
const TT = { backgroundColor:"#1f2937", border:"1px solid #374151", borderRadius:8, color:"#f9fafb", fontSize:12 };
const CATEGORY_COLORS = {
  FOOD_AND_DRINK: "#f59e0b", TRAVEL: "#0ea5e9", TRANSPORTATION: "#8b5cf6",
  ENTERTAINMENT: "#ec4899", GENERAL_MERCHANDISE: "#14b8a6", TRANSFER_OUT: "#6366f1",
  RENT_AND_UTILITIES: "#ef4444", PERSONAL_CARE: "#D4AF37", INCOME: "#10b981",
  LOAN_PAYMENTS: "#1E3A5F", OTHER: "#9ca3af",
};

const fmtMoney = (v) => {
  const n = Number(v);
  if (!isFinite(n)) return "$0";
  return n >= 1000000 ? `$${(n / 1000000).toFixed(2)}M`
    : n >= 1000 ? `$${(n / 1000).toFixed(1)}K`
    : `$${n.toFixed(2)}`;
};

const fmtFullMoney = (v) => {
  const n = Number(v);
  if (!isFinite(n)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
};

const fmtCategory = (cat) => {
  if (!cat) return "Other";
  return cat.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()).replace(/ And /g, " & ");
};

const Accounts = () => {
  const [tab, setTab] = useState("Overview");
  const [summary, setSummary] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [accountTransactions, setAccountTransactions] = useState([]);
  const [holdings, setHoldings] = useState([]);
  const [cryptoHoldings, setCryptoHoldings] = useState([]);
  const [properties, setProperties] = useState([]);
  const [editingProperty, setEditingProperty] = useState(null);
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [connectScope, setConnectScope] = useState("personal");
  const [connectEntity, setConnectEntity] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, accountsRes, txnRes] = await Promise.all([
        fetch("/api/plaid/summary").then(r => r.json()),
        fetch("/api/plaid/accounts").then(r => r.json()),
        fetch("/api/plaid/transactions?limit=200").then(r => r.json()),
      ]);
      setSummary(summaryRes);
      setAccounts(accountsRes.accounts || []);
      setAllTransactions(txnRes.transactions || []);

      const [holdingsRes, cryptoRes, propsRes] = await Promise.all([
        fetch("/api/plaid/holdings").then(r => r.json()).catch(() => ({ holdings: [] })),
        fetch("/api/coinbase/holdings").then(r => r.json()).catch(() => ({ holdings: [] })),
        fetch("/api/properties").then(r => r.json()).catch(() => ({ properties: [] })),
      ]);
      setHoldings(holdingsRes.holdings || []);
      setCryptoHoldings(cryptoRes.holdings || []);
      setProperties(propsRes.properties || []);
    } catch (err) {
      console.error("Failed to fetch financial data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchAccountTransactions = useCallback(async (accountId) => {
    try {
      const res = await fetch(`/api/plaid/transactions?account_id=${accountId}&limit=50`).then(r => r.json());
      setAccountTransactions(res.transactions || []);
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
    }
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch("/api/plaid/sync", { method: "POST" });
      await fetchData();
    } catch (err) { console.error("Sync error:", err); }
    finally { setSyncing(false); }
  };

  const bankAccounts = accounts.filter(a => a.type === "depository");
  const investmentAccounts = accounts.filter(a => a.type === "investment" || a.type === "brokerage");
  const creditAccounts = accounts.filter(a => a.type === "credit");
  const loanAccounts = accounts.filter(a => a.type === "loan");

  // Net worth composition for donut chart
  const netWorthData = useMemo(() => {
    if (!summary) return [];
    return [
      { name: "Banking", value: Math.max(0, summary.banking?.total || 0), color: "#0ea5e9" },
      { name: "Investments", value: Math.max(0, summary.investments?.total || 0), color: "#8b5cf6" },
      { name: "Real Estate Equity", value: Math.max(0, summary.real_estate?.owned_equity || 0), color: "#10b981" },
      { name: "Crypto", value: Math.max(0, summary.crypto?.total || 0), color: "#f59e0b" },
    ].filter(d => d.value > 0);
  }, [summary]);

  // Liabilities for donut chart
  const liabilitiesData = useMemo(() => {
    if (!accounts.length) return [];
    const creditTotal = creditAccounts.reduce((s, a) => s + (a.balance_current || 0), 0);
    const loanTotal = loanAccounts.reduce((s, a) => s + (a.balance_current || 0), 0);
    return [
      { name: "Credit Cards", value: creditTotal, color: "#ec4899" },
      { name: "Loans", value: loanTotal, color: "#ef4444" },
    ].filter(d => d.value > 0);
  }, [accounts, creditAccounts, loanAccounts]);

  // Spending by category
  const spendingByCategory = useMemo(() => {
    const map = {};
    allTransactions.forEach(t => {
      if (t.amount > 0) { // Plaid: positive = money out
        const cat = t.personal_finance_category || "OTHER";
        map[cat] = (map[cat] || 0) + t.amount;
      }
    });
    return Object.entries(map)
      .map(([name, value]) => ({
        name: fmtCategory(name),
        rawName: name,
        value: Math.round(value * 100) / 100,
        color: CATEGORY_COLORS[name] || "#9ca3af",
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [allTransactions]);

  // Account balances for bar chart
  const accountBalances = useMemo(() => {
    return accounts
      .filter(a => a.type === "depository" || a.type === "investment")
      .map(a => ({
        name: (a.name || "").replace("Plaid ", ""),
        balance: a.balance_current || 0,
        type: a.type,
        color: a.type === "investment" ? "#8b5cf6" : "#0ea5e9",
      }))
      .sort((a, b) => b.balance - a.balance);
  }, [accounts]);

  // Recent transactions (top 10)
  const recentTxns = useMemo(() => allTransactions.slice(0, 10), [allTransactions]);

  const totalAssets = (summary?.banking?.total || 0) + (summary?.investments?.total || 0) + (summary?.crypto?.total || 0) + (summary?.real_estate?.owned_equity || 0);
  const totalLiabilities = creditAccounts.reduce((s, a) => s + (a.balance_current || 0), 0)
    + loanAccounts.reduce((s, a) => s + (a.balance_current || 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Financial Accounts</h1>
          <div style={{ fontSize: 13, color: C.muted }}>
            Bank accounts · Investments · Crypto · Read-only via Plaid &amp; Coinbase
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={handleSync} disabled={syncing} style={{
            background: C.surface, color: C.text, border: `1px solid ${C.border}`,
            borderRadius: 8, padding: "8px 16px", fontSize: 13,
            cursor: syncing ? "wait" : "pointer", opacity: syncing ? 0.7 : 1,
          }}>
            {syncing ? "Syncing..." : "Sync Now"}
          </button>
        </div>
      </div>

      {/* KPIs */}
      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
          <KPI label="Net Worth" value={fmtMoney(summary.net_worth)} sub="Assets - Liabilities" color={C.green} />
          <KPI label="Real Estate" value={fmtMoney(summary.real_estate?.owned_equity)} sub={`${summary.real_estate?.property_count || 0} properties (your equity)`} color={"#10b981"} />
          <KPI label="Banking" value={fmtMoney(summary.banking?.total)} sub={`${bankAccounts.length} accounts`} color={"#0ea5e9"} />
          <KPI label="Investments" value={fmtMoney(summary.investments?.total)} sub={`${investmentAccounts.length} accounts`} color={C.purple} />
          <KPI label="Credit" value={fmtMoney(summary.credit?.total_balance)} sub={summary.credit?.total_limit ? `${Math.round((summary.credit?.total_balance || 0) / Math.max(1, summary.credit?.total_limit || 1) * 100)}% utilized` : "No cards linked"} color={C.red} />
          <KPI label="Institutions" value={summary.linked_institutions || 0} sub={summary.linked_institutions ? "Connected" : "Link accounts below"} color={C.accent} />
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.border}` }}>
        {TABS.map(t => (
          <button key={t} onClick={() => { setTab(t); setSelectedAccount(null); setAccountTransactions([]); }}
            style={{
              background: "none", border: "none",
              borderBottom: tab === t ? `2px solid ${C.accent}` : "2px solid transparent",
              color: tab === t ? C.text : C.muted,
              padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}>{t}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: C.muted, textAlign: "center", padding: 40 }}>Loading financial data...</div>
      ) : (
        <>
          {/* ═══════ OVERVIEW TAB ═══════ */}
          {tab === "Overview" && (
            <>
              {/* Charts Row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {/* Net Worth Composition */}
                <Card>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>Net Worth Composition</div>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>
                    Assets: {fmtFullMoney(totalAssets)} · Liabilities: {fmtFullMoney(totalLiabilities)}
                  </div>
                  {netWorthData.length > 0 ? (
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <ResponsiveContainer width="60%" height={200}>
                        <PieChart>
                          <Pie data={netWorthData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value">
                            {netWorthData.map((d, i) => <Cell key={i} fill={d.color} />)}
                          </Pie>
                          <Tooltip contentStyle={TT} formatter={v => fmtFullMoney(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                        {netWorthData.map((d, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flexShrink: 0 }} />
                            <span style={{ color: C.muted, fontSize: 12, flex: 1 }}>{d.name}</span>
                            <span style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{fmtFullMoney(d.value)}</span>
                          </div>
                        ))}
                        {liabilitiesData.map((d, i) => (
                          <div key={`l${i}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flexShrink: 0 }} />
                            <span style={{ color: C.muted, fontSize: 12, flex: 1 }}>{d.name}</span>
                            <span style={{ color: C.red, fontSize: 13, fontWeight: 600 }}>-{fmtFullMoney(d.value)}</span>
                          </div>
                        ))}
                        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 6, display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: C.text, fontSize: 13, fontWeight: 700 }}>Net Worth</span>
                          <span style={{ color: C.green, fontSize: 14, fontWeight: 700 }}>{fmtFullMoney(summary?.net_worth)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: C.muted, textAlign: "center", padding: 30 }}>No account data yet</div>
                  )}
                </Card>

                {/* Spending by Category */}
                <Card>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>Spending by Category</div>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>
                    {allTransactions.length} transactions · {fmtFullMoney(spendingByCategory.reduce((s, c) => s + c.value, 0))} total spend
                  </div>
                  {spendingByCategory.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={spendingByCategory} layout="vertical" margin={{ left: 10 }}>
                        <XAxis type="number" tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                        <YAxis type="category" dataKey="name" tick={{ fill: C.text, fontSize: 11 }} axisLine={false} tickLine={false} width={110} />
                        <Tooltip contentStyle={TT} formatter={v => fmtFullMoney(v)} />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Spent">
                          {spendingByCategory.map((d, i) => <Cell key={i} fill={d.color} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ color: C.muted, textAlign: "center", padding: 30 }}>
                      Link bank accounts to see spending breakdown
                    </div>
                  )}
                </Card>
              </div>

              {/* Connect Accounts CTA (show when no bank accounts) */}
              {accounts.length === 0 && (
                <Card style={{ border: `1px solid ${C.accent}40`, background: C.accent + "08" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 4 }}>Connect Your Financial Accounts</div>
                      <div style={{ fontSize: 13, color: C.muted }}>
                        Link banks, brokerages, and mortgage servicers via Plaid for real-time balances, transactions, and investment holdings.
                      </div>
                    </div>
                    <button onClick={() => setTab("Banking")} style={{
                      background: C.accent, color: "#fff", border: "none", borderRadius: 8,
                      padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
                    }}>
                      Get Started
                    </button>
                  </div>
                </Card>
              )}

              {/* Property Overview (always show if properties exist) */}
              {properties.length > 0 && (
                <Card>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Real Estate Portfolio</div>
                    <button onClick={() => setTab("Real Estate")} style={{
                      background: "none", border: "none", color: C.accent, fontSize: 12, cursor: "pointer",
                    }}>View Details →</button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(properties.length, 3)}, 1fr)`, gap: 12 }}>
                    {properties.map((p, i) => {
                      const val = p.current_value || p.zestimate || p.purchase_price || 0;
                      const mort = p.mortgage_balance || 0;
                      const ownedEq = (val - mort) * (p.ownership_pct || 100) / 100;
                      return (
                        <div key={i} style={{
                          background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`,
                          padding: 14, borderLeft: "3px solid #10b981",
                        }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>{p.address}</div>
                          <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>{p.city}, {p.state} · {p.entity_name} · {p.ownership_pct}% owned</div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, fontSize: 12 }}>
                            <div><span style={{ color: C.muted }}>Value: </span><span style={{ color: C.text, fontWeight: 600 }}>{fmtMoney(val)}</span></div>
                            <div><span style={{ color: C.muted }}>Mortgage: </span><span style={{ color: mort > 0 ? C.red : C.muted }}>{mort > 0 ? fmtMoney(mort) : "TBD"}</span></div>
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: C.green, marginTop: 6 }}>
                            Your Equity: {fmtMoney(ownedEq)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {/* Account Balances Chart + Recent Transactions */}
              {(accountBalances.length > 0 || recentTxns.length > 0) && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {/* Account Balances */}
                <Card>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Account Balances</div>
                  {accountBalances.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={accountBalances}>
                        <XAxis dataKey="name" tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} angle={-20} textAnchor="end" height={50} />
                        <YAxis tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(0) + "K" : v}`} />
                        <Tooltip contentStyle={TT} formatter={v => fmtFullMoney(v)} />
                        <Bar dataKey="balance" radius={[4, 4, 0, 0]} name="Balance">
                          {accountBalances.map((d, i) => <Cell key={i} fill={d.color} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ color: C.muted, textAlign: "center", padding: 30 }}>Link accounts to see balances</div>
                  )}
                </Card>

                {/* Recent Transactions */}
                <Card>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Recent Transactions</div>
                  {recentTxns.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                      {recentTxns.map((t, i) => (
                        <div key={i} style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "8px 0", borderBottom: i < recentTxns.length - 1 ? `1px solid ${C.border}` : "none",
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {t.merchant_name || t.name}
                            </div>
                            <div style={{ fontSize: 11, color: C.muted }}>{t.date}</div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                            {t.personal_finance_category && (
                              <span style={{
                                fontSize: 10, padding: "2px 6px", borderRadius: 4,
                                background: (CATEGORY_COLORS[t.personal_finance_category] || "#9ca3af") + "22",
                                color: CATEGORY_COLORS[t.personal_finance_category] || "#9ca3af",
                              }}>
                                {fmtCategory(t.personal_finance_category)}
                              </span>
                            )}
                            <span style={{
                              fontSize: 13, fontWeight: 600, minWidth: 70, textAlign: "right",
                              color: t.amount < 0 ? C.green : C.text,
                            }}>
                              {t.amount < 0 ? "+" : ""}{fmtFullMoney(Math.abs(t.amount))}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: C.muted, textAlign: "center", padding: 30 }}>No transactions</div>
                  )}
                </Card>
              </div>
              )}

              {/* All Accounts Grid */}
              {accounts.length > 0 && (
              <Card>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>All Accounts</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
                  {accounts.map((a, i) => {
                    const typeColors = { depository: "#0ea5e9", investment: "#8b5cf6", credit: "#ec4899", loan: "#ef4444", brokerage: "#8b5cf6" };
                    const accentColor = typeColors[a.type] || C.muted;
                    return (
                      <div key={i} style={{
                        background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`,
                        padding: 14, cursor: a.type === "depository" ? "pointer" : "default",
                        borderLeft: `3px solid ${accentColor}`,
                      }}
                        onClick={() => {
                          if (a.type === "depository") { setSelectedAccount(a.id); fetchAccountTransactions(a.id); setTab("Banking"); }
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{a.name?.replace("Plaid ", "")}</span>
                          <span style={{ fontSize: 10, color: accentColor, background: accentColor + "22", padding: "2px 6px", borderRadius: 4 }}>
                            {a.subtype || a.type}
                          </span>
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: a.type === "credit" || a.type === "loan" ? C.red : C.green }}>
                          {a.type === "credit" || a.type === "loan" ? "-" : ""}{fmtFullMoney(a.balance_current)}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                          <span style={{ fontSize: 11, color: C.muted }}>
                            {a.plaid_items?.institution_name} {a.mask ? `••${a.mask}` : ""}
                          </span>
                          <span style={{
                            fontSize: 10, padding: "1px 5px", borderRadius: 3,
                            background: a.account_scope === "business" ? C.purple + "22" : C.cyan + "22",
                            color: a.account_scope === "business" ? C.purple : C.cyan,
                          }}>
                            {a.account_scope}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
              )}
            </>
          )}

          {/* ═══════ BANKING TAB ═══════ */}
          {tab === "Banking" && (
            <>
              {/* Connect bar */}
              <Card style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <select value={connectScope} onChange={e => setConnectScope(e.target.value)}
                    style={{ background: C.surface, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 10px", fontSize: 13 }}>
                    <option value="personal">Personal</option>
                    <option value="business">Business</option>
                  </select>
                  {connectScope === "business" && (
                    <select value={connectEntity || ""} onChange={e => setConnectEntity(e.target.value || null)}
                      style={{ background: C.surface, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 10px", fontSize: 13 }}>
                      <option value="">Select entity...</option>
                      {entityData.entities.map(e => <option key={e.id} value={e.id}>{e.shortName}</option>)}
                    </select>
                  )}
                </div>
                <PlaidLink onSuccess={() => fetchData()} products={["transactions"]} accountScope={connectScope} entityId={connectEntity} buttonLabel="Link Bank Account" />
              </Card>

              {bankAccounts.length === 0 ? (
                <Card><div style={{ color: C.muted, textAlign: "center", padding: 20 }}>No bank accounts linked yet.</div></Card>
              ) : (
                <Table
                  columns={["Institution", "Account", "Type", "Balance", "Available", "Entity"]}
                  rows={bankAccounts.map(a => [
                    <span style={{ fontWeight: 600 }}>{a.plaid_items?.institution_name || "---"}</span>,
                    <span style={{ cursor: "pointer", color: C.accent }}
                      onClick={() => { setSelectedAccount(a.id); fetchAccountTransactions(a.id); }}>
                      {a.name} {a.mask ? `••${a.mask}` : ""}
                    </span>,
                    <Badge label={a.subtype || a.type} />,
                    <span style={{ fontWeight: 600, color: C.green }}>{fmtFullMoney(a.balance_current)}</span>,
                    fmtFullMoney(a.balance_available),
                    <EntitySelect accountId={a.id} currentEntity={a.entity_id} currentScope={a.account_scope} onUpdate={fetchData} />,
                  ])}
                />
              )}

              {/* Credit Cards */}
              {creditAccounts.length > 0 && (
                <>
                  <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginTop: 8 }}>Credit Cards</div>
                  <Table
                    columns={["Account", "Balance", "Available", "Utilization", "Entity"]}
                    rows={creditAccounts.map(a => {
                      const util = a.balance_limit ? Math.round(a.balance_current / a.balance_limit * 100) : 0;
                      return [
                        <span style={{ fontWeight: 600 }}>{a.name} {a.mask ? `••${a.mask}` : ""}</span>,
                        <span style={{ fontWeight: 600, color: C.red }}>{fmtFullMoney(a.balance_current)}</span>,
                        fmtFullMoney(a.balance_available),
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ flex: 1, background: C.bg, borderRadius: 4, height: 8, overflow: "hidden", maxWidth: 80 }}>
                            <div style={{ width: `${util}%`, height: "100%", background: util > 50 ? C.red : C.green, borderRadius: 4 }} />
                          </div>
                          <span style={{ fontSize: 12, color: util > 50 ? C.red : C.muted }}>{util}%</span>
                        </div>,
                        <EntitySelect accountId={a.id} currentEntity={a.entity_id} currentScope={a.account_scope} onUpdate={fetchData} />,
                      ];
                    })}
                  />
                </>
              )}

              {/* Loans */}
              {loanAccounts.length > 0 && (
                <>
                  <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginTop: 8 }}>Loans</div>
                  <Table
                    columns={["Account", "Type", "Balance", "Entity"]}
                    rows={loanAccounts.map(a => [
                      <span style={{ fontWeight: 600 }}>{a.name} {a.mask ? `••${a.mask}` : ""}</span>,
                      <Badge label={a.subtype || "loan"} />,
                      <span style={{ fontWeight: 600, color: C.red }}>{fmtFullMoney(a.balance_current)}</span>,
                      <EntitySelect accountId={a.id} currentEntity={a.entity_id} currentScope={a.account_scope} onUpdate={fetchData} />,
                    ])}
                  />
                </>
              )}

              {/* Transaction detail */}
              {selectedAccount && accountTransactions.length > 0 && (
                <Card>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: C.text }}>Recent Transactions</div>
                    <button onClick={() => { setSelectedAccount(null); setAccountTransactions([]); }}
                      style={{ background: "none", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 6, padding: "4px 12px", fontSize: 12, cursor: "pointer" }}>Close</button>
                  </div>
                  <Table
                    columns={["Date", "Description", "Category", "Amount"]}
                    rows={accountTransactions.map(t => [
                      t.date,
                      <div>
                        <div style={{ fontWeight: 500 }}>{t.name}</div>
                        {t.merchant_name && t.merchant_name !== t.name && <div style={{ fontSize: 11, color: C.muted }}>{t.merchant_name}</div>}
                      </div>,
                      t.personal_finance_category
                        ? <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, background: (CATEGORY_COLORS[t.personal_finance_category] || "#9ca3af") + "22", color: CATEGORY_COLORS[t.personal_finance_category] || "#9ca3af" }}>{fmtCategory(t.personal_finance_category)}</span>
                        : <span style={{ color: C.muted }}>---</span>,
                      <span style={{ fontWeight: 600, color: t.amount < 0 ? C.green : C.text }}>
                        {t.amount < 0 ? "+" : ""}{fmtFullMoney(Math.abs(t.amount))}
                      </span>,
                    ])}
                  />
                </Card>
              )}
            </>
          )}

          {/* ═══════ INVESTMENTS TAB ═══════ */}
          {tab === "Investments" && (
            <>
              <Card style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <select value={connectScope} onChange={e => setConnectScope(e.target.value)}
                    style={{ background: C.surface, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 10px", fontSize: 13 }}>
                    <option value="personal">Personal</option>
                    <option value="business">Business</option>
                  </select>
                </div>
                <PlaidLink onSuccess={() => fetchData()} products={["investments", "transactions"]} accountScope={connectScope} entityId={connectEntity} buttonLabel="Link Brokerage" />
              </Card>

              {investmentAccounts.length === 0 ? (
                <Card><div style={{ color: C.muted, textAlign: "center", padding: 20 }}>No investment accounts linked yet. Connect E*TRADE, Schwab, or Edward Jones above.</div></Card>
              ) : (
                <Table
                  columns={["Institution", "Account", "Type", "Value", "Scope"]}
                  rows={investmentAccounts.map(a => [
                    <span style={{ fontWeight: 600 }}>{a.plaid_items?.institution_name || "---"}</span>,
                    a.name,
                    <Badge label={a.subtype || a.type} />,
                    <span style={{ fontWeight: 600, color: C.green }}>{fmtFullMoney(a.balance_current)}</span>,
                    <Badge label={a.account_scope} color={a.account_scope === "business" ? C.purple : C.cyan} />,
                  ])}
                />
              )}

              {holdings.length > 0 && (
                <Card>
                  <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 12 }}>Holdings</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                    {holdings.map((h, i) => {
                      const sec = h.securities;
                      const gain = h.institution_value && h.cost_basis ? h.institution_value - h.cost_basis : null;
                      const gainPct = gain && h.cost_basis ? (gain / h.cost_basis * 100) : null;
                      return (
                        <div key={i} style={{ background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`, padding: 16 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <div>
                              <span style={{ fontWeight: 700, color: C.text, fontSize: 16 }}>{sec?.ticker_symbol || "---"}</span>
                              <span style={{ color: C.muted, fontSize: 12, marginLeft: 8 }}>{sec?.name?.slice(0, 30)}</span>
                            </div>
                            <Badge label={sec?.type || "---"} />
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 13 }}>
                            <div><span style={{ color: C.muted }}>Qty: </span><span style={{ color: C.text }}>{h.quantity}</span></div>
                            <div><span style={{ color: C.muted }}>Price: </span><span style={{ color: C.text }}>{fmtFullMoney(h.institution_price)}</span></div>
                            <div><span style={{ color: C.muted }}>Value: </span><span style={{ color: C.text, fontWeight: 600 }}>{fmtFullMoney(h.institution_value)}</span></div>
                            <div><span style={{ color: C.muted }}>Cost: </span><span style={{ color: C.text }}>{fmtFullMoney(h.cost_basis)}</span></div>
                          </div>
                          {gain !== null && (
                            <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: gain >= 0 ? C.green : C.red }}>
                              {gain >= 0 ? "+" : ""}{fmtFullMoney(gain)} ({gainPct?.toFixed(1)}%)
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}
            </>
          )}

          {/* ═══════ REAL ESTATE TAB ═══════ */}
          {tab === "Real Estate" && (
            <RealEstateTab
              properties={properties}
              onRefresh={fetchData}
              entityData={entityData}
            />
          )}

          {/* ═══════ CRYPTO TAB ═══════ */}
          {tab === "Crypto" && (
            <>
              <Card style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ color: C.muted, fontSize: 13 }}>Connect your Coinbase account for crypto portfolio tracking</span>
                <a href="/api/coinbase/connect" style={{
                  background: C.accent, color: "#fff", border: "none", borderRadius: 8,
                  padding: "10px 20px", fontSize: 14, fontWeight: 600, textDecoration: "none",
                }}>Connect Coinbase</a>
              </Card>
              {cryptoHoldings.length === 0 ? (
                <Card><div style={{ color: C.muted, textAlign: "center", padding: 20 }}>No crypto accounts connected.</div></Card>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
                  {cryptoHoldings.map((h, i) => (
                    <Card key={i}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontWeight: 700, color: C.text, fontSize: 18 }}>{h.currency}</span>
                        <Badge label="Coinbase" color={C.amber} />
                      </div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: C.green, marginBottom: 4 }}>{fmtFullMoney(h.balance_usd)}</div>
                      <div style={{ fontSize: 13, color: C.muted }}>{h.balance} {h.currency}</div>
                      {h.cost_basis && (
                        <div style={{ fontSize: 13, marginTop: 6, color: (h.balance_usd - h.cost_basis) >= 0 ? C.green : C.red }}>
                          P/L: {fmtFullMoney(h.balance_usd - h.cost_basis)}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Footer sync info */}
          {summary?.last_sync && (
            <div style={{ fontSize: 12, color: C.muted, textAlign: "right" }}>
              Last synced: {new Date(summary.last_sync).toLocaleString()}
              {" · "}{summary.linked_institutions} institution{summary.linked_institutions !== 1 ? "s" : ""} linked
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════
// Entity Assignment Dropdown Component
// ═══════════════════════════════════════════════
const EntitySelect = ({ accountId, currentEntity, currentScope, onUpdate }) => {
  const handleChange = async (e) => {
    const val = e.target.value;
    const entity_id = val === "personal" ? null : val;
    const account_scope = val === "personal" ? "personal" : "business";
    try {
      await fetch("/api/plaid/assign-entity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_id: accountId, entity_id, account_scope }),
      });
      onUpdate();
    } catch (err) {
      console.error("Entity assign error:", err);
    }
  };

  const entities = entityData.entities || [];
  const currentVal = currentEntity || (currentScope === "personal" ? "personal" : "");

  return (
    <select value={currentVal} onChange={handleChange}
      style={{
        background: C.surface, color: C.text, border: `1px solid ${C.border}`,
        borderRadius: 5, padding: "3px 6px", fontSize: 11, cursor: "pointer",
        maxWidth: 130,
      }}>
      <option value="personal">Personal</option>
      {entities.map(e => <option key={e.id} value={e.id}>{e.shortName}</option>)}
      {currentEntity && !entities.find(e => e.id === currentEntity) && (
        <option value={currentEntity}>{currentEntity}</option>
      )}
    </select>
  );
};

// ═══════════════════════════════════════════════
// Real Estate Tab Component
// ═══════════════════════════════════════════════
const EMPTY_PROPERTY = {
  address: "", city: "", state: "CA", zip: "", property_type: "residential",
  entity_id: "", entity_name: "", ownership_pct: 100,
  purchase_price: "", purchase_date: "", current_value: "", mortgage_balance: "",
  mortgage_rate: "", mortgage_payment: "", is_rental: false, lodgify_id: "", monthly_expenses: "", notes: "",
};

const RealEstateTab = ({ properties, onRefresh, entityData }) => {
  const [editing, setEditing] = useState(null); // property object or EMPTY
  const [saving, setSaving] = useState(false);
  const [fetchingZestimate, setFetchingZestimate] = useState(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...editing };
      // Clean numeric fields
      ["purchase_price", "current_value", "mortgage_balance", "mortgage_rate", "mortgage_payment", "ownership_pct", "monthly_expenses"]
        .forEach(k => { if (payload[k] === "") payload[k] = null; else if (payload[k]) payload[k] = Number(payload[k]); });
      if (payload.is_rental === "false") payload.is_rental = false;

      await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setEditing(null);
      onRefresh();
    } catch (err) { console.error("Save error:", err); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this property?")) return;
    await fetch("/api/properties", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    onRefresh();
  };

  const handleFetchZestimate = async (prop) => {
    setFetchingZestimate(prop.id);
    try {
      const fullAddress = `${prop.address}, ${prop.city}, ${prop.state} ${prop.zip || ""}`.trim();
      const res = await fetch("/api/properties/zestimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ property_id: prop.id, address: fullAddress }),
      });
      const data = await res.json();
      if (data.zestimate) {
        onRefresh();
      } else {
        alert(data.error || "Could not fetch Zestimate");
      }
    } catch (err) { alert("Zestimate fetch failed: " + err.message); }
    finally { setFetchingZestimate(null); }
  };

  const totalValue = properties.reduce((s, p) => s + (p.current_value || p.zestimate || p.purchase_price || 0), 0);
  const totalMortgage = properties.reduce((s, p) => s + (p.mortgage_balance || 0), 0);
  const totalOwnedEquity = properties.reduce((s, p) => {
    const val = p.current_value || p.zestimate || p.purchase_price || 0;
    return s + (val - (p.mortgage_balance || 0)) * (p.ownership_pct || 100) / 100;
  }, 0);

  const InputField = ({ label, field, type = "text", placeholder = "" }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 11, color: C.muted, fontWeight: 500 }}>{label}</label>
      <input type={type} value={editing[field] || ""} placeholder={placeholder}
        onChange={e => setEditing({ ...editing, [field]: e.target.value })}
        style={{ background: C.surface, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 10px", fontSize: 13 }}
      />
    </div>
  );

  return (
    <>
      {/* Summary KPIs */}
      {properties.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          <KPI label="Total Value" value={fmtMoney(totalValue)} sub={`${properties.length} properties`} color={"#10b981"} />
          <KPI label="Total Mortgage" value={fmtMoney(totalMortgage)} sub="Outstanding balance" color={C.red} />
          <KPI label="Total Equity" value={fmtMoney(totalValue - totalMortgage)} sub="Value - Mortgage" color={C.cyan} />
          <KPI label="Your Equity" value={fmtMoney(totalOwnedEquity)} sub="Ownership-adjusted" color={C.green} />
        </div>
      )}

      {/* Add Property button */}
      <Card style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ color: C.muted, fontSize: 13 }}>Manage property assets with Zillow Zestimate valuations</span>
        <button onClick={() => setEditing({ ...EMPTY_PROPERTY })}
          style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          Add Property
        </button>
      </Card>

      {/* Property Cards */}
      {properties.length === 0 && !editing && (
        <Card><div style={{ color: C.muted, textAlign: "center", padding: 20 }}>No properties added yet. Click "Add Property" to track your real estate assets.</div></Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 12 }}>
        {properties.map((p) => {
          const marketVal = p.current_value || p.zestimate || p.purchase_price || 0;
          const equity = marketVal - (p.mortgage_balance || 0);
          const ownedEquity = equity * (p.ownership_pct || 100) / 100;
          const appreciation = p.purchase_price ? ((marketVal - p.purchase_price) / p.purchase_price * 100) : null;

          return (
            <Card key={p.id} style={{ padding: 0, overflow: "hidden" }}>
              {/* Header */}
              <div style={{ background: "linear-gradient(135deg, #065f46 0%, #047857 100%)", padding: "14px 16px" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{p.address}</div>
                <div style={{ fontSize: 12, color: "#a7f3d0" }}>{p.city}, {p.state} {p.zip}</div>
              </div>

              <div style={{ padding: 16 }}>
                {/* Value and equity */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: C.muted }}>Market Value</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: C.text }}>{fmtFullMoney(marketVal)}</div>
                    {p.valuation_source === "zillow_rapidapi" && (
                      <div style={{ fontSize: 10, color: C.muted }}>
                        Zestimate · {p.zestimate_updated_at ? new Date(p.zestimate_updated_at).toLocaleDateString() : ""}
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: C.muted }}>Your Equity ({p.ownership_pct}%)</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: C.green }}>{fmtFullMoney(ownedEquity)}</div>
                    {appreciation !== null && (
                      <div style={{ fontSize: 10, color: appreciation >= 0 ? C.green : C.red }}>
                        {appreciation >= 0 ? "+" : ""}{appreciation.toFixed(1)}% since purchase
                      </div>
                    )}
                  </div>
                </div>

                {/* Details grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, fontSize: 12, marginBottom: 12 }}>
                  <div><span style={{ color: C.muted }}>Purchase: </span><span style={{ color: C.text }}>{p.purchase_price ? fmtFullMoney(p.purchase_price) : "---"}</span></div>
                  <div><span style={{ color: C.muted }}>Mortgage: </span><span style={{ color: C.red }}>{p.mortgage_balance ? fmtFullMoney(p.mortgage_balance) : "$0"}</span></div>
                  <div><span style={{ color: C.muted }}>Equity: </span><span style={{ color: C.green }}>{fmtFullMoney(equity)}</span></div>
                </div>

                {/* Entity and tags */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {p.entity_name && <Badge label={p.entity_name} color={C.purple} />}
                    {p.is_rental && <Badge label="Rental" color={C.amber} />}
                    <Badge label={`${p.ownership_pct}% owned`} color={C.cyan} />
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 8, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                  <button onClick={() => handleFetchZestimate(p)} disabled={fetchingZestimate === p.id}
                    style={{ flex: 1, background: C.surface, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 0", fontSize: 12, cursor: "pointer", opacity: fetchingZestimate === p.id ? 0.6 : 1 }}>
                    {fetchingZestimate === p.id ? "Fetching..." : "Update Zestimate"}
                  </button>
                  {p.zillow_zpid && (
                    <a href={`https://www.zillow.com/homedetails/${p.zillow_zpid}_zpid/`} target="_blank" rel="noopener noreferrer"
                      style={{ background: C.surface, color: "#0074e4", border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 12px", fontSize: 12, textAlign: "center", textDecoration: "none" }}>
                      Zillow
                    </a>
                  )}
                  <button onClick={() => setEditing({ ...p })}
                    style={{ flex: 1, background: C.surface, color: C.accent, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 0", fontSize: 12, cursor: "pointer" }}>
                    Edit
                  </button>
                  <button onClick={() => handleDelete(p.id)}
                    style={{ background: C.surface, color: C.red, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>
                    Delete
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add/Edit Form Modal */}
      {editing && (
        <Card style={{ border: `1px solid ${C.accent}` }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 16 }}>
            {editing.id ? "Edit Property" : "Add Property"}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <InputField label="Street Address" field="address" placeholder="47 Shasta Trl" />
            <InputField label="City" field="city" placeholder="Graeagle" />
            <InputField label="State" field="state" placeholder="CA" />
            <InputField label="ZIP" field="zip" placeholder="96103" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <InputField label="Purchase Price" field="purchase_price" type="number" placeholder="500000" />
            <InputField label="Current Value / Zestimate" field="current_value" type="number" placeholder="650000" />
            <InputField label="Mortgage Balance" field="mortgage_balance" type="number" placeholder="350000" />
            <InputField label="Ownership %" field="ownership_pct" type="number" placeholder="50" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <InputField label="Mortgage Rate %" field="mortgage_rate" type="number" placeholder="6.5" />
            <InputField label="Monthly Payment" field="mortgage_payment" type="number" placeholder="2200" />
            <InputField label="Purchase Date" field="purchase_date" type="date" />
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11, color: C.muted, fontWeight: 500 }}>Entity</label>
              <select value={editing.entity_id || ""} onChange={e => {
                const ent = entityData.entities.find(x => x.id === e.target.value);
                setEditing({ ...editing, entity_id: e.target.value, entity_name: ent?.shortName || "" });
              }}
                style={{ background: C.surface, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 10px", fontSize: 13 }}>
                <option value="">Personal</option>
                {entityData.entities.map(e => <option key={e.id} value={e.id}>{e.shortName}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={editing.is_rental || false} onChange={e => setEditing({ ...editing, is_rental: e.target.checked })} />
              <span style={{ fontSize: 13, color: C.text }}>Vacation Rental</span>
            </div>
            <InputField label="Monthly Expenses" field="monthly_expenses" type="number" placeholder="3830" />
            <InputField label="Notes" field="notes" placeholder="Optional notes" />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleSave} disabled={saving || !editing.address || !editing.city}
              style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Saving..." : editing.id ? "Update Property" : "Add Property"}
            </button>
            <button onClick={() => setEditing(null)}
              style={{ background: "none", color: C.muted, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 24px", fontSize: 14, cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        </Card>
      )}
    </>
  );
};

export default Accounts;
