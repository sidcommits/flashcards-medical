/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
  // For GitHub Pages under a subpath, set:
  // basePath: '/<repo>', assetPrefix: '/<repo>/',
  // and define NEXT_PUBLIC_BASE_PATH=/<repo> at build time.
};

export default nextConfig;
