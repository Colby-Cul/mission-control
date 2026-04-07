import { useState, useEffect, useCallback } from "react";
import { Card, KPI, Badge, Table } from "../components/shared";
import { C } from "../data/constants";
import PlaidLink from "../components/PlaidLink";
import entityData from "../data/entity-data.json";

const TABS = ["Banking", "Investments", "Crypto"];

const fmtMoney = (v) => {
  const n = Number(v);
  if (!isFinite(n)) return "$0.00";
  return n >= 1000000
    ? `$${(n / 1000000).toFixed(2)}M`
    : n >= 1000
    ? `$${(n / 1000).toFixed(1)}K`
    : `$${n.toFixed(2)}`;
};

const fmtFullMoney = (v) => {
  const n = Number(v);
  if (!isFinite(n)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
};

const Accounts = () => {
  const [tab, setTab] = useState("Banking");
  const [summary, setSummary] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
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
      const [summaryRes, accountsRes] = await Promise.all([
        fetch("/api/plaid/summary").then((r) => r.json()),
        fetch("/api/plaid/accounts").then((r) => r.json()),
      ]);
      setSummary(summaryRes);
      setAccounts(accountsRes.accounts || []);

      if (tab === "Investments") {
        const holdingsRes = await fetch("/api/plaid/holdings").then((r) => r.json());
        setHoldings(holdingsRes.holdings || []);
      }

      if (tab === "Crypto") {
        const cryptoRes = await fetch("/api/coinbase/holdings").then((r) => r.json());
        setCryptoHoldings(cryptoRes.holdings || []);
      }
    } catch (err) {
      console.error("Failed to fetch financial data:", err);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchTransactions = useCallback(async (accountId) => {
    try {
      const res = await fetch(`/api/plaid/transactions?account_id=${accountId}&limit=50`).then((r) => r.json());
      setTransactions(res.transactions || []);
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
    }
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch("/api/plaid/sync", { method: "POST" });
      await fetchData();
    } catch (err) {
      console.error("Sync error:", err);
    } finally {
      setSyncing(false);
    }
  };

  const handlePlaidSuccess = () => {
    fetchData();
  };

  const bankAccounts = accounts.filter((a) => a.type === "depository");
  const investmentAccounts = accounts.filter((a) => a.type === "investment" || a.type === "brokerage");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Financial Accounts</h1>
          <div style={{ fontSize: 13, color: C.muted }}>
            Bank accounts · Investments · Crypto · Read-only via Plaid
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            onClick={handleSync}
            disabled={syncing}
            style={{
              background: C.surface,
              color: C.text,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 13,
              cursor: syncing ? "wait" : "pointer",
              opacity: syncing ? 0.7 : 1,
            }}
          >
            {syncing ? "Syncing..." : "Sync Now"}
          </button>
        </div>
      </div>

      {/* Net Worth KPIs */}
      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
          <KPI label="Net Worth" value={fmtMoney(summary.net_worth)} sub="All accounts" color={C.green} />
          <KPI label="Banking" value={fmtMoney(summary.banking?.total)} sub={`${summary.banking?.accounts?.length || 0} accounts`} color={C.cyan} />
          <KPI label="Investments" value={fmtMoney(summary.investments?.total)} sub={`${summary.investments?.accounts?.length || 0} accounts`} color={C.purple} />
          <KPI label="Crypto" value={fmtMoney(summary.crypto?.total)} sub="Coinbase" color={C.amber} />
          <KPI label="Credit" value={fmtMoney(summary.credit?.total_balance)} sub={`Limit: ${fmtMoney(summary.credit?.total_limit)}`} color={C.red} />
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.border}` }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setSelectedAccount(null); setTransactions([]); }}
            style={{
              background: "none",
              border: "none",
              borderBottom: tab === t ? `2px solid ${C.accent}` : "2px solid transparent",
              color: tab === t ? C.text : C.muted,
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Connect Section */}
      <Card style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <select
            value={connectScope}
            onChange={(e) => setConnectScope(e.target.value)}
            style={{
              background: C.surface,
              color: C.text,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              padding: "6px 10px",
              fontSize: 13,
            }}
          >
            <option value="personal">Personal</option>
            <option value="business">Business</option>
          </select>
          {connectScope === "business" && (
            <select
              value={connectEntity || ""}
              onChange={(e) => setConnectEntity(e.target.value || null)}
              style={{
                background: C.surface,
                color: C.text,
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                padding: "6px 10px",
                fontSize: 13,
              }}
            >
              <option value="">Select entity...</option>
              {entityData.entities.map((e) => (
                <option key={e.id} value={e.id}>{e.shortName}</option>
              ))}
            </select>
          )}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {tab !== "Crypto" && (
            <PlaidLink
              onSuccess={handlePlaidSuccess}
              products={tab === "Investments" ? ["investments", "transactions"] : ["transactions"]}
              accountScope={connectScope}
              entityId={connectEntity}
              buttonLabel={tab === "Investments" ? "Link Brokerage" : "Link Bank Account"}
            />
          )}
          {tab === "Crypto" && (
            <a
              href="/api/coinbase/connect"
              style={{
                background: C.accent,
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Connect Coinbase
            </a>
          )}
        </div>
      </Card>

      {loading ? (
        <div style={{ color: C.muted, textAlign: "center", padding: 40 }}>Loading financial data...</div>
      ) : (
        <>
          {/* Banking Tab */}
          {tab === "Banking" && (
            <>
              {bankAccounts.length === 0 ? (
                <Card>
                  <div style={{ color: C.muted, textAlign: "center", padding: 20 }}>
                    No bank accounts linked yet. Use the button above to connect your first account.
                  </div>
                </Card>
              ) : (
                <Table
                  columns={["Institution", "Account", "Type", "Balance", "Available", "Scope"]}
                  rows={bankAccounts.map((a) => [
                    <span style={{ fontWeight: 600 }}>{a.plaid_items?.institution_name || "—"}</span>,
                    <span
                      style={{ cursor: "pointer", color: C.accent }}
                      onClick={() => { setSelectedAccount(a.id); fetchTransactions(a.id); }}
                    >
                      {a.name} {a.mask ? `••${a.mask}` : ""}
                    </span>,
                    <Badge label={a.subtype || a.type} />,
                    <span style={{ fontWeight: 600, color: C.green }}>{fmtFullMoney(a.balance_current)}</span>,
                    fmtFullMoney(a.balance_available),
                    <Badge label={a.account_scope} color={a.account_scope === "business" ? C.purple : C.cyan} />,
                  ])}
                />
              )}
            </>
          )}

          {/* Investments Tab */}
          {tab === "Investments" && (
            <>
              {investmentAccounts.length === 0 && holdings.length === 0 ? (
                <Card>
                  <div style={{ color: C.muted, textAlign: "center", padding: 20 }}>
                    No investment accounts linked yet. Connect E*TRADE, Schwab, or Edward Jones above.
                  </div>
                </Card>
              ) : (
                <>
                  {investmentAccounts.length > 0 && (
                    <Table
                      columns={["Institution", "Account", "Type", "Value", "Scope"]}
                      rows={investmentAccounts.map((a) => [
                        <span style={{ fontWeight: 600 }}>{a.plaid_items?.institution_name || "—"}</span>,
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
                          const gain = h.institution_value && h.cost_basis
                            ? h.institution_value - h.cost_basis : null;
                          const gainPct = gain && h.cost_basis ? (gain / h.cost_basis * 100) : null;
                          return (
                            <div key={i} style={{
                              background: C.surface,
                              borderRadius: 10,
                              border: `1px solid ${C.border}`,
                              padding: 16,
                            }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                <div>
                                  <span style={{ fontWeight: 700, color: C.text, fontSize: 16 }}>
                                    {sec?.ticker_symbol || "—"}
                                  </span>
                                  <span style={{ color: C.muted, fontSize: 12, marginLeft: 8 }}>
                                    {sec?.name?.slice(0, 30)}
                                  </span>
                                </div>
                                <Badge label={sec?.type || "—"} />
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
            </>
          )}

          {/* Crypto Tab */}
          {tab === "Crypto" && (
            <>
              {cryptoHoldings.length === 0 ? (
                <Card>
                  <div style={{ color: C.muted, textAlign: "center", padding: 20 }}>
                    No crypto accounts connected. Link your Coinbase account above.
                  </div>
                </Card>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
                  {cryptoHoldings.map((h, i) => (
                    <Card key={i}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontWeight: 700, color: C.text, fontSize: 18 }}>{h.currency}</span>
                        <Badge label="Coinbase" color={C.amber} />
                      </div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: C.green, marginBottom: 4 }}>
                        {fmtFullMoney(h.balance_usd)}
                      </div>
                      <div style={{ fontSize: 13, color: C.muted }}>
                        {h.balance} {h.currency}
                      </div>
                      {h.cost_basis && (
                        <div style={{
                          fontSize: 13,
                          marginTop: 6,
                          color: (h.balance_usd - h.cost_basis) >= 0 ? C.green : C.red,
                        }}>
                          P/L: {fmtFullMoney(h.balance_usd - h.cost_basis)}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Transactions for selected account */}
          {selectedAccount && transactions.length > 0 && (
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: C.text }}>Recent Transactions</div>
                <button
                  onClick={() => { setSelectedAccount(null); setTransactions([]); }}
                  style={{
                    background: "none",
                    border: `1px solid ${C.border}`,
                    color: C.muted,
                    borderRadius: 6,
                    padding: "4px 12px",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>
              <Table
                columns={["Date", "Description", "Category", "Amount"]}
                rows={transactions.map((t) => [
                  t.date,
                  <div>
                    <div style={{ fontWeight: 500 }}>{t.name}</div>
                    {t.merchant_name && t.merchant_name !== t.name && (
                      <div style={{ fontSize: 11, color: C.muted }}>{t.merchant_name}</div>
                    )}
                  </div>,
                  t.personal_finance_category ? (
                    <Badge label={t.personal_finance_category} />
                  ) : (
                    <span style={{ color: C.muted }}>—</span>
                  ),
                  <span style={{
                    fontWeight: 600,
                    color: t.amount < 0 ? C.green : C.red,
                  }}>
                    {t.amount < 0 ? "+" : "-"}{fmtFullMoney(Math.abs(t.amount))}
                  </span>,
                ])}
              />
            </Card>
          )}

          {/* Last sync info */}
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
