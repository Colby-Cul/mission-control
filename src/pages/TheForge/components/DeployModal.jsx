import { getStageDef, nextStage } from "../utils/stageMapper";

export default function DeployModal({ idea, onConfirm, onClose }) {
  if (!idea) return null;
  const next = nextStage(idea.forgeStage);
  const nextDef = getStageDef(next);

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-gray-900 border border-slate-700/50 rounded-xl shadow-2xl z-50 p-6">
        <h3 className="text-lg font-bold text-gray-100">Deploy "{idea.name}"?</h3>
        <p className="text-sm text-slate-400 mt-2">
          This will move the idea from <strong className="text-slate-300">{getStageDef(idea.forgeStage).label}</strong> to{" "}
          <strong className={nextDef.text}>{nextDef.label}</strong>.
        </p>
        {next === "building" && (
          <p className="text-xs text-slate-500 mt-2">This will generate tasks and assign agents.</p>
        )}

        <div className="flex items-center justify-end gap-2 mt-6">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors">
            Cancel
          </button>
          <button onClick={() => { onConfirm(idea.id); onClose(); }}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors">
            🚀 Deploy to {nextDef.label}
          </button>
        </div>
      </div>
    </>
  );
}
