-- ─────────────────────────────────────────────────────────────
-- Mission Control v7 — Foundation Migration
-- Author: Cowork (on behalf of CEO)
-- Date:   2026-04-14
-- Scope:  Additive only. Does NOT alter or drop any existing
--         tables. Existing tables referenced for FK only.
--
-- Existing tables preserved as-is:
--   forge_ideas, projects, tasks, financial_accounts,
--   financial_transactions, property_assets, property_photos,
--   entity_ownership, plaid_items, quickbooks_connections,
--   securities, holdings, investment_transactions,
--   coinbase_connections, crypto_holdings, brokerage_connections,
--   entity_documents
-- ─────────────────────────────────────────────────────────────

-- ═══ 1. USER PROFILE + XP/LEVEL (drives every hero) ═══════════
create table if not exists public.users_profile (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  display_name   text,
  role           text default 'CEO',
  avatar_url     text,
  xp             integer default 0,
  xp_next        integer default 1000,
  level          integer default 1,
  since          date default current_date,
  settings       jsonb default '{}'::jsonb,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);
alter table public.users_profile enable row level security;
create policy "users_profile_owner" on public.users_profile
  for all using (auth.uid() = user_id);

-- ═══ 2. VISION BOARD ═══════════════════════════════════════════
create table if not exists public.visions (
  id             text primary key,
  user_id        uuid references auth.users(id) on delete cascade,
  name           text not null,
  category       text,
  img            text,          -- emoji or icon key
  target_low     numeric,
  target_high    numeric,
  target_label   text,          -- "$2.5M — $3.5M"
  deadline       date,
  months_out     integer,
  status         text default 'planning', -- planning/active/achieved
  note           text,
  priority       integer default 0,
  progress_pct   numeric default 0,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);
alter table public.visions enable row level security;
create policy "visions_owner" on public.visions
  for all using (auth.uid() = user_id);

-- ═══ 3. ACHIEVEMENTS (gamification) ═══════════════════════════
create table if not exists public.achievements (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete cascade,
  dashboard_key  text not null, -- 'finance','vision','tax','company',...
  achievement_key text not null,
  name           text not null,
  description    text,
  xp             integer default 0,
  icon           text,
  earned_at      timestamptz,
  progress_pct   numeric default 0,
  meta           jsonb default '{}'::jsonb,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  unique (user_id, dashboard_key, achievement_key)
);
alter table public.achievements enable row level security;
create policy "achievements_owner" on public.achievements
  for all using (auth.uid() = user_id);

-- ═══ 4. KPI TIME-SERIES (sparklines, forecasts) ═══════════════
create table if not exists public.kpi_snapshots (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete cascade,
  dashboard_key  text not null,
  metric_key     text not null,   -- 'net_worth','cash_flow','liquid_cash',...
  value          numeric not null,
  unit           text default 'usd',
  as_of          timestamptz default now(),
  meta           jsonb default '{}'::jsonb
);
alter table public.kpi_snapshots enable row level security;
create policy "kpi_owner" on public.kpi_snapshots
  for all using (auth.uid() = user_id);
create index if not exists kpi_snapshots_lookup
  on public.kpi_snapshots (user_id, metric_key, as_of desc);

-- ═══ 5. TAX CENTER ═════════════════════════════════════════════
create table if not exists public.tax_entities_meta (
  entity_id      text primary key references public.entity_ownership(id) on delete cascade,
  filing_freq    text,            -- 'Quarterly','Annual'
  next_due       date,
  est_owed       numeric default 0,
  ytd_paid       numeric default 0,
  ytd_income     numeric default 0,
  deductions     numeric default 0,
  notes          text,
  updated_at     timestamptz default now()
);
alter table public.tax_entities_meta enable row level security;

create table if not exists public.tax_deadlines (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete cascade,
  entity_id      text references public.entity_ownership(id) on delete set null,
  deadline_date  date not null,
  kind           text,            -- 'Q2 Estimated','Annual Filing'
  amount_due     numeric,
  status         text default 'upcoming',
  notes          text,
  created_at     timestamptz default now()
);
alter table public.tax_deadlines enable row level security;
create policy "tax_deadlines_owner" on public.tax_deadlines
  for all using (auth.uid() = user_id);

