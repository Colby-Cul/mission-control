/**
 * GET /api/monday/loans
 *
 * Returns Xome Home loan data from Monday.com.
 * Requires env var: MONDAY_API_KEY
 *
 * Query params:
 *   type = "pipeline" | "kpis" | "officers"  (default: "kpis")
 */

import { NextResponse } from 'next/server'
import {
  getXomeLoanOfficers,
  getXomeLoanPipeline,
  getXomeLoanVolumeKPIs,
} from '../../../lib/monday'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  if (!process.env.MONDAY_API_KEY) {
    return NextResponse.json(
      { error: 'MONDAY_API_KEY not configured', data: null },
      { status: 200 }   // 200 so the page can render ComingSoon gracefully
    )
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') ?? 'kpis'

  try {
    switch (type) {
      case 'pipeline': {
        const data = await getXomeLoanPipeline()
        return NextResponse.json({ data })
      }
      case 'officers': {
        const data = await getXomeLoanOfficers()
        return NextResponse.json({ data })
      }
      case 'kpis':
      default: {
        const data = await getXomeLoanVolumeKPIs()
        return NextResponse.json({ data })
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[monday/loans]', message)
    return NextResponse.json({ error: message, data: null }, { status: 200 })
  }
}
