import path from 'node:path';

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../'),
  reactStrictMode: true,
  poweredByHeader: false,
  eslint: {
    // Lint runs as a dedicated CI step; Next's built-in lint is deprecated.
    ignoreDuringBuilds: true,
  },
  transpilePackages: ['@forja/shared', '@forja/design-tokens'],
};

export default nextConfig;