create table if not exists public.tax_moves (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete cascade,
  action         text not null,
  priority       text default 'medium',
  status         text default 'open', -- open/upcoming/evaluate/done
  savings_label  text,            -- "$35K-$55K"
  savings_num    numeric,
  detail         text,
  deadline       text,
  xp             integer default 0,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);
alter table public.tax_moves enable row level security;
create policy "tax_moves_owner" on public.tax_moves
  for all using (auth.uid() = user_id);

-- ═══ 6. AGENT LAYER (People → Team / The Floor) ═══════════════
create table if not exists public.agents (
  id             text primary key,
  user_id        uuid references auth.users(id) on delete cascade,
  name           text not null,
  role           text,
  model          text,
  tier           text,
  status         text default 'idle', -- active/idle/standby/killed
  system_prompt  text,
  tools          jsonb default '[]'::jsonb,
  triggers       jsonb default '[]'::jsonb,
  color          text,
  avatar         text,
  monthly_budget numeric,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);
alter table public.agents enable row level security;
create policy "agents_owner" on public.agents
  for all using (auth.uid() = user_id);

create table if not exists public.agent_runs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete cascade,
  agent_id       text references public.agents(id) on delete set null,
  project_id     text references public.projects(id) on delete set null,
  task_id        text references public.tasks(id) on delete set null,
  started_at     timestamptz default now(),
  ended_at       timestamptz,
  status         text default 'running', -- running/success/error/killed
  input          jsonb,
  output         jsonb,
  tokens         integer default 0,
  cost           numeric default 0,
  error          text
);
alter table public.agent_runs enable row level security;
create policy "agent_runs_owner" on public.agent_runs
  for all using (auth.uid() = user_id);
create index if not exists agent_runs_feed
  on public.agent_runs (user_id, started_at desc);

create table if not exists public.agent_outputs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete cascade,
  agent_run_id   uuid references public.agent_runs(id) on delete cascade,
  kind           text,            -- 'doc','email','summary','idea',...
  payload        jsonb,
  surfaced       boolean default true,
  reviewed_at    timestamptz,
  created_at     timestamptz default now()
);
alter table public.agent_outputs enable row level security;
create policy "agent_outputs_owner" on public.agent_outputs
  for all using (auth.uid() = user_id);

-- ═══ 7. COMPANY DASHBOARD DATA ════════════════════════════════
create table if not exists public.company_kpis (
  id             uuid primary key default gen_random_uuid(),
  entity_id      text references public.entity_ownership(id) on delete cascade,
  kpi_key        text not null,   -- 'revenue_mtd','cash_flow','runway_months',...
  value          numeric,
  target         numeric,
  unit           text default 'usd',
  period         text default 'month',
  as_of          timestamptz default now(),
  meta           jsonb default '{}'::jsonb,
  unique (entity_id, kpi_key, as_of)
);
alter table public.company_kpis enable row level security;

create table if not exists public.company_team (
  id             uuid primary key default gen_random_uuid(),
  entity_id      text references public.entity_ownership(id) on delete cascade,
  name           text not null,
  role           text,
  email          text,
  comp           numeric,
  status         text default 'active',
  avatar_url     text,
  created_at     timestamptz default now()
);
alter table public.company_team enable row level security;

create table if not exists public.company_milestones (
  id             uuid primary key default gen_random_uuid(),
  entity_id      text references public.entity_ownership(id) on delete cascade,
  title          text not null,
  description    text,
  target_date    date,
  completed_at   timestamptz,
  xp             integer default 0,
  status         text default 'upcoming'
);
alter table public.company_milestones enable row level security;

-- ═══ 8. OPERATIONS: INTEGRATIONS + INCIDENTS + SYSTEM ═════════
create table if not exists public.integrations (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete cascade,
  provider       text not null,   -- 'plaid','quickbooks','stripe','notion',...
  status         text default 'disconnected',
  scopes         jsonb default '[]'::jsonb,
  connected_at   timestamptz,
  last_sync_at   timestamptz,
  last_error     text,
  credentials_ref text,           -- pointer to secret store; never the secret itself
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  unique (user_id, provider)
);
alter table public.integrations enable row level security;
create policy "integrations_owner" on public.integrations
  for all using (auth.uid() = user_id);

