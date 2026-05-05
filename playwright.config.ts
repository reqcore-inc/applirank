import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E configuration for WWMate.
 *
 * Tests the most critical user outcomes:
 * - Creating a job (authenticated recruiter flow)
 * - Candidate applying to a job (public flow)
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // sequential â€” tests share state (auth â†’ create job â†’ apply)
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // single worker â€” tests depend on each other
  reporter: process.env.CI
    ? [
        ['github'],
        ['html', { open: 'never' }],
      ]
    : [
        ['html'],
      ],
  timeout: process.env.CI ? 120_000 : 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3333',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Start the Nuxt dev server before running tests (skipped in CI â€” we build there) */
  ...(process.env.CI
    ? {}
    : {
        webServer: {
          command: 'BETTER_AUTH_URL=http://localhost:3333 npx nuxt dev --port 3333',
          url: 'http://localhost:3333',
          reuseExistingServer: true,
          timeout: 60_000,
        },
      }),
})

