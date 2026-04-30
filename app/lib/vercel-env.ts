/**
 * Vercel env var management.
 *
 * Reads the project ID from .vercel/project.json (cached at module load).
 * Requires VERCEL_API_TOKEN to be set in the environment (create at
 * https://vercel.com/account/tokens, scoped to the cabo-tropic-horizons team).
 *
 * Server-only — never import from a client component.
 */

type VercelTarget = 'production' | 'preview' | 'development'

export interface VercelEnvUpdate {
  key: string
  value: string
  target: VercelTarget[]
}

export interface VercelEnvResult {
  success: boolean
  error?: string
}

export interface VercelRedeployResult {
  success: boolean
  url?: string
  error?: string
}

export interface VercelEnvMasked {
  masked: string
  updated_at: string | null
  targets: string[]
}

// ── Project metadata (read once, cached) ─────────────────────────────────────
let cachedProjectId: string | null = null
let cachedTeamId: string | null = null

function loadProjectJson(): { projectId: string; orgId: string } | null {
  if (cachedProjectId) {
    return { projectId: cachedProjectId, orgId: cachedTeamId ?? '' }
  }
  try {
    // Read synchronously at cold start. We intentionally require() via a
    // Node built-in so this file remains a pure server module.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs') as typeof import('fs')
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path') as typeof import('path')
    const p = path.join(process.cwd(), '.vercel', 'project.json')
    if (!fs.existsSync(p)) return null
    const raw = fs.readFileSync(p, 'utf8')
    const json = JSON.parse(raw) as { projectId: string; orgId: string }
    cachedProjectId = json.projectId
    cachedTeamId = json.orgId
    return { projectId: json.projectId, orgId: json.orgId }
  } catch (e) {
    console.error('[vercel-env] failed to read .vercel/project.json', e)
    return null
  }
}

function getProjectMeta(): { projectId: string; teamQuery: string } | null {
  // Allow env overrides (for serverless, where .vercel/ may not be packaged).
  const envProject = process.env.VERCEL_PROJECT_ID
  const envTeam = process.env.VERCEL_TEAM_ID
  if (envProject) {
    const teamQuery = envTeam ? `?teamId=${encodeURIComponent(envTeam)}` : ''
    return { projectId: envProject, teamQuery }
  }
  const j = loadProjectJson()
  if (!j) return null
  const teamQuery = j.orgId ? `?teamId=${encodeURIComponent(j.orgId)}` : ''
  return { projectId: j.projectId, teamQuery }
}

export function isVercelApiConfigured(): boolean {
  return !!process.env.VERCEL_API_TOKEN && !!getProjectMeta()
}

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
    'Content-Type': 'application/json',
  }
}

// ── Env list (read) ──────────────────────────────────────────────────────────
interface VercelEnvEntry {
  id: string
  key: string
  value?: string
  target: string[]
  type: string
  updatedAt?: number
  createdAt?: number
}

