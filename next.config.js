/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { typedRoutes: false },
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: { remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co' }] },
  async redirects() {
    return [
      { source: '/floor', destination: '/agents', permanent: true },
      // North Star merged into Home — old /home bookmarks still work.
      { source: '/home', destination: '/', permanent: true },
      // Sprint 1 IA restructure (2026-04-18). Old top-level routes for
      // back-office surfaces now live under /settings/*. Redirects keep
      // every existing bookmark, Slack link, and browser-autocomplete
      // entry working forever (308 permanent).
      { source: '/accounts',         destination: '/settings/connected-accounts', permanent: true },
      { source: '/entities',         destination: '/settings/entities',            permanent: true },
      { source: '/integrations',     destination: '/settings/integrations',        permanent: true },
      { source: '/files',            destination: '/settings/files',               permanent: true },
      { source: '/docs',             destination: '/settings/documents',           permanent: true },
      { source: '/legal',            destination: '/settings/legal',               permanent: true },
      { source: '/memory',           destination: '/settings/memory',              permanent: true },
      { source: '/monitor',          destination: '/settings/monitor',             permanent: true },
      { source: '/incidents',        destination: '/settings/incidents',           permanent: true },
      { source: '/sessions',         destination: '/settings/sessions',            permanent: true },
      { source: '/activity',         destination: '/settings/sessions',            permanent: true },
      { source: '/skills',           destination: '/settings/skills',              permanent: true },
      // Executive/Command Deck were redundant with Home/Finance — redirect
      // to the closest sensible destination.
      { source: '/executive',        destination: '/',                              permanent: true },
      { source: '/command',          destination: '/',                              permanent: true },
    ]
  },
}
module.exports = nextConfig
