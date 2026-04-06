STARTUP: Read ~/.openclaw/persistent-memory/PROJECT_REGISTRY.md for the master project list. After completing work, update the Mission Control entry.

# Mission Control Dashboard

- **Repo:** https://github.com/Colby-Cul/mission-control
- **Stack:** React + Vite, Recharts, deployed to Vercel + GitHub Pages
- **Production:** https://mission-control-peach-omega.vercel.app
- **Data:** `bash src/data/generate-live-data.sh` regenerates from OpenClaw runtime
- **Deploy:** `vercel --prod --yes` for production, `git push` for GitHub Pages

## Rules
1. Never break existing working features — only add to them.
2. All project/task management is native to Mission Control. No external tools.
3. Test `npx vite build` before committing.
4. After changes, regenerate live-data and deploy to Vercel.

## Recent Work Log

- 2026-04-05: Bookkeeper completed an expense and waste review using available workspace cost artifacts. Main confirmed issue remains AI/model spend leakage from premium-model overuse, fallback routing, and duplicate operational work. See `~/.openclaw/workspace/anthropic/EXPENSE_RESEARCH_2026-04-05.md`.
