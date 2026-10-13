import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { defaultClientConditions } from 'vite';
import { join } from 'node:path';

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/chat',
  plugins: [react()],
  resolve: {
    alias: {
      '@': join(import.meta.dirname, './src'),
      // 'server-only' throws outside a React Server Components bundle; the
      // server modules are tested directly in Node.
      'server-only': join(import.meta.dirname, './src/test/server-only.ts'),
    },
    // Resolve @owobilum/ui to source, like the rest of the workspace.
    conditions: ['@owobilum/source', ...defaultClientConditions],
  },
  test: {
    name: 'chat',
    watch: false,
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    reporters: ['default'],
    // Off by default (a filtered run would fail the thresholds); CI runs
    // `nx affected -t test --coverage` and uploads lcov to Codecov.
    coverage: {
      reportsDirectory: './test-output/vitest/coverage',
      provider: 'v8' as const,
      include: ['src/**/*.{ts,tsx}'],
      // src/app is Next.js wiring (layout, page, route), covered by e2e.
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/app/**'],
      // lcov paths relative to the repo root, as Codecov expects.
      reporter: [
        'text-summary',
        'html',
        ['lcov', { projectRoot: '../..' }] as ['lcov', { projectRoot: string }],
      ],
      // A few points under the current numbers: guards against regressions.
      thresholds: { statements: 86, branches: 78, functions: 86, lines: 89 },
    },
  },
}));
