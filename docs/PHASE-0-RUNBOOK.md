# Phase 0 — Safety Net Runbook
**Goal:** Lock down a bulletproof backup of the current live Mission Control before v7 work begins.
**Time required:** ~15 minutes.
**Who runs it:** Colby in Claude Code (Claude Code has git + Vercel CLI). This Cowork session can't run shell commands on your laptop.

---

## STEP 1 — Git safety snapshot (2 min)

Open Claude Code in your Mission Control repo and paste:

```
Please do the following, one command at a time, and report back after each:

1. Show me `git status` — I want to see any uncommitted work before we tag.
2. Run `git tag -a v6-stable -m "Frozen production snapshot before v7 redesign"`
3. Run `git push origin v6-stable`
4. Run `git checkout -b redesign/v7`
5. Run `git push -u origin redesign/v7`
```

✅ **Success check:** `git tag` shows `v6-stable` and `git branch --show-current` returns `redesign/v7`.

---

## STEP 2 — Vercel safety clone (5 min)

Tell Claude Code:

```
Use the Vercel MCP to:
1. List my Vercel projects and find the Mission Control one.
2. Tell me its project ID and current production URL.
3. Help me create a git-based clone: the legacy URL should keep deploying from `v6-stable` tag.
```

Claude Code will walk you through two clicks in Vercel UI:
- **Settings → Git → Branch** on the current project, point production to `main` still (unchanged).
- **Import → same repo again** as a new project called `mission-control-legacy`, set its Production Branch to `v6-stable`.
- Result: `missioncontrol.app` stays on v6 live, and `mission-control-legacy.vercel.app` becomes a hot standby always showing exactly what's in production today.

✅ **Success check:** You can load both URLs and they both render the current app.

---

## STEP 3 — Point main Vercel project at staging (2 min)

Tell Claude Code:

```
In Vercel, on the primary mission-control project:
1. Set a Preview Deployment on the `redesign/v7` branch.
2. Give me the staging URL it generates.
3. Keep production domain pointed at `main` for now.
```

✅ **Success check:** You get a URL like `mission-control-git-redesign-v7-<team>.vercel.app` and the production domain is untouched.

---

## STEP 4 — Supabase dev branch (3 min)

**I (Cowork) will execute this on approval.** The Supabase MCP I have access to can:
- Create a dev branch called `redesign-v7` off production.
- This copies the schema but not the data (per Supabase branch behavior).
- Cost confirmation is required before creation; I'll ask you to confirm.

**When ready, just reply: "APPROVE SUPABASE BRANCH"** and I'll create it.

---

## STEP 5 — Rollback drill (3 min)

Before ANY v7 code ships, prove rollback works.

In Claude Code:
```
Simulate a rollback:
1. In Vercel, alias `missioncontrol.app` to the `mission-control-legacy` project.
2. Verify it loads.
3. Alias it back to the primary project's production deployment.
4. Verify it loads.
5. Tell me how long the round-trip took.
```

✅ **Success check:** Under 5 minutes end-to-end.

---

## Phase 0 — Exit Criteria

- [ ] `v6-stable` tag exists on GitHub
- [ ] `redesign/v7` branch exists on GitHub
- [ ] `mission-control-legacy` Vercel project deploys from `v6-stable`
- [ ] Staging URL for `redesign/v7` works
- [ ] Supabase `redesign-v7` dev branch created
- [ ] Rollback drill completed in <5 min

Once all 6 checkboxes are green, we move to Phase 1.

---

## What Cowork has already done in parallel

While you work through Steps 1–3, I (Cowork) have:
1. ✅ Scaffolded `/mission-control-v7/` folder with `app/`, `app/shell/`, `app/components/`, `supabase/migrations/`, `docs/`
2. ✅ Audited the live Supabase — confirmed 17 existing tables including `forge_ideas` (13 ideas), `projects`, `tasks`, `financial_accounts` (23 accounts), `property_assets` (3 properties), `property_photos` (77 images), `entity_ownership`
3. ✅ Prepped the first new migration (`20260414_v7_foundation.sql`) that ADDS missing tables without touching existing ones — awaiting your review before apply
4. ✅ Ready to start Phase 1 scaffolding the App Shell the moment you say Step 4 is approved
