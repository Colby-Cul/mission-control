const GRAFANA_BASE = "https://jarvisagententerprise.grafana.net";
const PUBLIC_TOKEN = "8fd06a19728d4cab8b30217a62fe4f1a";
const DASH_UID = "a22790b1-ee44-41af-9f14-a1ad3fe78314";

export default function GrafanaPanel({ panelId, height = 200, title, className = "" }) {
  // Use public dashboard embed URL with solo panel view
  const src = `${GRAFANA_BASE}/public-dashboards/${PUBLIC_TOKEN}?orgId=1&panelId=${panelId}&theme=dark`;
  
  return (
    <div className={className} style={{ width: "100%", overflow: "hidden", borderRadius: 12, border: "1px solid #2a2f42" }}>
      {title && <div style={{ padding: "8px 12px", fontSize: 11, color: "#8b95a5", borderBottom: "1px solid #2a2f42", background: "#1a1d29" }}>{title}</div>}
      <iframe
        src={src}
        width="100%"
        height={height}
        frameBorder="0"
        style={{ border: "none", background: "#0f1117" }}
        loading="lazy"
        allow="fullscreen"
      />
    </div>
  );
}

// Full dashboard embed (shows all panels)
export function GrafanaDashboard({ height = 600 }) {
  const src = `${GRAFANA_BASE}/public-dashboards/${PUBLIC_TOKEN}?theme=dark&kiosk`;
  return (
    <iframe
      src={src}
      width="100%"
      height={height}
      frameBorder="0"
      style={{ border: "none", borderRadius: 12, background: "#0f1117" }}
      loading="lazy"
      allow="fullscreen"
    />
  );
}

// Config for embedding specific panels by name
export const GRAFANA_PANELS = {
  totalAgents: 1,
  totalSessions: 2,
  totalCost: 3,
  activeProjects: 4,
  cronJobs: 5,
  agentRoster: 6,
  projectsTable: 7,
  sessionsTable: 8,
};
