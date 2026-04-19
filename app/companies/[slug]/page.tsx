/**
 * Company detail page — per-entity operational dashboard.
 *
 * Template: Xome Home (pixel-for-pixel port of xome-home-dashboard.html).
 * Generic entities render the same template with ComingSoon on missing data.
 * Xome-only: loan pipeline / officers / KPIs / compliance / warehouse / power
 * sourced from Monday.com via the multi-tenant adapter at
 * `app/lib/monday-adapter.ts` (tenant `xome`, `MONDAY_XOME_API_KEY`).
 *
 * Legal-only entities (Alabama Shores, Black Lab Capital LLC) render a
 * minimal "Legal Entity Only — No Operations" card instead.
 */
import {
  getEntityBySlug,
  getCompanyKpisByEntityId,
  getCompanyTeam,
  getCompanyMilestonesByEntityId,
  getCompanyAssets,
  getAchievementsByEntityId,
  getAccountsByEntityId,
  getEntityRevenue30d,
  getEntityExpenses30d,
  getEntityDocumentsByEntityId,
  getEntityOwnershipPct,
} from '../../lib/queries'
import {
  getQbConnection,
  getQbProfitLoss,
  getQbBalanceSheet,
  getQbMonthlyProfitLoss,
  parseMonthlyProfitLoss,
  parseExpenseBreakdown,
  parseProfitLoss,
  parseBalanceSheet,
  type ParsedPL,
  type ParsedBS,
} from '../../lib/quickbooks'
import ComingSoon from '../../_components/ComingSoon'
import { SpecCard } from '../../_components/SpecCard'
import KPIMetricCard from '../../_components/widgets/KPIMetricCard'
import RevenueTrendChart from '../../_components/widgets/RevenueTrendChart'
import ExpenseDonut from '../../_components/widgets/ExpenseDonut'
import TimeRangeSelector, { resolveRange } from '../../_components/widgets/TimeRangeSelector'
import type { MonthlyPLRow, ExpenseCategory } from '../../lib/quickbooks'
import {
  getMondayData,
  type LoanPipelineView,
  type LoanOfficerRow,
  type LoanVolumeKPIs,
  type ClosedLoanRow,
  type ComplianceView,
  type WarehouseView,
  type XomePowerView,
} from '../../lib/monday-adapter'
import HeroCanvas from './HeroCanvas'
import OwnershipCard from '../../_components/OwnershipCard'
import SlugEditButton from './_SlugEditButton'
import CompanyTabs, { type TabDef } from './CompanyTabs'
import SalesRevenueTab from './SalesRevenueTab'

export const dynamic = 'force-dynamic'

// ── Legal-only entity names (no business dashboard) ───────────────
const LEGAL_ONLY_NAMES = ['Alabama Shores', 'Black Lab Capital LLC']

// ── Slug gate for Xome loan widgets ──────────────────────────────
const XOME_SLUG = 'xome-home'

interface Props {
  params: { slug: string }
  searchParams?: { [key: string]: string | string[] | undefined }
}

export default async function CompanyPage({ params, searchParams }: Props) {
  const { slug } = params

  // ── Fetch entity ──────────────────────────────────────────────
  let entity: any = null
  try { entity = await getEntityBySlug(slug) } catch {}

  // ── Derive real ownership % from edges (parent → this entity) ─
  // entity_ownership.ownership_pct is often stale/wrong; edges are the source of truth.
  let entityOwnershipPct: number | null = null
  try { entityOwnershipPct = await getEntityOwnershipPct(entity?.id ?? '') } catch {}

  const ownershipDisplay = entityOwnershipPct != null
    ? entityOwnershipPct + '%'
    : entity?.ownership_pct != null
    ? entity.ownership_pct + '%'
    : '—'

  // ── Render legal-only view ────────────────────────────────────
  if (entity && LEGAL_ONLY_NAMES.includes(entity.entity_name)) {
    const legalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${entity.entity_name} — Legal Entity</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    :root { --bg: #060610; --border: rgba(255,255,255,0.06); --dim: rgba(255,255,255,0.4); --amber: #f59e0b; }
    html, body { width: 100%; min-height: 100vh; background: var(--bg); color: rgba(255,255,255,0.9); font-family: 'DM Sans', sans-serif; display: flex; align-items: center; justify-content: center; }
    .wrapper { width: 86%; max-width: 560px; margin: 80px auto; }
    .back-link { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--dim); text-decoration: none; margin-bottom: 32px; letter-spacing: 0.04em; text-transform: uppercase; font-weight: 600; }
    .back-link:hover { color: rgba(255,255,255,0.7); }
    .card { background: rgba(245,158,11,0.04); border: 1px solid rgba(245,158,11,0.15); border-radius: 20px; padding: 40px; }
    .badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.2); border-radius: 8px; padding: 5px 12px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--amber); margin-bottom: 20px; }
    .entity-name { font-size: 28px; font-weight: 700; margin-bottom: 6px; }
    .entity-sub { font-size: 13px; color: var(--dim); margin-bottom: 28px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .info-item label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--dim); font-weight: 600; display: block; margin-bottom: 4px; }
    .info-item value { font-size: 14px; font-weight: 600; font-family: 'IBM Plex Mono', monospace; }
    .purpose-note { background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: 12px; padding: 16px; font-size: 13px; color: var(--dim); line-height: 1.6; }
    .purpose-note strong { color: rgba(255,255,255,0.7); }
  </style>
</head>
<body>
  <div class="wrapper">
    <a href="/companies" class="back-link">← All Companies</a>
    <div class="card">
      <div class="badge">⚖️ Legal Entity Only — No Operations</div>
      <div class="entity-name">${entity.entity_name}</div>
      <div class="entity-sub">This entity exists for legal separation only and does not operate a business.</div>
      <div class="info-grid">
        <div class="info-item"><label>Entity Type</label><value>${entity.entity_type ?? '—'}</value></div>
        <div class="info-item"><label>State of Formation</label><value>${entity.state ?? '—'}</value></div>
        <div class="info-item"><label>Ownership</label><value>${ownershipDisplay}</value></div>
        <div class="info-item"><label>Status</label><value>${entity.status ?? 'Active'}</value></div>
        ${entity.formation_date ? `<div class="info-item"><label>Formed</label><value>${entity.formation_date}</value></div>` : ''}
        ${entity.owned_by ? `<div class="info-item"><label>Member(s)</label><value>${entity.owned_by}</value></div>` : ''}
      </div>
      ${entity.notes ? `<div class="purpose-note"><strong>Purpose:</strong> ${entity.notes}</div>` : ''}
    </div>
  </div>
