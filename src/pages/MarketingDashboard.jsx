import { useState, useMemo } from 'react';

// ─── Color palette (matches Mission Control brand) ────────────────────────────
const C = {
  bg: '#0a0a0a',
  surface: '#111111',
  card: '#161616',
  border: '#1f1f1f',
  accent: '#c9a84c',
  accentDim: 'rgba(201,168,76,0.12)',
  accentBorder: 'rgba(201,168,76,0.25)',
  text: '#f0f0f0',
  muted: '#6b7280',
  mutedLight: '#9ca3af',
  green: '#22c55e',
  red: '#ef4444',
  blue: '#3b82f6',
  purple: '#a855f7',
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

const CAMPAIGNS = [
  { id: 1, name: 'Graeagle Summer Launch', channel: 'Email', status: 'Active', sent: 2840, opens: 1136, clicks: 284, conversions: 42, revenue: 18900, spend: 1200, ctr: 10.0, convRate: 14.8 },
  { id: 2, name: 'Northstar Spring Ski', channel: 'Social', status: 'Active', sent: 5200, opens: 1820, clicks: 546, conversions: 67, revenue: 42100, spend: 2800, ctr: 10.5, convRate: 12.3 },
  { id: 3, name: 'Holiday Bundle 2024', channel: 'Email', status: 'Completed', sent: 3100, opens: 1085, clicks: 217, conversions: 31, revenue: 21700, spend: 900, ctr: 7.0, convRate: 14.3 },
  { id: 4, name: 'Repeat Guest Promo', channel: 'SMS', status: 'Active', sent: 480, opens: 384, clicks: 192, conversions: 38, revenue: 19000, spend: 200, ctr: 40.0, convRate: 19.8 },
  { id: 5, name: 'Google Ads — Sierra', channel: 'Paid Search', status: 'Active', sent: 12000, opens: 12000, clicks: 960, conversions: 86, revenue: 55400, spend: 6400, ctr: 8.0, convRate: 9.0 },
  { id: 6, name: 'Instagram Reels Push', channel: 'Social', status: 'Paused', sent: 18500, opens: 9250, clicks: 370, conversions: 22, revenue: 13200, spend: 1800, ctr: 2.0, convRate: 5.9 },
];

const MONTHLY_LEADS = [
  { month: 'Oct', leads: 48, qualified: 28, bookings: 12 },
  { month: 'Nov', leads: 62, qualified: 38, bookings: 17 },
  { month: 'Dec', leads: 87, qualified: 54, bookings: 26 },
  { month: 'Jan', leads: 71, qualified: 40, bookings: 18 },
  { month: 'Feb', leads: 95, qualified: 61, bookings: 29 },
  { month: 'Mar', leads: 118, qualified: 79, bookings: 38 },
  { month: 'Apr', leads: 142, qualified: 97, bookings: 47 },
];

const CONTENT_ITEMS = [
  { id: 1, title: 'Graeagle Spring Hiking Guide', type: 'Blog', views: 3240, engagements: 487, leads: 28, published: '2025-03-12' },
  { id: 2, title: '5 Reasons to Book Northstar in Summer', type: 'Blog', views: 2810, engagements: 392, leads: 22, published: '2025-02-28' },
  { id: 3, title: 'Hot Tub + Mountain Views Reel', type: 'Video', views: 18700, engagements: 2240, leads: 61, published: '2025-03-20' },
  { id: 4, title: 'Guest Testimonial Series #4', type: 'Video', views: 9100, engagements: 1380, leads: 44, published: '2025-04-01' },
  { id: 5, title: 'March Email Newsletter', type: 'Email', views: 2840, engagements: 1136, leads: 38, published: '2025-03-01' },
  { id: 6, title: 'Tahoe Ski Season Checklist', type: 'Blog', views: 4120, engagements: 621, leads: 33, published: '2025-01-15' },
];

const CHANNEL_SPLIT = [
  { channel: 'Organic Search', pct: 34, color: C.accent },
  { channel: 'Paid Search', pct: 24, color: C.blue },
  { channel: 'Social Media', pct: 19, color: C.purple },
  { channel: 'Email', pct: 13, color: C.green },
  { channel: 'Direct', pct: 7, color: '#f97316' },
  { channel: 'Referral', pct: 3, color: C.muted },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n) {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n}`;
}
function fmtNum(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function delta(val, pct) {
  const up = pct >= 0;
  return (
    <span style={{ fontSize: 11, color: up ? C.green : C.red, marginLeft: 6 }}>
      {up ? '▲' : '▼'} {Math.abs(pct)}%
    </span>
  );
}

// ─── Mini sparkline (pure SVG) ────────────────────────────────────────────────

function Sparkline({ data, color = C.accent, height = 36, width = 120 }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height * 0.85 - 2;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx={pts.split(' ').pop().split(',')[0]} cy={pts.split(' ').pop().split(',')[1]} r="2.5" fill={color} />
    </svg>
  );
}

// ─── Horizontal bar ───────────────────────────────────────────────────────────

function HBar({ pct, color }) {
  return (
    <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden', marginTop: 4 }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2 }} />
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, delta: d, sparkData, color = C.accent }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontSize: 26, fontWeight: 700, color: C.text, lineHeight: 1 }}>{value}</span>
        {d !== undefined && delta(value, d)}
      </div>
      {sub && <div style={{ fontSize: 12, color: C.muted }}>{sub}</div>}
      {sparkData && <Sparkline data={sparkData} color={color} />}
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title, sub }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0 }}>{title}</h2>
      {sub && <p style={{ fontSize: 12, color: C.muted, margin: '3px 0 0' }}>{sub}</p>}
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const colors = {
    Active: { bg: 'rgba(34,197,94,0.1)', color: C.green },
    Completed: { bg: 'rgba(201,168,76,0.1)', color: C.accent },
    Paused: { bg: 'rgba(107,114,128,0.15)', color: C.muted },
  };
  const s = colors[status] ?? colors.Paused;
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: s.bg, color: s.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {status}
    </span>
  );
}

// ─── Lead funnel bar chart ────────────────────────────────────────────────────

function LeadFunnelChart({ data }) {
  const maxLeads = Math.max(...data.map(d => d.leads));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120, padding: '0 4px' }}>
      {data.map((d, i) => {
        const lPct = (d.leads / maxLeads) * 100;
        const qPct = (d.qualified / d.leads) * 100;
        const bPct = (d.bookings / d.leads) * 100;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <div title={`Leads: ${d.leads}`} style={{ width: '100%', height: lPct * 1.0, background: C.accentDim, borderRadius: '3px 3px 0 0', borderTop: `2px solid ${C.accent}`, minHeight: 4 }} />
            </div>
            <div style={{ fontSize: 10, color: C.muted, textAlign: 'center' }}>{d.month}</div>
            <div style={{ fontSize: 10, color: C.accent, fontWeight: 600 }}>{d.leads}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MarketingDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [campaignSort, setCampaignSort] = useState('revenue');

  // Aggregates
  const totals = useMemo(() => ({
    revenue: CAMPAIGNS.reduce((s, c) => s + c.revenue, 0),
    spend: CAMPAIGNS.reduce((s, c) => s + c.spend, 0),
    conversions: CAMPAIGNS.reduce((s, c) => s + c.conversions, 0),
    leads: MONTHLY_LEADS.reduce((s, m) => s + m.leads, 0),
    bookings: MONTHLY_LEADS.reduce((s, m) => s + m.bookings, 0),
  }), []);
  const roas = (totals.revenue / totals.spend).toFixed(1);

  const sortedCampaigns = useMemo(() => {
    return [...CAMPAIGNS].sort((a, b) => b[campaignSort] - a[campaignSort]);
  }, [campaignSort]);

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'campaigns', label: 'Campaigns' },
    { id: 'leads', label: 'Lead Gen' },
    { id: 'content', label: 'Content' },
  ];

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: '28px 32px', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: C.text }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>Marketing Performance</h1>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>California Luxury Stays — Live Dashboard</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.green, boxShadow: `0 0 6px ${C.green}` }} />
          <span style={{ fontSize: 12, color: C.mutedLight }}>Last updated: just now</span>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: `1px solid ${C.border}`, paddingBottom: 0 }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '8px 16px', fontSize: 13, fontWeight: 500,
              color: activeTab === t.id ? C.accent : C.muted,
              borderBottom: activeTab === t.id ? `2px solid ${C.accent}` : '2px solid transparent',
              marginBottom: -1, transition: 'color 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ OVERVIEW ══ */}
      {activeTab === 'overview' && (
        <div>
          {/* KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
            <StatCard label="Total Revenue" value={fmt(totals.revenue)} d={18} sub="from all campaigns" sparkData={[55,62,58,71,80,91,101]} />
            <StatCard label="Total Ad Spend" value={fmt(totals.spend)} d={-4} sub="budget utilized" color={C.blue} sparkData={[14,15,13,16,17,14,13]} />
            <StatCard label="ROAS" value={`${roas}x`} d={22} sub="return on ad spend" color={C.green} sparkData={[3.2,3.5,3.8,4.0,4.2,4.5,4.7]} />
            <StatCard label="Conversions" value={totals.conversions} d={12} sub="this period" sparkData={[180,195,210,220,238,254,286]} />
            <StatCard label="Total Leads" value={totals.leads} d={31} sub="across all channels" sparkData={[48,62,87,71,95,118,142]} />
            <StatCard label="Bookings" value={totals.bookings} d={19} sub="confirmed stays" color={C.purple} sparkData={[12,17,26,18,29,38,47]} />
          </div>

          {/* Two columns */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Channel split */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 22 }}>
              <SectionHeader title="Traffic by Channel" sub="All sources, last 30 days" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {CHANNEL_SPLIT.map(c => (
                  <div key={c.channel}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, color: C.mutedLight }}>{c.channel}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: c.color }}>{c.pct}%</span>
                    </div>
                    <HBar pct={c.pct} color={c.color} />
                  </div>
                ))}
              </div>
            </div>

            {/* Top campaigns */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 22 }}>
              <SectionHeader title="Top Campaigns by Revenue" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {CAMPAIGNS.sort((a, b) => b.revenue - a.revenue).slice(0, 5).map((c, i) => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 11, color: C.accent, fontWeight: 700, width: 16 }}>{i + 1}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: C.text, fontWeight: 500 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>{c.channel}</div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.accent }}>{fmt(c.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ CAMPAIGNS ══ */}
      {activeTab === 'campaigns' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <SectionHeader title="All Campaigns" sub={`${CAMPAIGNS.length} campaigns active`} />
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: C.muted }}>Sort by:</span>
              {['revenue', 'conversions', 'ctr'].map(k => (
                <button
                  key={k}
                  onClick={() => setCampaignSort(k)}
                  style={{
                    fontSize: 11, padding: '4px 10px', borderRadius: 6,
                    background: campaignSort === k ? C.accentDim : 'transparent',
                    border: `1px solid ${campaignSort === k ? C.accentBorder : C.border}`,
                    color: campaignSort === k ? C.accent : C.muted,
                    cursor: 'pointer', fontWeight: campaignSort === k ? 600 : 400,
                  }}
                >
                  {k.charAt(0).toUpperCase() + k.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sortedCampaigns.map(c => {
              const roi = (((c.revenue - c.spend) / c.spend) * 100).toFixed(0);
              return (
                <div key={c.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{c.name}</span>
                        <StatusBadge status={c.status} />
                      </div>
                      <span style={{ fontSize: 11, color: C.muted, background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: 4 }}>
                        {c.channel}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(70px, 1fr))', gap: 16 }}>
                      {[
                        { label: 'Revenue', val: fmt(c.revenue), color: C.accent },
                        { label: 'Spend', val: fmt(c.spend), color: C.mutedLight },
                        { label: 'ROI', val: `${roi}%`, color: parseInt(roi) >= 0 ? C.green : C.red },
                        { label: 'CTR', val: `${c.ctr}%`, color: C.mutedLight },
                        { label: 'Conv.', val: c.conversions, color: C.mutedLight },
                      ].map(m => (
                        <div key={m.label} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{m.label}</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: m.color }}>{m.val}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Progress bar: opens → clicks → conversions */}
                  <div style={{ marginTop: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: C.muted, width: 60 }}>Funnel</span>
                    <div style={{ flex: 1, display: 'flex', gap: 2 }}>
                      {[
                        { pct: 100, label: `${fmtNum(c.sent)} sent`, color: 'rgba(255,255,255,0.06)' },
                        { pct: (c.opens / c.sent) * 100, label: `${fmtNum(c.opens)} opens`, color: 'rgba(59,130,246,0.4)' },
                        { pct: (c.clicks / c.sent) * 100, label: `${fmtNum(c.clicks)} clicks`, color: 'rgba(201,168,76,0.4)' },
                        { pct: (c.conversions / c.sent) * 100, label: `${c.conversions} conv.`, color: 'rgba(34,197,94,0.4)' },
                      ].map((f, fi) => (
                        <div key={fi} title={f.label} style={{ height: 4, flex: fi === 0 ? 1 : f.pct, maxFlex: 1, background: f.color, borderRadius: 2, minWidth: f.pct > 0 ? 3 : 0 }} />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ LEADS ══ */}
      {activeTab === 'leads' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
            <StatCard label="Total Leads (7mo)" value={totals.leads} d={31} sub="qualified + unqualified" />
            <StatCard label="Qualified Rate" value="64%" d={8} sub="leads worth pursuing" color={C.green} sparkData={[52,55,58,56,64,67,68]} />
            <StatCard label="Lead → Booking" value="32%" d={5} sub="close rate" color={C.purple} sparkData={[25,27,30,25,31,32,33]} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 22 }}>
              <SectionHeader title="Monthly Lead Volume" sub="Leads, qualified, and bookings by month" />
              <LeadFunnelChart data={MONTHLY_LEADS} />
              <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                {[
                  { label: 'Total Leads', color: C.accent },
                  { label: 'Qualified', color: C.blue },
                  { label: 'Bookings', color: C.green },
                ].map(l => (
                  <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />
                    <span style={{ fontSize: 11, color: C.muted }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 22 }}>
              <SectionHeader title="Monthly Detail" />
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    {['Month', 'Leads', 'Qualified', 'Bookings', 'Rate'].map(h => (
                      <th key={h} style={{ textAlign: h === 'Month' ? 'left' : 'right', paddingBottom: 10, color: C.muted, fontWeight: 500, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MONTHLY_LEADS.map((row, i) => (
                    <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={{ padding: '9px 0', color: C.text, fontWeight: 500 }}>{row.month}</td>
                      <td style={{ textAlign: 'right', padding: '9px 0', color: C.text }}>{row.leads}</td>
                      <td style={{ textAlign: 'right', padding: '9px 0', color: C.blue }}>{row.qualified}</td>
                      <td style={{ textAlign: 'right', padding: '9px 0', color: C.green }}>{row.bookings}</td>
                      <td style={{ textAlign: 'right', padding: '9px 0', color: C.accent, fontWeight: 600 }}>{((row.bookings / row.leads) * 100).toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══ CONTENT ══ */}
      {activeTab === 'content' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
            <StatCard label="Total Content Views" value={fmtNum(CONTENT_ITEMS.reduce((s, c) => s + c.views, 0))} d={24} sub="last 90 days" />
            <StatCard label="Total Engagements" value={fmtNum(CONTENT_ITEMS.reduce((s, c) => s + c.engagements, 0))} d={18} sub="likes, shares, comments" color={C.purple} />
            <StatCard label="Content-Driven Leads" value={CONTENT_ITEMS.reduce((s, c) => s + c.leads, 0)} d={37} sub="attributable to content" color={C.green} />
          </div>

          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 22 }}>
            <SectionHeader title="Content Performance" sub="Top performing pieces ranked by lead generation" />
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  {['Title', 'Type', 'Views', 'Engagements', 'Leads', 'Eng. Rate'].map(h => (
                    <th key={h} style={{ textAlign: h === 'Title' ? 'left' : 'right', paddingBottom: 12, color: C.muted, fontWeight: 500, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CONTENT_ITEMS.sort((a, b) => b.leads - a.leads).map((item, i) => {
                  const engRate = ((item.engagements / item.views) * 100).toFixed(1);
                  const typeColor = { Blog: C.blue, Video: C.purple, Email: C.green }[item.type] ?? C.muted;
                  return (
                    <tr key={item.id} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={{ padding: '12px 0', color: C.text, maxWidth: 220 }}>
                        <div style={{ fontWeight: 500 }}>{item.title}</div>
                        <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{item.published}</div>
                      </td>
                      <td style={{ textAlign: 'right', padding: '12px 0' }}>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: `${typeColor}18`, color: typeColor, fontWeight: 600 }}>
                          {item.type}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', padding: '12px 0', color: C.mutedLight }}>{fmtNum(item.views)}</td>
                      <td style={{ textAlign: 'right', padding: '12px 0', color: C.mutedLight }}>{fmtNum(item.engagements)}</td>
                      <td style={{ textAlign: 'right', padding: '12px 0', color: C.accent, fontWeight: 700 }}>{item.leads}</td>
                      <td style={{ textAlign: 'right', padding: '12px 0', color: parseFloat(engRate) >= 10 ? C.green : C.mutedLight }}>{engRate}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
