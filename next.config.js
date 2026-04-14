/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { typedRoutes: false },
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: { remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co' }] },
}
module.exports = nextConfig
