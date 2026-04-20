import { useState, useEffect, useMemo } from "react";
import { Card, KPI, Badge } from "../components/shared";
import { C } from "../data/constants";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ComposedChart,
  ReferenceLine,
} from "recharts";

const TT = { backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8, color: "#f9fafb", fontSize: 12 };
const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#0ea5e9", "#8b5cf6", "#ec4899", "#14b8a6", "#ef4444"];
const PROP_MAP = { 533203: "Graeagle Cabin", 746614: "Northstar Luxury" };
const PROP_COLORS = { 533203: "#10b981", 746614: "#8b5cf6" };
const SRC_COLORS = { AirbnbIntegration: "#ef4444", BookingCom: "#6366f1", HomeAway: "#f59e0b", OH: "#0ea5e9", Direct: "#10b981" };
const SRC_LABELS = { AirbnbIntegration: "Airbnb", BookingCom: "Booking.com", HomeAway: "VRBO", OH: "Owner Hold", Direct: "Direct" };

// Rough expense model per property per month (based on typical STR costs)
const MONTHLY_EXPENSES = {
  533203: { mortgage: 2200, utilities: 350, insurance: 180, maintenance: 400, cleaning: 600, platform: 0, marketing: 100 },
  746614: { mortgage: 4500, utilities: 500, insurance: 320, maintenance: 600, cleaning: 900, platform: 0, marketing: 200 },
};

