import { FILTER_CHIPS, SORT_OPTIONS } from "../hooks/useForgeFilters";

export default function FilterBar({
  search, onSearch, activeFilter, onFilter, sortBy, onSort, totalCount,
}) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      {/* Search */}
      <div className="relative flex-shrink-0 w-full sm:w-56">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
        <input
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder="Search ideas..."
          className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-900/60 border border-slate-700/40 rounded-lg text-gray-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
        />
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-1.5 flex-wrap flex-1">
        {FILTER_CHIPS.map(chip => {
          const isActive = activeFilter === chip.key;
          return (
            <button key={chip.key} onClick={() => onFilter(chip.key)}
              className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors whitespace-nowrap
                ${isActive
                  ? "border-purple-500/50 bg-purple-500/10 text-purple-400"
                  : "border-slate-700/40 bg-slate-900/40 text-slate-400 hover:border-slate-600 hover:text-slate-300"
                }`}>
              {chip.icon ? `${chip.icon} ` : ""}{chip.label}
              {chip.key === "all" && ` (${totalCount})`}
            </button>
          );
        })}
      </div>

      {/* Sort */}
      <select value={sortBy} onChange={e => onSort(e.target.value)}
        className="px-2.5 py-1.5 text-xs bg-slate-900/60 border border-slate-700/40 rounded-lg text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-500/50">
        {SORT_OPTIONS.map(opt => (
          <option key={opt.key} value={opt.key}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
