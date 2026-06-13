/** @type {import('next').NextConfig} */
const dev = process.env.NODE_ENV === 'development';

const nextConfig = {
  // Static export is only for the production build; `next dev` runs a normal
  // server so the /api proxy below works (export mode disables rewrites).
  output: dev ? undefined : 'export',
  images: { unoptimized: true },
  trailingSlash: true,
  // In dev, don't 308-redirect /api/* to a trailing slash before the rewrite runs.
  skipTrailingSlashRedirect: dev,
  // For GitHub Pages under a subpath, set:
  // basePath: '/<repo>', assetPrefix: '/<repo>/',
  // and define NEXT_PUBLIC_BASE_PATH=/<repo> at build time.
  async rewrites() {
    if (!dev) return [];
    return [{ source: '/api/:path*', destination: 'http://127.0.0.1:3010/api/:path*' }];
  },
};

export default nextConfig;
