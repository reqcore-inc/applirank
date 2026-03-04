import { test, expect } from '../fixtures'

/**
 * Critical flow: Recruiter creates and publishes a job.
 *
 * Steps:
 * 1. Sign up + create org (via authenticatedPage fixture)
 * 2. Navigate to "Create Job" page
 * 3. Fill in job details (title, description, location, type)
 * 4. Submit the job
 * 5. Verify the job appears in the job list
 * 6. Open the job and publish it (draft → open)
 * 7. Verify the job is visible on the public jobs page
 */

const JOB_TITLE = 'Senior QA Engineer'
const JOB_DESCRIPTION = 'We are looking for a senior QA engineer to lead our testing efforts.'
const JOB_LOCATION = 'Remote'

test.describe('Job Creation Flow', () => {
  test('recruiter can create and publish a job', async ({ authenticatedPage, testAccount }) => {
    const page = authenticatedPage

    // ── Navigate to Create Job ───────────────────────────
    await page.goto('/dashboard/jobs/new')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'New Job' })).toBeVisible()

    // ── Step 1: Fill in job details ──────────────────────
    // Wait for the form to be fully hydrated before interacting
    await page.getByLabel('Job title').waitFor({ state: 'visible', timeout: 15_000 })
    await page.getByLabel('Job title').fill(JOB_TITLE)
    await page.locator('textarea').first().fill(JOB_DESCRIPTION)
    await page.getByLabel('Location').fill(JOB_LOCATION)

    // Click through to step 3 and submit (scope to form to avoid header duplicate button)
    await page.locator('form').getByRole('button', { name: 'Save & continue' }).waitFor({ state: 'attached', timeout: 10_000 })
    await expect(page.locator('form').getByRole('button', { name: 'Save & continue' })).toBeEnabled({ timeout: 10_000 })
    await page.locator('form').getByRole('button', { name: 'Save & continue' }).click()

    // Step 2: Application form — skip (defaults are fine)
    await page.locator('form').getByRole('button', { name: 'Save & continue' }).waitFor({ state: 'attached', timeout: 10_000 })
    await expect(page.locator('form').getByRole('button', { name: 'Save & continue' })).toBeEnabled({ timeout: 10_000 })
    await page.locator('form').getByRole('button', { name: 'Save & continue' }).click()

    // Step 3: Find candidates — skip
    await page.locator('form').getByRole('button', { name: 'Save & continue' }).waitFor({ state: 'visible', timeout: 10_000 })
    await page.locator('form').getByRole('button', { name: 'Save & continue' }).click()

    // Step 4: Publish the job
    await expect(page.getByRole('heading', { name: /Ready to go\?/i })).toBeVisible({ timeout: 10_000 })
    const publishButton = page.locator('form').getByRole('button', { name: /Publish & copy link/i })
    await publishButton.waitFor({ state: 'visible', timeout: 10_000 })
    await publishButton.click()

    // ── Verify the success state ("Your job is live!") ───
    await expect(page.getByRole('heading', { name: 'Your job is live!' })).toBeVisible({ timeout: 20_000 })

    // ── Extract job slug from the application link ────────
    const applicationLink = await page.locator('input[readonly]').inputValue()
    expect(applicationLink).toContain('/jobs/')
    const jobSlug = applicationLink.split('/jobs/')[1]?.split('/apply')[0] ?? ''
    expect(jobSlug.length, 'Job slug must not be empty').toBeGreaterThan(0)

    // ── Verify on public jobs page ───────────────────────
    await page.goto(`/jobs/${jobSlug}`)
    await expect(page.getByRole('heading', { name: JOB_TITLE })).toBeVisible()
    await expect(page.getByText(JOB_LOCATION)).toBeVisible()

    // Verify the "Apply" link/button is present (use .first() because the page has two apply links)
    await expect(page.getByRole('link', { name: /apply/i }).first()).toBeVisible()
  })
})
