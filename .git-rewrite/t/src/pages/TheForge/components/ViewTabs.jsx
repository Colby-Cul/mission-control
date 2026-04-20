const TABS = [
  { key: "factory",  label: "🏭 Factory" },
  { key: "pipeline", label: "📋 Pipeline" },
  { key: "table",    label: "📊 Table" },
  { key: "review",   label: "⚡ Quick Review" },
];

export default function ViewTabs({ active, onChange }) {
  return (
    <div className="flex items-center gap-1 bg-slate-900/40 rounded-lg p-1 border border-slate-700/20">
      {TABS.map(tab => (
        <button key={tab.key} onClick={() => onChange(tab.key)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap
            ${active === tab.key
              ? "bg-purple-500/20 text-purple-400"
              : "text-slate-400 hover:text-slate-300 hover:bg-slate-800/50"
            }`}>
          {tab.label}
        </button>
      ))}
    </div>
  );
}
