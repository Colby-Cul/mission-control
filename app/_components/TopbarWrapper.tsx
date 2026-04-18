import { headers } from 'next/headers'
import Topbar from './Topbar'

/**
 * TopbarWrapper — reads the current URL path from request headers
 * to derive the active page label for the breadcrumb.
 * Server component.
 */
export default function TopbarWrapper() {
  let currentPage = 'Dashboard'
  try {
    const headersList = headers()
    const referer = headersList.get('x-pathname') ?? headersList.get('referer') ?? '/'
    const pathname = referer.split('?')[0].split('#')[0]

    const PAGE_MAP: Record<string, string> = {
      '/':             'Home',
      '/home':         'Home',
      '/vision':       'Vision Board',
      '/finance':      'Finance',
      '/cash-flow':    'Cash Flow',
      '/companies':    'Companies',
      '/properties':   'Properties',
      '/projects':     'Projects',
      '/tasks':        'Tasks',
      '/tax':          'Tax Center',
      '/agents':       'Agents',
      '/forge':        'The Forge',
      '/settings':     'Settings',
      '/monitor':      'Monitor',
      '/incidents':    'Incidents',
      '/integrations': 'Integrations',
      '/team':         'Team',
      '/floor':        'The Floor',
      '/docs':         'Docs Hub',
      '/files':        'Files',
      '/legal':        'Legal',
      '/memory':       'Memory',
      '/skills':       'Skill Lab',
      '/activity':     'Activity',
      '/sessions':     'Sessions',
      '/rentals':      'Rentals',
      '/photos':       'Photo Manager',
      '/entities':     'Entity Map',
    }

    // Exact match first, then prefix match
    currentPage = PAGE_MAP[pathname] ??
      Object.entries(PAGE_MAP).find(([k]) => pathname.startsWith(k) && k !== '/')?.[1] ??
      'Dashboard'
  } catch {
    // headers() throws outside request context (e.g. static gen)
  }

  return <Topbar currentPage={currentPage} />
}
