import { test, expect } from '../fixtures'

/**
 * Critical flow: Candidate applies to a published job that contains every
 * available custom question field type.
 *
 * Recruiter setup:
 * 1. Create a job via the 4-step New Job wizard
 * 2. Step 2 – disable "Require resume/CV", then add one question of each type:
 *    short_text, long_text, single_select, multi_select, number, date, url,
 *    checkbox, file_upload
 * 3. Step 4 – publish ("Publish & copy link") and capture the application URL
 *
 * Candidate flow:
 * 4. Open the public application form (unauthenticated context)
 * 5. Fill basic fields (first name, last name, email, phone)
 * 6. Fill every custom question field type with suitable test data
 * 7. Submit — verify the API responds 2xx
 * 8. Verify the confirmation page is shown
 */

const JOB_TITLE = 'Frontend Developer — All Fields Test'
const JOB_DESCRIPTION = 'Join our team building modern web applications with Vue and Nuxt.'
const JOB_LOCATION = 'Berlin, Germany'

// Applicant identity is generated inside the test to guarantee uniqueness
// across retries (Playwright can retry up to 2× in CI; a static email would
// produce a 409 "already applied" on the second attempt).

/**
 * One question per field type defined in QuestionForm.vue / DynamicField.vue.
 * The nine types are: short_text, long_text, single_select, multi_select,
 * number, date, url, checkbox, file_upload.
 */
const CUSTOM_QUESTIONS = [
  {
    type: 'short_text',
    label: 'Years of experience',
    required: true,
  },
  {
    type: 'long_text',
    label: 'Why do you want this role',
    required: false,
  },
  {
    type: 'single_select',
    label: 'Preferred work style',
    options: ['Remote', 'Hybrid', 'Onsite'] as string[],
    required: true,
  },
  {
    type: 'multi_select',
    label: 'Technologies you know',
    options: ['Vue', 'React', 'Angular'] as string[],
    required: false,
  },
  {
    type: 'number',
    label: 'Expected salary',
    required: false,
  },
  {
    type: 'date',
    label: 'Earliest start date',
    required: false,
  },
  {
    type: 'url',
    label: 'GitHub profile URL',
    required: false,
  },
  {
    type: 'checkbox',
    label: 'Agree to background check',
    required: true,
  },
  {
    type: 'file_upload',
    label: 'Cover letter document',
    required: false,
  },
]

/**
 * Opens the QuestionForm in the wizard Step 2 and saves a single question.
 * Assumes the "Add Question" trigger button is visible before calling.
 */
async function addCustomQuestion(
  page: Parameters<Parameters<typeof test>[1]>[0]['page'],
  question: {
    type: string
    label: string
    required?: boolean
    options?: string[]
  },
) {
  // Click the trigger to open the QuestionForm
  await page.getByRole('button', { name: 'Add a question' }).waitFor({ state: 'visible', timeout: 10_000 })
  await page.getByRole('button', { name: 'Add a question' }).click()

  // Wait for the form to render
  await page.locator('#q-label').waitFor({ state: 'visible', timeout: 10_000 })

  // Fill the question label
  await page.locator('#q-label').fill(question.label)

  // Select the field type
  await page.locator('#q-type').selectOption(question.type)

  // For single_select / multi_select: populate the option inputs
  if (question.type === 'single_select' || question.type === 'multi_select') {
    const options = question.options ?? []
    // The form starts with one empty option input
    await page.getByPlaceholder('Option 1').fill(options[0] ?? '')
    // Add and fill subsequent options one by one
    for (let i = 1; i < options.length; i++) {
      await page.getByRole('button', { name: 'Add option' }).click()
      await page.getByPlaceholder(`Option ${i + 1}`).fill(options[i] ?? '')
    }
  }

  // Check the "Required" checkbox when the question must be answered
  if (question.required) {
    await page.getByRole('checkbox', { name: 'Required' }).check()
  }

  // Submit the QuestionForm.
  // When showAddForm=true the trigger "Add Question" button is removed from the
  // DOM (v-if="!showAddForm"), so the only visible "Add Question" button is the
  // form's submit button.
  await page.getByRole('button', { name: 'Add Question' }).click()

  // Wait for the form to close before the next iteration
  await page.locator('#q-label').waitFor({ state: 'hidden', timeout: 10_000 })
}

