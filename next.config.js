/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/barberflow',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'placeholder.co', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      { protocol: 'https', hostname: 'picsum.photos', pathname: '/**' },
      { protocol: 'https', hostname: 'api.qrserver.com', pathname: '/**' }
    ],
  },
};

module.exports = nextConfig;