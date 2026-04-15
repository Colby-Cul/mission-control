/**
 * monday.ts — Monday.com data layer for Xome Home Loans
 *
 * PRIMARY BOARD (loan pipeline):
 *   Board ID : 1931297970  ("XOME Daddy Home Loans - Active Deal Pipeline")
 *   Workspace: 1066095     ("Xome Home Loans Mortgage - Roseville Branch")
 *
 * SECONDARY BOARD (pending deals):
 *   Board ID : 8955312250  ("Xome & C&G Pending Deals")
 *
 * KEY COLUMN IDs (board 1931297970):
 *   name                      = Deal name / borrower
 *   multiple_person_mkq99spt  = LO Name (people)
 *   person                    = LO Name (alt people col)
 *   status                    = Deal Status (see label map below)
 *   status_1                  = Purchase or Refi
 *   loan_type                 = Loan Type (FHA / VA / Conv. / Non-QM)
 *   numbers                   = Est. Loan Amount ($)
 *   numbers5                  = Actual Closed Loan Amount ($)
 *   date                      = Expected Close Date
 *   date9                     = Actual Close Date
 *   date1                     = Deal creation date
 *   numbers00                 = LO Commission %
 *   numbers60                 = LO Comp ($)
 *   numbers59                 = Xome Revenue ($)
 *   formula                   = Deal length (days)
 *   numbers0                  = Close Probability (%)
 *
 * DEAL STATUS LABELS (key IDs):
 *   10  = APPLICATION_INTAKE   (Lead/App stage)
 *   12  = Qualification
 *    6  = Pre_Approved
 *    5  = Disclosed
 *   15  = Loan_Setup
 *    1  = Submitted_to_UW
 *    0  = Approved_w/_Conditions
 *    7  = Clear_to_Close
 *   14  = Docs_Out
 *   11  = Docs_Signed
 *    3  = Loan_Finalized (DONE)
 *   13  = Loan_Funded
 *   16  = Broker_Check_Received
 *    4  = Suspended
 *    8  = Adverse
 *    9  = Nurture Lead
 *    2  = Re-Submittal
 *
 * PIPELINE STAGE GROUPS (board groups):
 *   duplicate_of_pre___approved_mkkzqdp = Leads
 *   topics        = Pre-Approved
 *   closed        = In-Contract
 *   new_group36956 = Closing
 *   new_group5903  = Funded
 *   new_group71893 = Long Term Nurture
 *   new_group86833 = Dead File
 *   new_group65884 = Lost to Competition
 *
 * CONFIGURE (set env vars in Vercel):
 *   MONDAY_API_KEY — API v2 token (from monday.com profile → developers → API token)
 */

// ─── Types ─────────────────────────────────────────────────────────────────

export interface LoanOfficer {
  id: string
  name: string
  loan_count: number
  volume_mtd: number
  volume_ytd: number
  status: 'active' | 'inactive'
}

export interface LoanDeal {
  loan_id: string
  borrower: string   // redacted display name, e.g. "J. Smith"
  amount: number
  stage: string
  group: string
  officer: string
  expected_close_date: string | null
  actual_close_date: string | null
  loan_type: string
  purchase_or_refi: string
  days_in_pipeline: number | null
}

export interface LoanVolumeKPIs {
  volume_mtd: number
  volume_ytd: number
  loans_closed_mtd: number
  avg_loan_size: number
  avg_days_to_close: number | null
  pipeline_value: number
  pipeline_count: number
  conversion_rate: number | null  // funded / total
  pull_through_rate: number | null
}

// ─── Internal fetch helper ──────────────────────────────────────────────────

async function mondayFetch<T = unknown>(
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T> {
  const apiKey = process.env.MONDAY_API_KEY
  if (!apiKey) throw new Error('MONDAY_API_KEY not configured')

  const res = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey,
      'API-Version': '2024-01',
    },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  })

  if (!res.ok) throw new Error(`Monday API HTTP ${res.status}`)
  const json = await res.json() as { data?: T; errors?: unknown[] }
  if (json.errors?.length) throw new Error(`Monday API error: ${JSON.stringify(json.errors)}`)
  return json.data as T
}

// ─── Board list ─────────────────────────────────────────────────────────────

export async function getMondayBoards(): Promise<{ id: string; name: string; workspace: string }[]> {
  const data = await mondayFetch<{ boards: Array<{ id: string; name: string; workspace: { name: string } }> }>(
    `{ boards(workspace_ids: [1066095], limit: 50) { id name workspace { name } } }`
  )
  return (data.boards ?? []).map(b => ({ id: b.id, name: b.name, workspace: b.workspace?.name ?? '' }))
}

// ─── Loan Officers ──────────────────────────────────────────────────────────