</body>
</html>`
    return <div dangerouslySetInnerHTML={{ __html: legalHtml }} />
  }

  // ── Operational entity: fetch all data ───────────────────────
  // NOTE: all per-entity tables use slug as entity_id (e.g. 'xome-home'),
  // NOT the UUID-style entity_ownership.id ('ent-xome-home').
  const isXome = slug === XOME_SLUG
  const entityKey = slug  // use slug consistently as the entity_id key

  let kpis: any[] = []
  try { kpis = await getCompanyKpisByEntityId(entityKey) } catch {}

  let team: any[] = []
  try { team = await getCompanyTeam(entityKey) } catch {}

  let milestones: any[] = []
  try { milestones = await getCompanyMilestonesByEntityId(entityKey) } catch {}

  let assets: Awaited<ReturnType<typeof getCompanyAssets>> = []
  // entity_id on company_assets uses the row.id (ent-* format) — try both slug and entity.id
  try { assets = await getCompanyAssets(entityKey) } catch {}
  if (assets.length === 0 && entity?.id && entity.id !== entityKey) {
    try { assets = await getCompanyAssets(entity.id) } catch {}
  }

  let achievements: any[] = []
  // Try slug-based first, fall back to entity.id if entity exists
  try { achievements = await getAchievementsByEntityId(entityKey) } catch {}
  if (achievements.length === 0 && entity?.id) {
    try { achievements = await getAchievementsByEntityId(entity.id) } catch {}
  }

  let revenue30d = 0
  let expenses30d = 0
  try { revenue30d = await getEntityRevenue30d(entityKey) } catch {}
  try { expenses30d = await getEntityExpenses30d(entityKey) } catch {}

  let documents: any[] = []
  try { documents = await getEntityDocumentsByEntityId(entityKey) } catch {}
  if (documents.length === 0 && entity?.id) {
    try { documents = await getEntityDocumentsByEntityId(entity.id) } catch {}
  }

  // Entity-scoped accounts only (not all accounts globally)
  let accounts: any[] = []
  try { accounts = await getAccountsByEntityId(entityKey) } catch {}
  if (accounts.length === 0 && entity?.id) {
    try { accounts = await getAccountsByEntityId(entity.id) } catch {}
  }

  // ── QuickBooks (per-entity) ───────────────────────────────
  // The connection is keyed by entity slug; a missing row means this entity
  // hasn't been connected yet. We show a ComingSoon + Connect CTA for that case.
  let qbPL: ParsedPL | null = null
  let qbBS: ParsedBS | null = null
  let qbMonthlyPL: MonthlyPLRow[] = []
  let qbExpenseBreakdown: ExpenseCategory[] = []
  let qbPriorPL: ParsedPL | null = null
  let qbConnected = false
  try {
    const conn = await getQbConnection(slug)
    if (conn?.realm_id) {
      qbConnected = true
      // Resolve time range from URL (?range=ytd|month|3mo|6mo|year|all…)
      const range = resolveRange(searchParams?.range as string | undefined)
      const start = range?.start
      const end = range?.end
      // Prior-period for delta comparisons — same length, immediately before.
      let priorStart: string | undefined
      let priorEnd: string | undefined
      if (start && end) {
        const s = new Date(start).getTime()
        const e = new Date(end).getTime()
        const span = e - s
        priorEnd = new Date(s - 86400000).toISOString().slice(0, 10)
        priorStart = new Date(s - 86400000 - span).toISOString().slice(0, 10)
      }
      const [rawPL, rawBS, rawMonthly, rawPrior] = await Promise.all([
        getQbProfitLoss(slug, start, end),
        getQbBalanceSheet(slug, end),
        getQbMonthlyProfitLoss(slug, start, end),
        priorStart && priorEnd ? getQbProfitLoss(slug, priorStart, priorEnd) : Promise.resolve(null),
      ])
      qbPL = parseProfitLoss(rawPL)
      qbBS = parseBalanceSheet(rawBS)
      qbMonthlyPL = parseMonthlyProfitLoss(rawMonthly)
      qbExpenseBreakdown = parseExpenseBreakdown(rawPL)
      qbPriorPL = parseProfitLoss(rawPrior)
    }
  } catch {
    // swallow — show ComingSoon fallback below
  }

  // ── Monday.com Xome data (multi-tenant adapter) ─────────────
  let mondayKpis: LoanVolumeKPIs | null = null
  let mondayPipeline: LoanPipelineView | null = null
  let mondayOfficers: LoanOfficerRow[] | null = null
  let mondayClosedLoans: ClosedLoanRow[] | null = null
  let mondayCompliance: ComplianceView | null = null
  let mondayWarehouse: WarehouseView | null = null
  let mondayPower: XomePowerView | null = null
  let mondayError: string | null = null

  if (isXome) {
    const [rKpis, rPipe, rOff, rClosed, rComp, rWare, rPow] = await Promise.all([
      getMondayData('xome.loan_volume_kpis'),
      getMondayData('xome.loan_pipeline'),
      getMondayData('xome.loan_officer_roster'),
      getMondayData('xome.recent_closed_loans'),
      getMondayData('xome.compliance'),
      getMondayData('xome.warehouse_reconciliation'),
      getMondayData('xome.power'),
    ])
    mondayKpis = rKpis.data as LoanVolumeKPIs | null
    mondayPipeline = rPipe.data as LoanPipelineView | null
    mondayOfficers = rOff.data as LoanOfficerRow[] | null
    mondayClosedLoans = rClosed.data as ClosedLoanRow[] | null
    mondayCompliance = rComp.data as ComplianceView | null
    mondayWarehouse = rWare.data as WarehouseView | null
    mondayPower = rPow.data as XomePowerView | null
    mondayError =
      rKpis.error ||
      rPipe.error ||
      rOff.error ||
      rClosed.error ||
      rComp.error ||
      rWare.error ||
      rPow.error ||
      null
  }

  // ── Entity metadata with graceful fallbacks ───────────────────
  // display_name is an optional override (e.g. 'The Culbertson and Gray Group',
  // 'Xome Home Loans'); falls back to entity_name (legal name).
  // dba is the "Doing Business As" override; formation_state is legal state.
  const legalName   = entity?.entity_name ?? slug
  const displayName = (entity as any)?.display_name ?? legalName
  const dba         = (entity as any)?.dba ?? null
  const entityType  = entity?.entity_type ?? null
  const formationSt = (entity as any)?.formation_state ?? entity?.state ?? null

  // Subtitle: "LegalName · Type · State · DBA: dba" — skip empty fragments
  const subtitleFragments: string[] = []
  if (legalName && legalName !== displayName) subtitleFragments.push(legalName)
  if (entityType) subtitleFragments.push(entityType)
  if (formationSt) subtitleFragments.push(formationSt)
  if (dba) subtitleFragments.push(`DBA: ${dba}`)
  const entitySubtitle = subtitleFragments.join(' · ')

  const E = {
    name:      displayName,
    fullName:  displayName,
    legalName: legalName,
    dba:       dba,
    subtitle:  entitySubtitle,
    type:      entityType ?? 'LLC',
    state:     formationSt ?? 'CA',
    purpose:   entity?.notes ?? '',
    teamCount: team.length || 0,
    accounts: accounts.map((a: any) => ({
        name: a.name ?? a.official_name ?? a.account_name ?? 'Account',
        mask: a.mask ?? '????',
        type: a.type ?? 'depository',
        bal:  Number(a.balance_current ?? 0),
      })),
  }

  const fmtCurrency = (n: number) =>
    n >= 1_000_000
      ? '$' + (n / 1_000_000).toFixed(1) + 'M'
      : n >= 1_000
      ? '$' + (n / 1_000).toFixed(1) + 'K'
      : '$' + n.toFixed(0)

  const hasKpis       = kpis.length > 0
  const hasTeam       = team.length > 0
  const hasMilestones = milestones.length > 0
  const hasRevenue    = revenue30d > 0 || expenses30d > 0
  const hasDocs       = documents.length > 0

  // ── Hero primary metric ───────────────────────────────────────
  // Priority: Monday YTD volume > revenue KPI > financial_transactions revenue > entity name
  const kpiRevenue = kpis.find((k: any) => k.metric_key === 'revenue_mtd')
  const kpiCashFlow = kpis.find((k: any) => k.metric_key === 'cash_flow_mtd')
  const kpiMortgage = kpis.find((k: any) => k.metric_key === 'mortgage_volume')

  const heroPrimary = isXome && mondayKpis?.volume_ytd
    ? fmtCurrency(mondayKpis.volume_ytd)
    : kpiRevenue
    ? fmtCurrency(Number(kpiRevenue.value))
    : hasRevenue
    ? fmtCurrency(revenue30d)
    : E.fullName

  const heroSub = isXome && mondayKpis?.volume_ytd
    ? 'Loan Volume YTD'
    : kpiRevenue
    ? `Revenue MTD${kpiRevenue.target ? ' · target ' + fmtCurrency(Number(kpiRevenue.target)) : ''}`
    : hasRevenue
    ? 'Revenue — last 30 days'
    : 'Entity dashboard — connect data sources to populate metrics'

  // ── Xome hero mini-cards ──────────────────────────────────────
  const heroMini1 = isXome && mondayKpis?.pipeline_value
    ? { val: fmtCurrency(mondayKpis.pipeline_value), label: 'Pipeline Value' }
    : kpiCashFlow
    ? { val: fmtCurrency(Number(kpiCashFlow.value)), label: 'Cash Flow MTD' }
    : hasRevenue
    ? { val: fmtCurrency(expenses30d), label: 'Expenses 30d' }
    : { val: '0', label: 'Expenses 30d' }

  const heroMini2 = isXome && mondayKpis?.avg_loan_size
    ? { val: fmtCurrency(mondayKpis.avg_loan_size), label: 'Avg Loan Size' }
    : { val: String(E.teamCount), label: 'Team Members' }

  const heroMini3 = isXome && mondayKpis?.loans_funded_mtd != null
    ? { val: String(mondayKpis.loans_funded_mtd), label: 'Funded This Month' }
    : { val: String(milestones.length), label: 'Milestones' }

  const heroTickerLabel = isXome ? 'PULL-THROUGH' : 'STATUS'
  const heroTickerValue = isXome && mondayKpis?.pull_through_rate != null
    ? (mondayKpis.pull_through_rate * 100).toFixed(0) + '%'
    : E.purpose || 'Operational'
  const heroShowProgress = isXome && mondayKpis?.pull_through_rate != null

  // ── Health gauge: avg pct of target across KPIs with both value+target ──
  const kpisWithTarget = kpis.filter((k: any) => k.target != null && Number(k.target) > 0)
  const healthPct = kpisWithTarget.length > 0
    ? Math.min(100, Math.round(
        kpisWithTarget.reduce((sum: number, k: any) => {
          const pct = Number(k.value) / Number(k.target)
          return sum + Math.min(1, Math.max(0, pct))
        }, 0) / kpisWithTarget.length * 100
      ))
    : (isXome && mondayKpis ? 85 : null)
  const healthGaugeVal = healthPct != null ? String(healthPct) + '%' : '—'
  // stroke-dasharray for full circle (r=45) = 2π*45 ≈ 282.7
  // stroke-dashoffset = 282.7 * (1 - pct/100)
  const healthDashOffset = healthPct != null
    ? (282.7 * (1 - healthPct / 100)).toFixed(1)
    : '282.7'

  // ── Health card stats ─────────────────────────────────────────
  const healthStats = isXome && mondayKpis
    ? [
        { val: String((mondayOfficers?.length) ?? '—'), label: 'Officers' },
        { val: String(mondayPipeline?.total_items ?? '—'), label: 'Total Items' },
        { val: mondayKpis.avg_days_to_close ? String(mondayKpis.avg_days_to_close) : '—', label: 'Days Close' },
        {
          val: mondayKpis.pull_through_rate != null
            ? (mondayKpis.pull_through_rate * 100).toFixed(0) + '%'
            : '—',
          label: 'Pull-Through',
        },
      ]
    : [
        { val: String(E.teamCount), label: 'Team' },
        { val: String(milestones.length), label: 'Milestones' },
        { val: String(kpis.length), label: 'KPIs' },
        { val: String(documents.length), label: 'Docs' },
      ]

  // ── Analytics grid: conversion donut + funding timeline ───────
  // Pipeline stages come directly from the adapter (group-aware, amount-aware)
  type PipelineStage = LoanPipelineView['stages'][number]
  const pipelineStagesArr: PipelineStage[] = mondayPipeline?.stages ?? []
  const pipelineStageOrder = ['Leads', 'Pre-Approved', 'In Process', 'Funded', 'Nurture', 'Dead/DNC']
  const stageColorByName: Record<string, string> = {
    'Leads': 'var(--purple)',
    'Pre-Approved': 'var(--orange)',
    'In Process': 'var(--amber)',
    'Funded': 'var(--green)',
    'Nurture': 'var(--lime)',
    'Dead/DNC': 'var(--red)',
    'New Group': 'var(--pink)',
  }
  const totalStaged = pipelineStagesArr.reduce((a, s) => a + s.count, 0) || 1

  // Recent closed loans come pre-sorted from the adapter, already redacted
  const recentClosed: ClosedLoanRow[] = mondayClosedLoans ?? []

  // ── Full operational dashboard ─────────────────────────────
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${E.fullName} - Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    :root {
      --bg: #060610; --card: rgba(255,255,255,0.025); --border: rgba(255,255,255,0.06);
      --dim: rgba(255,255,255,0.4); --dim2: rgba(255,255,255,0.25);
      --orange: #f97316; --pink: #ec4899; --purple: #8b5cf6;
      --green: #10b981; --amber: #f59e0b; --red: #ef4444; --lime: #84cc16;
    }
    html, body { width: 100%; height: 100%; background: var(--bg); color: rgba(255,255,255,0.9); font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif; overflow-x: hidden; }
    .page-wrapper { min-height: 100vh; display: flex; flex-direction: column; }
    .navbar { border-bottom: 1px solid var(--border); padding: 16px 0; position: sticky; top: 0; z-index: 100; background: rgba(6,6,16,0.95); backdrop-filter: blur(20px); }
    .navbar-container { width: 86%; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
    .navbar-title { font-size: 18px; font-weight: 600; letter-spacing: 0.02em; }
    .navbar-back { font-size: 12px; color: var(--dim); text-decoration: none; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }
    .navbar-back:hover { color: rgba(255,255,255,0.7); }
    .main-container { flex: 1; width: 86%; margin: 0 auto; padding: 40px 0; }

    /* ── Hero ── */
    .hero-banner { position: relative; border-radius: 24px; overflow: hidden; margin-bottom: 28px; border: 1px solid rgba(249,115,22,0.12); background: #050510; min-height: 480px; }
    #heroCanvas { position: absolute; inset: 0; z-index: 0; }
    .hero-scanline { position: absolute; top: 0; left: 0; right: 0; height: 2px; z-index: 1; background: linear-gradient(90deg, transparent, rgba(249,115,22,0.4), rgba(139,92,246,0.3), transparent); animation: scanDown 4s ease-in-out infinite; filter: blur(1px); }
    @keyframes scanDown { 0% { top: 0; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
    .hud-corner { position: absolute; z-index: 2; width: 24px; height: 24px; }
    .hud-corner.tl { top: 12px; left: 12px; border-top: 2px solid rgba(249,115,22,0.3); border-left: 2px solid rgba(249,115,22,0.3); }
    .hud-corner.tr { top: 12px; right: 12px; border-top: 2px solid rgba(139,92,246,0.3); border-right: 2px solid rgba(139,92,246,0.3); }
    .hud-corner.bl { bottom: 12px; left: 12px; border-bottom: 2px solid rgba(249,115,22,0.3); border-left: 2px solid rgba(249,115,22,0.3); }
    .hud-corner.br { bottom: 12px; right: 12px; border-bottom: 2px solid rgba(139,92,246,0.3); border-right: 2px solid rgba(139,92,246,0.3); }
    .hero-content { position: relative; z-index: 3; display: flex; align-items: stretch; min-height: 480px; }
    .hero-left { flex: 1; padding: 36px 0 36px 40px; display: flex; flex-direction: column; justify-content: center; }
    .hero-badges { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
    .hero-badge { font-size: 9px; font-weight: 600; text-transform: uppercase; padding: 4px 10px; border-radius: 6px; letter-spacing: 0.08em; }
    .hero-badge.type { background: rgba(249,115,22,0.12); color: var(--orange); border: 1px solid rgba(249,115,22,0.2); }
    .hero-badge.state { background: rgba(16,185,129,0.12); color: var(--green); border: 1px solid rgba(16,185,129,0.2); }
    .hero-badge.operational { background: rgba(139,92,246,0.12); color: var(--purple); border: 1px solid rgba(139,92,246,0.2); }
    .hero-company-greeting { font-size: 13px; color: var(--dim); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.04em; }
    .hero-primary-metric { font-size: 56px; font-weight: 700; font-family: 'IBM Plex Mono', monospace; background: linear-gradient(135deg, #f59e0b 0%, #a3e635 40%, #10b981 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 4px; line-height: 1; }
    .hero-sub-text { font-size: 12px; color: var(--dim); margin-bottom: 20px; font-weight: 500; }
    .hero-mini-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
    .mini-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); border-radius: 14px; padding: 16px; text-align: center; }
    .mini-card-number { font-size: 28px; font-weight: 700; font-family: 'IBM Plex Mono', monospace; margin-bottom: 4px; line-height: 1; }
    .mini-card-label { font-size: 9px; text-transform: uppercase; color: var(--dim); letter-spacing: 0.08em; font-weight: 600; }
    .hero-ticker { display: flex; align-items: center; gap: 10px; padding: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); border-radius: 12px; font-size: 12px; }
    .ticker-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--green); animation: pulse 2s ease-in-out infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    .ticker-label { font-size: 10px; color: var(--dim); text-transform: uppercase; font-weight: 600; min-width: 80px; }
    .ticker-progress { flex: 1; height: 4px; background: rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden; }
    .ticker-progress-bar { height: 100%; background: linear-gradient(90deg, var(--green), var(--lime)); }
    .ticker-value { font-size: 11px; font-family: 'IBM Plex Mono', monospace; font-weight: 600; color: var(--green); min-width: 50px; text-align: right; }
    .hero-orbital { flex: 1; position: relative; display: flex; align-items: center; justify-content: center; padding: 0 20px; }
    #orbitalCanvas { width: 100%; max-width: 500px; height: auto; }
    .hero-player { flex: 1; padding: 36px 40px 36px 0; display: flex; flex-direction: column; justify-content: center; align-items: flex-end; }

    /* ── Health Card ── */
    .health-card { background: rgba(139,92,246,0.06); border: 1px solid rgba(139,92,246,0.15); border-radius: 20px; padding: 24px; width: 100%; max-width: 240px; }
    .health-card-name { font-size: 13px; font-weight: 600; margin-bottom: 4px; }
    .health-card-type { font-size: 10px; color: var(--dim); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 16px; }
    .health-gauge-wrap { position: relative; width: 100px; height: 100px; margin: 0 auto 16px; }
    .health-gauge-svg { width: 100%; height: 100%; transform: rotate(-90deg); }
    .health-gauge-value { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 28px; font-weight: 700; font-family: 'IBM Plex Mono', monospace; background: linear-gradient(135deg, var(--purple), var(--pink)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .health-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding-top: 12px; border-top: 1px solid rgba(139,92,246,0.1); }
    .health-stat { text-align: center; }
    .health-stat-number { font-size: 18px; font-weight: 700; font-family: 'IBM Plex Mono', monospace; margin-bottom: 2px; }
    .health-stat-label { font-size: 9px; color: var(--dim); text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; }

    /* ── Sections ── */
    .section { margin-bottom: 40px; }
    .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .section-header-left { display: flex; align-items: center; gap: 10px; }
    .section-title { font-size: 18px; font-weight: 600; letter-spacing: 0.02em; }
    .achieve-count { font-size: 12px; color: var(--dim); background: rgba(255,255,255,0.04); padding: 3px 10px; border-radius: 6px; }
    .xp-earned { font-size: 12px; font-weight: 600; color: var(--orange); background: rgba(249,115,22,0.1); padding: 3px 10px; border-radius: 6px; }

    /* ── Achievements ── */
    .achieve-grid { display: flex; gap: 20px; flex-wrap: wrap; justify-content: flex-start; padding: 8px 0; }
    .achieve-card { display: flex; flex-direction: column; align-items: center; text-align: center; width: 110px; position: relative; cursor: pointer; transition: transform 0.2s; }
    .achieve-card:hover { transform: translateY(-4px); }
    .achieve-card.locked { opacity: 0.3; }
    .achieve-ring-wrap { position: relative; width: 88px; height: 88px; margin-bottom: 10px; }
    .achieve-ring-svg { width: 88px; height: 88px; transform: rotate(-90deg); }
    .achieve-ring-bg { fill: none; stroke: rgba(255,255,255,0.06); stroke-width: 4; }
    .achieve-ring-fill { fill: none; stroke-width: 4; stroke-linecap: round; stroke: url(#achieveGrad); transition: stroke-dashoffset 1s cubic-bezier(0.22,1,0.36,1); }
    .achieve-icon-center { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 30px; line-height: 1; }
    .achieve-card.earned .achieve-ring-wrap::before { content: ''; position: absolute; inset: -4px; border-radius: 50%; background: radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 70%); z-index: 0; }
    .achieve-check { position: absolute; bottom: 4px; right: 16px; width: 20px; height: 20px; border-radius: 50%; background: var(--green); display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; border: 2px solid var(--bg); z-index: 2; }
    .achieve-name { font-size: 11px; font-weight: 600; margin-bottom: 2px; line-height: 1.3; }
    .achieve-xp { font-size: 10px; font-weight: 600; color: var(--orange); }
    .achieve-tooltip { position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%); background: rgba(12,12,26,0.95); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 10px 14px; min-width: 180px; max-width: 220px; opacity: 0; pointer-events: none; transition: opacity 0.2s; z-index: 50; backdrop-filter: blur(12px); }
    .achieve-card:hover .achieve-tooltip { opacity: 1; }
    .achieve-tooltip-name { font-size: 12px; font-weight: 600; margin-bottom: 4px; }
    .achieve-tooltip-desc { font-size: 11px; color: var(--dim); line-height: 1.4; margin-bottom: 4px; }
    .achieve-tooltip-xp { font-size: 11px; font-weight: 600; color: var(--orange); }

    /* ── KPI Grid ── */
    .kpi-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; margin-bottom: 40px; }
    @media (max-width: 1600px) { .kpi-grid { grid-template-columns: repeat(3, 1fr); } }
    @media (max-width: 1200px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
    .kpi-card { padding: 20px; border-radius: 14px; position: relative; overflow: hidden; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); backdrop-filter: blur(8px); transition: all 0.3s cubic-bezier(0.22,1,0.36,1); }
    .kpi-card::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 40px; pointer-events: none; }
    .kpi-card:hover { transform: translateY(-2px); background: rgba(255,255,255,0.035); box-shadow: 0 12px 40px rgba(0,0,0,0.4); }
    .kpi-card.kpi-orange { border-color: rgba(249,115,22,0.15); } .kpi-card.kpi-orange::after { background: linear-gradient(to top, rgba(249,115,22,0.06), transparent); } .kpi-card.kpi-orange .kpi-num { color: var(--orange); } .kpi-card.kpi-orange .kpi-indicator { background: var(--orange); } .kpi-card.kpi-orange .kpi-bar { background: linear-gradient(to top, rgba(249,115,22,0.15), rgba(249,115,22,0.5)); }
    .kpi-card.kpi-green { border-color: rgba(16,185,129,0.15); } .kpi-card.kpi-green::after { background: linear-gradient(to top, rgba(16,185,129,0.06), transparent); } .kpi-card.kpi-green .kpi-num { color: var(--green); } .kpi-card.kpi-green .kpi-indicator { background: var(--green); } .kpi-card.kpi-green .kpi-bar { background: linear-gradient(to top, rgba(16,185,129,0.15), rgba(16,185,129,0.5)); }
    .kpi-card.kpi-purple { border-color: rgba(139,92,246,0.15); } .kpi-card.kpi-purple::after { background: linear-gradient(to top, rgba(139,92,246,0.06), transparent); } .kpi-card.kpi-purple .kpi-num { color: var(--purple); } .kpi-card.kpi-purple .kpi-indicator { background: var(--purple); } .kpi-card.kpi-purple .kpi-bar { background: linear-gradient(to top, rgba(139,92,246,0.15), rgba(139,92,246,0.5)); }
    .kpi-card.kpi-amber { border-color: rgba(245,158,11,0.15); } .kpi-card.kpi-amber::after { background: linear-gradient(to top, rgba(245,158,11,0.06), transparent); } .kpi-card.kpi-amber .kpi-num { color: var(--amber); } .kpi-card.kpi-amber .kpi-indicator { background: var(--amber); } .kpi-card.kpi-amber .kpi-bar { background: linear-gradient(to top, rgba(245,158,11,0.15), rgba(245,158,11,0.5)); }
    .kpi-card.kpi-lime { border-color: rgba(132,204,22,0.15); } .kpi-card.kpi-lime::after { background: linear-gradient(to top, rgba(132,204,22,0.06), transparent); } .kpi-card.kpi-lime .kpi-num { color: var(--lime); } .kpi-card.kpi-lime .kpi-indicator { background: var(--lime); } .kpi-card.kpi-lime .kpi-bar { background: linear-gradient(to top, rgba(132,204,22,0.15), rgba(132,204,22,0.5)); }
    .kpi-card.kpi-pink { border-color: rgba(236,72,153,0.15); } .kpi-card.kpi-pink::after { background: linear-gradient(to top, rgba(236,72,153,0.06), transparent); } .kpi-card.kpi-pink .kpi-num { color: var(--pink); } .kpi-card.kpi-pink .kpi-indicator { background: var(--pink); } .kpi-card.kpi-pink .kpi-bar { background: linear-gradient(to top, rgba(236,72,153,0.15), rgba(236,72,153,0.5)); }
    .kpi-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .kpi-num { font-size: 28px; font-weight: 700; letter-spacing: -0.03em; font-family: 'IBM Plex Mono', monospace; }
    .kpi-indicator { width: 10px; height: 10px; border-radius: 50%; position: relative; }
    .kpi-indicator::after { content: ''; position: absolute; inset: -3px; border-radius: 50%; animation: kpiPulse 2s ease-in-out infinite; }
    @keyframes kpiPulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.2); } }
    .kpi-label { font-size: 9px; font-weight: 600; letter-spacing: 0.1em; color: var(--dim); margin-bottom: 10px; text-transform: uppercase; }
    .kpi-bars { display: flex; align-items: flex-end; gap: 3px; height: 28px; }
    .kpi-bar { flex: 1; border-radius: 2px 2px 0 0; transition: height 1s cubic-bezier(0.22,1,0.36,1); min-width: 0; }
    .kpi-meta { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.04); }
    .kpi-meta-item { font-size: 10px; color: var(--dim); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
    .kpi-meta-value { font-family: 'IBM Plex Mono', monospace; font-size: 11px; font-weight: 700; }

    /* ── Analytics Grid + Chart Cards ── */
    .analytics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px; }
    .chart-card { background: var(--card); border: 1px solid var(--border); border-radius: 20px; padding: 28px 24px; overflow: hidden; transition: all 0.3s; position: relative; }
    .chart-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, var(--orange), var(--pink), transparent); opacity: 0.6; }
    .chart-card:hover { transform: translateY(-2px); background: rgba(255,255,255,0.035); box-shadow: 0 12px 40px rgba(0,0,0,0.4); }
    .chart-label { font-size: 13px; font-weight: 600; margin-bottom: 16px; }
    .chart-svg { width: 100%; height: 180px; }

    /* ── Stats Row (mini cards row) ── */
    .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px; }
    .stat-card { background: var(--card); border: 1px solid var(--border); border-radius: 20px; padding: 24px; position: relative; overflow: hidden; }
    .stat-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, var(--purple), var(--pink), transparent); opacity: 0.6; }
    .stat-card:hover { transform: translateY(-2px); background: rgba(255,255,255,0.035); box-shadow: 0 12px 40px rgba(0,0,0,0.4); }
    .stat-card.green::before { background: linear-gradient(90deg, var(--green), var(--lime), transparent); }
    .stat-card.amber::before { background: linear-gradient(90deg, var(--amber), var(--orange), transparent); }
    .stat-card.pink::before { background: linear-gradient(90deg, var(--pink), var(--purple), transparent); }
    .stat-card.lime::before { background: linear-gradient(90deg, var(--lime), var(--green), transparent); }
    .stat-card-content { text-align: center; }
    .stat-value { font-size: 32px; font-weight: 700; font-family: 'IBM Plex Mono', monospace; margin-bottom: 6px; }
    .stat-label { font-size: 11px; text-transform: uppercase; color: var(--dim); letter-spacing: 0.08em; font-weight: 600; }
    .stat-sub { margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.04); font-size: 10px; color: var(--dim); line-height: 1.6; }

    /* ── Bank Accounts Card ── */
    .bank-accounts-card { background: var(--card); border: 1px solid var(--border); border-radius: 20px; padding: 28px 24px; position: relative; overflow: hidden; margin-bottom: 40px; }
    .bank-accounts-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, var(--green), var(--lime), transparent); opacity: 0.6; }
    .bank-accounts-card:hover { transform: translateY(-2px); background: rgba(255,255,255,0.035); box-shadow: 0 12px 40px rgba(0,0,0,0.4); }
    .card-title { font-size: 14px; font-weight: 600; margin-bottom: 16px; }
    .account-list { display: flex; flex-direction: column; gap: 12px; }
    .account-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.02); }
    .account-row:last-child { border-bottom: none; }
    .account-info { flex: 1; }
    .account-name { font-size: 12px; font-weight: 500; margin-bottom: 2px; }
    .account-mask { font-size: 10px; color: var(--dim); font-family: 'IBM Plex Mono', monospace; font-weight: 600; letter-spacing: 0.04em; }
    .account-balance { font-size: 14px; font-weight: 700; font-family: 'IBM Plex Mono', monospace; text-align: right; }
    .account-balance.positive { color: var(--green); }
    .account-balance.negative { color: var(--red); }

    /* ── Note Section ── */
    .note-section { padding: 20px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); border-radius: 14px; font-size: 13px; color: var(--dim); line-height: 1.6; margin-bottom: 40px; }

    /* ── Coming Soon ── */
    .coming-soon-inline { background: rgba(139,92,246,0.04); border: 1px solid rgba(139,92,246,0.12); border-radius: 16px; padding: 32px 24px; text-align: center; color: var(--dim); font-size: 13px; margin-bottom: 40px; }
    .coming-soon-inline .cs-icon { font-size: 28px; display: block; margin-bottom: 10px; }
    .coming-soon-inline .cs-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; color: var(--purple); margin-bottom: 8px; }
    .coming-soon-inline code { background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 4px; font-size: 11px; font-family: 'IBM Plex Mono', monospace; }

    /* ── Loan-specific widgets ── */
    .officer-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-bottom: 40px; }
    .officer-card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 20px; position: relative; overflow: hidden; transition: all 0.3s; }
    .officer-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, var(--orange), var(--pink)); opacity: 0.6; }
    .officer-card:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
    .officer-avatar { width: 44px; height: 44px; border-radius: 50%; background: rgba(249,115,22,0.15); border: 1px solid rgba(249,115,22,0.25); display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; margin-bottom: 12px; color: var(--orange); }
    .officer-name { font-size: 13px; font-weight: 600; margin-bottom: 10px; }
    .officer-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .officer-stat-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--dim); font-weight: 600; margin-bottom: 2px; }
    .officer-stat-val { font-size: 14px; font-weight: 700; font-family: 'IBM Plex Mono', monospace; color: var(--green); }
    .pipeline-bar-wrap { margin-bottom: 40px; }
    .pipeline-bar-row { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .pipeline-bar-label { font-size: 11px; font-weight: 600; color: var(--dim); text-transform: uppercase; letter-spacing: 0.06em; min-width: 120px; text-align: right; }
    .pipeline-bar-track { flex: 1; height: 28px; background: rgba(255,255,255,0.03); border-radius: 6px; overflow: hidden; position: relative; }
    .pipeline-bar-fill { height: 100%; border-radius: 6px; transition: width 1s cubic-bezier(0.22,1,0.36,1); display: flex; align-items: center; padding-left: 10px; }
    .pipeline-bar-count { font-size: 11px; font-weight: 700; font-family: 'IBM Plex Mono', monospace; color: rgba(255,255,255,0.9); }
    .closed-loans-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
    .closed-loans-table th { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--dim); font-weight: 700; text-align: left; padding: 0 12px 12px 0; border-bottom: 1px solid var(--border); }
    .closed-loans-table td { font-size: 12px; padding: 12px 12px 12px 0; border-bottom: 1px solid rgba(255,255,255,0.02); }
    .closed-loans-table td.mono { font-family: 'IBM Plex Mono', monospace; font-weight: 600; }
    .closed-loans-table td.green { color: var(--green); }
    .closed-loans-table td.dim { color: var(--dim); font-size: 11px; }

    /* ── Team + Milestones ── */
    .team-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; margin-bottom: 40px; }
    .team-card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 20px; text-align: center; }
    .team-card-name { font-size: 13px; font-weight: 600; margin-bottom: 4px; }
    .team-card-role { font-size: 11px; color: var(--dim); }
    .milestone-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 40px; }
    .milestone-row { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; }
    .milestone-title { font-size: 13px; font-weight: 600; }
    .milestone-date { font-size: 11px; color: var(--dim); font-family: 'IBM Plex Mono', monospace; }
    .milestone-status { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; padding: 3px 10px; border-radius: 6px; }
    .milestone-status.completed { background: rgba(16,185,129,0.1); color: var(--green); }
    .milestone-status.in_progress { background: rgba(245,158,11,0.1); color: var(--amber); }
    .milestone-status.upcoming { background: rgba(139,92,246,0.1); color: var(--purple); }
  </style>
</head>
<body>
  <div class="page-wrapper">
    <nav class="navbar">
      <div class="navbar-container">
        <div style="display:flex;flex-direction:column;gap:2px;">
          <div style="font-size:11px;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:0.06em;font-weight:600;">
            Mission Control / Companies / ${E.fullName}
          </div>
          <div class="navbar-title" style="font-size:28px;font-weight:700;">${E.fullName}</div>
          ${E.subtitle ? `<div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:2px;letter-spacing:0.01em;">${E.subtitle}</div>` : ''}
          <div style="display:flex;gap:8px;margin-top:6px;">
            <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;padding:3px 8px;border-radius:5px;background:rgba(249,115,22,0.12);color:#f97316;border:1px solid rgba(249,115,22,0.2);">${E.type}</span>
            <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;padding:3px 8px;border-radius:5px;background:rgba(16,185,129,0.12);color:#10b981;border:1px solid rgba(16,185,129,0.2);">${E.state}</span>
            ${entity?.notes ? `<span style="font-size:9px;font-weight:600;padding:3px 8px;border-radius:5px;background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.4);">${entity.notes}</span>` : ''}
          </div>
        </div>
        <a href="/companies" class="navbar-back">← All Companies</a>
      </div>
    </nav>
    <div class="main-container">

      <!-- HERO BANNER -->
      <div class="hero-banner">
        <canvas id="heroCanvas"></canvas>
        <div class="hero-scanline"></div>
        <div class="hud-corner tl"></div><div class="hud-corner tr"></div>
        <div class="hud-corner bl"></div><div class="hud-corner br"></div>
        <div class="hero-content">
          <div class="hero-left">
            <div class="hero-badges">
              <span class="hero-badge type">${E.type}</span>
              <span class="hero-badge state">${E.state}</span>
              <span class="hero-badge operational">Operational</span>
            </div>
            <div class="hero-company-greeting">${E.name}</div>
            ${E.subtitle ? `<div style="font-size:11px;color:rgba(255,255,255,0.45);margin-bottom:10px;letter-spacing:0.02em;">${E.subtitle}</div>` : ''}
            <div class="hero-primary-metric">${heroPrimary}</div>
            <div class="hero-sub-text">${heroSub}</div>
            <div class="hero-mini-cards">
              <div class="mini-card">
                <div class="mini-card-number">${heroMini1.val}</div>
                <div class="mini-card-label">${heroMini1.label}</div>
              </div>
              <div class="mini-card">
                <div class="mini-card-number">${heroMini2.val}</div>
                <div class="mini-card-label">${heroMini2.label}</div>
              </div>
              <div class="mini-card">
                <div class="mini-card-number">${heroMini3.val}</div>
                <div class="mini-card-label">${heroMini3.label}</div>
              </div>
            </div>
            <div class="hero-ticker">
              <span class="ticker-dot"></span>
              <span class="ticker-label">${heroTickerLabel}</span>
              ${heroShowProgress
                ? `<div class="ticker-progress"><div class="ticker-progress-bar" style="width:${(mondayKpis.pull_through_rate*100).toFixed(0)}%"></div></div>
                   <span class="ticker-value">${heroTickerValue}</span>`
                : `<span class="ticker-value" style="flex:1">${heroTickerValue}</span>`
              }
            </div>
          </div>
          <div class="hero-orbital">
            <canvas id="orbitalCanvas"></canvas>
          </div>
          <div class="hero-player">
            <div class="health-card">
              <svg width="0" height="0" style="position:absolute">
                <defs>
                  <linearGradient id="healthGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#8b5cf6"/>
                    <stop offset="100%" stop-color="#ec4899"/>
                  </linearGradient>
                </defs>
              </svg>
              <div class="health-card-name">${E.fullName}</div>
              <div class="health-card-type">Company Health</div>
              <div class="health-gauge-wrap">
                <svg class="health-gauge-svg" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="6"/>
                  <circle cx="50" cy="50" r="45" fill="none" stroke="url(#healthGrad)" stroke-width="6" stroke-dasharray="282.7" stroke-dashoffset="${healthDashOffset}" stroke-linecap="round"/>
                </svg>
                <div class="health-gauge-value">${healthGaugeVal}</div>
              </div>
              <div class="health-stats">
                ${healthStats.map(s => `
                  <div class="health-stat">
                    <div class="health-stat-number">${s.val}</div>
                    <div class="health-stat-label">${s.label}</div>
                  </div>`).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ACHIEVEMENTS -->
      <section class="section" data-tab="overview">
        <div class="section-header">
          <div class="section-header-left">
            <span style="font-size:20px">🏆</span>
            <h2 class="section-title">Achievements</h2>
            ${achievements.length > 0
              ? `<span class="achieve-count">${achievements.length} earned</span>`
              : ''}
          </div>
        </div>
        ${achievements.length > 0
          ? `<svg width="0" height="0" style="position:absolute">
              <defs>
                <linearGradient id="achieveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#f97316"/>
                  <stop offset="50%" stop-color="#ec4899"/>
                  <stop offset="100%" stop-color="#8b5cf6"/>
                </linearGradient>
              </defs>
            </svg>
            <div class="achieve-grid">
              ${achievements.map((a: any) => `
                <div class="achieve-card earned">
                  <div class="achieve-ring-wrap">
                    <svg class="achieve-ring-svg" viewBox="0 0 88 88">
                      <circle class="achieve-ring-bg" cx="44" cy="44" r="40"/>
                      <circle class="achieve-ring-fill" cx="44" cy="44" r="40" stroke-dasharray="251" stroke-dashoffset="0"/>
                    </svg>
                    <span class="achieve-icon-center">${a.icon ?? '🏆'}</span>
                    <div class="achieve-check">✓</div>
                  </div>
                  <p class="achieve-name">${a.title}</p>
                  <p class="achieve-xp">+${a.xp ?? 100} XP</p>
                </div>`).join('')}
            </div>`
          : `<div class="coming-soon-inline" data-source="achievements:${slug}">
              <span class="cs-icon">🔮</span>
              <div class="cs-label">Coming Soon</div>
              Achievements will be earned as ${E.name} hits milestones and KPI targets.
            </div>`
        }
      </section>

      <!-- KPIs -->
      <section class="section" data-tab="overview">
        <div class="section-header">
          <div class="section-header-left">
            <span style="font-size:20px">⚡</span>
            <h2 class="section-title">KPIs</h2>
          </div>
        </div>
        ${hasKpis
          ? `<div class="kpi-grid">
              ${kpis.map((k: any, i: number) => {
                const colors = ['kpi-orange','kpi-green','kpi-purple','kpi-amber','kpi-lime']
                const color = k.color ? `kpi-${k.color}` : colors[i % colors.length]
                const numVal = Number(k.value ?? 0)
                const numTarget = k.target != null ? Number(k.target) : null
                const val = k.unit === 'currency'
                  ? fmtCurrency(numVal)
                  : k.unit === 'pct'
                  ? (numVal * (numVal <= 1 ? 100 : 1)).toFixed(0) + '%'
                  : String(k.value ?? '—')
                const targetStr = numTarget != null && numTarget > 0
                  ? k.unit === 'currency'
                    ? 'target ' + fmtCurrency(numTarget)
                    : k.unit === 'pct'
                    ? 'target ' + (numTarget * (numTarget <= 1 ? 100 : 1)).toFixed(0) + '%'
                    : 'target ' + numTarget
                  : ''
                const pctOfTarget = numTarget != null && numTarget > 0
                  ? Math.min(100, Math.round((numVal / numTarget) * 100))
                  : null
                const pctColor = pctOfTarget == null ? '' : pctOfTarget >= 80 ? 'var(--green)' : pctOfTarget >= 50 ? 'var(--amber)' : 'var(--red)'
                return `<div class="kpi-card ${color}">
                  <div class="kpi-header"><div class="kpi-num">${val}</div><div class="kpi-indicator"></div></div>
                  <div class="kpi-label">${k.label ?? k.metric_key}</div>
                  <div class="kpi-bars" id="bars${i+1}"></div>
                  <div class="kpi-meta">
                    <span class="kpi-meta-item">${targetStr}</span>
                    ${pctOfTarget != null ? `<div class="kpi-meta-value" style="color:${pctColor}">${pctOfTarget}%</div>` : ''}
                  </div>
                </div>`
              }).join('')}
            </div>`
          : `<div class="coming-soon-inline" data-source="company_kpis:${slug}">
              <span class="cs-icon">🔮</span>
              <div class="cs-label">Coming Soon</div>
              Per-entity KPIs from <code>company_kpis</code> will display here once data is available.
            </div>`
        }
      </section>

      ${isXome ? `
      <!-- LOAN ANALYTICS (Xome only, Monday.com) -->
      <section class="section" data-tab="sales">
        <div class="section-header">
          <div class="section-header-left">
            <span style="font-size:20px">📊</span>
            <h2 class="section-title">Loan Analytics</h2>
            ${mondayKpis ? `<span class="achieve-count" style="color:var(--green);border:1px solid rgba(16,185,129,0.2);background:rgba(16,185,129,0.08)">Live · Monday.com</span>` : '<span class="achieve-count">monday.com</span>'}
          </div>
        </div>

        ${mondayKpis ? `
        <!-- Loan Volume KPI Row -->
        <div class="kpi-grid" style="margin-bottom:28px">
          <div class="kpi-card kpi-green">
            <div class="kpi-header"><div class="kpi-num">${fmtCurrency(mondayKpis.volume_ytd || 0)}</div><div class="kpi-indicator"></div></div>
            <div class="kpi-label">Loan Volume YTD</div>
            <div class="kpi-bars" id="bars-lo1"></div>
            <div class="kpi-meta"><span class="kpi-meta-item">${mondayKpis.loans_funded_ytd || 0} funded YTD</span><div class="kpi-meta-value">Monday</div></div>
          </div>
          <div class="kpi-card kpi-orange">
            <div class="kpi-header"><div class="kpi-num">${fmtCurrency(mondayKpis.pipeline_value || 0)}</div><div class="kpi-indicator"></div></div>
            <div class="kpi-label">Pipeline Value</div>
            <div class="kpi-bars" id="bars-lo2"></div>
            <div class="kpi-meta"><span class="kpi-meta-item">${mondayKpis.pipeline_count || 0} active loans</span></div>
          </div>
          <div class="kpi-card kpi-purple">
            <div class="kpi-header"><div class="kpi-num">${mondayKpis.avg_loan_size ? fmtCurrency(mondayKpis.avg_loan_size) : '—'}</div><div class="kpi-indicator"></div></div>
            <div class="kpi-label">Avg Loan Size</div>
            <div class="kpi-bars" id="bars-lo3"></div>
            <div class="kpi-meta"><span class="kpi-meta-item">Funded loans</span></div>
          </div>
          <div class="kpi-card kpi-amber">
            <div class="kpi-header"><div class="kpi-num">${mondayKpis.avg_days_to_close ? mondayKpis.avg_days_to_close + 'd' : '—'}</div><div class="kpi-indicator"></div></div>
            <div class="kpi-label">Avg Days to Close</div>
            <div class="kpi-bars" id="bars-lo4"></div>
            <div class="kpi-meta"><span class="kpi-meta-item">Goal: 30d</span><div class="kpi-meta-value" style="color:${(mondayKpis.avg_days_to_close || 99) <= 30 ? 'var(--green)' : 'var(--orange)'};">${(mondayKpis.avg_days_to_close || 99) <= 30 ? 'On Track' : 'Needs Attn'}</div></div>
          </div>
          <div class="kpi-card kpi-lime">
            <div class="kpi-header"><div class="kpi-num">${mondayKpis.loans_funded_mtd ?? '—'}</div><div class="kpi-indicator"></div></div>
            <div class="kpi-label">Loans Funded MTD</div>
            <div class="kpi-bars" id="bars-lo5"></div>
            <div class="kpi-meta"><span class="kpi-meta-item">${fmtCurrency(mondayKpis.volume_mtd || 0)} MTD vol.</span></div>
          </div>
        </div>

        <!-- Analytics Grid: Conversion Donut + Pipeline Stages -->
        <div class="analytics-grid">
          <div class="chart-card">
            <div class="chart-label">Pull-Through Rate</div>
            <svg class="chart-svg" viewBox="0 0 280 180">
              ${mondayKpis.pull_through_rate != null ? `
              <circle cx="80" cy="90" r="60" fill="none" stroke="rgba(16,185,129,0.3)" stroke-width="20"/>
              <circle cx="80" cy="90" r="60" fill="none" stroke="var(--green)" stroke-width="20"
                stroke-dasharray="${(mondayKpis.pull_through_rate * 314).toFixed(1)}" stroke-dashoffset="0" stroke-linecap="round"/>
              <text x="80" y="95" font-size="32" font-weight="700" font-family="IBM Plex Mono" text-anchor="middle" fill="var(--green)">${(mondayKpis.pull_through_rate*100).toFixed(0)}%</text>
              <text x="80" y="115" font-size="11" font-weight="600" text-anchor="middle" fill="rgba(255,255,255,0.4)">Funded</text>
              ` : `
              <text x="80" y="95" font-size="14" text-anchor="middle" fill="rgba(255,255,255,0.4)">No data</text>
              `}
              <circle cx="160" cy="50" r="5" fill="var(--green)"/>
              <text x="175" y="55" font-size="11" fill="rgba(255,255,255,0.8)">Funded ${mondayKpis.pull_through_rate != null ? (mondayKpis.pull_through_rate*100).toFixed(0)+'%' : '—'}</text>
              <circle cx="160" cy="75" r="5" fill="var(--amber)"/>
              <text x="175" y="80" font-size="11" fill="rgba(255,255,255,0.8)">In Process</text>
              <circle cx="160" cy="100" r="5" fill="var(--red)"/>
              <text x="175" y="105" font-size="11" fill="rgba(255,255,255,0.8)">Dead/Lost</text>
            </svg>
          </div>
          <div class="chart-card">
            <div class="chart-label">Avg Days-to-Close Trend</div>
            <canvas id="timelineCanvas" class="chart-svg"></canvas>
          </div>
        </div>

        <!-- Second Tier Stats Row -->
        <div class="stats-row">
          <div class="stat-card green">
            <div class="stat-card-content">
              <div class="stat-value">${mondayKpis.pull_through_rate != null ? (mondayKpis.pull_through_rate*100).toFixed(0)+'%' : '—'}</div>
              <div class="stat-label">Pull-Through Rate</div>
              <div class="stat-sub">Active pipeline conversion to funded</div>
            </div>
          </div>
          <div class="stat-card amber">
            <div class="stat-card-content">
              <div class="stat-value">${mondayKpis.pipeline_count || '—'}</div>
              <div class="stat-label">Active Pipeline Loans</div>
              <div class="stat-sub">Excluding dead / nurture / funded</div>
            </div>
          </div>
          <div class="stat-card pink">
            <div class="stat-card-content">
              <div class="stat-value">${fmtCurrency(mondayKpis.volume_mtd || 0)}</div>
              <div class="stat-label">Volume MTD</div>
              <div class="stat-sub">${mondayKpis.loans_funded_mtd || 0} loans funded this month</div>
            </div>
          </div>
        </div>
        ` : `
        <div class="coming-soon-inline" data-source="monday:5842083369/loan-kpis">
          <span class="cs-icon">🏠</span>
          <div class="cs-label">Monday.com · Xome Loan Pipeline</div>
          Configure the Xome Monday integration to load live loan analytics from
          "New Pipeline Xome" (board 5842083369).
          <a href="/integrations" style="color:var(--purple);display:inline-block;margin-top:8px;">
            Configure Xome Monday integration →
          </a>
          ${mondayError ? `<div style="margin-top:8px;font-size:10px;color:var(--red);">${mondayError}</div>` : ''}
        </div>`}
      </section>

      <!-- LOAN OFFICER ROSTER (Xome only) -->
      <section class="section" data-tab="crm">
        <div class="section-header">
          <div class="section-header-left">
            <span style="font-size:20px">👤</span>
            <h2 class="section-title">Loan Officer Roster</h2>
          </div>
        </div>
        ${mondayOfficers && mondayOfficers.length > 0 ? `
        <div class="officer-grid">
          ${mondayOfficers.map((o: LoanOfficerRow) => `
            <div class="officer-card">
              <div class="officer-avatar">${o.name?.[0]?.toUpperCase() || '?'}</div>
              <div class="officer-name">${o.name}</div>
              <div class="officer-stats">
                <div>
                  <div class="officer-stat-label">YTD Volume</div>
                  <div class="officer-stat-val">${fmtCurrency(o.volume_ytd || 0)}</div>
                </div>
                <div>
                  <div class="officer-stat-label">MTD Volume</div>
                  <div class="officer-stat-val">${fmtCurrency(o.volume_mtd || 0)}</div>
                </div>
                <div>
                  <div class="officer-stat-label">Funded</div>
                  <div class="officer-stat-val">${o.funded_count || 0}</div>
                </div>
                <div>
                  <div class="officer-stat-label">Active</div>
                  <div class="officer-stat-val">${o.active_count || 0}</div>
                </div>
              </div>
            </div>`).join('')}
        </div>` : `
        <div class="coming-soon-inline" data-source="monday:5842083369/loan-officers">
          <span class="cs-icon">👤</span>
          <div class="cs-label">Monday.com · Loan Officer Data</div>
          Loan officer roster aggregated from Xome pipeline. Configure the Xome Monday
          integration in <a href="/integrations" style="color:var(--purple);">/integrations</a>.
        </div>`}
      </section>

      <!-- LOAN PIPELINE STAGES (Xome only) -->
      <section class="section" data-tab="sales">
        <div class="section-header">
          <div class="section-header-left">
            <span style="font-size:20px">🏗️</span>
            <h2 class="section-title">Loan Pipeline Stages</h2>
          </div>
        </div>
        ${pipelineStagesArr.length > 0 ? `
        <div class="pipeline-bar-wrap">
          ${pipelineStagesArr
            .slice()
            .sort((a, b) => {
              const ai = pipelineStageOrder.indexOf(a.group_name)
              const bi = pipelineStageOrder.indexOf(b.group_name)
              return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
            })
            .map((s) => {
              const pct = Math.max(4, (s.count / totalStaged) * 100)
              const color = stageColorByName[s.group_name] || 'rgba(255,255,255,0.2)'
              return s.count === 0 ? '' : `
              <div class="pipeline-bar-row">
                <div class="pipeline-bar-label">${s.group_name}</div>
                <div class="pipeline-bar-track">
                  <div class="pipeline-bar-fill" style="width:${pct}%;background:${color.startsWith('var') ? color.replace('var(--','rgba(').replace(')', ',0.13)') : 'rgba(255,255,255,0.06)'};border-left:3px solid ${color}">
                    <span class="pipeline-bar-count">${s.count}${s.total_amount > 0 ? ` · ${fmtCurrency(s.total_amount)}` : ''}</span>
                  </div>
                </div>
              </div>`
            }).join('')}
        </div>` : `
        <div class="coming-soon-inline" data-source="monday:5842083369/pipeline">
          <span class="cs-icon">🏗️</span>
          <div class="cs-label">Monday.com · Pipeline Stages</div>
          Stage distribution from the Xome "New Pipeline Xome" board. Configure the
          Xome Monday integration in
          <a href="/integrations" style="color:var(--purple);">/integrations</a>.
        </div>`}
      </section>

      <!-- RECENT CLOSED LOANS (Xome only) -->
      <section class="section" data-tab="sales">
        <div class="section-header">
          <div class="section-header-left">
            <span style="font-size:20px">✅</span>
            <h2 class="section-title">Recent Closed Loans</h2>
          </div>
        </div>
        ${recentClosed.length > 0 ? `
        <table class="closed-loans-table">
          <thead>
            <tr>
              <th>Borrower</th>
              <th>Amount</th>
              <th>Officer</th>
              <th>Type</th>
              <th>Purpose</th>
              <th>State</th>
              <th>Close Date</th>
            </tr>
          </thead>
          <tbody>
            ${recentClosed.map((d: ClosedLoanRow) => `
            <tr>
              <td>${d.borrower || '—'}</td>
              <td class="mono green">${d.amount ? fmtCurrency(d.amount) : '—'}</td>
              <td class="dim">${d.lo || '—'}</td>
              <td class="dim">${d.loan_type || '—'}</td>
              <td class="dim">${d.loan_purpose || '—'}</td>
              <td class="dim">${d.state || '—'}</td>
              <td class="mono dim">${d.close_date || '—'}</td>
            </tr>`).join('')}
          </tbody>
        </table>` : `
        <div class="coming-soon-inline" data-source="monday:5842083369/funded">
          <span class="cs-icon">✅</span>
          <div class="cs-label">Monday.com · Funded Group</div>
          Last 10 closed loans from the Xome "Funded 💵" group.
          Configure the Xome Monday integration in
          <a href="/integrations" style="color:var(--purple);">/integrations</a>.
        </div>`}
      </section>

      <!-- COMPLIANCE TRACKER (Xome only) -->
      <section class="section" data-tab="financials">
        <div class="section-header">
          <div class="section-header-left">
            <span style="font-size:20px">🛡️</span>
            <h2 class="section-title">Compliance Tracker</h2>
            ${mondayCompliance && mondayCompliance.overdue_count > 0
              ? `<span class="achieve-count" style="color:var(--red);border:1px solid rgba(239,68,68,0.2);background:rgba(239,68,68,0.08)">${mondayCompliance.overdue_count} overdue</span>`
              : mondayCompliance
              ? `<span class="achieve-count" style="color:var(--green);border:1px solid rgba(16,185,129,0.2);background:rgba(16,185,129,0.08)">Live · Monday.com</span>`
              : ''}
          </div>
        </div>
        ${mondayCompliance ? `
          <div class="stats-row" style="margin-bottom:20px">
            <div class="stat-card amber">
              <div class="stat-card-content">
                <div class="stat-value">${mondayCompliance.pending_count}</div>
                <div class="stat-label">Pending Compliance</div>
                <div class="stat-sub">Items awaiting review</div>
              </div>
            </div>
            <div class="stat-card green">
              <div class="stat-card-content">
                <div class="stat-value">${mondayCompliance.completed_count}</div>
                <div class="stat-label">Completed</div>
                <div class="stat-sub">Cleared & closed</div>
              </div>
            </div>
            <div class="stat-card pink" style="${mondayCompliance.overdue_count > 0 ? 'border-color:rgba(239,68,68,0.25);' : ''}">
              <div class="stat-card-content">
                <div class="stat-value" style="${mondayCompliance.overdue_count > 0 ? 'color:var(--red);' : ''}">${mondayCompliance.overdue_count}</div>
                <div class="stat-label">Overdue (>14d)</div>
                <div class="stat-sub">${mondayCompliance.overdue_count > 0 ? 'Needs immediate attention' : 'All within SLA'}</div>
              </div>
            </div>
          </div>
          ${mondayCompliance.items && mondayCompliance.items.length > 0 ? `
          <table class="closed-loans-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Group</th>
                <th>Date Received</th>
                <th>Processor</th>
                <th>Cleared</th>
                <th>Flag</th>
              </tr>
            </thead>
            <tbody>
              ${mondayCompliance.items.map((i: any) => `
              <tr${i.overdue ? ' style="background:rgba(239,68,68,0.04);"' : ''}>
                <td>${i.name}</td>
                <td class="dim">${i.group}</td>
                <td class="mono dim">${i.date_received || '—'}</td>
                <td class="dim">${i.processor_compliance || '—'}</td>
                <td class="dim">${i.cleared || '—'}</td>
                <td>${i.overdue ? '<span style="color:var(--red);font-weight:700;">Overdue</span>' : '<span style="color:var(--green);">OK</span>'}</td>
              </tr>`).join('')}
            </tbody>
          </table>` : `
          <div class="coming-soon-inline" data-source="monday:18140546461/empty" style="border-color:rgba(139,92,246,0.1)">
            <span class="cs-icon">🛡️</span>
            <div class="cs-label">No compliance items yet</div>
            The "Compliance Tracker" board (18140546461) is empty. As items are added,
            they will appear here with overdue flags (>14 days since Date Received).
          </div>`}
        ` : `
        <div class="coming-soon-inline" data-source="monday:18140546461">
          <span class="cs-icon">🛡️</span>
          <div class="cs-label">Monday.com · Compliance Tracker</div>
          Configure the Xome Monday integration in
          <a href="/integrations" style="color:var(--purple);">/integrations</a>.
        </div>`}
      </section>

      <!-- WAREHOUSE RECONCILIATION (Xome only) -->
      <section class="section" data-tab="financials">
        <div class="section-header">
          <div class="section-header-left">
            <span style="font-size:20px">🏦</span>
            <h2 class="section-title">Warehouse Reconciliation</h2>
            ${mondayWarehouse
              ? `<span class="achieve-count" style="color:var(--green);border:1px solid rgba(16,185,129,0.2);background:rgba(16,185,129,0.08)">Live · Monday.com</span>`
              : ''}
          </div>
        </div>
        ${mondayWarehouse ? `
          <div class="stats-row">
            <div class="stat-card amber">
              <div class="stat-card-content">
                <div class="stat-value">${mondayWarehouse.open_count}</div>
                <div class="stat-label">Open Items</div>
                <div class="stat-sub">Pending reconciliation</div>
              </div>
            </div>
            <div class="stat-card pink">
              <div class="stat-card-content">
                <div class="stat-value">${fmtCurrency(mondayWarehouse.total_pending_value || 0)}</div>
                <div class="stat-label">Total Value Pending</div>
                <div class="stat-sub">Sum of wire amounts open</div>
              </div>
            </div>
            <div class="stat-card green">
              <div class="stat-card-content">
                <div class="stat-value">${mondayWarehouse.oldest_open_days != null ? mondayWarehouse.oldest_open_days + 'd' : '—'}</div>
                <div class="stat-label">Oldest Open</div>
                <div class="stat-sub">${mondayWarehouse.reconciled_count} reconciled total</div>
              </div>
            </div>
          </div>
        ` : `
        <div class="coming-soon-inline" data-source="monday:18140546824">
          <span class="cs-icon">🏦</span>
          <div class="cs-label">Monday.com · Warehouse Reconciliation</div>
          Configure the Xome Monday integration in
          <a href="/integrations" style="color:var(--purple);">/integrations</a>.
        </div>`}
      </section>

      <!-- XOME POWER (Xome only) -->
      <section class="section" data-tab="sales">
        <div class="section-header">
          <div class="section-header-left">
            <span style="font-size:20px">⚡</span>
            <h2 class="section-title">Xome Power</h2>
            ${mondayPower
              ? `<span class="achieve-count" style="color:var(--amber);border:1px solid rgba(245,158,11,0.2);background:rgba(245,158,11,0.08)">${mondayPower.total_items} leads</span>`
              : ''}
          </div>
        </div>
        ${mondayPower ? `
          <div class="pipeline-bar-wrap">
            ${mondayPower.stages.map((s) => {
              const totalP = mondayPower.total_items || 1
              const pct = Math.max(4, (s.count / totalP) * 100)
              const color = s.group_name === 'Completed' ? 'var(--green)'
                : s.group_name === 'Project' ? 'var(--amber)'
                : s.group_name === 'Proposal' ? 'var(--orange)'
                : s.group_name === 'Nurture' ? 'var(--lime)'
                : s.group_name === 'Dead' ? 'var(--red)'
                : 'var(--purple)'
              return s.count === 0 ? '' : `
              <div class="pipeline-bar-row">
                <div class="pipeline-bar-label">${s.group_name}</div>
                <div class="pipeline-bar-track">
                  <div class="pipeline-bar-fill" style="width:${pct}%;background:${color.replace('var(--','rgba(').replace(')',',0.13)')};border-left:3px solid ${color}">
                    <span class="pipeline-bar-count">${s.count}</span>
                  </div>
                </div>
              </div>`
            }).join('')}
          </div>
        ` : `
        <div class="coming-soon-inline" data-source="monday:6386432034">
          <span class="cs-icon">⚡</span>
          <div class="cs-label">Monday.com · Xome Power</div>
          Solar / renewables lead pipeline. Configure the Xome Monday integration in
          <a href="/integrations" style="color:var(--purple);">/integrations</a>.
        </div>`}
      </section>
      ` : ''}

      <!-- REVENUE / CASH FLOW -->
      <section class="section" data-tab="financials">
        <div class="section-header">
          <div class="section-header-left">
            <span style="font-size:20px">💰</span>
            <h2 class="section-title">Revenue &amp; Cash Flow</h2>
          </div>
        </div>
        ${hasRevenue
          ? `<div class="analytics-grid">
              <div class="chart-card">
                <div class="chart-label">Revenue — Last 30 Days</div>
                <div style="font-size:36px;font-weight:700;font-family:'IBM Plex Mono',monospace;color:var(--green);margin:24px 0 8px;">${fmtCurrency(revenue30d)}</div>
                <div style="font-size:11px;color:var(--dim);">From financial_transactions tagged to this entity</div>
              </div>
              <div class="chart-card">
                <div class="chart-label">Expenses — Last 30 Days</div>
                <div style="font-size:36px;font-weight:700;font-family:'IBM Plex Mono',monospace;color:var(--orange);margin:24px 0 8px;">${fmtCurrency(expenses30d)}</div>
                <div style="font-size:11px;color:var(--dim);">Net: <span style="color:${revenue30d - expenses30d >= 0 ? 'var(--green)' : 'var(--red)'}">${fmtCurrency(Math.abs(revenue30d - expenses30d))} ${revenue30d - expenses30d >= 0 ? 'surplus' : 'deficit'}</span></div>
              </div>
            </div>`
          : `<div class="coming-soon-inline" data-source="financial_transactions:entity_id:${slug}">
              <span class="cs-icon">💳</span>
              <div class="cs-label">No transactions yet</div>
              No transactions tagged to this entity yet. Tag via <a href="/accounts" style="color:var(--purple);">/accounts</a>.
            </div>`
        }
      </section>

      <!-- TEAM -->
      <section class="section" data-tab="team">
        <div class="section-header">
          <div class="section-header-left">
            <span style="font-size:20px">👥</span>
            <h2 class="section-title">Team</h2>
          </div>
        </div>
        ${hasTeam
          ? `<div class="team-grid">
              ${team.map((m: any) => `
                <div class="team-card">
                  <div style="width:44px;height:44px;border-radius:50%;background:rgba(249,115,22,0.15);border:1px solid rgba(249,115,22,0.2);margin:0 auto 12px;display:flex;align-items:center;justify-content:center;font-size:18px;">
                    ${(m.name ?? '?')[0].toUpperCase()}
                  </div>
                  <div class="team-card-name">${m.name}</div>
                  <div class="team-card-role">${m.role ?? '—'}</div>
                </div>`).join('')}
            </div>`
          : `<div class="coming-soon-inline" data-source="company_team:${slug}">
              <span class="cs-icon">👥</span>
              <div class="cs-label">No team members yet</div>
              Add team members on the <a href="/team" style="color:var(--purple);">Team page</a>.
            </div>`
        }
      </section>

      <!-- MILESTONES -->
      <section class="section" data-tab="milestones">
        <div class="section-header">
          <div class="section-header-left">
            <span style="font-size:20px">🎯</span>
            <h2 class="section-title">Milestones</h2>
          </div>
        </div>
        ${hasMilestones
          ? `<div class="milestone-list">
              ${milestones.map((m: any) => `
                <div class="milestone-row">
                  <div>
                    <div class="milestone-title">${m.title}</div>
                    ${m.notes ? `<div style="font-size:11px;color:var(--dim);margin-top:4px;">${m.notes}</div>` : ''}
                  </div>
                  <div style="display:flex;align-items:center;gap:12px;">
                    ${m.target_date ? `<span class="milestone-date">${m.target_date}</span>` : ''}
                    <span class="milestone-status ${m.status ?? 'upcoming'}">${(m.status ?? 'upcoming').replace('_', ' ')}</span>
                  </div>
                </div>`).join('')}
            </div>`
          : `<div class="coming-soon-inline" data-source="company_milestones:${slug}">
              <span class="cs-icon">🔮</span>
              <div class="cs-label">Coming Soon</div>
              Milestones from <code>company_milestones</code> will display here.
            </div>`
        }
      </section>

      <!-- BANK ACCOUNTS -->
      <section data-tab="financials" style="margin-bottom:40px;">
        ${E.accounts.length > 0
          ? `<div class="bank-accounts-card">
              <div class="card-title">Bank Accounts</div>
              <div class="account-list">
                ${E.accounts.map((a: any) => {
                  const isNeg = a.bal < 0
                  const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(a.bal))
                  return `<div class="account-row">
                    <div class="account-info">
                      <div class="account-name">${a.name}</div>
                      <div class="account-mask">•••• ${a.mask}</div>
                    </div>
                    <div class="account-balance ${isNeg ? 'negative' : 'positive'}">${isNeg ? '-' : ''}${fmt}</div>
                  </div>`
                }).join('')}
              </div>
            </div>`
          : `<div class="coming-soon-inline" data-source="financial_accounts:${slug}">
              <span class="cs-icon">🔮</span>
              <div class="cs-label">Coming Soon</div>
              Bank accounts from <code>financial_accounts</code> will display here once linked via Plaid.
            </div>`
        }
      </section>

      <!-- COMPANY ASSETS (websites, apps, IP owned by this entity) -->
      <section data-tab="assets" style="margin-bottom:40px;">
        ${assets.length > 0
          ? `<div class="bank-accounts-card" style="border-color:rgba(16,185,129,0.2)">
              <div class="card-title">Company Assets · ${assets.length}</div>
              <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px;padding:12px;">
                ${assets.map((a: any) => {
                  const kindIcon: Record<string, string> = {
                    website: '🌐', web_app: '🖥️', mobile_app: '📱',
                    saas_product: '⚙️', domain: '🔗', ai_system: '🤖',
                    brand: '✨', ip: '📜', other: '📦',
                  }
                  const statusColor: Record<string, string> = {
                    live: 'var(--green)', staging: 'var(--amber)',
                    building: 'var(--blue)', archived: 'var(--dim)',
                    licensed: 'var(--purple)', internal: 'var(--orange)',
                  }
                  const icon = kindIcon[a.kind] ?? '📦'
                  const color = statusColor[a.status] ?? 'var(--dim)'
                  const urlEsc = (a.url ?? '').replace(/"/g, '&quot;')
                  return `<div style="padding:16px;border:1px solid var(--border);border-radius:12px;background:rgba(255,255,255,0.02);">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:10px;">
                      <div style="display:flex;align-items:center;gap:10px;">
                        <span style="font-size:22px;">${icon}</span>
                        <div>
                          <div style="font-size:14px;font-weight:700;color:var(--t1);">${a.name}</div>
                          <div style="font-size:10px;font-family:'IBM Plex Mono',monospace;color:var(--dim);letter-spacing:0.08em;text-transform:uppercase;margin-top:2px;">${a.kind.replace('_',' ')}</div>
                        </div>
                      </div>
                      <span style="font-size:9px;font-family:'IBM Plex Mono',monospace;padding:3px 8px;border-radius:4px;border:1px solid ${color};color:${color};text-transform:uppercase;letter-spacing:0.06em;">${a.status}</span>
                    </div>
                    ${a.description ? `<div style="font-size:12px;color:var(--t2);line-height:1.45;margin-bottom:10px;">${a.description}</div>` : ''}
                    ${a.url ? `<a href="${urlEsc}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-family:'IBM Plex Mono',monospace;color:var(--orange);text-decoration:none;margin-bottom:8px;">${String(a.url).replace('https://','').replace('http://','')} ↗</a>` : ''}
                    ${a.tags && a.tags.length ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:8px;">${a.tags.map((t: string) => `<span style="font-size:9px;padding:2px 6px;border-radius:4px;background:rgba(255,255,255,0.04);color:var(--dim);font-family:'IBM Plex Mono',monospace;">${t}</span>`).join('')}</div>` : ''}
                    ${a.monthly_revenue ? `<div style="font-size:11px;color:var(--green);margin-top:8px;font-family:'IBM Plex Mono',monospace;">$${Number(a.monthly_revenue).toLocaleString()}/mo revenue</div>` : ''}
                  </div>`
                }).join('')}
              </div>
            </div>`
          : `<div class="coming-soon-inline" data-source="company_assets:${slug}">
              <span class="cs-icon">🌐</span>
              <div class="cs-label">No assets yet</div>
              Websites, apps, and IP owned by this entity will appear here. Add rows to <code>company_assets</code> with entity_id=${slug}.
            </div>`
        }
      </section>

      <!-- DOCUMENTS -->
      <section data-tab="documents" style="margin-bottom:40px;">
        ${hasDocs
          ? `<div class="bank-accounts-card" style="border-color:rgba(139,92,246,0.15)">
              <div class="card-title">Entity Documents (${documents.length})</div>
              <div class="account-list">
                ${documents.map((d: any) => `
                  <div class="account-row">
                    <div class="account-info">
                      <div class="account-name">${d.document_name ?? d.document_type ?? 'Document'}</div>
                      <div class="account-mask">${d.document_type ?? ''}</div>
                    </div>
                    <div style="font-size:11px;color:var(--dim);font-family:'IBM Plex Mono',monospace;">${d.created_at ? d.created_at.split('T')[0] : ''}</div>
                  </div>`).join('')}
              </div>
            </div>`
          : `<div class="coming-soon-inline" data-source="entity_documents:${slug}">
              <span class="cs-icon">📄</span>
              <div class="cs-label">Coming Soon</div>
              Entity documents will display here once uploaded to <code>entity_documents</code>.
            </div>`
        }
      </section>

      <!-- NOTE SECTION -->
      <section data-tab="overview">
        <div class="note-section">
          ${isXome
            ? `Xome Monday integration active — primary board is "New Pipeline Xome" (5842083369, Main workspace, 928 items). Compliance Tracker (18140546461) and Warehouse Reconciliation (18140546824) also wired. Env var: <code>MONDAY_XOME_API_KEY</code>. 60s in-memory cache. ${mondayError ? '<br><span style="color:var(--amber);">' + mondayError + '</span>' : ''}`
            : E.purpose
            ? E.purpose
            : `${E.fullName} · ${E.type} · ${E.state} · Data updates automatically as KPIs, transactions, and team members are added.`
          }
        </div>
      </section>

    </div>
  </div>
</body>
</html>`

  // ── Tab definitions ───────────────────────────────────────────
  // Counts reflect data availability; `empty: true` grays the tab out.
  // Tabs with no source for this entity are `hidden: true`.
  const CG_SLUG = 'culbertson-gray'
  const isCG = slug === CG_SLUG

  // CRM & Activity is only shown for entities with a wired CRM source:
  //   - C&G: FUB is wired (dedicated /companies/culbertson-gray page handles
  //     it, but we also show a pointer here)
  //   - Xome: loan-officer roster from Monday
  const hasCrmSource = isXome || isCG

  const tabs: TabDef[] = [
    { id: 'overview',    label: 'Overview' },
    {
      id: 'sales',
      label: 'Sales & Revenue',
      count: isXome ? (mondayKpis ? 1 : 0) : null,
    },
    {
      id: 'crm',
      label: 'CRM & Activity',
      hidden: !hasCrmSource,
      count: isXome ? (mondayOfficers?.length ?? 0) : null,
    },
    {
      id: 'team',
      label: 'Team',
      count: team.length,
      empty: team.length === 0,
    },
    { id: 'financials',  label: 'Financials' },
    {
      id: 'assets',
      label: 'Assets',
      count: assets.length,
      empty: assets.length === 0,
    },
    {
      id: 'documents',
      label: 'Documents',
      count: documents.length,
      empty: documents.length === 0,
    },
    {
      id: 'milestones',
      label: 'Milestones',
      count: milestones.length,
      empty: milestones.length === 0,
    },
    { id: 'ownership',   label: 'Ownership', hidden: !entity?.id },
  ]

  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <HeroCanvas />

      {/* ── Tab bar (sticky) ─────────────────────────────────── */}
      <CompanyTabs tabs={tabs} defaultTab="overview" />

      {/* ── Sales & Revenue tab (React-rendered, separate from HTML blob) ── */}
      <div
        data-tab="sales"
        style={{
          width: '86%',
          margin: '0 auto',
          fontFamily: 'DM Sans, sans-serif',
        }}
      >
        {isCG && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 20,
            }}
          >
            <span style={{ fontSize: 20 }}>📈</span>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.9)',
                margin: 0,
              }}
            >
              Sales & Revenue — Culbertson & Gray
            </h2>
          </div>
        )}
        <SalesRevenueTab
          slug={slug}
          entityName={E.name}
          revenue30d={revenue30d}
          expenses30d={expenses30d}
        />
      </div>

      {/* ── CRM & Activity pointer (for C&G only — dedicated page) ── */}
      {isCG && (
        <div
          data-tab="crm"
          style={{
            width: '86%',
            margin: '0 auto 40px',
            fontFamily: 'DM Sans, sans-serif',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 20,
            }}
          >
            <span style={{ fontSize: 20 }}>🏁</span>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.9)',
                margin: 0,
              }}
            >
              CRM & Activity — Follow Up Boss
            </h2>
          </div>
          <div
            style={{
              background: 'rgba(139,92,246,0.04)',
              border: '1px solid rgba(139,92,246,0.12)',
              borderRadius: 16,
              padding: '32px 24px',
              textAlign: 'center',
              color: 'rgba(255,255,255,0.4)',
              fontSize: 13,
            }}
          >
            <div
              style={{
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                fontWeight: 700,
                color: '#8b5cf6',
                marginBottom: 10,
              }}
            >
              Full FUB Dashboard
            </div>
            Lead pipeline, agent roster, call volume, appointments, smart lists,
            recent closings, and response time live on the dedicated
            FUB-powered page.
            <div style={{ marginTop: 16 }}>
              <a
                href="/companies/culbertson-gray"
                style={{
                  color: '#8b5cf6',
                  fontWeight: 600,
                  textDecoration: 'none',
                  fontSize: 13,
                }}
              >
                Open Culbertson & Gray — FUB Dashboard →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── Financials tab (QuickBooks — per entity) ─────────── */}
      <div
        data-tab="financials"
        style={{
          width: '86%',
          margin: '0 auto 40px',
          fontFamily: 'DM Sans, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            margin: '20px 0',
          }}
        >
          <span style={{ fontSize: 20 }}>📊</span>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.9)',
              margin: 0,
            }}
          >
            QuickBooks — {E.name}
          </h2>
          {qbConnected && (
            <span
              style={{
                fontSize: 10,
                fontFamily: 'IBM Plex Mono, monospace',
                letterSpacing: '0.08em',
                color: 'var(--green)',
                background: 'rgba(16,185,129,0.1)',
                border: '1px solid rgba(16,185,129,0.25)',
                borderRadius: 6,
                padding: '3px 8px',
                textTransform: 'uppercase',
              }}
            >
              Connected
            </span>
          )}
        </div>
        {qbConnected ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {qbPL ? (
              <SpecCard
                accent
                dataSource={`quickbooks:ProfitAndLoss:${slug}`}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontFamily: 'IBM Plex Mono, monospace',
                    color: 'var(--dim)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginBottom: 4,
                  }}
                >
                  P&amp;L · {qbPL.periodLabel}
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 12,
                    marginTop: 8,
                  }}
                >
                  {([
                    ['Income', qbPL.totalIncome, 'var(--green)'],
                    ['Expenses', qbPL.totalExpenses, 'var(--red)'],
                    [
                      'Net',
                      qbPL.netIncome,
                      qbPL.netIncome >= 0 ? 'var(--green)' : 'var(--red)',
                    ],
                  ] as [string, number, string][]).map(([label, val, color]) => (
                    <div
                      key={label}
                      style={{
                        padding: '12px 14px',
                        background: 'rgba(255,255,255,0.02)',
                        borderRadius: 12,
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          color: 'var(--dim)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          marginBottom: 6,
                        }}
                      >
                        {label}
                      </div>
                      <div
                        style={{
                          fontSize: 22,
                          fontWeight: 700,
                          fontFamily: 'IBM Plex Mono, monospace',
                          color,
                        }}
                      >
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                          maximumFractionDigits: 0,
                        }).format(val)}
                      </div>
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: 'var(--dim)',
                    marginTop: 10,
                  }}
                >
                  Pulled live from QuickBooks Online · {qbPL.currency} · cached 60s
                </div>
              </SpecCard>
            ) : (
              <SpecCard
                accent
                dataSource={`quickbooks:ProfitAndLoss:${slug}:empty`}
              >
                <div style={{ fontSize: 12, color: 'var(--dim)' }}>
                  Profit &amp; Loss data not yet available for this entity's
                  QuickBooks realm.
                </div>
              </SpecCard>
            )}
            {qbBS ? (
              <SpecCard
                accent
                dataSource={`quickbooks:BalanceSheet:${slug}`}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontFamily: 'IBM Plex Mono, monospace',
                    color: 'var(--dim)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginBottom: 4,
                  }}
                >
                  Balance Sheet · as of {qbBS.asOf}
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 12,
                    marginTop: 8,
                  }}
                >
                  {([
                    ['Total Assets', qbBS.totalAssets, 'var(--green)'],
                    ['Total Liabilities', qbBS.totalLiabilities, 'var(--red)'],
                    ['Total Equity', qbBS.totalEquity, 'var(--orange)'],
                  ] as [string, number, string][]).map(([label, val, color]) => (
                    <div
                      key={label}
                      style={{
                        padding: '14px 16px',
                        background: 'rgba(255,255,255,0.02)',
                        borderRadius: 12,
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          color: 'var(--dim)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          marginBottom: 6,
                        }}
                      >
                        {label}
                      </div>
                      <div
                        style={{
                          fontSize: 22,
                          fontWeight: 700,
                          fontFamily: 'IBM Plex Mono, monospace',
                          color,
                        }}
                      >
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                          maximumFractionDigits: 0,
                        }).format(val)}
                      </div>
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: 'var(--dim)',
                    marginTop: 10,
                  }}
                >
                  Pulled live from QuickBooks Online · {qbBS.currency} · cached 60s
                </div>
              </SpecCard>
            ) : (
              <SpecCard
                accent
                dataSource={`quickbooks:BalanceSheet:${slug}:empty`}
              >
                <div style={{ fontSize: 12, color: 'var(--dim)' }}>
                  Balance Sheet data not yet available for this entity's
                  QuickBooks realm.
                </div>
              </SpecCard>
            )}
          </div>
        ) : (
          <ComingSoon
            title={`QuickBooks · ${E.name}`}
            reason={`Connect this entity's QuickBooks company to pull live P&L and Balance Sheet data into Mission Control. Each entity keeps its own token row in quickbooks_connections.`}
            icon="📊"
            skeleton="kpi"
            dataSource={`coming-soon:quickbooks:${slug}`}
          />
        )}
        {!qbConnected && (
          <div style={{ marginTop: 12 }}>
            <a
              href={`/api/qb/connect?entity=${encodeURIComponent(
                slug,
              )}&returnTo=${encodeURIComponent(`/companies/${slug}`)}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 700,
                padding: '8px 14px',
                borderRadius: 8,
                background: '#2ca01c',
                color: '#fff',
                textDecoration: 'none',
                border: '1px solid rgba(44,160,28,0.5)',
              }}
            >
              Connect QuickBooks for {E.name}
            </a>
          </div>
        )}
      </div>

      {/* ── Ownership tab ───────────────────────────────────── */}
      {entity?.id && (
        <div
          data-tab="ownership"
          style={{
            width: '86%',
            margin: '0 auto',
            paddingBottom: 40,
            fontFamily: 'DM Sans, sans-serif',
          }}
        >
          {/* ⚙ Edit button in top-right of the section */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'rgba(255,255,255,0.9)', margin: 0 }}>
              Ownership Structure
            </h2>
            <SlugEditButton entityId={entity.id} entityName={entity.entity_name ?? slug} />
          </div>
          <OwnershipCard
            entityId={entity.id}
            entityName={entity.entity_name ?? slug}
            entityType={entity.entity_type ?? null}
          />
        </div>
      )}
    </>
  )
}
