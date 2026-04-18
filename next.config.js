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
    ]
  },
}
module.exports = nextConfig
