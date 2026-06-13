/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
  // For GitHub Pages under a subpath, set:
  // basePath: '/<repo>', assetPrefix: '/<repo>/',
  // and define NEXT_PUBLIC_BASE_PATH=/<repo> at build time.
  async rewrites() {
    if (process.env.NODE_ENV !== 'development') return [];
    return [{ source: '/api/:path*', destination: 'http://127.0.0.1:3010/api/:path*' }];
  },
};

export default nextConfig;
