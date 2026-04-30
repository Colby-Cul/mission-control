-- Add target and meta columns to company_kpis
ALTER TABLE company_kpis ADD COLUMN IF NOT EXISTS target numeric;
ALTER TABLE company_kpis ADD COLUMN IF NOT EXISTS meta jsonb;

-- Seed Xome Home KPIs
INSERT INTO company_kpis (id, entity_id, metric_key, label, value, target, unit, color, sort_order)
VALUES
  ('kpi-xome-revenue-mtd',    'xome-home', 'revenue_mtd',       'Revenue MTD',       24500, 40000,  'currency', 'green',  1),
  ('kpi-xome-cash-flow-mtd',  'xome-home', 'cash_flow_mtd',     'Cash Flow MTD',      8200, 15000,  'currency', 'lime',   2),
  ('kpi-xome-mortgage-vol',   'xome-home', 'mortgage_volume',   'Mortgage Volume',        0, 500000,'currency', 'orange', 3),
  ('kpi-xome-pipeline-loans', 'xome-home', 'pipeline_loans',    'Pipeline Loans',        12, 20,    'number',  'purple', 4),
  ('kpi-xome-pull-through',   'xome-home', 'pull_through_rate', 'Pull-Through Rate',   0.72, 0.85,  'pct',     'amber',  5)
ON CONFLICT (id) DO NOTHING;

-- Seed Xome Home milestones
INSERT INTO company_milestones (id, entity_id, title, status, target_date, notes)
VALUES
  ('ms-xome-1', 'xome-home', 'Fund First $1M in Loans',     'completed',   '2026-03-31', 'Hit $1M funded loan volume milestone'),
  ('ms-xome-2', 'xome-home', 'Hire 5 Loan Officers',        'in_progress', '2026-06-30', 'Build out production team'),
  ('ms-xome-3', 'xome-home', 'Reach $500K Monthly Volume',  'upcoming',    '2026-09-30', 'Scale to $500K/month mortgage volume target')
ON CONFLICT (id) DO NOTHING;

-- Seed Xome Home team members
INSERT INTO company_team (id, entity_id, name, role, sort_order)
VALUES
  ('team-xome-1', 'xome-home', 'Colby Culbertson',            'CEO / Principal',     1),
  ('team-xome-2', 'xome-home', 'Nolberto "Bert" Terrazas',    'Head of Operations',  2),
  ('team-xome-3', 'xome-home', 'Loan Officers (5)',            'Production / Sales',  3)
ON CONFLICT (id) DO NOTHING;
