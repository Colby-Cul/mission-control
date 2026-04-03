import { useState, useMemo } from 'react';
import { Badge, Card, KPI } from '../components/shared';
import { C } from '../data/constants';
import { useMissionControlData } from '../context/MissionControlDataContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area } from "recharts";

function fmtDate(v) { if (!v) return "—"; const d = new Date(v); return isNaN(d) ? "—" : d.toLocaleString("en-US", { month:"short", day:"numeric", hour:"numeric", minute:"2-digit" }); }
function fmtBytes(v) { const n = Number(v); return n < 1024 ? `${n} B` : n < 1048576 ? `${(n/1024).toFixed(1)} KB` : `${(n/1048576).toFixed(1)} MB`; }
function fmtTokens(v) { const n = Number(v); return n >= 1e6 ? `${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `${(n/1e3).toFixed(1)}K` : String(n); }

const CHART_COLORS = ["#6366f1","#10b981","#f59e0b","#0ea5e9","#8b5cf6","#ec4899","#14b8a6","#ef4444","#D4AF37","#1E3A5F"];
const TT = { backgroundColor:"#1f2937", border:"1px solid #374151", borderRadius:8, color:"#f9fafb", fontSize:12 };

const Sessions = () => {
  const { acpSessions = [], refresh } = useMissionControlData();
  const [selected, setSelected] = useState(null);
  const totalBytes = acpSessions.reduce((s, t) => s + (t.sizeBytes || 0), 0);
  const totalTokens = acpSessions.reduce((s, t) => s + (t.tokens || 0), 0);
  const totalCost = acpSessions.reduce((s, t) => s + (t.totalCost || 0), 0);

  // Status distribution pie
  const statusDist = useMemo(() => {
    const map = {};
    acpSessions.forEach(s => { const st = s.status || "unknown"; map[st] = (map[st] || 0) + 1; });
    const colors = { done: C.green, delegated: C.amber, pending: C.cyan, blocked: C.red, unknown: C.muted };
    return Object.entries(map).map(([name, value]) => ({ name, value, fill: colors[name] || C.accent }));
  }, [acpSessions]);

  // Sessions by agent bar
  const sessionsByAgent = useMemo(() => {
    const map = {};
    acpSessions.forEach(s => { const a = s.agent || "unknown"; map[a] = (map[a] || 0) + 1; });
    return Object.entries(map).map(([name, count], i) => ({ name, count, fill: CHART_COLORS[i % CHART_COLORS.length] })).sort((a, b) => b.count - a.count);
  }, [acpSessions]);

  // Cost over time (last 7 days)
  const costTimeline = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      days.push({ date: d, label: d.toLocaleDateString("en-US", { weekday: "short" }), cost: 0, sessions: 0 });
    }
    acpSessions.forEach(s => {
      const ts = s.dateFinished || s.dateCreated;
      if (!ts) return;
      const sd = new Date(ts); sd.setHours(0, 0, 0, 0);
      const match = days.find(d => d.date.getTime() === sd.getTime());
      if (match) { match.cost += (s.totalCost || 0); match.sessions += 1; }
    });
    return days.map(d => ({ ...d, cost: Math.round(d.cost * 100) / 100 }));
  }, [acpSessions]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Sessions</h1>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>{acpSessions.length} ACP session transcripts</div>
        </div>
        <button onClick={refresh} style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 10, padding: "10px 14px", fontWeight: 600, cursor: "pointer" }}>Refresh</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <KPI label="Sessions" value={acpSessions.length} sub="Total transcripts" color={C.accent} />
        <KPI label="Storage" value={fmtBytes(totalBytes)} sub="Transcript size" color={C.cyan} />
        <KPI label="Tokens" value={fmtTokens(totalTokens)} sub="Total processed" color={C.purple} />
        <KPI label="Total Cost" value={`$${totalCost.toFixed(2)}`} sub="API spend" color={C.amber} />
      </div>

      {/* Session Analytics */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 8 }}>Cost & Sessions (7d)</div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={costTimeline}>
              <defs>
                <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.accent} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={C.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip contentStyle={TT} formatter={(v, name) => name === "cost" ? `$${v}` : v} />
              <Area type="monotone" dataKey="cost" stroke={C.accent} fill="url(#costGrad)" name="Cost" />
              <Area type="monotone" dataKey="sessions" stroke={C.green} fill="none" strokeDasharray="4 2" name="Sessions" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 8 }}>Status Breakdown</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={statusDist} cx="50%" cy="50%" innerRadius={35} outerRadius={65} paddingAngle={3} dataKey="value">
                {statusDist.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
              <Tooltip contentStyle={TT} />
              <Legend wrapperStyle={{ fontSize: 10, color: C.muted }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 8 }}>Sessions by Agent</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={sessionsByAgent.slice(0, 6)} layout="vertical">
              <XAxis type="number" tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: C.text, fontSize: 10 }} axisLine={false} tickLine={false} width={70} />
              <Tooltip contentStyle={TT} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {sessionsByAgent.slice(0, 6).map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1fr" : "1fr", gap: 12 }}>
        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {acpSessions.slice(0, 25).map(s => (
              <button key={s.sessionId || s.id} onClick={() => setSelected(s)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 8, background: selected?.sessionId === s.sessionId ? C.accent + "22" : C.surface, border: `1px solid ${selected?.sessionId === s.sessionId ? C.accent : C.border}`, cursor: "pointer", textAlign: "left", color: C.text, fontSize: 13 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(s.task || "Session").slice(0, 50)}</div>
                  <div style={{ fontSize: 11, color: C.muted, fontFamily: "monospace" }}>{(s.sessionId || s.id || "").slice(0, 16)}</div>
                </div>
                <Badge color={s.status === "done" ? C.green : s.status === "delegated" ? C.amber : C.cyan}>{s.status}</Badge>
              </button>
            ))}
          </div>
        </Card>
        {selected && (
          <Card>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Session Detail</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                ["Task", selected.task],
                ["Session ID", selected.sessionId],
                ["Agent", selected.agent],
                ["Status", selected.status],
                ["Model", selected.model],
                ["Tokens", fmtTokens(selected.tokens)],
                ["Cost", `$${(selected.totalCost || 0).toFixed(4)}`],
                ["Size", fmtBytes(selected.sizeBytes)],
                ["Created", fmtDate(selected.dateCreated)],
                ["Finished", fmtDate(selected.dateFinished)],
                ["Transcript", selected.transcriptPath],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 12, color: C.muted }}>{label}</span>
                  <span style={{ fontSize: 12, color: C.text, textAlign: "right", maxWidth: "60%", wordBreak: "break-all" }}>{value || "—"}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
export default Sessions;
