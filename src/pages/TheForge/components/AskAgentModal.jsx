import { useState } from "react";

const QUICK_PROMPTS = [
  "Research competitors",
  "Estimate costs for SaaS version",
  "Find potential customers",
  "Analyze market size",
  "Generate build roadmap",
  "Draft landing page copy",
];

export default function AskAgentModal({ idea, onSend, onClose }) {
  const [prompt, setPrompt] = useState("");

  if (!idea) return null;

  const handleSend = () => {
    if (!prompt.trim()) return;
    onSend(idea, prompt);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-gray-900 border border-slate-700/50 rounded-xl shadow-2xl z-50 p-6">
        <h3 className="text-lg font-bold text-gray-100">Ask Agent about "{idea.name}"</h3>
        <p className="text-sm text-slate-400 mt-1">Send a prompt to the assigned agent for research or action.</p>

        {/* Quick prompts */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {QUICK_PROMPTS.map(qp => (
            <button key={qp} onClick={() => setPrompt(qp)}
              className="text-[10px] px-2 py-1 rounded bg-slate-800/60 text-slate-400 border border-slate-700/30 hover:border-purple-500/30 hover:text-purple-400 transition-colors">
              {qp}
            </button>
          ))}
        </div>

        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Type your prompt..."
          rows={3}
          className="w-full mt-3 px-3 py-2 text-sm bg-slate-800/60 border border-slate-700/40 rounded-lg text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 resize-none"
        />

        <div className="flex items-center justify-end gap-2 mt-4">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors">
            Cancel
          </button>
          <button onClick={handleSend} disabled={!prompt.trim()}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-gradient-to-br from-purple-600 to-purple-700 text-white hover:from-purple-500 hover:to-purple-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            💬 Send to Agent
          </button>
        </div>
      </div>
    </>
  );
}
