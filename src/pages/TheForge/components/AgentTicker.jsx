const ICONS = { research: "🔍", scoring: "📊", queued: "📥", building: "🔨", testing: "🧪", done: "✅" };

function tickerIcon(task) {
  const t = (task || "").toLowerCase();
  if (t.includes("research") || t.includes("search")) return ICONS.research;
  if (t.includes("score") || t.includes("analy")) return ICONS.scoring;
  if (t.includes("queue") || t.includes("wait")) return ICONS.queued;
  if (t.includes("build") || t.includes("creat")) return ICONS.building;
  if (t.includes("test") || t.includes("valid")) return ICONS.testing;
  return ICONS.queued;
}

export default function AgentTicker({ sessions }) {
  if (!sessions || sessions.length === 0) return null;

  const items = sessions.map(s => ({
    id: s.id,
    icon: tickerIcon(s.task),
    agent: s.agent,
    task: (s.task || "").slice(0, 50),
  }));

  // Double items for seamless scroll
  const doubled = [...items, ...items];

  return (
    <div className="flex items-center gap-3 overflow-hidden bg-slate-900/30 border border-slate-700/20 rounded-lg px-3 py-2">
      {/* Label */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Agent Live</span>
      </div>

      {/* Scrolling content */}
      <div className="overflow-hidden flex-1 relative">
        <div className="flex items-center gap-6 whitespace-nowrap animate-ticker">
          {doubled.map((item, i) => (
            <span key={`${item.id}-${i}`} className="text-xs text-slate-400">
              {item.icon}{" "}
              <span className="text-purple-400 font-medium">{item.agent}</span>
              {": "}{item.task}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
