/**
 * POST or DELETE /api/qb/disconnect?entity=<slug>
 *
 * Removes a single entity's QuickBooks connection row. Does NOT revoke the
 * grant on Intuit's side — user can revoke from
 * https://appcenter.intuit.com/app/connection/.
 *
 * The entity slug can be passed via query string or JSON body:
 *   POST /api/qb/disconnect?entity=xome-home
 *   DELETE /api/qb/disconnect  with body {"entity":"xome-home"}
 *
 * Responds:
 *   - 303 redirect to /integrations?disconnected=quickbooks&entity=<slug>
 *     when called via a browser form (POST)
 *   - 204 no-content when called with DELETE (API clients / fetch)
 *   - 400 when no entity slug is provided
 */
import { NextRequest, NextResponse } from 'next/server'
import {
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

async function entityFromRequest(req: NextRequest): Promise<string | null> {
  const q = req.nextUrl.searchParams.get('entity')
  if (q && q.trim()) return q.trim()
  try {
    const ct = req.headers.get('content-type') ?? ''
    if (ct.includes('application/json')) {
      const body = await req.json().catch(() => null)
      if (body && typeof body.entity === 'string' && body.entity.trim()) {
        return body.entity.trim()
      }
    } else if (ct.includes('application/x-www-form-urlencoded') || ct.includes('multipart/form-data')) {
      const form = await req.formData().catch(() => null)
      const val = form?.get('entity')
      if (typeof val === 'string' && val.trim()) return val.trim()
    }
  } catch {
    // swallow — returns null below
  }
  return null
}

async function doDisconnect(entity: string): Promise<void> {
  try {
    await deleteQbConnection(entity)
    await logQbEvent({ kind: 'disconnect', status: 'ok', detail: { entity } })
  } catch (e) {
    await logQbEvent({ kind: 'disconnect', status: 'error', detail: String(e) })
  }
}

export async function POST(req: NextRequest) {
  const origin = appOrigin(req)
  const entity = await entityFromRequest(req)
  if (!entity) {
    return NextResponse.redirect(
      `${origin}/integrations?highlight=quickbooks&error=entity-required`,
      303,
    )
  }
  await doDisconnect(entity)
  const dest = new URL('/integrations', origin)
  dest.searchParams.set('disconnected', 'quickbooks')
  dest.searchParams.set('entity', entity)
  return NextResponse.redirect(dest.toString(), 303)
}

export async function DELETE(req: NextRequest) {
  const entity = await entityFromRequest(req)
  if (!entity) {
    return NextResponse.json({ ok: false, error: 'entity-required' }, { status: 400 })
  }
  await doDisconnect(entity)
  return new NextResponse(null, { status: 204 })
}
