import { AGENTS, C } from '../../data/constants';

const Avatar = ({ agent, size = 32 }) => {
  const a = typeof agent === "string" ? AGENTS.find(x => x.id === agent) : agent;
  if (!a) return null;
  
  const status = String(a.status || "").toLowerCase();
  const statusColor =
    status === "online" || status === "connected" || status === "active" || status === "running"
      ? C.green
      : status === "busy" || status === "warning"
        ? C.amber
        : "#64748b";
  const initials = a.initials || String(a.name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "AG";
  const primary = a.color || C.accent;
  const secondary = a.ring || C.accentLight;
  
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <div style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `linear-gradient(135deg, ${primary}, ${secondary})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size / 2.5,
        fontWeight: 700,
        color: "white",
      }}>
        {initials}
      </div>
      <div style={{
        position: "absolute",
        bottom: -1,
        right: -1,
        width: size / 4,
        height: size / 4,
        background: statusColor,
        border: "2px solid " + C.surface,
        borderRadius: "50%",
      }} />
    </div>
  );
};

export default Avatar;
