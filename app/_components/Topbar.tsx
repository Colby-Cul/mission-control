import { getUserProfile } from '../lib/queries'
import TopbarClient from './TopbarClient'

/**
 * Topbar — 52px, rgba(8,8,24,0.7) + blur(20px).
 * Reads user profile from Supabase server-side, passes to client shell.
 * Server component wrapper.
 */
export default async function Topbar({ currentPage }: { currentPage: string }) {
  let profile: { full_name?: string | null; level?: number | null; xp?: number | null; xp_next?: number | null } | null = null
  try {
    profile = await getUserProfile()
  } catch {
    // Not authenticated or no profile yet — render with defaults
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : 'C'

  // Single source of truth for LVL/XP — every page reads these same values
  // via the Topbar. No more LVL 7/8/12/37/1 drift across pages.
  const level  = profile?.level   ?? 1
  const xp     = profile?.xp      ?? 0
  const xpNext = profile?.xp_next ?? 1000

  return (
    <TopbarClient
      currentPage={currentPage}
      initials={initials}
      level={level}
      xp={xp}
      xpNext={xpNext}
    />
  )
}
