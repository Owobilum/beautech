import path from 'node:path';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

// Runs every story as a test in a real browser: render checks, play-function
// interaction tests and axe accessibility checks.
// https://storybook.js.org/docs/writing-tests/integrations/vitest-addon
export default defineConfig({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/storybook',
  plugins: [
    storybookTest({ configDir: path.join(import.meta.dirname, '.storybook') }),
  ],
  test: {
    name: 'storybook',
    watch: false,
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
    // CI's `nx affected -t test --coverage` reaches this project too; keep
    // the (unreported) output in the gitignored test-output folder.
    coverage: {
      reportsDirectory: './test-output/vitest/coverage',
    },
  },
});