export async function getXomeLoanOfficers(): Promise<LoanOfficer[]> {
  // Aggregates from deal pipeline board grouped by LO Name
  const data = await mondayFetch<{
    boards: Array<{
      items_page: {
        items: Array<{
          id: string
          name: string
          column_values: Array<{ id: string; text: string; value: string }>
        }>
      }
    }>
  }>(`
    query {
      boards(ids: [1931297970]) {
        items_page(limit: 500) {
          items {
            id name
            column_values(ids: ["multiple_person_mkq99spt","numbers5","date9","date1","status"]) {
              id text value
            }
          }
        }
      }
    }
  `)

  const items = data.boards?.[0]?.items_page?.items ?? []
  const now = new Date()
  const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const ytdStart = new Date(now.getFullYear(), 0, 1)

  const officerMap = new Map<string, { loan_count: number; volume_mtd: number; volume_ytd: number }>()

  for (const item of items) {
    const cv = (id: string) => item.column_values.find(c => c.id === id)
    const loName = cv('multiple_person_mkq99spt')?.text?.trim() || 'Unknown'
    const closed = Number(cv('numbers5')?.text?.replace(/[^0-9.-]/g, '') || 0)
    const closeDateStr = cv('date9')?.text

    if (!officerMap.has(loName)) officerMap.set(loName, { loan_count: 0, volume_mtd: 0, volume_ytd: 0 })
    const rec = officerMap.get(loName)!
    rec.loan_count++

    if (closed > 0 && closeDateStr) {
      const closeDate = new Date(closeDateStr)
      if (closeDate >= ytdStart) rec.volume_ytd += closed
      if (closeDate >= mtdStart) rec.volume_mtd += closed
    }
  }

  return Array.from(officerMap.entries())
    .filter(([name]) => name !== 'Unknown')
    .map(([name, stats], i) => ({
      id: `lo-${i}`,
      name,
      ...stats,
      status: 'active' as const,
    }))
    .sort((a, b) => b.volume_ytd - a.volume_ytd)
}

// ─── Loan Pipeline ──────────────────────────────────────────────────────────

export async function getXomeLoanPipeline(): Promise<LoanDeal[]> {
  const data = await mondayFetch<{
    boards: Array<{
      groups: Array<{
        id: string
        title: string
        items_page: {
          items: Array<{
            id: string
            name: string
            column_values: Array<{ id: string; text: string }>
          }>
        }
      }>
    }>
  }>(`
    query {
      boards(ids: [1931297970]) {
        groups {
          id title
          items_page(limit: 200) {
            items {
              id name
              column_values(ids: ["multiple_person_mkq99spt","numbers","numbers5","status","status_1","loan_type","date","date9","formula"]) {
                id text
              }
            }
          }
        }
      }
    }
  `)

  const groups = data.boards?.[0]?.groups ?? []
  const deals: LoanDeal[] = []

  for (const group of groups) {
    for (const item of group.items_page?.items ?? []) {
      const cv = (id: string) => item.column_values.find(c => c.id === id)?.text ?? ''

      // Redact borrower: keep first initial + last name
      const nameParts = item.name.trim().split(/\s+/)
      const redacted = nameParts.length >= 2
        ? `${nameParts[0][0]}. ${nameParts[nameParts.length - 1]}`
        : nameParts[0]?.[0] ? `${nameParts[0][0]}.` : '—'

      deals.push({
        loan_id: item.id,
        borrower: redacted,
        amount: Number(cv('numbers').replace(/[^0-9.-]/g, '') || 0),
        stage: cv('status') || group.title,
        group: group.title,
        officer: cv('multiple_person_mkq99spt') || '—',
        expected_close_date: cv('date') || null,
        actual_close_date: cv('date9') || null,
        loan_type: cv('loan_type') || '—',
        purchase_or_refi: cv('status_1') || '—',
        days_in_pipeline: Number(cv('formula') || 0) || null,
      })
    }
  }

  return deals
}

// ─── Volume KPIs ─────────────────────────────────────────────────────────────

export async function getXomeLoanVolumeKPIs(): Promise<LoanVolumeKPIs> {
  const deals = await getXomeLoanPipeline()

  const now = new Date()
  const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const ytdStart = new Date(now.getFullYear(), 0, 1)

  // Funded/closed deals (groups: Funded, and status labels 3=Loan_Finalized / 13=Loan_Funded)
  const fundedGroups = new Set(['new_group5903', 'Funded'])
  const fundedStatuses = new Set(['Loan_Finalized', 'Loan_Funded', 'LOAN_FUNDED'])

  const closedDeals = deals.filter(d =>
    fundedGroups.has(d.group) || fundedStatuses.has(d.stage)
  )

  let volume_mtd = 0
  let volume_ytd = 0
  let loans_closed_mtd = 0
  const closeTimes: number[] = []

  for (const d of closedDeals) {
    const closeDate = d.actual_close_date ? new Date(d.actual_close_date) : null

    if (closeDate && closeDate >= ytdStart) {
      volume_ytd += d.amount
      if (closeDate >= mtdStart) {
        volume_mtd += d.amount
        loans_closed_mtd++
      }
    }

    if (d.days_in_pipeline && d.days_in_pipeline > 0) {
      closeTimes.push(d.days_in_pipeline)
    }
  }

  // Active pipeline (not dead/lost/funded)
  const deadGroups = new Set(['Dead File', 'Lost to Competition', 'Long Term Nurture', 'Funded'])
  const activeDeals = deals.filter(d => !deadGroups.has(d.group))
  const pipeline_value = activeDeals.reduce((s, d) => s + d.amount, 0)

  const avg_loan_size = closedDeals.length > 0
    ? closedDeals.reduce((s, d) => s + d.amount, 0) / closedDeals.length
    : 0

  const avg_days_to_close = closeTimes.length > 0
    ? Math.round(closeTimes.reduce((a, b) => a + b, 0) / closeTimes.length)
    : null

  const totalDeals = deals.filter(d => !new Set(['Long Term Nurture', 'Dead File', 'Lost to Competition']).has(d.group))
  const conversion_rate = totalDeals.length > 0 ? closedDeals.length / totalDeals.length : null
  const pull_through_rate = conversion_rate

  return {
    volume_mtd,
    volume_ytd,
    loans_closed_mtd,
    avg_loan_size,
    avg_days_to_close,
    pipeline_value,
    pipeline_count: activeDeals.length,
    conversion_rate,
    pull_through_rate,
  }
}
