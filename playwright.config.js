// playwright.config.js — WO-1334 E2E golden path
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir:   './tests/e2e',
  timeout:   60_000,
  retries:   0,
  workers:   1,
  reporter:  'list',
  use: {
    baseURL:           'http://localhost:5173',
    headless:          true,
    viewport:          { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
    video:             'retain-on-failure',
    screenshot:        'only-on-failure',
  },
  webServer: {
    command:           'npm run dev',
    url:               'http://localhost:5173',
    reuseExistingServer: true,
    timeout:           30_000,
  },
});
