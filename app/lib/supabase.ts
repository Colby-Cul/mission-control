import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// redesign-v7 branch (development). Swap envs for prod.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(url, key, {
  auth: { persistSession: true, autoRefreshToken: true },
})

// Handy typed aliases for the most-queried tables
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type Vision = Tables<'visions'>
export type Agent = Tables<'agents'>
export type Achievement = Tables<'achievements'>
export type KpiSnapshot = Tables<'kpi_snapshots'>
export type TaxMove = Tables<'tax_moves'>
export type TaxDeadline = Tables<'tax_deadlines'>
export type TaxEntityMeta = Tables<'tax_entities_meta'>
export type Entity = Tables<'entity_ownership'>
export type Property = Tables<'property_assets'>
export type Account = Tables<'financial_accounts'>
export type Transaction = Tables<'financial_transactions'>
export type ForgeIdea = Tables<'forge_ideas'>
export type Project = Tables<'projects'>
export type Task = Tables<'tasks'>
export type CompanyKpi = Tables<'company_kpis'>
export type Integration = Tables<'integrations'>
export type UserProfile = Tables<'users_profile'>