test.describe('Candidate Application Flow — All Custom Question Field Types', () => {
  test('all nine custom field types render and accept input on the public application form', async ({ authenticatedPage, browser }, testInfo) => {
    const page = authenticatedPage

    // ── Step 1: Fill in job details ───────────────────────────────────────────

    await page.goto('/dashboard/jobs/new')
    await page.waitForLoadState('networkidle')
    await page.getByLabel('Job title').waitFor({ state: 'visible', timeout: 15_000 })
    await page.getByLabel('Job title').fill(JOB_TITLE)
    await page.locator('textarea').first().fill(JOB_DESCRIPTION)
    await page.getByLabel('Location').fill(JOB_LOCATION)

    // Step 1 → Step 2 (scope to form to avoid the duplicate header button)
    await page.locator('form').getByRole('button', { name: 'Save & continue' }).first().waitFor({ state: 'attached', timeout: 10_000 })
    await expect(page.locator('form').getByRole('button', { name: 'Save & continue' }).first()).toBeEnabled({ timeout: 10_000 })
    await page.locator('form').getByRole('button', { name: 'Save & continue' }).first().click()

    // ── Step 2: Application form — disable resume requirement, add all question types ──

    // "Require resume/CV" defaults to ON — switch it off so the candidate flow
    // does not need a resume upload (the file_upload custom question covers files)
    const resumeRadioGroup = page.getByRole('radiogroup', { name: /Resume requirement/i })
    await resumeRadioGroup.waitFor({ state: 'visible', timeout: 10_000 })
    await resumeRadioGroup.getByRole('radio', { name: 'Off' }).click()

    // Add one question for each of the nine available field types
    for (const question of CUSTOM_QUESTIONS) {
      await addCustomQuestion(page, question)
    }

    // Verify all nine question labels appear in the wizard UI
    for (const question of CUSTOM_QUESTIONS) {
      await expect(page.getByText(question.label).first()).toBeVisible()
    }

    // Step 2 → Step 3 (Scoring criteria — skip)
    await page.locator('form').getByRole('button', { name: 'Save & continue' }).first().click()

    // ── Step 3: Scoring criteria (skip) → Step 4 ─────────────────────────────

    await page.locator('form').getByRole('button', { name: 'Save & continue' }).first().waitFor({ state: 'visible', timeout: 10_000 })
    await page.locator('form').getByRole('button', { name: 'Save & continue' }).first().click()

    // ── Step 4: Publish the job ─────────────────────────────────────────

    await expect(page.getByRole('heading', { name: /Ready to go\?/i })).toBeVisible({ timeout: 10_000 })

    // publishChoice defaults to 'publish' → the footer button reads "Publish & copy link"
    const publishButton = page.locator('form').getByRole('button', { name: /Publish & copy link/i })
    await publishButton.waitFor({ state: 'visible', timeout: 10_000 })
    await publishButton.click()

    // Wait for the success state ("Your job is live!")
    await expect(page.getByRole('heading', { name: 'Your job is live!' })).toBeVisible({ timeout: 20_000 })

    // Read the application link from the readonly input in the success card.
    // The link has the form: https://<host>/jobs/<slug>/apply
    const applicationLink = await page.locator('input[readonly]').inputValue()
    expect(applicationLink).toMatch(/\/jobs\/[^/]+\/apply(?:$|[?#])/)
    const slugMatch = applicationLink.match(/\/jobs\/([^/]+)\/apply(?:$|[?#])/)
    const jobSlug = slugMatch?.[1] ?? ''
    expect(jobSlug.length, 'Job slug must not be empty').toBeGreaterThan(0)

    // ── Candidate flow: fresh unauthenticated context ─────────────────────────

    const candidateContext = await browser.newContext()
    const candidatePage = await candidateContext.newPage()

    // Unique identity per run + retry — static emails cause a 409 "already
    // applied" conflict when Playwright retries a failed test in CI.
    const APPLICANT = {
      firstName: 'Jane',
      lastName: 'Doe',
      email: `jane.doe.${Date.now()}.r${testInfo.retry}@example.com`,
      phone: '+49 170 1234567',
    }

    // Navigate directly to the application form URL captured from the success state
    await candidatePage.goto(applicationLink)
    await candidatePage.waitForLoadState('networkidle')
    await expect(candidatePage.getByRole('heading', { name: JOB_TITLE })).toBeVisible({ timeout: 15_000 })

    // Wait for the form to be fully hydrated
    await candidatePage.getByRole('button', { name: /submit/i }).waitFor({ state: 'visible', timeout: 15_000 })

    // ── Fill basic applicant info ─────────────────────────────────────────────

    await candidatePage.getByLabel('First name').fill(APPLICANT.firstName)
    await candidatePage.getByLabel('Last name').fill(APPLICANT.lastName)
    await candidatePage.getByLabel('Email').fill(APPLICANT.email)
    await candidatePage.getByLabel('Phone').fill(APPLICANT.phone)

    // ── Fill each custom question field type ──────────────────────────────────

    // 1. short_text — plain text input (required)
    await candidatePage.getByLabel('Years of experience').fill('5')

    // 2. long_text — textarea
    await candidatePage.getByLabel('Why do you want this role').fill(
      'I am passionate about Vue.js and Nuxt and love building great user experiences.',
    )

    // 3. single_select — <select> dropdown (required): pick "Remote"
    await candidatePage.getByLabel('Preferred work style').selectOption('Remote')

    // 4. multi_select — group of checkboxes: check two of the three options
    await candidatePage.getByLabel('Vue').check()
    await candidatePage.getByLabel('React').check()
    await expect(candidatePage.getByLabel('Vue')).toBeChecked()
    await expect(candidatePage.getByLabel('React')).toBeChecked()

    // 5. number — numeric input
    await candidatePage.getByLabel('Expected salary').fill('75000')

    // 6. date — date picker
    await candidatePage.getByLabel('Earliest start date').fill('2026-04-01')

    // 7. url — URL input
    await candidatePage.getByLabel('GitHub profile URL').fill('https://github.com/jane-doe')

    // 8. checkbox — boolean toggle (required): check "Yes"
    await candidatePage.getByLabel('Agree to background check').check()
    await expect(candidatePage.getByLabel('Agree to background check')).toBeChecked()

    // 9. file_upload — hidden <input type="file"> triggered by a styled button.
    // Scope to the specific custom question container so the selector remains
    // stable even if a built-in resume upload is added later.
    const pdfBuffer = Buffer.from(
      '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n'
       + '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n'
       + '3 0 obj<</Type/Page/MediaBox[0 0 612 792]>>endobj\n'
       + 'xref\n0 4\n0000000000 65535 f\n'
       + 'trailer<</Size 4/Root 1 0 R>>\nstartxref\n9\n%%EOF',
    )
    // Locate the DynamicField wrapper for the "Cover letter document" question
    // and narrow the file input to that scope.
    const coverLetterQuestionContainer = candidatePage
      .locator('div, section, fieldset')
      .filter({ hasText: 'Cover letter document' })
      .first()
    await coverLetterQuestionContainer.locator('input[type="file"]').setInputFiles({
      name: 'cover-letter.pdf',
      mimeType: 'application/pdf',
      buffer: pdfBuffer,
    })

    // The DynamicField should now display the selected file name
    await expect(candidatePage.getByText('cover-letter.pdf')).toBeVisible({ timeout: 5_000 })

    // ── Submit the application ────────────────────────────────────────────────

    const [applyResponse] = await Promise.all([
      candidatePage.waitForResponse(
        resp =>
          resp.url().includes(`/api/public/jobs/${jobSlug}/apply`) &&
          resp.request().method() === 'POST',
        { timeout: 30_000 },
      ),
      candidatePage.getByRole('button', { name: /submit/i }).click(),
    ])

    // Verify the API responded with a 2xx status
    const applyStatus = applyResponse.status()
    expect(applyStatus, `Apply API returned ${applyStatus}`).toBeGreaterThanOrEqual(200)
    expect(applyStatus, `Apply API returned ${applyStatus}`).toBeLessThan(300)

    // ── Verify the confirmation page ──────────────────────────────────────────

    await candidatePage.waitForURL(`**/jobs/${jobSlug}/confirmation`, {
      waitUntil: 'commit',
      timeout: 15_000,
    })
    await expect(candidatePage.getByRole('heading', { name: 'Application Submitted!' })).toBeVisible()
    await expect(candidatePage.getByText(JOB_TITLE)).toBeVisible()

    await candidatePage.close()
    await candidateContext.close()

    // ── Recruiter verification: dashboard data ────────────────────────────────
    // Switch back to the recruiter's authenticated page and confirm that the
    // application, candidate, and all custom question responses are correctly
    // stored and rendered in the dashboard.

    // Navigate to the dashboard jobs list
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Find the job card by title and extract the job ID from its href
    const jobCardLink = page.getByRole('link', { name: JOB_TITLE }).first()
    await expect(jobCardLink).toBeVisible({ timeout: 15_000 })
    const jobHref = await jobCardLink.getAttribute('href')
    expect(jobHref, 'Job card link must contain /jobs/').toContain('/jobs/')
    const jobId = jobHref!.split('/jobs/')[1]!.split('/')[0]
    expect(jobId.length, 'Job ID must not be empty').toBeGreaterThan(0)

    // ── Navigate to the job's candidates table ────────────────────────────────
    await page.goto(`/dashboard/jobs/${jobId}/candidates`)
    await page.waitForLoadState('networkidle')

    // The pipeline badge in the "Needs attention" section and the table should
    // now show 1 candidate. Wait until at least one row with Jane's name appears.
    await expect(
      page.getByRole('cell', { name: /Jane\s+Doe/i }).or(
        page.getByText(`${APPLICANT.firstName} ${APPLICANT.lastName}`).first(),
      ).first(),
    ).toBeVisible({ timeout: 15_000 })

    // Verify the candidate's email is also visible in the table
    await expect(page.getByText(APPLICANT.email).first()).toBeVisible()

    // The status for a fresh application must be "new"
    await expect(page.getByText('new').first()).toBeVisible()

    // ── Open the CandidateDetailSidebar by clicking Janet's row ──────────────
    // The row is identified by the candidate name cell
    await page
      .getByRole('row', { name: new RegExp(`${APPLICANT.firstName}\\s+${APPLICANT.lastName}`, 'i') })
      .first()
      .click()

    // Wait for the sidebar to mount: the Overview tab button becomes visible
    await page.getByRole('button', { name: 'Overview' }).waitFor({ state: 'visible', timeout: 10_000 })

    // ── Overview tab: verify basic candidate info ─────────────────────────────
    await expect(page.getByText(`${APPLICANT.firstName} ${APPLICANT.lastName}`).first()).toBeVisible()
    await expect(page.getByText(APPLICANT.email).first()).toBeVisible()
    await expect(page.getByText(APPLICANT.phone).first()).toBeVisible()
    // The application status badge ("new") should be visible in the sidebar
    await expect(page.getByText('new').first()).toBeVisible()

    // ── Switch to the Responses tab ───────────────────────────────────────────
    // The tab button reads "Responses (9)" — one for each custom question.
    await page.getByRole('button', { name: /^Responses\s*\(\s*9\s*\)/i }).click()

    // Wait for the first response card to appear
    await expect(page.getByText('Years of experience', { exact: false }).first()).toBeVisible({ timeout: 10_000 })

    // ── Verify each custom question response ──────────────────────────────────

    // Helper: within the Responses tab, find a response card by its label and
    // assert the displayed value matches `expected`.
    async function assertResponse(questionLabel: string, expected: string | RegExp) {
      // Each response is rendered as a <dt> (label) + <dd> (value) pair inside
      // a card. Locate the <dd> that follows the matching <dt>.
      const label = page.getByText(questionLabel, { exact: false }).first()
      await expect(label).toBeVisible()
      // The value is the next sibling text node — grabbing the nearest <dd>
      const card = label.locator('..')
      const valueEl = card.locator('dd')
      if (typeof expected === 'string') {
        await expect(valueEl).toContainText(expected)
      } else {
        await expect(valueEl).toHaveText(expected)
      }
    }

    // 1. short_text
    await assertResponse('Years of experience', '5')

    // 2. long_text
    await assertResponse('Why do you want this role', 'I am passionate about Vue.js')

    // 3. single_select
    await assertResponse('Preferred work style', 'Remote')

    // 4. multi_select — array values are joined with ", "
    await assertResponse('Technologies you know', /Vue.*React|React.*Vue/)

    // 5. number
    await assertResponse('Expected salary', '75000')

    // 6. date
    await assertResponse('Earliest start date', '2026-04-01')

    // 7. url
    await assertResponse('GitHub profile URL', 'https://github.com/jane-doe')

    // 8. checkbox — boolean stored as "true" rendered as "Yes"
    await assertResponse('Agree to background check', 'Yes')

    // 9. file_upload — the stored value is a document UUID; verify the label
    //    exists and the value is non-empty (not "—").
    const fileUploadLabel = page.getByText('Cover letter document', { exact: false }).first()
    await expect(fileUploadLabel).toBeVisible()
    const fileUploadCard = fileUploadLabel.locator('..')
    const fileUploadValue = fileUploadCard.locator('dd')
    // The value should be a non-empty UUID (document ID), not the dash placeholder
    await expect(fileUploadValue).not.toHaveText('—')
    const fileIdText = await fileUploadValue.textContent()
    expect(fileIdText?.trim().length, 'file_upload response value must not be empty').toBeGreaterThan(0)

    // ── Documents tab: cover letter file should be listed ─────────────────────
    await page.getByRole('button', { name: /^Documents/i }).click()
    // The file uploaded via the file_upload custom question is stored as a
    // candidate document — verify the original filename is visible.
    await expect(page.getByText('cover-letter.pdf', { exact: false })).toBeVisible({ timeout: 10_000 })

    // ── Navigate to the full application detail page ───────────────────────────
    // Close the sidebar and navigate directly to /dashboard/applications/<id>
    // by using the applications list and finding Jane's entry.
    await page.goto('/dashboard/applications')
    await page.waitForLoadState('networkidle')

    // Find and click on Jane Doe's application entry
    const appRow = page.getByText(`${APPLICANT.firstName} ${APPLICANT.lastName}`).first()
    await expect(appRow).toBeVisible({ timeout: 15_000 })
    await appRow.click()
    await page.waitForLoadState('networkidle')

    // The full application detail page heading includes both names and job title
    await expect(
      page.getByRole('heading', { name: new RegExp(`${APPLICANT.firstName}`, 'i') }),
    ).toBeVisible({ timeout: 15_000 })

    // Confirm job title link is present on the detail page
    await expect(page.getByText(JOB_TITLE).first()).toBeVisible()

    // Confirm the candidate info section shows the correct data
    await expect(page.getByText(APPLICANT.email).first()).toBeVisible()

    // Confirm all 9 question responses are shown in the "Application Responses" section
    await expect(page.getByText(/Application Responses\s*\(\s*9\s*\)/i)).toBeVisible()

    // Spot-check a few response values on the detail page
    await expect(page.getByText('5').first()).toBeVisible() // short_text: years of experience
    await expect(page.getByText('Remote').first()).toBeVisible() // single_select
    await expect(page.getByText('Yes').first()).toBeVisible() // checkbox
    await expect(page.getByText('https://github.com/jane-doe').first()).toBeVisible() // url
  })
})

test.describe('Candidate Application — Required Cover Letter Validation', () => {
  /**
   * Verifies that:
   * - The cover letter textarea appears when the job has requireCoverLetter=true
   * - Client-side validation blocks submission when the textarea is empty
   * - The error message "Cover letter is required" is displayed
   */
  test('form shows and enforces required cover letter', async ({ authenticatedPage, browser }, testInfo) => {
    const page = authenticatedPage

    // ── Create a job with cover letter required ────────────────────────────────
    await page.goto('/dashboard/jobs/new')
    await page.waitForLoadState('networkidle')
    await page.getByLabel('Job title').waitFor({ state: 'visible', timeout: 15_000 })
    await page.getByLabel('Job title').fill('Cover Letter Required Job')
    await page.locator('textarea').first().fill('A job that requires a cover letter.')
    await page.getByLabel('Location').fill('Remote')

    // Step 1 → Step 2
    await page.locator('form').getByRole('button', { name: 'Save & continue' }).first()
      .waitFor({ state: 'attached', timeout: 10_000 })
    await page.locator('form').getByRole('button', { name: 'Save & continue' }).first().click()

    // Step 2: Enable "Cover letter" requirement via radio group
    const coverLetterRadioGroup = page.getByRole('radiogroup', { name: /Cover letter requirement/i })
    await coverLetterRadioGroup.waitFor({ state: 'visible', timeout: 10_000 })
    await coverLetterRadioGroup.getByRole('radio', { name: 'Required' }).click()
    await expect(coverLetterRadioGroup.getByRole('radio', { name: 'Required' })).toHaveAttribute('aria-checked', 'true')

    // Step 2 → Step 3 (Scoring criteria) → Step 4 (Publish)
    await page.locator('form').getByRole('button', { name: 'Save & continue' }).first().click()
    await page.locator('form').getByRole('button', { name: 'Save & continue' }).first()
      .waitFor({ state: 'visible', timeout: 10_000 })
    await page.locator('form').getByRole('button', { name: 'Save & continue' }).first().click()
    await expect(page.getByRole('heading', { name: /Ready to go\?/i })).toBeVisible({ timeout: 10_000 })
    await page.locator('form').getByRole('button', { name: /Publish & copy link/i })
      .waitFor({ state: 'visible', timeout: 10_000 })
    await page.locator('form').getByRole('button', { name: /Publish & copy link/i }).click()
    await expect(page.getByRole('heading', { name: 'Your job is live!' })).toBeVisible({ timeout: 20_000 })

    // Capture the application link
    const applicationLink = await page.locator('input[readonly]').inputValue()
    expect(applicationLink).toMatch(/\/jobs\/[^/]+\/apply(?:$|[?#])/)

    // ── Candidate flow ────────────────────────────────────────────────────────
    const candidateContext = await browser.newContext()
    const candidatePage = await candidateContext.newPage()

    await candidatePage.goto(applicationLink)
    await candidatePage.waitForLoadState('networkidle')
    await candidatePage.getByRole('button', { name: /submit/i }).waitFor({ state: 'visible', timeout: 15_000 })

    // The cover letter textarea must be visible (requireCoverLetter=true)
    await expect(candidatePage.locator('#coverLetterText')).toBeVisible({ timeout: 10_000 })

    // Fill required basic fields but leave cover letter EMPTY
    await candidatePage.getByLabel('First name').fill('Test')
    await candidatePage.getByLabel('Last name').fill('Applicant')
    await candidatePage.getByLabel('Email').fill(`test.applicant.${Date.now()}.r${testInfo.retry}@example.com`)

    // Submit without cover letter — client validation must block it
    await candidatePage.getByRole('button', { name: /submit/i }).click()

    // Error message should appear; the page should NOT navigate
    await expect(
      candidatePage.getByText(/Cover letter is required/i),
    ).toBeVisible({ timeout: 5_000 })
    expect(candidatePage.url()).not.toContain('/confirmation')

    await candidatePage.close()
    await candidateContext.close()
  })
})
