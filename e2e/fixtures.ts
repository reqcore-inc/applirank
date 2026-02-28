import { test as base, type Page } from '@playwright/test'

/**
 * Shared test fixtures for Reqcore E2E tests.
 *
 * Provides a unique test account per worker so parallel runs
 * won't clash (currently single-worker, but future-proofed).
 */

export interface TestAccount {
  name: string
  email: string
  password: string
  orgName: string
  orgSlug: string
}

function generateTestAccount(workerId: number): TestAccount {
  const id = `${Date.now()}-${workerId}`
  return {
    name: `E2E Tester ${id}`,
    email: `e2e-${id}@test.local`,
    password: 'TestPassword123!',
    orgName: `E2E Org ${id}`,
    orgSlug: `e2e-org-${id}`,
  }
}

type Fixtures = {
  testAccount: TestAccount
  authenticatedPage: Page
}

export const test = base.extend<Fixtures>({
  testAccount: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use, workerInfo) => {
      const account = generateTestAccount(workerInfo.workerIndex)
      await use(account)
    },
    { scope: 'test' },
  ],

  authenticatedPage: async ({ page, testAccount }, use) => {
    // Sign up
    await page.goto('/auth/sign-up')
    await page.waitForLoadState('networkidle')
    await page.getByLabel('Name').fill(testAccount.name)
    await page.getByLabel('Email').fill(testAccount.email)
    await page.getByLabel('Password', { exact: true }).fill(testAccount.password)
    await page.getByLabel('Confirm password').fill(testAccount.password)

    // Click sign-up and wait for the auth API response before expecting navigation
    await Promise.all([
      page.waitForResponse(
        resp => resp.url().includes('/api/auth/sign-up') && resp.status() === 200,
        { timeout: 30_000 },
      ),
      page.getByRole('button', { name: 'Sign up' }).click(),
    ])

    // After sign-up the app navigates to /onboarding/create-org, but the
    // auth middleware may not yet recognise the freshly-set session cookie
    // and redirect to /auth/sign-in instead.  Handle both outcomes.
    await page.waitForURL(
      url => url.pathname.includes('/onboarding/') || url.pathname.includes('/auth/sign-in'),
      { waitUntil: 'commit', timeout: 30_000 },
    )

    // If we landed on sign-in, explicitly sign in with the new credentials
    if (page.url().includes('/auth/sign-in')) {
      await page.waitForLoadState('networkidle')
      await page.getByLabel('Email').fill(testAccount.email)
      await page.getByLabel('Password').fill(testAccount.password)

      await Promise.all([
        page.waitForResponse(
          resp => resp.url().includes('/api/auth/sign-in') && resp.status() === 200,
          { timeout: 30_000 },
        ),
        page.getByRole('button', { name: 'Sign in' }).click(),
      ])

      // Sign-in navigates to /dashboard, then require-org middleware
      // redirects to /onboarding/create-org (user has no org yet)
      await page.waitForURL('**/onboarding/**', { waitUntil: 'commit', timeout: 30_000 })
    }

    // Wait for the org-creation form to render (loading spinner may show first)
    await page.getByLabel('Organization name').waitFor({ state: 'visible', timeout: 30_000 })
    await page.getByLabel('Organization name').fill(testAccount.orgName)
    await page.getByRole('button', { name: 'Create organization' }).click()

    // Wait for redirect to dashboard (use 'commit' for SPA navigation)
    await page.waitForURL('**/dashboard**', { waitUntil: 'commit' })

    await use(page)
  },
})

export { expect } from '@playwright/test'
