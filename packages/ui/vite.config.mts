/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import * as path from 'path';
import pkg from './package.json' with { type: 'json' };

// Never bundle dependencies or peers (including subpaths like react/jsx-runtime);
// consumers install them, which keeps a single React/Headless UI instance.
const externals = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {}),
];
const isExternal = (id: string) =>
  externals.some((dep) => id === dep || id.startsWith(`${dep}/`));

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/packages/ui',
  plugins: [
    react(),
    dts({
      entryRoot: 'src',
      tsconfigPath: path.join(import.meta.dirname, 'tsconfig.lib.json'),
    }),
  ],
  // Library mode: https://vite.dev/guide/build.html#library-mode
  build: {
    outDir: './dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    sourcemap: true,
    lib: {
      entry: 'src/index.ts',
      fileName: 'index',
      formats: ['es' as const],
    },
    rolldownOptions: {
      external: isExternal,
    },
  },
  test: {
    name: 'ui',
    watch: false,
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    // Off by default (a filtered run would fail the thresholds); CI runs
    // `nx affected -t test --coverage` and uploads lcov to Codecov.
    coverage: {
      reportsDirectory: './test-output/vitest/coverage',
      provider: 'v8' as const,
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/index.ts',
        'src/test-setup.ts',
      ],
      // lcov paths relative to the repo root, as Codecov expects.
      reporter: [
        'text-summary',
        'html',
        ['lcov', { projectRoot: '../..' }] as ['lcov', { projectRoot: string }],
      ],
      // A few points under the current numbers: guards against regressions.
      thresholds: { statements: 87, branches: 92, functions: 80, lines: 89 },
    },
  },
}));
