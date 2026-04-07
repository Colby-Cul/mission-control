import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, KPI, Badge, Table } from "../components/shared";
import { C } from "../data/constants";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import PlaidLink from "../components/PlaidLink";
import entityData from "../data/entity-data.json";

const TABS = ["Overview", "Banking", "Investments", "Crypto"];
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

      const [holdingsRes, cryptoRes] = await Promise.all([
        fetch("/api/plaid/holdings").then(r => r.json()).catch(() => ({ holdings: [] })),
        fetch("/api/coinbase/holdings").then(r => r.json()).catch(() => ({ holdings: [] })),
      ]);
      setHoldings(holdingsRes.holdings || []);
      setCryptoHoldings(cryptoRes.holdings || []);
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

  const totalAssets = (summary?.banking?.total || 0) + (summary?.investments?.total || 0) + (summary?.crypto?.total || 0);
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
          <KPI label="Total Assets" value={fmtMoney(totalAssets)} sub={`${bankAccounts.length + investmentAccounts.length} accounts`} color={C.cyan} />
          <KPI label="Banking" value={fmtMoney(summary.banking?.total)} sub={`${bankAccounts.length} accounts`} color={"#0ea5e9"} />
          <KPI label="Investments" value={fmtMoney(summary.investments?.total)} sub={`${investmentAccounts.length} accounts`} color={C.purple} />
          <KPI label="Credit" value={fmtMoney(summary.credit?.total_balance)} sub={`${Math.round((summary.credit?.total_balance || 0) / Math.max(1, summary.credit?.total_limit || 1) * 100)}% utilized`} color={C.red} />
          <KPI label="Institutions" value={summary.linked_institutions} sub="Connected" color={C.accent} />
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
                    <div style={{ color: C.muted, textAlign: "center", padding: 30 }}>No transaction data</div>
                  )}
                </Card>
              </div>

              {/* Account Balances Chart + Recent Transactions */}
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
                    <div style={{ color: C.muted, textAlign: "center", padding: 30 }}>No accounts</div>
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

              {/* All Accounts Grid */}
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
                  columns={["Institution", "Account", "Type", "Balance", "Available", "Scope"]}
                  rows={bankAccounts.map(a => [
                    <span style={{ fontWeight: 600 }}>{a.plaid_items?.institution_name || "---"}</span>,
                    <span style={{ cursor: "pointer", color: C.accent }}
                      onClick={() => { setSelectedAccount(a.id); fetchAccountTransactions(a.id); }}>
                      {a.name} {a.mask ? `••${a.mask}` : ""}
                    </span>,
                    <Badge label={a.subtype || a.type} />,
                    <span style={{ fontWeight: 600, color: C.green }}>{fmtFullMoney(a.balance_current)}</span>,
                    fmtFullMoney(a.balance_available),
                    <Badge label={a.account_scope} color={a.account_scope === "business" ? C.purple : C.cyan} />,
                  ])}
                />
              )}

              {/* Credit Cards */}
              {creditAccounts.length > 0 && (
                <>
                  <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginTop: 8 }}>Credit Cards</div>
                  <Table
                    columns={["Account", "Balance", "Available", "Utilization"]}
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
                    columns={["Account", "Type", "Balance"]}
                    rows={loanAccounts.map(a => [
                      <span style={{ fontWeight: 600 }}>{a.name} {a.mask ? `••${a.mask}` : ""}</span>,
                      <Badge label={a.subtype || "loan"} />,
                      <span style={{ fontWeight: 600, color: C.red }}>{fmtFullMoney(a.balance_current)}</span>,
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

export default Accounts;
