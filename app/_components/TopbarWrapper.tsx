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

    // Ordered most-specific-first so the prefix matcher picks /settings/*
    // nested labels before 'Settings' itself.
    const PAGE_MAP: Array<[string, string]> = [
      ['/settings/connected-accounts', 'Settings · Connected Accounts'],
      ['/settings/integrations',       'Settings · Integrations'],
      ['/settings/entities',           'Settings · Entities'],
      ['/settings/files',              'Settings · Files'],
      ['/settings/documents',          'Settings · Documents'],
      ['/settings/legal',              'Settings · Legal'],
      ['/settings/memory',             'Settings · Memory'],
      ['/settings/monitor',            'Settings · Monitor'],
      ['/settings/incidents',          'Settings · Incidents'],
      ['/settings/sessions',           'Settings · Sessions'],
      ['/settings/skills',             'Settings · Skills'],
      ['/settings/preferences',        'Settings · Preferences'],
      ['/settings/security',           'Settings · Security'],
      ['/settings/billing',            'Settings · Billing'],
      ['/settings/export',             'Settings · Export'],
      ['/settings',                    'Settings'],
      ['/finance/personal',            'Finance · Personal'],
      ['/finance',                     'Finance · Empire View'],
      ['/cash-flow',                   'Cash Flow'],
      ['/tax',                         'Tax Planning'],
      ['/companies',                   'Companies'],
      ['/properties',                  'Properties'],
      ['/projects',                    'Projects'],
      ['/tasks',                       'Tasks'],
      ['/agents',                      'Agents'],
      ['/team',                        'Team'],
      ['/forge',                       'Forge'],
      ['/vision',                      'Vision Board'],
      ['/rentals',                     'Rentals'],
      ['/photos',                      'Photos'],
      ['/',                            'Home'],
    ]

    const exact = PAGE_MAP.find(([k]) => k === pathname)?.[1]
    const prefix = !exact
      ? PAGE_MAP.find(([k]) => k !== '/' && pathname.startsWith(k + '/'))?.[1]
        ?? PAGE_MAP.find(([k]) => k !== '/' && pathname.startsWith(k))?.[1]
      : null
    currentPage = exact ?? prefix ?? 'Home'
  } catch {
    // headers() throws outside request context (e.g. static gen)
  }

  return <Topbar currentPage={currentPage} />
}
