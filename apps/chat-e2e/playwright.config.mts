import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';
import { join } from 'node:path';

const port = 3100;
const baseURL = process.env['BASE_URL'] || `http://localhost:${port}`;

/**
 * E2E tests run against a production build (`nx e2e chat-e2e` builds it
 * first) using the scripted mock provider, so they need no API key and use
 * no quota. See apps/chat/src/lib/server/mock-provider.ts for the prompt
 * markers ([slow], [fail-once]…) the tests rely on.
 */
export default defineConfig({
  ...nxE2EPreset(import.meta.dirname, { testDir: './src' }),
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: {
    command: `npx next start --port ${port}`,
    cwd: join(workspaceRoot, 'apps/chat'),
    url: baseURL,
    env: { AI_PROVIDER: 'mock' },
    reuseExistingServer: !process.env['CI'],
    timeout: 60_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
