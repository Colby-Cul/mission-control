import { useState } from "react";

const REASONS = [
  "Too competitive",
  "Bad timing",
  "Not aligned",
  "Insufficient revenue",
  "Technical infeasibility",
  "Other",
];

export default function KillModal({ idea, onConfirm, onClose }) {
  const [reason, setReason] = useState(REASONS[0]);

  if (!idea) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-gray-900 border border-slate-700/50 rounded-xl shadow-2xl z-50 p-6">
        <h3 className="text-lg font-bold text-gray-100">Kill "{idea.name}"?</h3>
        <p className="text-sm text-slate-400 mt-1">This will archive the idea. You can find archived ideas later.</p>

        <div className="mt-4">
          <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Reason</label>
          <select value={reason} onChange={e => setReason(e.target.value)}
            className="w-full mt-1 px-3 py-2 text-sm bg-slate-800/60 border border-slate-700/40 rounded-lg text-slate-300 focus:outline-none focus:ring-1 focus:ring-red-500/50">
            {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div className="flex items-center justify-end gap-2 mt-6">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors">
            Cancel
          </button>
          <button onClick={() => { onConfirm(idea.id, reason); onClose(); }}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors">
            ✕ Kill Idea
          </button>
        </div>
      </div>
    </>
  );
}
