-- Migration: Create property_mortgages table and seed 47 Shasta Trail data
-- Date: 2026-04-20

-- Create property_mortgages table
CREATE TABLE IF NOT EXISTS public.property_mortgages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_address TEXT NOT NULL,
  lender_name TEXT,
  loan_number TEXT,
  interest_rate NUMERIC(6,3),
  monthly_payment NUMERIC(12,2),
  principal_monthly NUMERIC(12,2),
  interest_monthly NUMERIC(12,2),
  escrow_monthly NUMERIC(12,2),
  outstanding_balance NUMERIC(14,2),
  interest_paid_ytd NUMERIC(14,2),
  statement_date DATE,
  entity_id TEXT,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (loan_number)
);

-- Enable RLS
ALTER TABLE public.property_mortgages ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
DO $$ BEGIN
  CREATE POLICY "Service role full access" ON public.property_mortgages
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Allow anon/authenticated read
DO $$ BEGIN
  CREATE POLICY "Enable read for all users" ON public.property_mortgages
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Insert 47 Shasta Trail mortgage record (upsert by loan_number)
INSERT INTO public.property_mortgages (
  property_address,
  lender_name,
  loan_number,
  interest_rate,
  monthly_payment,
  principal_monthly,
  interest_monthly,
  escrow_monthly,
  outstanding_balance,
  interest_paid_ytd,
  statement_date,
  entity_id,
  last_updated
) VALUES (
  '47 Shasta Trail, Graeagle, CA 96103',
  'Shellpoint Mortgage Servicing',
  '0687788489',
  8.875,
  5301.95,
  342.49,
  3852.15,
  1107.31,
  520854.53,
  19298.11,
  '2025-05-06',
  'ent-blcp',
  NOW()
)
ON CONFLICT (loan_number) DO UPDATE SET
  outstanding_balance = EXCLUDED.outstanding_balance,
  principal_monthly = EXCLUDED.principal_monthly,
  interest_monthly = EXCLUDED.interest_monthly,
  interest_paid_ytd = EXCLUDED.interest_paid_ytd,
  statement_date = EXCLUDED.statement_date,
  last_updated = NOW();

-- Update property_assets for 47 Shasta Trail with real mortgage data
UPDATE public.property_assets
SET
  mortgage_balance = 520854.53,
  mortgage_rate = 8.875,
  mortgage_payment = 5301.95,
  mortgage_updated_at = NOW(),
  equity = current_value - 520854.53,
  owned_equity = (current_value - 520854.53) * (ownership_pct / 100.0),
  updated_at = NOW()
WHERE address = '47 Shasta Trl' AND city = 'Graeagle';
