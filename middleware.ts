import { NextResponse, type NextRequest } from 'next/server'

/**
 * Sets the `x-pathname` request header so server components (e.g. the
 * Topbar breadcrumb) can read the current route. Without this the
 * breadcrumb falls back to 'Dashboard' on every page because the
 * `referer` header doesn't reflect the server-rendered URL.
 *
 * Excludes static assets, API routes, and image optimization.
 */
export function middleware(req: NextRequest) {
  const res = NextResponse.next()
  // Forward the pathname to downstream server components / route handlers
  const url = req.nextUrl
  req.headers.set('x-pathname', url.pathname)
  res.headers.set('x-pathname', url.pathname)

  // Use request-header forwarding pattern so server components can read it
  const reqHeaders = new Headers(req.headers)
  reqHeaders.set('x-pathname', url.pathname)
  return NextResponse.next({ request: { headers: reqHeaders } })
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     *  - _next/static, _next/image (Next.js internals)
     *  - favicon, robots, sitemap, fonts
     *  - api routes (don't need breadcrumb)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|svg|webp|woff2?|ico)$).*)',
  ],
}