create table if not exists public.incidents (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete cascade,
  title          text not null,
  severity       text default 'P3', -- P1/P2/P3/P4
  status         text default 'active', -- active/resolved/postmortem
  owner          text,
  started_at     timestamptz default now(),
  resolved_at    timestamptz,
  summary        text,
  postmortem     text
);
alter table public.incidents enable row level security;
create policy "incidents_owner" on public.incidents
  for all using (auth.uid() = user_id);

-- ═══ 9. DOCUMENTS + MEMORY + SKILLS + SESSIONS ════════════════
create table if not exists public.docs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete cascade,
  title          text not null,
  kind           text default 'note', -- note/sop/playbook/handoff/research
  body           text,
  entity_id      text references public.entity_ownership(id) on delete set null,
  project_id     text references public.projects(id) on delete set null,
  tags           text[],
  pinned         boolean default false,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);
alter table public.docs enable row level security;
create policy "docs_owner" on public.docs
  for all using (auth.uid() = user_id);

create table if not exists public.memory_entries (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete cascade,
  memory_type    text,             -- 'user','feedback','project','reference'
  name           text,
  description    text,
  body           text,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);
alter table public.memory_entries enable row level security;
create policy "memory_owner" on public.memory_entries
  for all using (auth.uid() = user_id);

create table if not exists public.skills (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete cascade,
  slug           text not null,
  name           text not null,
  description    text,
  source_path    text,
  enabled        boolean default true,
  version        text,
  created_at     timestamptz default now(),
  unique (user_id, slug)
);
alter table public.skills enable row level security;
create policy "skills_owner" on public.skills
  for all using (auth.uid() = user_id);

create table if not exists public.sessions (
  id             text primary key,
  user_id        uuid references auth.users(id) on delete cascade,
  title          text,
  summary        text,
  started_at     timestamptz default now(),
  ended_at       timestamptz,
  message_count  integer default 0,
  tokens         integer default 0,
  cost           numeric default 0,
  transcript_path text
);
alter table public.sessions enable row level security;
create policy "sessions_owner" on public.sessions
  for all using (auth.uid() = user_id);

-- ═══ 10. AUDIT + BILLING + SEARCH ═════════════════════════════
create table if not exists public.audit_log (
  id             bigserial primary key,
  user_id        uuid references auth.users(id) on delete set null,
  action         text not null,
  resource_type  text,
  resource_id    text,
  meta           jsonb default '{}'::jsonb,
  ip             inet,
  created_at     timestamptz default now()
);
alter table public.audit_log enable row level security;
create policy "audit_log_owner_read" on public.audit_log
  for select using (auth.uid() = user_id);
create index if not exists audit_log_feed
  on public.audit_log (user_id, created_at desc);

create table if not exists public.billing (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  plan           text default 'free',
  seats          integer default 1,
  renewal_date   date,
  amount         numeric default 0,
  stripe_customer_id text,
  stripe_subscription_id text,
  status         text default 'active',
  updated_at     timestamptz default now()
);
alter table public.billing enable row level security;
create policy "billing_owner" on public.billing
  for all using (auth.uid() = user_id);

-- Command palette search index — denormalized for speed
create table if not exists public.command_palette_index (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete cascade,
  kind           text not null,   -- 'page','entity','property','vision','task','agent','doc','idea'
  ref_id         text,
  title          text not null,
  subtitle       text,
  keywords       tsvector,
  updated_at     timestamptz default now()
);
alter table public.command_palette_index enable row level security;
create policy "palette_owner" on public.command_palette_index
  for all using (auth.uid() = user_id);
create index if not exists palette_keywords on public.command_palette_index
  using gin(keywords);

-- ═══ 11. ASSETS: RENTAL BOOKINGS (for Assets → Rentals) ═══════
create table if not exists public.rental_bookings (
  id             text primary key,    -- Lodgify booking id
  property_id    text references public.property_assets(id) on delete cascade,
  guest_name     text,
  check_in       date,
  check_out      date,
  nights         integer,
  total_revenue  numeric,
  status         text,                -- 'confirmed','cancelled','past','upcoming'
  source         text default 'lodgify',
  meta           jsonb default '{}'::jsonb,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);
alter table public.rental_bookings enable row level security;

-- ═══ 12. FORGE → PROJECT CONVERSION LINK ══════════════════════
-- When a forge_idea is approved, record the project it became.
alter table public.forge_ideas
  add column if not exists converted_project_id text references public.projects(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references auth.users(id);

-- ═══ DONE. Nothing above drops or alters existing production data. ═══
