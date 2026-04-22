import path from 'path'

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8000/api/:path*',
      },
      {
        source: '/models/:path*',
        destination: 'http://127.0.0.1:8000/models/:path*',
      },
      {
        source: '/models',
        destination: 'http://127.0.0.1:8000/models',
      },
    ]
  },
}

export default nextConfig
