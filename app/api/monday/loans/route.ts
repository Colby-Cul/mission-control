/**
 * GET /api/monday/loans   (legacy — kept for backward compatibility)
 *
 * Proxies to the multi-tenant Monday adapter (`app/lib/monday-adapter.ts`).
 * New widgets should call `getMondayData('xome.*')` directly in server
 * components instead of hitting this route.
 *
 * Query params:
 *   type = "pipeline" | "kpis" | "officers" | "closed" | "compliance" | "warehouse" | "power"
 */

import { NextResponse } from 'next/server'
import { getMondayData, type WidgetKey } from '../../../lib/monday-adapter'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const TYPE_TO_WIDGET: Record<string, WidgetKey> = {
  pipeline: 'xome.loan_pipeline',
  kpis: 'xome.loan_volume_kpis',
  officers: 'xome.loan_officer_roster',
  closed: 'xome.recent_closed_loans',
  compliance: 'xome.compliance',
  warehouse: 'xome.warehouse_reconciliation',
  power: 'xome.power',
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') ?? 'kpis'
  const widgetKey = TYPE_TO_WIDGET[type]

  if (!widgetKey) {
    return NextResponse.json(
      { error: `Unknown type: ${type}`, data: null },
      { status: 200 }
    )
  }

  const { data, error, cached } = await getMondayData(widgetKey)
  return NextResponse.json({ data, error, cached, widgetKey }, { status: 200 })
}
