/** @type {import('next').NextConfig} */
const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const normalizedBasePath =
  rawBasePath && rawBasePath !== "/"
    ? `/${rawBasePath.replace(/^\/+|\/+$/g, "")}`
    : "";

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Permite servir o app em um subcaminho (ex.: /barberflow) quando configurado no ambiente
  basePath: normalizedBasePath || undefined,
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
