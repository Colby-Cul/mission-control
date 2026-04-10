import { useState, useMemo, useCallback } from "react";
import { isQuickWin, computeROI } from "../utils/computeMetrics";

const SORT_OPTIONS = [
  { key: "confidence", label: "Confidence Score" },
  { key: "revenue",    label: "Revenue Potential" },
  { key: "cost",       label: "Lowest Build Cost" },
  { key: "time",       label: "Time to Market" },
  { key: "newest",     label: "Newest First" },
];

const FILTER_CHIPS = [
  { key: "all",           label: "All",            icon: "" },
  { key: "quick-win",     label: "Quick Wins",     icon: "🔥" },
  { key: "high-revenue",  label: "High Revenue",   icon: "💰" },
  { key: "agent-sourced", label: "Agent-Sourced",   icon: "🤖" },
  { key: "manual",        label: "Manual",          icon: "📌" },
  { key: "saas",          label: "SaaS",            icon: "" },
  { key: "str",           label: "STR",             icon: "" },
  { key: "internal",      label: "Internal Tool",   icon: "" },
  { key: "needs-review",  label: "Needs Review",    icon: "⏳" },
];

export { SORT_OPTIONS, FILTER_CHIPS };

function parseWeeks(str) {
  if (!str) return 99;
  const m = String(str).match(/(\d+)\s*week/i);
  if (m) return parseInt(m[1], 10);
  return 4;
}

export default function useForgeFilters(ideas) {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState(null);
  const [sortBy, setSortBy] = useState("confidence");
  const [compareIds, setCompareIds] = useState([]);

  const toggleCompare = useCallback((id) => {
    setCompareIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 4 ? [...prev, id] : prev);
  }, []);

  const clearCompare = useCallback(() => setCompareIds([]), []);

  const filtered = useMemo(() => {
    let result = ideas;

    // stage filter
    if (stageFilter) result = result.filter(i => i.forgeStage === stageFilter);

    // chip filter
    if (activeFilter !== "all") {
      result = result.filter(i => {
        switch (activeFilter) {
          case "quick-win": return isQuickWin(i);
          case "high-revenue": return (i.revenueEstimate?.max || 0) >= 5000;
          case "agent-sourced": return i.source === "agent";
          case "manual": return i.source === "manual";
          case "saas": return i.category === "saas";
          case "str": return i.category === "str";
          case "internal": return i.category === "internal";
          case "needs-review": return i.forgeStage === "sourced" || i.forgeStage === "evaluating";
          default: return true;
        }
      });
    }

    // search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(i =>
        (i.name || "").toLowerCase().includes(q) ||
        (i.pitch || "").toLowerCase().includes(q) ||
        (i.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }

    // sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "confidence": return (b.confidenceScore || 0) - (a.confidenceScore || 0);
        case "revenue": return (b.revenueEstimate?.max || 0) - (a.revenueEstimate?.max || 0);
        case "cost": return (a.buildCostEstimate || 0) - (b.buildCostEstimate || 0);
        case "time": return parseWeeks(a.timeToMVP) - parseWeeks(b.timeToMVP);
        case "newest": return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        default: return 0;
      }
    });

    return result;
  }, [ideas, search, activeFilter, stageFilter, sortBy]);

  return {
    search, setSearch,
    activeFilter, setActiveFilter,
    stageFilter, setStageFilter,
    sortBy, setSortBy,
    compareIds, toggleCompare, clearCompare,
    filtered,
  };
}
