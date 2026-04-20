import { useMemo, useState, useCallback } from "react";
import { useMissionControlData } from "../../../context/MissionControlDataContext";
import { deriveForgeStage, STAGES } from "../utils/stageMapper";
import {
  computeConfidence, computeRevenueEstimate, computeBuildCost,
  computeTimeToMVP, computeSource, computeCategory, computeRisk,
} from "../utils/computeMetrics";

export default function useForgeData() {
  const { projects = [], acpSessions = [], refresh } = useMissionControlData();
  const [localOverrides, setLocalOverrides] = useState(() => {
    try { return JSON.parse(localStorage.getItem("forge-overrides") || "{}"); } catch { return {}; }
  });
  const [shelved, setShelved] = useState(() => {
    try { return JSON.parse(localStorage.getItem("forge-shelved") || "[]"); } catch { return []; }
  });
  const [killed, setKilled] = useState(() => {
    try { return JSON.parse(localStorage.getItem("forge-killed") || "[]"); } catch { return []; }
  });

  const ideas = useMemo(() => {
    return projects
      .filter(p => p.id !== "system-ops")
      .map(p => {
        const overrides = localOverrides[p.id] || {};
        const merged = { ...p, ...overrides };
        const forgeStage = overrides.forgeStage || deriveForgeStage(merged);
        const confidenceScore = computeConfidence(merged);
        const revenueEstimate = computeRevenueEstimate(merged);
        const buildCostEstimate = computeBuildCost(merged);
        const timeToMVP = computeTimeToMVP(merged);
        const source = computeSource(merged);
        const category = computeCategory(merged);
        const riskAssessment = computeRisk(merged);
        const pct = merged.taskCount > 0 ? Math.round((merged.doneCount / merged.taskCount) * 100) : 0;
        const pitch = merged.description || merged.name;
        return {
          ...merged,
          forgeStage,
          confidenceScore,
          revenueEstimate,
          buildCostEstimate,
          timeToMVP,
          source,
          category,
          riskAssessment,
          pitch,
          progressPct: pct,
          isShelved: shelved.includes(merged.id),
          isKilled: killed.includes(merged.id),
        };
      })
      .filter(i => !i.isKilled);
  }, [projects, localOverrides, shelved, killed]);

  const activeIdeas = useMemo(() => ideas.filter(i => !i.isShelved), [ideas]);

  const stageCounts = useMemo(() => {
    const counts = {};
    STAGES.forEach(s => { counts[s.key] = 0; });
    activeIdeas.forEach(i => { counts[i.forgeStage] = (counts[i.forgeStage] || 0) + 1; });
    return counts;
  }, [activeIdeas]);

  const recentSessions = useMemo(() => {
    return acpSessions
      .slice()
      .sort((a, b) => new Date(b.dateCreated || 0) - new Date(a.dateCreated || 0))
      .slice(0, 8);
  }, [acpSessions]);

  const reviewQueue = useMemo(() => {
    return activeIdeas.filter(i => i.forgeStage === "sourced" || i.forgeStage === "evaluating");
  }, [activeIdeas]);

  const deployIdea = useCallback((id) => {
    setLocalOverrides(prev => {
      const current = prev[id] || {};
      const idea = ideas.find(i => i.id === id);
      if (!idea) return prev;
      const stages = STAGES.map(s => s.key);
      const idx = stages.indexOf(idea.forgeStage);
      const next = idx < stages.length - 1 ? stages[idx + 1] : idea.forgeStage;
      const updated = { ...prev, [id]: { ...current, forgeStage: next } };
      localStorage.setItem("forge-overrides", JSON.stringify(updated));
      return updated;
    });
  }, [ideas]);

  const killIdea = useCallback((id) => {
    setKilled(prev => {
      const next = [...prev, id];
      localStorage.setItem("forge-killed", JSON.stringify(next));
      return next;
    });
  }, []);

  const shelveIdea = useCallback((id) => {
    setShelved(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem("forge-shelved", JSON.stringify(next));
      return next;
    });
  }, []);

  return {
    ideas,
    activeIdeas,
    stageCounts,
    recentSessions,
    reviewQueue,
    deployIdea,
    killIdea,
    shelveIdea,
    refresh,
  };
}
