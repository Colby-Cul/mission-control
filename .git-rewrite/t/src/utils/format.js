export function fmtDate(v) {
  if (!v) return "\u2014";
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function fmtCost(v) {
  const n = Number(v);
  return isFinite(n) ? `$${n.toFixed(2)}` : "$0.00";
}

export function fmtTokens(v) {
  const n = Number(v);
  if (!isFinite(n) || n <= 0) return "\u2014";
  return n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(n);
}

export function fmtDuration(ms) {
  if (!ms) return "\u2014";
  const m = Math.floor(ms / 60000);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}
