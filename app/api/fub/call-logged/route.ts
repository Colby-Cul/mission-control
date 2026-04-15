/**
 * POST /api/fub/call-logged
 *
 * FUB webhook receiver. Fires when a call is logged in FUB. Writes a row to
 * Supabase `activity_log` so the unified /activity feed can display it with
 * the "📞 FUB Call" pill, and optionally triggers a follow-up task (e.g. if
 * outcome === 'No Answer').
 *
 * Webhook registration:
 *   POST https://api.followupboss.com/v1/webhooks
 *   body: { event: 'peopleCreated' | 'callsCreated' | ..., url: '<this>' }
 *   auth: HTTP Basic with FUB_API_KEY
 *
 * Verification:
 *   FUB doesn't sign payloads by default, so we compare a shared secret
 *   passed via the `X-FUB-Webhook-Secret` header against FUB_WEBHOOK_SECRET
 *   env var. If FUB_WEBHOOK_SECRET is unset we accept any request (dev
 *   mode) but log a warning.
 *
 * Response:
 *   200  { ok: true, wrote: <rows>, taskId?: <id> }
 *   401  { ok: false, error: 'invalid_secret' }
 *   500  { ok: false, error: <message> }
 *
 * TODO (agent wiring): when an OpenClaw agent is subscribed to this topic,
 * emit an internal event on a queue (Supabase Realtime channel) so the agent
 * can react to e.g. missed calls in < 60 seconds.
 */
import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'
import { createFubTask } from '../../../lib/fub'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface FubWebhookBody {
  event?: string            // e.g. 'callsCreated'
  eventId?: string | number
  resourceIds?: number[]
  uri?: string
  // FUB also inlines the resource payload on some events:
  calls?: Array<{
    id: number
    personId?: number
    userId?: number
    userName?: string
    duration?: number
    outcome?: string
    isIncoming?: boolean
    note?: string | null
    startedAt?: string
    created?: string
  }>
}

function verifySecret(req: Request): boolean {
  const required = process.env.FUB_WEBHOOK_SECRET
  if (!required) return true  // dev mode
  const got = req.headers.get('x-fub-webhook-secret') ?? ''
  return got === required
}

export async function POST(req: Request) {
  if (!verifySecret(req)) {
    return NextResponse.json({ ok: false, error: 'invalid_secret' }, { status: 401 })
  }

  let body: FubWebhookBody
  try {
    body = (await req.json()) as FubWebhookBody
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const calls = body.calls ?? []

  // Write an activity_log row per call. activity_log is best-effort — if the
  // table doesn't exist yet we still return ok so FUB doesn't retry-storm.
  let wrote = 0
  let createdTaskId: number | undefined

  for (const c of calls) {
    try {
      const { error } = await supabase.from('activity_log').insert({
        event_type: 'fub_call',
        actor: c.userName || String(c.userId ?? 'system'),
        description: `${c.isIncoming ? 'Incoming' : 'Outgoing'} call · ${c.outcome ?? 'logged'}${
          c.duration ? ` · ${c.duration}s` : ''
        }`,
        metadata: {
          fub_call_id: c.id,
          fub_person_id: c.personId,
          fub_user_id: c.userId,
          duration: c.duration,
          outcome: c.outcome,
          isIncoming: c.isIncoming,
          startedAt: c.startedAt,
        },
        source: 'fub',
        created_at: c.startedAt || c.created || new Date().toISOString(),
      })
      if (!error) wrote++
    } catch {
      // swallow — we never fail the webhook on logging errors
    }

    // Auto-task on missed outgoing call
    if (!c.isIncoming && c.outcome && /no answer|voicemail|busy/i.test(c.outcome) && c.personId) {
      const t = await createFubTask({
        personId: c.personId,
        name: `Follow up: ${c.outcome} (Mission Control auto-task)`,
        type: 'Follow Up',
        dueDate: new Date(Date.now() + 24 * 3600_000).toISOString(),
      })
      if (t.data?.id && !createdTaskId) createdTaskId = t.data.id
    }
  }

  return NextResponse.json(
    { ok: true, wrote, event: body.event, taskId: createdTaskId },
    { status: 200 }
  )
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    method: 'POST',
    purpose: 'FUB callsCreated webhook receiver',
    setup:
      'Register at POST https://api.followupboss.com/v1/webhooks with event=callsCreated and url=<this>',
  })
}
