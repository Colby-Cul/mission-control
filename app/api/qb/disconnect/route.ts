/**
 * POST or DELETE /api/qb/disconnect
 *
 * Removes the current company's QuickBooks connection row. Does NOT revoke
 * the grant on Intuit's side — user can revoke from
 * https://appcenter.intuit.com/app/connection/.
 *
 * Responds:
 *   - 303 redirect to /integrations?disconnected=quickbooks when called via
 *     a browser form (POST)
 *   - 204 no-content when called with DELETE (API clients / fetch)
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  currentCompanyKey,
  deleteQbConnection,
  logQbEvent,
} from '../../../lib/quickbooks'

export const dynamic = 'force-dynamic'

function appOrigin(req: NextRequest): string {
  if (process.env.QUICKBOOKS_REDIRECT_URI) {
    try {
      return new URL(process.env.QUICKBOOKS_REDIRECT_URI).origin
    } catch {}
  }
  return new URL(req.url).origin
}

async function doDisconnect(): Promise<void> {
  try {
    await deleteQbConnection(currentCompanyKey())
    await logQbEvent({ kind: 'disconnect', status: 'ok' })
  } catch (e) {
    await logQbEvent({ kind: 'disconnect', status: 'error', detail: String(e) })
  }
}

export async function POST(req: NextRequest) {
  await doDisconnect()
  const origin = appOrigin(req)
  return NextResponse.redirect(`${origin}/integrations?disconnected=quickbooks`, 303)
}

export async function DELETE() {
  await doDisconnect()
  return new NextResponse(null, { status: 204 })
}
