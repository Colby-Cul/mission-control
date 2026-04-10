export default function ForgeHeader({ reviewCount = 0, onCompare, onAnalytics, onReview, onNewIdea }) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-50">
            <span className="mr-2">⚒️</span>The Forge
          </h1>
          <span className="bg-purple-500/20 text-purple-400 text-xs font-semibold rounded-md px-2 py-0.5">
            Product Factory
          </span>
        </div>
        <p className="text-slate-400 text-sm mt-1">
          Your AI-powered idea pipeline — source, evaluate, decide, build, launch, profit
        </p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={onCompare}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors">
          Compare
        </button>
        <button onClick={onAnalytics}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors">
          Analytics
        </button>
        <button onClick={onReview}
          className="relative px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-br from-purple-600 to-purple-700 text-white hover:from-purple-500 hover:to-purple-600 transition-colors">
          🔥 Review Queue
          {reviewCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-red-500 text-white rounded-full px-1">
              {reviewCount}
            </span>
          )}
        </button>
        <button onClick={onNewIdea}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-br from-purple-600 to-purple-700 text-white hover:from-purple-500 hover:to-purple-600 transition-colors">
          + New Idea
        </button>
      </div>
    </div>
  );
}
