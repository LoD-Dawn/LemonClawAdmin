/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@prisma/client', 'prisma'],
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3000'] }
  }
}
module.exports = nextConfig
