import { useState, useCallback } from "react";
import { getApiUrl } from "../../utils/api";
import useForgeData from "./hooks/useForgeData";
import useForgeFilters from "./hooks/useForgeFilters";
import ForgeHeader from "./components/ForgeHeader";
import ViewTabs from "./components/ViewTabs";
import AgentTicker from "./components/AgentTicker";
import PipelineFunnel from "./components/PipelineFunnel";
import FilterBar from "./components/FilterBar";
import IdeaCard from "./components/IdeaCard";
import IdeaDetailPanel from "./components/IdeaDetailPanel";
import CompareModal from "./components/CompareModal";
import ReviewQueue from "./components/ReviewQueue";
import KanbanView from "./components/KanbanView";
import TableView from "./components/TableView";
import AnalyticsPanel from "./components/AnalyticsPanel";
import KillModal from "./components/KillModal";
import DeployModal from "./components/DeployModal";
import AskAgentModal from "./components/AskAgentModal";

export default function TheForge() {
  const {
    activeIdeas, stageCounts, recentSessions, reviewQueue,
    deployIdea, killIdea, shelveIdea,
  } = useForgeData();

  const {
    search, setSearch, activeFilter, setActiveFilter,
    stageFilter, setStageFilter, sortBy, setSortBy,
    compareIds, toggleCompare, clearCompare, filtered,
  } = useForgeFilters(activeIdeas);

  // View state
  const [view, setView] = useState("factory");
  const [selectedIdea, setSelectedIdea] = useState(null);
  const [showCompare, setShowCompare] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [killTarget, setKillTarget] = useState(null);
  const [deployTarget, setDeployTarget] = useState(null);
  const [askTarget, setAskTarget] = useState(null);
  const [showNewIdea, setShowNewIdea] = useState(false);
  const [newIdeaName, setNewIdeaName] = useState("");
  const [newIdeaSource, setNewIdeaSource] = useState("Manual");
  const [addResult, setAddResult] = useState(null);

  const submitNewIdea = useCallback(async () => {
    if (!newIdeaName.trim()) return;
    try {
      const base = getApiUrl();
      await fetch(`${base}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newIdeaName,
          agents: ["main"],
          status: "active",
          description: `Source: ${newIdeaSource}. Added from The Forge pipeline.`,
        }),
      });
      setAddResult({ ok: true, msg: `"${newIdeaName}" added to pipeline` });
      setNewIdeaName("");
      setTimeout(() => { setAddResult(null); refresh(); setShowNewIdea(false); }, 1500);
    } catch {
      setAddResult({ ok: false, msg: "API unreachable — idea saved locally only" });
      setTimeout(() => setAddResult(null), 3000);
    }
  }, [newIdeaName, newIdeaSource, refresh]);

  // Action handlers with confirmation modals
  const handleDeploy = useCallback((id) => {
    const idea = activeIdeas.find(i => i.id === id);
    if (idea) setDeployTarget(idea);
  }, [activeIdeas]);

  const handleKill = useCallback((id) => {
    const idea = activeIdeas.find(i => i.id === id);
    if (idea) setKillTarget(idea);
  }, [activeIdeas]);

  const confirmDeploy = useCallback((id) => {
    deployIdea(id);
    setDeployTarget(null);
    setSelectedIdea(null);
  }, [deployIdea]);

  const confirmKill = useCallback((id) => {
    killIdea(id);
    setKillTarget(null);
    setSelectedIdea(null);
  }, [killIdea]);

  const handleStageClick = useCallback((key) => {
    setStageFilter(prev => prev === key ? null : key);
  }, [setStageFilter]);

  const handleViewChange = useCallback((v) => {
    if (v === "review") { setShowReview(true); return; }
    setView(v);
  }, []);

  // Compare items
  const compareIdeas = activeIdeas.filter(i => compareIds.includes(i.id));

  return (
    <div className="flex flex-col gap-4">
      {/* Ticker animation style */}
      <style>{`
        @keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-ticker { animation: ticker 30s linear infinite; }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>

      <ForgeHeader
        reviewCount={reviewQueue.length}
        onCompare={() => compareIds.length >= 2 ? setShowCompare(true) : null}
        onAnalytics={() => setShowAnalytics(true)}
        onReview={() => setShowReview(true)}
        onNewIdea={() => setShowNewIdea(true)}
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <ViewTabs active={view} onChange={handleViewChange} />
      </div>

      <AgentTicker sessions={recentSessions} />

      <PipelineFunnel
        stageCounts={stageCounts}
        activeStage={stageFilter}
        onStageClick={handleStageClick}
      />

      <FilterBar
        search={search} onSearch={setSearch}
        activeFilter={activeFilter} onFilter={setActiveFilter}
        sortBy={sortBy} onSort={setSortBy}
        totalCount={activeIdeas.length}
      />

      {/* Compare hint */}
      {compareIds.length > 0 && compareIds.length < 2 && (
        <div className="text-xs text-slate-500 bg-slate-900/30 rounded-lg px-3 py-2 border border-slate-700/20">
          Select {2 - compareIds.length} more idea{compareIds.length === 0 ? "s" : ""} to compare, then click Compare.
        </div>
      )}
      {compareIds.length >= 2 && (
        <div className="flex items-center gap-2 text-xs bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-2">
          <span className="text-purple-400 font-medium">{compareIds.length} ideas selected</span>
          <button onClick={() => setShowCompare(true)}
            className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 hover:bg-purple-500/30">
            Compare Now
          </button>
          <button onClick={clearCompare} className="text-slate-500 hover:text-slate-300">Clear</button>
        </div>
      )}

      {/* Main content area */}
      {view === "factory" && (
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}>
          {filtered.map(idea => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              isComparing={compareIds.includes(idea.id)}
              onToggleCompare={toggleCompare}
              onClick={() => setSelectedIdea(idea)}
              onDeploy={handleDeploy}
              onKill={handleKill}
              onShelve={shelveIdea}
              onAskAgent={setAskTarget}
            />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center text-slate-500 text-sm py-12">
              No ideas match your filters
            </div>
          )}
        </div>
      )}

      {view === "pipeline" && (
        <KanbanView
          ideas={filtered}
          onDeploy={handleDeploy}
          onKill={handleKill}
          onClick={setSelectedIdea}
        />
      )}

      {view === "table" && (
        <TableView
          ideas={filtered}
          onDeploy={handleDeploy}
          onKill={handleKill}
          onClick={setSelectedIdea}
        />
      )}

      {/* New Idea modal */}
      {showNewIdea && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setShowNewIdea(false)}>
          <div className="bg-gray-900 border border-slate-700/50 rounded-xl shadow-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-100">New Idea</h3>
            <div className="flex gap-2 mt-3">
              <input
                value={newIdeaName}
                onChange={e => setNewIdeaName(e.target.value)}
                placeholder="Idea name..."
                autoFocus
                className="flex-1 px-3 py-2 text-sm bg-slate-800/60 border border-slate-700/40 rounded-lg text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                onKeyDown={e => { if (e.key === "Enter") submitNewIdea(); }}
              />
              <select value={newIdeaSource} onChange={e => setNewIdeaSource(e.target.value)}
                className="px-3 py-2 text-sm bg-slate-800/60 border border-slate-700/40 rounded-lg text-slate-300 focus:outline-none">
                <option>Manual</option><option>Twitter/X</option><option>Reddit</option>
                <option>Product Hunt</option><option>Financial Trends</option><option>Blog Monitor</option>
              </select>
            </div>
            {addResult && (
              <div className={`mt-3 px-3 py-2 rounded-lg text-xs ${addResult.ok ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                {addResult.msg}
              </div>
            )}
            <div className="flex items-center justify-end gap-2 mt-4">
              <button onClick={() => setShowNewIdea(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200">Cancel</button>
              <button onClick={submitNewIdea} disabled={!newIdeaName.trim()}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-gradient-to-br from-purple-600 to-purple-700 text-white disabled:opacity-40 disabled:cursor-not-allowed">
                Add to Pipeline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals & Panels */}
      {selectedIdea && (
        <IdeaDetailPanel
          idea={selectedIdea}
          onClose={() => setSelectedIdea(null)}
          onDeploy={handleDeploy}
          onKill={handleKill}
          onShelve={shelveIdea}
          onAskAgent={setAskTarget}
        />
      )}

      {showCompare && compareIdeas.length >= 2 && (
        <CompareModal
          ideas={compareIdeas}
          onDeploy={confirmDeploy}
          onClose={() => setShowCompare(false)}
        />
      )}

      {showReview && reviewQueue.length > 0 && (
        <ReviewQueue
          ideas={reviewQueue}
          onApprove={confirmDeploy}
          onKill={confirmKill}
          onNeedInfo={setAskTarget}
          onClose={() => setShowReview(false)}
        />
      )}
      {showReview && reviewQueue.length === 0 && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setShowReview(false)}>
          <div className="bg-gray-900 border border-slate-700/50 rounded-xl shadow-2xl p-6 text-center">
            <div className="text-2xl mb-2">✅</div>
            <h3 className="text-lg font-bold text-gray-100">All Caught Up!</h3>
            <p className="text-sm text-slate-400 mt-1">No ideas need review right now.</p>
            <button onClick={() => setShowReview(false)} className="mt-4 px-4 py-2 text-sm text-slate-400 hover:text-slate-200">Close</button>
          </div>
        </div>
      )}

      {showAnalytics && (
        <AnalyticsPanel
          ideas={activeIdeas}
          stageCounts={stageCounts}
          onClose={() => setShowAnalytics(false)}
        />
      )}

      {killTarget && (
        <KillModal
          idea={killTarget}
          onConfirm={confirmKill}
          onClose={() => setKillTarget(null)}
        />
      )}

      {deployTarget && (
        <DeployModal
          idea={deployTarget}
          onConfirm={confirmDeploy}
          onClose={() => setDeployTarget(null)}
        />
      )}

      {askTarget && (
        <AskAgentModal
          idea={askTarget}
          onSend={(idea, prompt) => {
            // In full implementation, this creates a new ACP session
            console.log(`[Forge] Ask agent for "${idea.name}": ${prompt}`);
          }}
          onClose={() => setAskTarget(null)}
        />
      )}
    </div>
  );
}
