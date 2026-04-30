# Phase 0 — Status (2026-04-14, autonomous overnight run)

## ✅ Done

### Step 1: Git safety snapshot
- Tag `v6-stable` pushed to `github.com/Colby-Cul/mission-control`
  - Points at commit `2c588cb` (Auto-update: refresh live data 02:38)
- Branch `redesign/v7` pushed (currently identical to master — see Gap #1)
- Branch `legacy-v6` pushed, pinned to `v6-stable` tag
- Local working copy returned to `master` so auto-updater cron keeps working

### Step 2: Vercel safety clone
- New Vercel project: `mission-control-legacy` (team `cabo-tropic-horizons`)
- Connected to GitHub repo `Colby-Cul/mission-control`
- Production deployment live from `legacy-v6` branch:
  - **`https://mission-control-legacy.vercel.app`**
  - Specific deployment: `https://mission-control-legacy-j80xsjapb-cabo-tropic-horizons.vercel.app`
- Primary `mission-control` project untouched — still deploys `master` to production domain

### Step 4: Supabase dev branch (completed earlier in session)
- Branch `redesign-v7` on project `bdlvwfobjqvnrffzxrfz`
- Branch URL: `foeaxtbsigecfyvewkws.supabase.co` (~$9.68/mo)
- Real prod data copied over:
  | Table | Rows |
  |---|---|
  | forge_ideas | 13 |
  | property_assets | 3 |
  | plaid_items | 7 (access tokens scrubbed — safe) |
  | financial_accounts | 23 |
  | projects | 1 |
  | tasks | 23 |
  | entity_ownership | 7, agents 8, visions 3, tax_deadlines 6 |
- Skipped: `financial_transactions` (83) and `property_photos` (77) — heavy, not on dashboard counts
- Dashboard running on Worker at `http://192.168.1.44:3000` now renders real business data (`$2,571,480` net, etc.)

## ⚠️ Gaps to address when you're back

### Gap #1 — `redesign/v7` branch ≠ v7 code
The Phase-0 runbook assumes v7 code will live on a `redesign/v7` branch of the v6 repo. In reality, the v7 scaffold is a **separate project** at `~/openclaw/mission-control-v7` (different repo/package.json, different Next.js structure, different Supabase project). The `redesign/v7` branch on the v6 GitHub repo is a literal copy of `master` right now.

**Decision needed:**
- **Option A:** Merge the v7 scaffold *into* the existing v6 repo on the `redesign/v7` branch. Pros: matches the runbook, single Vercel project. Cons: bigger git history rewrite.
- **Option B:** Keep v7 as its own repo/project, and treat the v6 `redesign/v7` branch as a stub you can delete. Create a new Vercel project `mission-control-v7` from the standalone scaffold. Pros: clean separation, no blast radius on v6. Cons: you now manage two Vercel projects long-term.

I stopped here because either decision shapes the rest of Phase 0.

### Step 3 — Staging URL for redesign/v7 (NOT done)
Tried to trigger a preview deploy of the `redesign/v7` branch on the primary `mission-control` Vercel project. Build failed with `deploy_failed` (no usable logs surfaced via CLI). Likely cause: env vars not populated for non-production branches.
- Blocked on Gap #1 above — not worth fixing until we know whether `redesign/v7` should hold v7 code at all.

### Step 5 — Rollback drill (NOT done — destructive, needs your go-ahead)
This step aliases `missioncontrol.app` to the legacy project and back. I don't touch production domains autonomously. To execute when you're back:
```
vercel alias set mission-control-legacy.vercel.app missioncontrol.app   # rollback
# verify it loads, then restore:
vercel alias set <primary-prod-deployment-url> missioncontrol.app        # restore
```

## Housekeeping
- `/tmp/mc-legacy` worktree left in place (feeds the legacy Vercel project)
- `/tmp/mc-v7staging` cleaned up
- Supabase DB password stored in `~/.openclaw/vault/shared/supabase.md` on both Main and Worker — **rotate it again** since it went through plaintext chat
- Vercel CLI is authed as `colby-5083` on Main

## URLs cheat sheet
| Purpose | URL |
|---|---|
| Live production (untouched) | missioncontrol.app |
| Legacy hot standby | https://mission-control-legacy.vercel.app |
| v7 local dev (Worker) | http://192.168.1.44:3000 |
| v6 GitHub tag | github.com/Colby-Cul/mission-control/releases/tag/v6-stable |
| v6 GitHub `redesign/v7` branch (stub) | github.com/Colby-Cul/mission-control/tree/redesign/v7 |
| Supabase staging branch | https://foeaxtbsigecfyvewkws.supabase.co |
