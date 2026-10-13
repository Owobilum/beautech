// @ts-check
import path from 'node:path';

const workspaceRoot = path.join(import.meta.dirname, '../..');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // @owobilum/ui ships TypeScript source alongside dist; inside the monorepo
  // the app compiles it from source (Next has no equivalent of the
  // "@owobilum/source" resolve condition), so library edits hot-reload
  // without a build.
  transpilePackages: ['@owobilum/ui'],
  turbopack: {
    root: workspaceRoot,
    resolveAlias: {
      '@owobilum/ui': '../../packages/ui/src/index.ts',
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },
};

export default nextConfig;
