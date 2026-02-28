import { test, expect } from '../fixtures'

/**
 * Critical flow: Candidate applies to a published job.
 *
 * Steps:
 * 1. Recruiter signs up, creates org, creates and publishes a job (setup)
 * 2. Candidate visits the public job page
 * 3. Candidate clicks "Apply"
 * 4. Candidate fills in application form (name, email, phone)
 * 5. Candidate submits the application
 * 6. Candidate sees the confirmation page
 * 7. Recruiter sees the application in the dashboard
 */

const JOB_TITLE = 'Frontend Developer'
const JOB_DESCRIPTION = 'Join our team building modern web applications with Vue and Nuxt.'
const JOB_LOCATION = 'Berlin, Germany'

const APPLICANT = {
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane.doe@example.com',
  phone: '+49 170 1234567',
}

test.describe('Candidate Application Flow', () => {
  test('candidate can apply to a published job', async ({ authenticatedPage, testAccount, context }) => {
    const page = authenticatedPage

    // ── Setup: Create and publish a job ──────────────────

    await page.goto('/dashboard/jobs/new')
    await page.getByLabel('Job title').fill(JOB_TITLE)
    await page.locator('textarea').first().fill(JOB_DESCRIPTION)
    await page.getByLabel('Location').fill(JOB_LOCATION)

    // Step through wizard (scope to form to avoid header duplicate button)
    await page.locator('form').getByRole('button', { name: 'Save & continue' }).click()
    await page.locator('form').getByRole('button', { name: 'Save & continue' }).click()
    await page.locator('form').getByRole('button', { name: 'Create job' }).click()

    // Wait for redirect to jobs list and open the job
    await page.waitForURL('**/dashboard/jobs', { waitUntil: 'commit' })
    await page.getByText(JOB_TITLE).first().click()

    // Publish the job
    await page.getByRole('button', { name: 'Publish' }).click()
    await expect(page.getByText('open', { exact: false })).toBeVisible({ timeout: 10_000 })

    // Get job slug via API
    const jobDetailUrl = page.url()
    const jobId = jobDetailUrl.split('/dashboard/jobs/')[1]?.split('/')[0]
    const jobData = await page.evaluate(async (id) => {
      const res = await fetch(`/api/jobs/${id}`)
      return res.json()
    }, jobId)

    const jobSlug = jobData.slug

    // ── Candidate flow: Apply in a separate page ─────────
    // Use a fresh page (no auth cookies) to simulate an anonymous candidate
    const candidatePage = await context.newPage()

    // Clear cookies for the candidate page so they have no auth session
    await candidatePage.context().clearCookies()

    await candidatePage.goto(`/jobs/${jobSlug}`)
    await expect(candidatePage.getByRole('heading', { name: JOB_TITLE })).toBeVisible()

    // Click Apply
    await candidatePage.getByRole('link', { name: /apply/i }).click()
    await candidatePage.waitForURL(`**/jobs/${jobSlug}/apply`, { waitUntil: 'commit' })

    // ── Fill in application form ─────────────────────────
    await candidatePage.getByLabel('First name').fill(APPLICANT.firstName)
    await candidatePage.getByLabel('Last name').fill(APPLICANT.lastName)
    await candidatePage.getByLabel('Email').fill(APPLICANT.email)
    await candidatePage.getByLabel('Phone').fill(APPLICANT.phone)

    // Submit application
    await candidatePage.getByRole('button', { name: /submit/i }).click()

    // ── Verify confirmation page ─────────────────────────
    await candidatePage.waitForURL(`**/jobs/${jobSlug}/confirmation`, { waitUntil: 'commit' })
    await expect(candidatePage.getByText('Application Submitted')).toBeVisible()
    await expect(candidatePage.getByText(JOB_TITLE)).toBeVisible()

    await candidatePage.close()

    // ── Verify application appears in recruiter dashboard ─
    // Navigate to the job's candidates page
    await page.goto(`/dashboard/jobs/${jobId}/candidates`)
    await expect(page.getByText(APPLICANT.firstName)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(APPLICANT.lastName)).toBeVisible()
    await expect(page.getByText(APPLICANT.email)).toBeVisible()
  })
})
