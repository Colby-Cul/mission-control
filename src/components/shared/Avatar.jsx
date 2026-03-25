import { AGENTS, C } from '../../data/constants';

const Avatar = ({ agent, size = 32 }) => {
  const a = typeof agent === "string" ? AGENTS.find(x => x.id === agent) : agent;
  if (!a) return null;
  
  const statusColor = a.status === "online" ? C.green : a.status === "busy" ? C.amber : "#64748b";
  
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <div style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `linear-gradient(135deg, ${a.color}, ${a.ring})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size / 2.5,
        fontWeight: 700,
        color: "white",
      }}>
        {a.initials}
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