import { useState, useEffect } from "react";
import { Card, KPI, Badge } from "../components/shared";
import { C } from "../data/constants";

const fmt = (n, decimals = 2) => {
  const num = Number(n);
  if (!isFinite(num)) return "$0";
  if (Math.abs(num) >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
  if (Math.abs(num) >= 1e3) return `$${(num / 1e3).toFixed(1)}K`;
  return `$${num.toFixed(decimals)}`;
};
const fmtPct = (n) => {
  const num = Number(n);
  if (!isFinite(num)) return "0.00%";
  return `${num >= 0 ? "+" : ""}${num.toFixed(2)}%`;
};
const fmtNum = (n) => {
  const num = Number(n);
  if (!isFinite(num)) return "0";
  return num.toLocaleString();
};

const SUPABASE_URL = "https://bdlvwfobjqvnrffzxrfz.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbHZ3Zm9ianF2bnJmZnp4cmZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMzUwNjAsImV4cCI6MjA4OTkxMTA2MH0.kY3bpFY9Vr-WlR3mXTxZ6TbHVS4c7nTTXkDioP7vvEI";

const fetchSupa = async (table, params = "") => {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
};

export default function InvestingCommand() {
  const [accounts, setAccounts] = useState([]);
  const [positions, setPositions] = useState([]);
  const [cryptoHoldings, setCryptoHoldings] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [sortBy, setSortBy] = useState("market_value");
  const [sortDir, setSortDir] = useState("desc");
  const [searchQ, setSearchQ] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [accs, pos, crypto, txns] = await Promise.all([
        fetchSupa("schwab_accounts", "select=*"),
        fetchSupa("schwab_positions", "select=*&order=market_value.desc"),
        fetchSupa("crypto_holdings", "select=*&order=balance_usd.desc"),
        fetchSupa("schwab_transactions", "select=*&order=date.desc&limit=50"),
      ]);
      setAccounts(accs);
      setPositions(pos);
      setCryptoHoldings(crypto);
      setTransactions(txns);
      setLoading(false);
    };
    load();
  }, []);

  // Aggregate stats
  const totalPortfolioValue = accounts.reduce((s, a) => s + (Number(a.total_market_value) || 0), 0);
  const totalCash = accounts.reduce((s, a) => s + (Number(a.cash_balance) || 0), 0);
  const totalCostBasis = accounts.reduce((s, a) => s + (Number(a.total_cost_basis) || 0), 0);
  const totalUnrealizedGain = accounts.reduce((s, a) => s + (Number(a.total_unrealized_gain) || 0), 0);
  const totalDayChange = accounts.reduce((s, a) => s + (Number(a.day_change) || 0), 0);
  const cryptoTotal = cryptoHoldings.reduce((s, c) => s + (Number(c.balance_usd) || 0), 0);
  const grandTotal = totalPortfolioValue + cryptoTotal;
  const totalReturnPct = totalCostBasis > 0 ? (totalUnrealizedGain / totalCostBasis) * 100 : 0;

  // Sort & filter positions
  const filteredPositions = positions
    .filter((p) =>
      !searchQ ||
      p.symbol?.toLowerCase().includes(searchQ.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQ.toLowerCase())
    )
    .sort((a, b) => {
      const mult = sortDir === "desc" ? -1 : 1;
      return mult * (Number(a[sortBy]) - Number(b[sortBy]));
    });

  const gainers = positions.filter((p) => Number(p.open_pnl) > 0).sort((a, b) => Number(b.open_pnl) - Number(a.open_pnl)).slice(0, 5);
  const losers = positions.filter((p) => Number(p.open_pnl) < 0).sort((a, b) => Number(a.open_pnl) - Number(b.open_pnl)).slice(0, 5);

  const pnlColor = (v) => (Number(v) >= 0 ? C.green : C.red);

  const tabs = ["overview", "positions", "crypto", "transactions"];

  const sortToggle = (col) => {
    if (sortBy === col) setSortDir(sortDir === "desc" ? "asc" : "desc");
    else { setSortBy(col); setSortDir("desc"); }
  };

  const thStyle = (col) => ({
    padding: "8px 10px",
    fontSize: 11,
    fontWeight: 600,
    color: sortBy === col ? C.accent : C.muted,
    textAlign: "right",
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
  });

  if (loading) {
    return (
      <div style={{ color: C.muted, padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 28, marginBottom: 12 }}>📈</div>
        Loading investment data…
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>
            📈 CMD-6: Investing & Capital Allocation
          </h1>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>
            Portfolio performance, capital deployment, returns & strategy
          </div>
        </div>
        <Badge color={C.green}>Live</Badge>
      </div>

      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        <KPI label="Total Portfolio" value={fmt(grandTotal)} sub="Equities + Crypto" color={C.accent} />
        <KPI label="Equity Value" value={fmt(totalPortfolioValue)} sub="Schwab brokerage" color={C.cyan} />
        <KPI label="Cash Held" value={fmt(totalCash)} sub="Buying power" color={C.amber} />
        <KPI
          label="Unrealized P&L"
          value={fmt(totalUnrealizedGain)}
          sub={fmtPct(totalReturnPct) + " total return"}
          color={totalUnrealizedGain >= 0 ? C.green : C.red}
        />
        <KPI
          label="Day Change"
          value={fmt(totalDayChange)}
          sub={fmtPct(accounts[0]?.day_change_pct)}
          color={totalDayChange >= 0 ? C.green : C.red}
        />
        <KPI label="Positions" value={fmtNum(positions.length)} sub={`${cryptoHoldings.length} crypto assets`} color={C.purple} />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${C.border}`, paddingBottom: 0 }}>
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            style={{
              background: "none",
              border: "none",
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              color: activeTab === t ? C.accent : C.muted,
              cursor: "pointer",
              borderBottom: activeTab === t ? `2px solid ${C.accent}` : "2px solid transparent",
              textTransform: "capitalize",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Accounts */}
          <Card>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 14 }}>
              Brokerage Accounts
            </div>
            {accounts.length === 0 ? (
              <div style={{ color: C.muted, fontSize: 13 }}>No accounts connected.</div>
            ) : (
              accounts.map((acc) => (
                <div
                  key={acc.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr repeat(5, auto)",
                    gap: 16,
                    alignItems: "center",
                    padding: "12px 0",
                    borderBottom: `1px solid ${C.border}`,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{acc.account_name}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>
                      {acc.account_type} · ···{acc.account_number}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, color: C.muted }}>Market Value</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{fmt(acc.total_market_value)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, color: C.muted }}>Cash</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.amber }}>{fmt(acc.cash_balance)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, color: C.muted }}>Cost Basis</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{fmt(acc.total_cost_basis)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, color: C.muted }}>Unrealized P&L</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: pnlColor(acc.total_unrealized_gain) }}>
                      {fmt(acc.total_unrealized_gain)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, color: C.muted }}>Day Chg</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: pnlColor(acc.day_change) }}>
                      {fmt(acc.day_change)} ({fmtPct(acc.day_change_pct)})
                    </div>
                  </div>
                </div>
              ))
            )}
          </Card>

          {/* Top Gainers / Losers */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Card>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.green, marginBottom: 12 }}>
                🚀 Top Gainers
              </div>
              {gainers.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 0",
                    borderBottom: `1px solid ${C.border}`,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{p.symbol}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{p.description?.slice(0, 28)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.green }}>{fmt(p.open_pnl)}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{fmt(p.market_value)} MV</div>
                  </div>
                </div>
              ))}
              {gainers.length === 0 && <div style={{ color: C.muted, fontSize: 13 }}>No gainers yet.</div>}
            </Card>

            <Card>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.red, marginBottom: 12 }}>
                📉 Top Losers
              </div>
              {losers.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 0",
                    borderBottom: `1px solid ${C.border}`,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{p.symbol}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{p.description?.slice(0, 28)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.red }}>{fmt(p.open_pnl)}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{fmt(p.market_value)} MV</div>
                  </div>
                </div>
              ))}
              {losers.length === 0 && <div style={{ color: C.muted, fontSize: 13 }}>No losers yet.</div>}
            </Card>
          </div>

          {/* Allocation Summary */}
          <Card>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 14 }}>
              Capital Allocation
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
              {[
                { label: "Equities", value: totalPortfolioValue, color: C.accent, pct: grandTotal > 0 ? (totalPortfolioValue / grandTotal) * 100 : 0 },
                { label: "Cash (Buying Power)", value: totalCash, color: C.amber, pct: grandTotal > 0 ? (totalCash / grandTotal) * 100 : 0 },
                { label: "Crypto", value: cryptoTotal, color: C.purple, pct: grandTotal > 0 ? (cryptoTotal / grandTotal) * 100 : 0 },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    background: C.card,
                    borderRadius: 10,
                    padding: "14px 16px",
                    border: `1px solid ${C.border}`,
                  }}
                >
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: item.color }}>{fmt(item.value)}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                    {item.pct.toFixed(1)}% of total
                  </div>
                  <div
                    style={{
                      height: 4,
                      borderRadius: 2,
                      background: C.border,
                      marginTop: 8,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(item.pct, 100)}%`,
                        height: "100%",
                        background: item.color,
                        borderRadius: 2,
                        transition: "width 0.5s",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* POSITIONS TAB */}
      {activeTab === "positions" && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
              Equity Positions ({filteredPositions.length})
            </div>
            <input
              type="text"
              placeholder="Search symbol or name..."
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: "6px 12px",
                color: C.text,
                fontSize: 13,
                width: 220,
                outline: "none",
              }}
            />
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  <th style={{ ...thStyle("symbol"), textAlign: "left" }} onClick={() => sortToggle("symbol")}>
                    Symbol {sortBy === "symbol" ? (sortDir === "desc" ? "↓" : "↑") : ""}
                  </th>
                  <th style={{ ...thStyle("quantity"), textAlign: "left" }}>Name</th>
                  <th style={thStyle("quantity")} onClick={() => sortToggle("quantity")}>
                    Qty {sortBy === "quantity" ? (sortDir === "desc" ? "↓" : "↑") : ""}
                  </th>
                  <th style={thStyle("market_value")} onClick={() => sortToggle("market_value")}>
                    Market Value {sortBy === "market_value" ? (sortDir === "desc" ? "↓" : "↑") : ""}
                  </th>
                  <th style={thStyle("cost_basis")} onClick={() => sortToggle("cost_basis")}>
                    Cost Basis {sortBy === "cost_basis" ? (sortDir === "desc" ? "↓" : "↑") : ""}
                  </th>
                  <th style={thStyle("open_pnl")} onClick={() => sortToggle("open_pnl")}>
                    Open P&L {sortBy === "open_pnl" ? (sortDir === "desc" ? "↓" : "↑") : ""}
                  </th>
                  <th style={thStyle("day_pnl")} onClick={() => sortToggle("day_pnl")}>
                    Day P&L {sortBy === "day_pnl" ? (sortDir === "desc" ? "↓" : "↑") : ""}
                  </th>
                  <th style={thStyle("open_pnl")}>Return %</th>
                </tr>
              </thead>
              <tbody>
                {filteredPositions.map((p, i) => {
                  const returnPct =
                    Number(p.cost_basis) > 0 ? (Number(p.open_pnl) / Number(p.cost_basis)) * 100 : 0;
                  return (
                    <tr
                      key={p.id || i}
                      style={{
                        borderBottom: `1px solid ${C.border}`,
                        background: i % 2 === 0 ? "transparent" : C.surface + "33",
                      }}
                    >
                      <td style={{ padding: "8px 10px", fontWeight: 700, color: C.accent }}>
                        {p.symbol}
                      </td>
                      <td style={{ padding: "8px 10px", color: C.muted, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.description}
                      </td>
                      <td style={{ padding: "8px 10px", textAlign: "right", color: C.text }}>
                        {fmtNum(p.quantity)}
                      </td>
                      <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600, color: C.text }}>
                        {fmt(p.market_value)}
                      </td>
                      <td style={{ padding: "8px 10px", textAlign: "right", color: C.muted }}>
                        {fmt(p.cost_basis)}
                      </td>
                      <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, color: pnlColor(p.open_pnl) }}>
                        {fmt(p.open_pnl)}
                      </td>
                      <td style={{ padding: "8px 10px", textAlign: "right", color: pnlColor(p.day_pnl) }}>
                        {fmt(p.day_pnl)}
                      </td>
                      <td
                        style={{
                          padding: "8px 10px",
                          textAlign: "right",
                          fontWeight: 600,
                          color: returnPct >= 0 ? C.green : C.red,
                        }}
                      >
                        {fmtPct(returnPct)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredPositions.length === 0 && (
              <div style={{ color: C.muted, fontSize: 13, padding: "20px 10px" }}>
                No positions found.
              </div>
            )}
          </div>
        </Card>
      )}

      {/* CRYPTO TAB */}
      {activeTab === "crypto" && (
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 14 }}>
            🪙 Crypto Holdings
          </div>
          {cryptoHoldings.length === 0 ? (
            <div style={{ color: C.muted, fontSize: 13 }}>
              No crypto holdings connected. Link a Coinbase account via Integrations Hub.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {["Currency", "Balance", "USD Value", "Cost Basis", "P&L"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "8px 10px",
                        fontSize: 11,
                        fontWeight: 600,
                        color: C.muted,
                        textAlign: h === "Currency" ? "left" : "right",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cryptoHoldings.map((c, i) => {
                  const pnl = Number(c.balance_usd) - Number(c.cost_basis);
                  return (
                    <tr key={c.id || i} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: "8px 10px", fontWeight: 700, color: C.amber }}>{c.currency}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", color: C.text }}>{c.balance}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600, color: C.text }}>
                        {fmt(c.balance_usd)}
                      </td>
                      <td style={{ padding: "8px 10px", textAlign: "right", color: C.muted }}>
                        {fmt(c.cost_basis)}
                      </td>
                      <td
                        style={{
                          padding: "8px 10px",
                          textAlign: "right",
                          fontWeight: 700,
                          color: pnlColor(pnl),
                        }}
                      >
                        {fmt(pnl)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* TRANSACTIONS TAB */}
      {activeTab === "transactions" && (
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 14 }}>
            Recent Transactions (Last 50)
          </div>
          {transactions.length === 0 ? (
            <div style={{ color: C.muted, fontSize: 13 }}>No transactions found.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {["Date", "Symbol", "Description", "Type", "Qty", "Price", "Amount"].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "8px 10px",
                          fontSize: 11,
                          fontWeight: 600,
                          color: C.muted,
                          textAlign: ["Qty", "Price", "Amount"].includes(h) ? "right" : "left",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t, i) => (
                    <tr key={t.id || i} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? "transparent" : C.surface + "33" }}>
                      <td style={{ padding: "8px 10px", color: C.muted, whiteSpace: "nowrap" }}>
                        {t.date ? new Date(t.date).toLocaleDateString() : "—"}
                      </td>
                      <td style={{ padding: "8px 10px", fontWeight: 700, color: C.accent }}>{t.symbol || "—"}</td>
                      <td style={{ padding: "8px 10px", color: C.text, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {t.description}
                      </td>
                      <td style={{ padding: "8px 10px", color: C.muted }}>{t.activity_type || t.type}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", color: C.text }}>{t.quantity ?? "—"}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", color: C.text }}>{t.price ? fmt(t.price) : "—"}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600, color: pnlColor(-(t.amount)) }}>
                        {fmt(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
