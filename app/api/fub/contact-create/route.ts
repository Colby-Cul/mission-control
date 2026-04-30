/**
 * POST /api/fub/contact-create
 *
 * Create a FUB person (lead) from Mission Control. Primary callers:
 *   - Agent auto-intake flows (OpenClaw agents converting chat → FUB lead)
 *   - Manual "Create Lead in FUB" button from the /companies/culbertson-gray UI
 *
 * Request body (application/json):
 *   {
 *     firstName: string,
 *     lastName:  string,
 *     email?:    string,
 *     phone?:    string,
 *     stage?:    string,       // defaults to 'Lead'
 *     source?:   string,       // e.g. 'Mission Control'
 *     tags?:     string[],
 *     assignedUserId?: number,
 *     missionControlId?: string   // echoed back to FUB as a custom field so
 *                                 // downstream webhook can correlate
 *   }
 *
 * Response:
 *   200  { ok: true, person: FubPerson }
 *   400  { ok: false, error: 'validation error' }
 *   502  { ok: false, error: 'FUB error <status>' }
 *
 * TODO (agent wiring): once OpenClaw agents have a lead-creation action, they
 * should call this route rather than hitting FUB directly so we get consistent
 * audit logging into Supabase activity_log.
 */
import { NextResponse } from 'next/server'
import { createFubPerson } from '../../../lib/fub'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface CreatePersonInput {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  stage?: string
  source?: string
  tags?: string[]
  assignedUserId?: number
  missionControlId?: string
}

export async function POST(req: Request) {
  let body: CreatePersonInput
  try {
    body = (await req.json()) as CreatePersonInput
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const firstName = (body.firstName ?? '').trim()
  const lastName = (body.lastName ?? '').trim()
  if (!firstName && !lastName) {
    return NextResponse.json(
      { ok: false, error: 'at_least_one_of_firstName_or_lastName_required' },
      { status: 400 }
    )
  }

  const emails = body.email ? [{ value: body.email, type: 'work' }] : undefined
  const phones = body.phone ? [{ value: body.phone, type: 'mobile' }] : undefined

  const r = await createFubPerson({
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    emails,
    phones,
    stage: body.stage ?? 'Lead',
    source: body.source ?? 'Mission Control',
    tags: body.tags,
    assignedUserId: body.assignedUserId,
    customMissionControlLeadId: body.missionControlId,
  })

  if (r.error || !r.data) {
    return NextResponse.json(
      { ok: false, error: r.error ?? 'fub_create_failed' },
      { status: 502 }
    )
  }

  // TODO (agent wiring): write an activity_log row here so the /activity
  // feed picks up MC-originated contact creations.

  return NextResponse.json({ ok: true, person: r.data }, { status: 200 })
}

export async function GET() {
  return NextResponse.json({ ok: true, method: 'POST', purpose: 'Create FUB person from MC' })
}
