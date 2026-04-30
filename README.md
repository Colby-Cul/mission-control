# Mission Control v7

CEO command center for Colby's empire (Cabo Tropic, Culbertson, Xome Home, BLC CA, Alabama Shores, Lincoln Hodl, CA Stays).

## Status

✅ **Phase 0 — Safety Net** (Supabase branch created, additive migration applied, 22 new tables, 72 seed rows)
🟡 **Phase 1 — Foundation** (App Shell scaffolded, queries layer written, Dashboard page wired — ready for Claude Code to run `npm install && npm run dev`)
⬜ Phase 2 — Lock-page data wiring (Vision Board, Finance, Xome)
⬜ Phase 3 — Core pages
⬜ Phase 4 — Entity fan-out
⬜ Phase 5 — Ops / Engineering / Docs / Assets / People pages
⬜ Phase 6 — Monetization prep
⬜ Phase 7 — Launch

## Environments

| | Prod | Dev (this repo targets this) |
|---|---|---|
| Supabase project ref | `bdlvwfobjqvnrffzxrfz` | `foeaxtbsigecfyvewkws` |
| URL | `https://bdlvwfobjqvnrffzxrfz.supabase.co` | `https://foeaxtbsigecfyvewkws.supabase.co` |
| Status | 🔒 untouched | 🟢 active with seed data |
| Cost | Free + Pro plan | $0.01344/hr branch cost |

## Quick start (for Claude Code)

```bash
cp .env.local.example .env.local
npm install
npm run dev
# open http://localhost:3000
```

The Dashboard at `/` will query the dev branch live — you'll see 7 entities, 8 agents, 3 visions, 6 tax deadlines, 16 achievements.

## Structure

```
mission-control-v7/
├── app/
│   ├── layout.tsx          # Wraps everything in <Shell>
│   ├── page.tsx            # Dashboard (live Supabase data)
│   ├── globals.css         # Design tokens + shell styles
│   ├── shell/
│   │   ├── Shell.tsx       # Sidebar + top bar + command palette
│   │   └── index.html      # Static HTML preview (reference)
│   └── lib/
│       ├── supabase.ts     # Typed client
│       ├── queries.ts      # Canonical query layer — pages use this, never raw SQL
│       └── database.types.ts  # Generated from Supabase branch
├── supabase/
│   └── migrations/
│       └── 20260414_v7_foundation.sql   # 22 tables, additive, already applied to branch
├── docs/
│   └── PHASE-0-RUNBOOK.md  # git tag + Vercel clone steps for CEO
├── package.json
├── tsconfig.json
├── next.config.js
└── .env.local.example
```

## Sidebar architecture (locked)

- **📌 Pinned** — Dashboard · Vision Board · 🔥 The Forge
- 💰 **Finance** — Finance · Cash Flow · Tax Center
- 💼 **Work** — Projects · Tasks
- 🏠 **Assets** — Companies · Properties · Rentals · Photo Manager · Entity Map
- ⚡ **Engineering** — Skill Lab · Activity Feed · Sessions
- 📄 **Documents** — Docs Hub · Workspace Files · Legal Docs · Memory & Knowledge
- 🖥 **Operations** — System Monitor · Incident Room · Integrations Hub
- 👥 **People** — Team · The Floor (agent monitoring)
- ⚙ **System** — Settings

## Pages to build next (Phase 3)

Each one is a `.tsx` file under `app/<route>/page.tsx`. Use the pattern from `app/page.tsx` — call queries from `lib/queries.ts`, render cards from `globals.css`.

- `app/vision/page.tsx` — LOCKED visuals, wire to `getVisions()` (ref: `/openclaw/vision-board-v5-option-d-terrain.html`)
- `app/finance/page.tsx` — LOCKED visuals, wire to `getAccounts()` + `getRecentTransactions()` (ref: `/openclaw/finance-dashboard-v2.html`)
- `app/tax/page.tsx` — wire to `getTaxEntities()` + `getTaxMoves()` + `getUpcomingTaxDeadlines()`
- `app/forge/page.tsx` — `getForgeIdeas('new')` + approve flow that writes `converted_project_id`
- `app/projects/page.tsx` + `app/tasks/page.tsx`
- `app/companies/page.tsx` + `app/companies/[entity]/page.tsx` (Xome template clone per entity)
- `app/properties/page.tsx` + `app/properties/[id]/page.tsx`
- etc.

## Rules

1. **Every widget declares its Supabase source.** If data isn't ready, render the shared `<ComingSoon>` component (not yet built — stub it).
2. **Never write hardcoded arrays.** Everything flows through `lib/queries.ts`.
3. **Hero section is LOCKED** per `DASHBOARD-TEMPLATE-SPEC.md` in `/openclaw`.
4. **Spec lint blocks PRs** — `qa-reviewer` agent will enforce this.

## Seed user

The dev branch has a seed CEO user:
- ID: `00000000-0000-0000-0000-000000000001`
- Email: `jarvis.culbertson@agentmail.to`
- Password: `seed-only-replace-in-prod` (dev only — replace for prod)

RLS is enabled on every user-scoped table. In dev you can bypass by signing in as this user or disabling RLS temporarily.

## Prod migration path (when Phase 7 launch happens)

The same `20260414_v7_foundation.sql` can be applied to prod (`bdlvwfobjqvnrffzxrfz`) verbatim — it's additive with `IF NOT EXISTS` guards. Run via Supabase MCP `apply_migration`, verify with the same counts check, then flip the Vercel alias.
