/**
 * POST /api/fub/task-sync
 *
 * Bidirectional task sync endpoint between Mission Control and FUB.
 *
 * Direction: determined by `body.direction` ('mc_to_fub' | 'fub_to_mc').
 *
 *   mc_to_fub — push a MC task into FUB as a task on the referenced person.
 *   fub_to_mc — receive a FUB taskUpdated webhook payload and mirror status
 *               into Supabase `tasks` / `activity_log`.
 *
 * Request body (application/json):
 *   {
 *     direction: 'mc_to_fub' | 'fub_to_mc',
 *     task: {
 *       mcTaskId?: string,
 *       fubTaskId?: number,
 *       personId?:  number,      // FUB person id
 *       name:       string,
 *       type?:      string,
 *       dueDate?:   string,      // ISO
 *       assignedUserId?: number, // FUB user id
 *       isCompleted?:    boolean,
 *     }
 *   }
 *
 * Response:
 *   200 { ok: true, ... }
 *   400 { ok: false, error: 'validation error' }
 *   502 { ok: false, error: 'fub error' }
 *
 * TODO (agent wiring):
 *   - Persist a mapping row (mc_task_id ↔ fub_task_id) in a new
 *     `fub_task_sync` table so repeat syncs update rather than duplicate.
 *   - Hook an OpenClaw agent ("TaskReconciler") that runs hourly and
 *     reconciles MC ↔ FUB tasks that diverged.
 */
import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'
import { createFubTask } from '../../../lib/fub'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface TaskSyncBody {
  direction: 'mc_to_fub' | 'fub_to_mc'
  task: {
    mcTaskId?: string
    fubTaskId?: number
    personId?: number
    name: string
    type?: string
    dueDate?: string
    assignedUserId?: number
    isCompleted?: boolean
  }
}

export async function POST(req: Request) {
  let body: TaskSyncBody
  try {
    body = (await req.json()) as TaskSyncBody
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  if (!body.direction || !body.task?.name) {
    return NextResponse.json(
      { ok: false, error: 'direction_and_task.name_required' },
      { status: 400 }
    )
  }

  if (body.direction === 'mc_to_fub') {
    const r = await createFubTask({
      personId: body.task.personId,
      name: body.task.name,
      type: body.task.type,
      dueDate: body.task.dueDate,
      assignedUserId: body.task.assignedUserId,
      isCompleted: body.task.isCompleted,
    })
    if (r.error || !r.data) {
      return NextResponse.json({ ok: false, error: r.error ?? 'fub_create_failed' }, { status: 502 })
    }

    // Log the sync
    try {
      await supabase.from('activity_log').insert({
        event_type: 'fub_task_synced',
        actor: 'mission-control',
        description: `Pushed task "${body.task.name}" to FUB`,
        metadata: {
          mc_task_id: body.task.mcTaskId,
          fub_task_id: r.data.id,
          direction: 'mc_to_fub',
          personId: body.task.personId,
        },
        source: 'fub',
      })
    } catch {
      // non-fatal
    }

    return NextResponse.json({ ok: true, fubTaskId: r.data.id }, { status: 200 })
  }

  if (body.direction === 'fub_to_mc') {
    // Mirror FUB task state into MC. If a `tasks` row exists with matching
    // external_id, update its status; otherwise insert a new row.
    try {
      const upsert = {
        external_id: body.task.fubTaskId ? `fub:${body.task.fubTaskId}` : undefined,
        title: body.task.name,
        due_date: body.task.dueDate ?? null,
        status: body.task.isCompleted ? 'completed' : 'open',
        source: 'fub',
      }
      await supabase.from('tasks').upsert(upsert, { onConflict: 'external_id' })

      await supabase.from('activity_log').insert({
        event_type: 'fub_task_mirrored',
        actor: 'fub',
        description: `Mirrored FUB task "${body.task.name}" into MC`,
        metadata: {
          fub_task_id: body.task.fubTaskId,
          isCompleted: body.task.isCompleted,
          direction: 'fub_to_mc',
        },
        source: 'fub',
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return NextResponse.json({ ok: false, error: msg }, { status: 500 })
    }
    return NextResponse.json({ ok: true, direction: 'fub_to_mc' }, { status: 200 })
  }

  return NextResponse.json({ ok: false, error: 'unknown_direction' }, { status: 400 })
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    method: 'POST',
    purpose: 'Bidirectional FUB ↔ MC task sync',
    directions: ['mc_to_fub', 'fub_to_mc'],
  })
}