function fmtCurrency(v) { return "$" + Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
function fmtPct(v) { return (v * 100).toFixed(1) + "%"; }
function nightsBetween(a, d) { return Math.max(1, Math.round((new Date(d) - new Date(a)) / 86400000)); }

const Rentals = () => {
  const [bookings, setBookings] = useState([]);
  const [sortCol, setSortCol] = useState("arrival");
  const [sortDir, setSortDir] = useState("desc");
  const [propFilter, setPropFilter] = useState("all");

  useEffect(() => {
    const base = import.meta.env.BASE_URL || "/";
    fetch(`${base}rental-data.json`).then(r => r.ok ? r.json() : []).then(setBookings).catch(() => {});
  }, []);

  const active = useMemo(() => bookings.filter(b => b.status !== "Declined"), [bookings]);
  const filtered = useMemo(() => propFilter === "all" ? active : active.filter(b => String(b.property_id) === propFilter), [active, propFilter]);

  // ── KPI Calculations ──
  const totalRevenue = useMemo(() => filtered.reduce((s, b) => s + (b.total_amount || 0), 0), [filtered]);
  const totalNights = useMemo(() => filtered.reduce((s, b) => s + nightsBetween(b.arrival, b.departure), 0), [filtered]);
  const avgNightlyRate = totalNights > 0 ? totalRevenue / totalNights : 0;
  const totalExpenses = useMemo(() => {
    const months = 10;
    const propIds = propFilter === "all" ? Object.keys(MONTHLY_EXPENSES).map(Number) : [Number(propFilter)];
    return propIds.reduce((s, pid) => s + Object.values(MONTHLY_EXPENSES[pid] || {}).reduce((a, b) => a + b, 0), 0) * months;
  }, [propFilter]);
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? netProfit / totalRevenue : 0;
  // Occupancy: total booked nights / total available nights (2 properties × ~300 days in range)
  const availableNights = (propFilter === "all" ? 2 : 1) * 300;
  const occupancyRate = totalNights / availableNights;
  const revPAR = totalRevenue / availableNights;
  const avgGuests = filtered.length > 0 ? filtered.reduce((s, b) => s + (b.rooms?.[0]?.people || 2), 0) / filtered.length : 0;

  // ── Monthly Revenue + P&L ──
  const monthlyData = useMemo(() => {
    const months = {};
    filtered.forEach(b => {
      const m = b.arrival?.slice(0, 7);
      if (!m) return;
      if (!months[m]) months[m] = { month: m, graeagle: 0, northstar: 0, total: 0, bookings: 0 };
      const amt = b.total_amount || 0;
      months[m].total += amt;
      months[m].bookings += 1;
      if (b.property_id === 533203) months[m].graeagle += amt;
      else months[m].northstar += amt;
    });
    const propIds = propFilter === "all" ? Object.keys(MONTHLY_EXPENSES).map(Number) : [Number(propFilter)];
    const monthlyExp = propIds.reduce((s, pid) => s + Object.values(MONTHLY_EXPENSES[pid] || {}).reduce((a, b) => a + b, 0), 0);
    return Object.values(months).sort((a, b) => a.month.localeCompare(b.month)).map(m => {
      return { ...m, expenses: monthlyExp, profit: Math.round(m.total - monthlyExp), label: new Date(m.month + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" }) };
    });
  }, [filtered, propFilter]);

  // ── Source Distribution ──
  const sourceData = useMemo(() => {
    const map = {};
    filtered.forEach(b => {
      const src = b.source || "Direct";
      map[src] = (map[src] || 0) + (b.total_amount || 0);
    });
    return Object.entries(map).map(([name, value]) => ({
      name: SRC_LABELS[name] || name, value: Math.round(value), fill: SRC_COLORS[name] || COLORS[0]
    })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  // ── Expense Breakdown ──
  const expenseData = useMemo(() => {
    const combined = {};
    const propIds = propFilter === "all" ? Object.keys(MONTHLY_EXPENSES).map(Number) : [Number(propFilter)];
    propIds.forEach(pid => {
      const exp = MONTHLY_EXPENSES[pid] || {};
      Object.entries(exp).forEach(([k, v]) => { combined[k] = (combined[k] || 0) + v * 10; });
    });
    const labels = { mortgage: "Mortgage", utilities: "Utilities", insurance: "Insurance", maintenance: "Maintenance", cleaning: "Cleaning", platform: "Platform Fees", marketing: "Marketing" };
    return Object.entries(combined).filter(([, v]) => v > 0).map(([k, v], i) => ({
      name: labels[k] || k, value: v, fill: COLORS[i % COLORS.length]
    })).sort((a, b) => b.value - a.value);
  }, [propFilter]);

  // ── Occupancy by Month ──
  const occupancyData = useMemo(() => {
    const propCount = propFilter === "all" ? 2 : 1;
    const daysPerMonth = propCount * 30;
    const months = {};
    filtered.forEach(b => {
      const m = b.arrival?.slice(0, 7);
      if (!m) return;
      if (!months[m]) months[m] = { month: m, nights: 0 };
      months[m].nights += nightsBetween(b.arrival, b.departure);
    });
    return Object.values(months).sort((a, b) => a.month.localeCompare(b.month)).map(m => ({
      ...m, occupancy: Math.round((m.nights / daysPerMonth) * 100),
      adr: monthlyData.find(d => d.month === m.month)?.total / Math.max(1, m.nights) || 0,
      revpar: monthlyData.find(d => d.month === m.month)?.total / daysPerMonth || 0,
      label: new Date(m.month + "-01").toLocaleDateString("en-US", { month: "short" }),
    }));
  }, [filtered, monthlyData]);

  // ── Property Performance ──
  const propertyPerf = useMemo(() => {
    return Object.entries(PROP_MAP).map(([pid, name]) => {
      const propBookings = active.filter(b => b.property_id === Number(pid));
      const rev = propBookings.reduce((s, b) => s + (b.total_amount || 0), 0);
      const nights = propBookings.reduce((s, b) => s + nightsBetween(b.arrival, b.departure), 0);
      const exp = Object.values(MONTHLY_EXPENSES[Number(pid)] || {}).reduce((a, b) => a + b, 0) * 10;
      return {
        id: pid, name, bookings: propBookings.length, revenue: rev, nights,
        adr: nights > 0 ? Math.round(rev / nights) : 0,
        occupancy: Math.round((nights / 300) * 100),
        expenses: exp, profit: rev - exp,
        avgGuests: propBookings.length > 0 ? Math.round(propBookings.reduce((s, b) => s + (b.rooms?.[0]?.people || 2), 0) / propBookings.length) : 0,
      };
    });
  }, [filtered]);

  // ── Sortable Bookings Table ──
  const sortedBookings = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      let va = a[sortCol], vb = b[sortCol];
      if (sortCol === "total_amount") { va = va || 0; vb = vb || 0; }
      if (sortCol === "property_id") { va = PROP_MAP[va] || va; vb = PROP_MAP[vb] || vb; }
      if (sortCol === "nights") { va = nightsBetween(a.arrival, a.departure); vb = nightsBetween(b.arrival, b.departure); }
      if (typeof va === "number" && typeof vb === "number") return sortDir === "asc" ? va - vb : vb - va;
      return sortDir === "asc" ? String(va || "").localeCompare(String(vb || "")) : String(vb || "").localeCompare(String(va || ""));
    });
    return list;
  }, [filtered, sortCol, sortDir]);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("desc"); }
  };

  if (!bookings.length) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Rentals</h1>
      <Card><div style={{ textAlign: "center", padding: 40, color: C.muted }}>Loading rental data...</div></Card>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Rentals</h1>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Pineside Cabins — {filtered.length} bookings across {Object.keys(PROP_MAP).length} properties</div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {[["all", "All"], ["533203", "Graeagle"], ["746614", "Northstar"]].map(([v, l]) => (
            <button key={v} onClick={() => setPropFilter(v)} style={{ background: propFilter === v ? C.accent : C.surface, color: propFilter === v ? "#fff" : C.muted, border: `1px solid ${propFilter === v ? C.accent : C.border}`, borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{l}</button>
          ))}
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 8 }}>
        <KPI label="Revenue" value={fmtCurrency(totalRevenue)} sub="All bookings" color={C.green} />
        <KPI label="Net Profit" value={fmtCurrency(netProfit)} sub={`Margin: ${fmtPct(profitMargin)}`} color={netProfit > 0 ? C.green : C.red} />
        <KPI label="Occupancy" value={fmtPct(occupancyRate)} sub="Avg across properties" color={occupancyRate > 0.7 ? C.green : C.amber} />
        <KPI label="ADR" value={fmtCurrency(avgNightlyRate)} sub="Avg nightly rate" color={C.cyan} />
        <KPI label="RevPAR" value={fmtCurrency(revPAR)} sub="Rev per avail night" color={C.purple} />
        <KPI label="Bookings" value={filtered.length} sub={`${bookings.length - filtered.length} declined`} color={C.accent} />
        <KPI label="Nights Booked" value={totalNights} sub={`of ${availableNights} available`} color={C.teal} />
        <KPI label="Avg Guests" value={avgGuests.toFixed(1)} sub="Per booking" color={C.amber} />
      </div>

      {/* ── Revenue & P&L ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Revenue by Property</div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="gGrae" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                <linearGradient id="gNorth" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={TT} formatter={v => fmtCurrency(v)} />
              <Area type="monotone" dataKey="graeagle" stackId="1" stroke="#10b981" fill="url(#gGrae)" name="Graeagle" />
              <Area type="monotone" dataKey="northstar" stackId="1" stroke="#8b5cf6" fill="url(#gNorth)" name="Northstar" />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Monthly P&L</div>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={monthlyData}>
              <XAxis dataKey="label" tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={TT} formatter={v => fmtCurrency(v)} />
              <ReferenceLine y={0} stroke={C.border} />
              <Bar dataKey="total" fill={C.green} radius={[4, 4, 0, 0]} name="Revenue" />
              <Bar dataKey="expenses" fill={C.red + "88"} radius={[4, 4, 0, 0]} name="Expenses" />
              <Line type="monotone" dataKey="profit" stroke={C.amber} strokeWidth={2} dot={{ fill: C.amber, r: 3 }} name="Profit" />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ── Expenses & Sources ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Expense Breakdown (YTD Est.)</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={expenseData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value">
                {expenseData.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
              <Tooltip contentStyle={TT} formatter={v => fmtCurrency(v)} />
              <Legend wrapperStyle={{ fontSize: 10, color: C.muted }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Revenue by Source</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={sourceData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value">
                {sourceData.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
              <Tooltip contentStyle={TT} formatter={v => fmtCurrency(v)} />
              <Legend wrapperStyle={{ fontSize: 10, color: C.muted }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ── Occupancy & Pricing ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Occupancy Rate by Month</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={occupancyData}>
              <defs>
                <linearGradient id="gOcc" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.cyan} stopOpacity={0.4}/><stop offset="95%" stopColor={C.cyan} stopOpacity={0}/></linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} domain={[0, 100]} />
              <ReferenceLine y={85} stroke={C.green} strokeDasharray="4 4" label={{ value: "85% target", fill: C.green, fontSize: 10, position: "right" }} />
              <Tooltip contentStyle={TT} formatter={v => `${v}%`} />
              <Area type="monotone" dataKey="occupancy" stroke={C.cyan} fill="url(#gOcc)" name="Occupancy %" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>ADR & RevPAR Trend</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={occupancyData}>
              <XAxis dataKey="label" tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v.toFixed(0)}`} />
              <Tooltip contentStyle={TT} formatter={v => fmtCurrency(Math.round(v))} />
              <Line type="monotone" dataKey="adr" stroke={C.amber} strokeWidth={2} dot={{ fill: C.amber, r: 3 }} name="ADR" />
              <Line type="monotone" dataKey="revpar" stroke={C.purple} strokeWidth={2} dot={{ fill: C.purple, r: 3 }} name="RevPAR" />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ── Property Performance Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {propertyPerf.map(p => (
          <Card key={p.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{p.name}</div>
                <div style={{ fontSize: 11, color: C.muted }}>Lodgify ID: {p.id}</div>
              </div>
              <Badge color={p.profit > 0 ? C.green : C.red}>{p.profit > 0 ? "Profitable" : "Loss"}</Badge>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
              {[
                ["Revenue", fmtCurrency(p.revenue), C.green],
                ["Expenses", fmtCurrency(p.expenses), C.red],
                ["Profit", fmtCurrency(p.profit), p.profit > 0 ? C.green : C.red],
                ["Bookings", p.bookings, C.accent],
                ["Nights", p.nights, C.cyan],
              ].map(([label, val, color]) => (
                <div key={label}>
                  <div style={{ fontSize: 10, color: C.muted }}>{label}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color }}>{val}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 8 }}>
              {[
                ["ADR", `$${p.adr}`, C.amber],
                ["Occupancy", `${p.occupancy}%`, p.occupancy >= 85 ? C.green : C.amber],
                ["Avg Guests", p.avgGuests, C.purple],
                ["RevPAR", fmtCurrency(Math.round(p.revenue / 300)), C.teal],
              ].map(([label, val, color]) => (
                <div key={label}>
                  <div style={{ fontSize: 10, color: C.muted }}>{label}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color }}>{val}</div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* ── Bookings Table ── */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Bookings ({sortedBookings.length})</div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                {[
                  ["arrival", "Check-in"], ["departure", "Check-out"], ["nights", "Nights"],
                  ["property_id", "Property"], ["source", "Source"], ["total_amount", "Revenue"],
                  ["status", "Status"], ["guest", "Guest"],
                ].map(([col, label]) => (
                  <th key={col} onClick={() => handleSort(col)} style={{ padding: "8px 6px", textAlign: "left", color: sortCol === col ? C.accent : C.muted, cursor: "pointer", borderBottom: `1px solid ${C.border}`, fontWeight: 600, whiteSpace: "nowrap", userSelect: "none" }}>
                    {label} {sortCol === col ? (sortDir === "asc" ? "↑" : "↓") : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedBookings.slice(0, 30).map(b => (
                <tr key={b.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "6px", color: C.text }}>{b.arrival}</td>
                  <td style={{ padding: "6px", color: C.text }}>{b.departure}</td>
                  <td style={{ padding: "6px", color: C.cyan }}>{nightsBetween(b.arrival, b.departure)}</td>
                  <td style={{ padding: "6px" }}><span style={{ color: PROP_COLORS[b.property_id] || C.text }}>{PROP_MAP[b.property_id] || b.property_id}</span></td>
                  <td style={{ padding: "6px", color: C.muted }}>{SRC_LABELS[b.source] || b.source}</td>
                  <td style={{ padding: "6px", color: C.green, fontWeight: 600 }}>{fmtCurrency(b.total_amount)}</td>
                  <td style={{ padding: "6px" }}><Badge color={b.status === "Booked" ? C.green : b.status === "Open" ? C.cyan : C.red}>{b.status}</Badge></td>
                  <td style={{ padding: "6px", color: C.text }}>{b.guest?.name || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
export default Rentals;
