import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E configuration for Backbone.
 * Tests run against a locally running dev server (npm run dev).
 *
 * To run:
 *   npx playwright test
 *   npx playwright test --ui          (interactive mode)
 *   npx playwright test --project=chromium
 *   npx playwright codegen localhost:3005   (record new test)
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Retry failed tests once on CI to reduce flakiness
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'e2e/report', open: 'never' }],
    ['list'],
  ],

  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3005',
    // Keep traces on first retry — very helpful for debugging CI failures
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Viewport matching most dashboard users
    viewport: { width: 1280, height: 800 },
    // Sensible timeouts
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },

  projects: [
    // Setup project to log in once and reuse auth state (faster)
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    // Unauthenticated tests (login page, public articles)
    {
      name: 'chromium-public',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*\.public\.spec\.ts/,
    },
  ],

  // Start the dev server automatically if not already running
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3005',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