async function listEnv(): Promise<VercelEnvEntry[]> {
  if (!process.env.VERCEL_API_TOKEN) return []
  const meta = getProjectMeta()
  if (!meta) return []
  const url = `https://api.vercel.com/v10/projects/${meta.projectId}/env${meta.teamQuery}`
  const res = await fetch(url, {
    method: 'GET',
    headers: authHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) {
    console.error('[vercel-env] listEnv failed', res.status, await res.text().catch(() => ''))
    return []
  }
  const data = (await res.json()) as { envs?: VercelEnvEntry[] }
  return data.envs ?? []
}

/**
 * Return masked values + metadata for the given env keys.
 * For each key we expose only a masked string (last 4 chars) — the Vercel API
 * does not return the decrypted secret value from the list endpoint anyway.
 * Missing keys are omitted from the result map.
 */
export async function getEnvMaskedValues(
  keys: string[],
): Promise<Record<string, VercelEnvMasked>> {
  const result: Record<string, VercelEnvMasked> = {}
  if (keys.length === 0) return result
  if (!isVercelApiConfigured()) return result

  const envs = await listEnv()
  const wantedSet = new Set(keys)

  // Vercel may return multiple entries per key (one per target) — coalesce.
  const byKey = new Map<string, VercelEnvEntry[]>()
  for (const e of envs) {
    if (!wantedSet.has(e.key)) continue
    const arr = byKey.get(e.key) ?? []
    arr.push(e)
    byKey.set(e.key, arr)
  }

  for (const [key, entries] of byKey.entries()) {
    // Prefer the production entry for the masked preview.
    const sorted = [...entries].sort((a, b) => {
      const ap = a.target.includes('production') ? 0 : 1
      const bp = b.target.includes('production') ? 0 : 1
      return ap - bp
    })
    const primary = sorted[0]
    const raw = primary.value ?? ''
    const masked = raw ? `···${raw.slice(-4)}` : 'encrypted'
    const updatedAt = primary.updatedAt
      ? new Date(primary.updatedAt).toISOString()
      : primary.createdAt
      ? new Date(primary.createdAt).toISOString()
      : null
    // Union of targets across all entries
    const targets = Array.from(new Set(entries.flatMap((e) => e.target)))
    result[key] = { masked, updated_at: updatedAt, targets }
  }
  return result
}

// ── Env write (create or update) ─────────────────────────────────────────────
/**
 * Upsert an env var. If a key with the same target set already exists, the
 * existing entries are deleted first, then recreated with the new value —
 * Vercel's PATCH endpoint is per-id and fussy about target arrays.
 */
export async function updateVercelEnv(
  update: VercelEnvUpdate,
): Promise<VercelEnvResult> {
  if (!process.env.VERCEL_API_TOKEN) {
    return { success: false, error: 'VERCEL_API_TOKEN not configured' }
  }
  const meta = getProjectMeta()
  if (!meta) {
    return { success: false, error: 'Vercel project metadata missing' }
  }
  try {
    // 1. Find existing entries with this key — if any overlap the target set, delete them.
    const existing = await listEnv()
    const conflicts = existing.filter(
      (e) => e.key === update.key && e.target.some((t) => update.target.includes(t as VercelTarget)),
    )
    for (const c of conflicts) {
      const delUrl = `https://api.vercel.com/v10/projects/${meta.projectId}/env/${c.id}${meta.teamQuery}`
      const delRes = await fetch(delUrl, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (!delRes.ok && delRes.status !== 404) {
        const txt = await delRes.text().catch(() => '')
        return { success: false, error: `delete ${c.id} failed: ${delRes.status} ${txt}` }
      }
    }

    // 2. Create the new encrypted entry.
    const createUrl = `https://api.vercel.com/v10/projects/${meta.projectId}/env${meta.teamQuery}`
    const createRes = await fetch(createUrl, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        key: update.key,
        value: update.value,
        target: update.target,
        type: 'encrypted',
      }),
    })
    if (!createRes.ok) {
      const txt = await createRes.text().catch(() => '')
      return { success: false, error: `create failed: ${createRes.status} ${txt}` }
    }
    return { success: true }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/**
 * Remove every Vercel env entry matching the given key (all targets).
 */
export async function deleteVercelEnv(key: string): Promise<VercelEnvResult> {
  if (!process.env.VERCEL_API_TOKEN) {
    return { success: false, error: 'VERCEL_API_TOKEN not configured' }
  }
  const meta = getProjectMeta()
  if (!meta) {
    return { success: false, error: 'Vercel project metadata missing' }
  }
  try {
    const existing = await listEnv()
    const hits = existing.filter((e) => e.key === key)
    for (const c of hits) {
      const delUrl = `https://api.vercel.com/v10/projects/${meta.projectId}/env/${c.id}${meta.teamQuery}`
      const delRes = await fetch(delUrl, { method: 'DELETE', headers: authHeaders() })
      if (!delRes.ok && delRes.status !== 404) {
        const txt = await delRes.text().catch(() => '')
        return { success: false, error: `delete ${c.id} failed: ${delRes.status} ${txt}` }
      }
    }
    return { success: true }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

// ── Redeploy ─────────────────────────────────────────────────────────────────
/**
 * Trigger a new Vercel deployment from the currently connected git branch.
 * Uses the v13 deployments endpoint with gitSource pointing at the project's
 * linked repo. Returns the new deployment URL on success.
 */
export async function triggerRedeploy(): Promise<VercelRedeployResult> {
  if (!process.env.VERCEL_API_TOKEN) {
    return { success: false, error: 'VERCEL_API_TOKEN not configured' }
  }
  const meta = getProjectMeta()
  if (!meta) return { success: false, error: 'Vercel project metadata missing' }

  try {
    // Fetch project to discover the linked git repo + default branch.
    const projUrl = `https://api.vercel.com/v9/projects/${meta.projectId}${meta.teamQuery}`
    const projRes = await fetch(projUrl, { headers: authHeaders(), cache: 'no-store' })
    if (!projRes.ok) {
      return { success: false, error: `project fetch failed: ${projRes.status}` }
    }
    const proj = (await projRes.json()) as {
      name: string
      link?: {
        type?: string
        repo?: string
        repoId?: number
        org?: string
        productionBranch?: string
      }
    }

    const deployUrl = `https://api.vercel.com/v13/deployments${meta.teamQuery}`
    const body: Record<string, unknown> = {
      name: proj.name,
      target: 'production',
    }

    // If git source is linked we can cut a new deployment from the latest commit.
    if (proj.link?.type === 'github' && proj.link.repoId) {
      body.gitSource = {
        type: 'github',
        repoId: proj.link.repoId,
        ref: proj.link.productionBranch ?? 'redesign/v7',
      }
    }

    const res = await fetch(deployUrl, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      return { success: false, error: `deploy create failed: ${res.status} ${txt}` }
    }
    const data = (await res.json()) as { url?: string; id?: string }
    const url = data.url ? `https://${data.url}` : undefined
    return { success: true, url }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}
