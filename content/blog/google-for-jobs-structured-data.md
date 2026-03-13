---
title: "Google for Jobs: Structured Data Implementation Guide"
description: "Implement JobPosting structured data for Google for Jobs. Step-by-step JSON-LD setup, required fields, validation, and common errors with fixes."
date: 2026-03-15
author: "Reqcore Team"
image: "/og-image.png"
tags: ["google-for-jobs", "structured-data", "jobposting-schema", "career-page-seo", "recruitment"]
---

# Google for Jobs: Structured Data Implementation Guide

Google for Jobs displays job listings in a rich, interactive panel directly in Google search results. When someone searches "backend engineer remote" or "marketing manager New York," matching jobs appear above organic results with salary, company, and location details. Getting your listings into this panel requires one thing: valid `JobPosting` structured data on each job listing page.

This guide covers the full implementation — from JSON-LD markup to field-by-field reference to validation and common errors. If you're starting from scratch and need to set up your career page architecture first, read our [career page SEO guide](/blog/career-page-seo) before this one.

## How Google for Jobs Works

Google for Jobs is not a job board. You don't post jobs to it. Instead, Google crawls your website, finds pages with `JobPosting` structured data, and aggregates those listings into its search interface alongside listings from Indeed, LinkedIn, ZipRecruiter, and other sources.

Three requirements must be met for your listings to appear:

1. **Each job listing has its own page** with a unique, crawlable URL
2. **Each page contains valid `JobPosting` JSON-LD markup** with all required fields
3. **The page is accessible to Googlebot** — server-rendered or prerendered, not blocked by robots.txt

Google does not charge for inclusion. There is no paid placement. The only variable is whether your structured data is correct and complete.

## The Complete JobPosting JSON-LD Template

Add this JSON-LD block to the `<head>` of each job listing page. Every field shown below is either required or strongly recommended by Google.

```json
{
  "@context": "https://schema.org/",
  "@type": "JobPosting",
  "title": "Senior Backend Engineer",
  "description": "<p>We're hiring a Senior Backend Engineer to build and maintain the API layer of our applicant tracking system. You'll work with TypeScript, PostgreSQL, and Docker in a small, remote-first team.</p><h3>Responsibilities</h3><ul><li>Design and implement REST and GraphQL APIs</li><li>Write database migrations and optimize queries</li><li>Review pull requests and mentor junior developers</li></ul><h3>Requirements</h3><ul><li>4+ years backend development experience</li><li>Strong PostgreSQL or similar RDBMS experience</li><li>Experience with Docker and container orchestration</li></ul>",
  "datePosted": "2026-03-15",
  "validThrough": "2026-05-15T23:59:59Z",
  "employmentType": "FULL_TIME",
  "hiringOrganization": {
    "@type": "Organization",
    "name": "YourCompany",
    "sameAs": "https://yourcompany.com",
    "logo": "https://yourcompany.com/logo.png"
  },
  "jobLocation": {
    "@type": "Place",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "123 Main St",
      "addressLocality": "Austin",
      "addressRegion": "TX",
      "postalCode": "78701",
      "addressCountry": "US"
    }
  },
  "baseSalary": {
    "@type": "MonetaryAmount",
    "currency": "USD",
    "value": {
      "@type": "QuantitativeValue",
      "minValue": 130000,
      "maxValue": 170000,
      "unitText": "YEAR"
    }
  },
  "directApply": true
}
```

## Field-by-Field Reference

### Required Fields

These fields must be present for Google to process your listing. Missing any of them causes the listing to be rejected.

| Field | Type | Rules |
|-------|------|-------|
| `title` | String | The job title. Use a standard, searchable title — not internal codes. "Senior Backend Engineer" not "SBE-III" |
| `description` | String (HTML) | The full job description. Google accepts HTML formatting (`<p>`, `<ul>`, `<h3>`, `<br>`). Include responsibilities, requirements, and benefits. Minimum ~100 words for the listing to be considered substantial |
| `datePosted` | Date | ISO 8601 format: `YYYY-MM-DD`. Must be the actual date the job was first published. Do not backdate or future-date |
| `hiringOrganization` | Object | Must include `name` and `sameAs` (company URL). `logo` is strongly recommended — listed jobs with logos get higher click-through rates |
| `jobLocation` | Object | Required for non-remote jobs. Contains a `PostalAddress` with at minimum `addressLocality` and `addressCountry` |

### Strongly Recommended Fields

These fields are not strictly required, but listings that include them rank higher in Google for Jobs and display more information to candidates.

| Field | Type | Rules |
|-------|------|-------|
| `baseSalary` | Object | Salary range with `currency`, `minValue`, `maxValue`, and `unitText` (HOUR, WEEK, MONTH, YEAR). Google prominently displays salary data — listings with salary get significantly more clicks |
| `validThrough` | DateTime | When the listing expires. ISO 8601 format with timezone: `2026-05-15T23:59:59Z`. Google removes expired listings automatically. Set this to avoid stale listings staying in results |
| `employmentType` | String | One of: `FULL_TIME`, `PART_TIME`, `CONTRACTOR`, `TEMPORARY`, `INTERN`, `VOLUNTEER`, `PER_DIEM`, `OTHER`. Can be an array if the role accepts multiple types |
| `directApply` | Boolean | Set to `true` if candidates can submit their application directly on your page without being redirected. Google flags direct-apply listings, which increases click-through rate |
| `applicantLocationRequirements` | Object | Required for remote jobs. Specifies geographic restrictions for applicants: `{"@type": "Country", "name": "US"}` |
| `jobLocationType` | String | Set to `TELECOMMUTE` for fully remote positions. Used in combination with `applicantLocationRequirements` |

### Remote Job Configuration

Remote and hybrid jobs require specific schema configuration. Google is strict about this — incorrect "remote" markup is a common rejection reason.

**Fully remote, US only:**
```json
{
  "jobLocationType": "TELECOMMUTE",
  "applicantLocationRequirements": {
    "@type": "Country",
    "name": "US"
  }
}
```

**Fully remote, no geographic restriction:**
```json
{
  "jobLocationType": "TELECOMMUTE",
  "applicantLocationRequirements": {
    "@type": "Country",
    "name": "Worldwide"
  }
}
```

**Hybrid (on-site + remote):**
```json
{
  "jobLocationType": "TELECOMMUTE",
  "jobLocation": {
    "@type": "Place",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Austin",
      "addressRegion": "TX",
      "addressCountry": "US"
    }
  },
  "applicantLocationRequirements": {
    "@type": "Country",
    "name": "US"
  }
}
```

For hybrid roles, include both `jobLocation` (the physical office) and `jobLocationType: TELECOMMUTE` with `applicantLocationRequirements`.

## Implementation in a Nuxt/Vue Application

If your career page runs on Nuxt (as Reqcore does), you can inject the structured data using the `useHead` composable or the `@nuxtjs/seo` module's `useSchemaOrg`.

### Option A: useSchemaOrg (Recommended)

Using the `@nuxtjs/seo` package with `defineJobPosting`:

```typescript
useSchemaOrg([
  defineJobPosting({
    title: job.value.title,
    description: job.value.description,
    datePosted: new Date(job.value.createdAt).toISOString().split('T')[0],
    validThrough: job.value.expiresAt
      ? new Date(job.value.expiresAt).toISOString()
      : undefined,
    hiringOrganization: {
      name: org.value.name,
      sameAs: `https://reqcore.com`,
      logo: org.value.logo || 'https://reqcore.com/og-image.png',
    },
    jobLocation: job.value.location
      ? {
          address: {
            addressLocality: job.value.location,
            addressCountry: job.value.country || 'US',
          },
        }
      : undefined,
    jobLocationType: job.value.remote ? 'TELECOMMUTE' : undefined,
    baseSalary: job.value.salaryMin
      ? {
          currency: job.value.currency || 'USD',
          value: {
            minValue: job.value.salaryMin,
            maxValue: job.value.salaryMax,
            unitText: 'YEAR',
          },
        }
      : undefined,
    employmentType: job.value.employmentType || 'FULL_TIME',
    directApply: true,
  }),
])
```

### Option B: Manual JSON-LD via useHead

If you're not using `@nuxtjs/seo`, inject the JSON-LD script tag directly:

```typescript
useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org/',
        '@type': 'JobPosting',
        title: job.value.title,
        description: job.value.description,
        datePosted: job.value.createdAt,
        hiringOrganization: {
          '@type': 'Organization',
          name: org.value.name,
          sameAs: 'https://reqcore.com',
        },
        jobLocation: {
          '@type': 'Place',
          address: {
            '@type': 'PostalAddress',
            addressLocality: job.value.location,
            addressCountry: 'US',
          },
        },
        directApply: true,
      }),
    },
  ],
})
```

Both approaches produce the same output: a `<script type="application/ld+json">` tag in the page's `<head>` that Googlebot reads during crawling.

## Validation and Testing

### Google's Rich Results Test

Before deploying, validate your structured data using [Google's Rich Results Test](https://search.google.com/test/rich-results):

1. Enter the URL of a live job listing page (or paste the HTML)
2. The tool parses the JSON-LD and reports errors and warnings
3. Fix any errors — they prevent inclusion in Google for Jobs
4. Warnings are non-blocking but indicate opportunities to add recommended fields

### Schema.org Validator

For detailed schema validation, use the [Schema.org Validator](https://validator.schema.org/). This catches structural issues that Google's tool may not flag, such as incorrect nested types or invalid enum values.

### Google Search Console

After deployment, monitor your listings in Google Search Console:

1. Navigate to **Enhancements → Job postings**
2. Check for errors (invalid fields, missing required properties)
3. Monitor impressions and clicks — this shows how often your listings appear in Google for Jobs
4. Fix errors promptly — Google stops showing listings with persistent structured data errors

## Common Errors and How to Fix Them

These errors appear repeatedly in Google Search Console for job listing pages:

| Error | Cause | Fix |
|-------|-------|-----|
| `title` field is missing | JSON-LD doesn't include a `title` property | Add `"title": "Job Title"` — this is the role title, not the page title |
| `description` is too short | Description is under ~100 words | Expand the description with responsibilities, requirements, and benefits in HTML format |
| `datePosted` is invalid | Wrong date format or missing timezone | Use ISO 8601: `"2026-03-15"` for date-only, `"2026-03-15T00:00:00Z"` for datetime |
| `hiringOrganization` is missing `name` | Organization object is incomplete | Add `"name": "Company Name"` inside the `hiringOrganization` object |
| Job location missing for non-remote job | No `jobLocation` and no `jobLocationType: TELECOMMUTE` | Add either a physical `jobLocation` or set `jobLocationType` to `TELECOMMUTE` |
| Expired listing still indexed | `validThrough` date has passed but page is still live | Remove the JSON-LD, return 404, or send a `URL_DELETED` notification via the Indexing API |
| Remote job missing `applicantLocationRequirements` | Set `TELECOMMUTE` but didn't specify where candidates can be located | Add `applicantLocationRequirements` with at least a country |
| Salary data format incorrect | Used a plain number instead of a `MonetaryAmount` object | Wrap salary in `MonetaryAmount` with `currency`, `value` (which contains `minValue`, `maxValue`, `unitText`) |

## Lifecycle Management: Publishing and Removing Listings

Structured data has a lifecycle. A job listing isn't static — it's created, published, and eventually closed. Your structured data management must handle each state.

### When a Job Is Published

1. Add `JobPosting` JSON-LD to the page
2. Include `datePosted` set to today's date
3. Set `validThrough` if the position has a known close date
4. Submit the URL to [Google's Indexing API](/blog/career-page-seo) to accelerate discovery

### When a Job Is Closed

1. Remove the `JobPosting` JSON-LD from the page, OR
2. Return a 404 status code for the URL, OR
3. Redirect to the main careers page
4. Submit a `URL_DELETED` notification via the Indexing API

The worst outcome is a closed job that remains indexed in Google for Jobs. Candidates apply to a dead listing, have a negative experience, and associate your company with poor candidate communication.

If you're running an ATS that supports [status-based job workflows](/blog/how-applicant-tracking-systems-work) (draft → open → closed → archived), tie the structured data output to the "open" status. When a recruiter closes a job in the ATS, the structured data disappears automatically.

## FAQ

### Does Google for Jobs cost money?

No. Google for Jobs is entirely free. Google crawls `JobPosting` structured data from your website and includes valid listings in its search results. There is no paid tier, no premium placement, and no way to bid for higher visibility. The only cost is the engineering time to implement and maintain the structured data.

### How quickly do listings appear in Google for Jobs?

With the Indexing API, listings typically appear within 1–24 hours. Without the API, Google's standard crawling schedule applies — which can take days or weeks. For time-sensitive job postings, the Indexing API is essential.

### Can I use Google for Jobs without a career page?

No. Google for Jobs requires a crawlable web page with `JobPosting` structured data. You cannot submit jobs directly to Google — there is no submission form or API for posting jobs. You need a career page (or ATS-generated job listing pages) that Google can crawl.

### What happens if my structured data has errors?

Google Search Console reports structured data errors under **Enhancements → Job postings**. Listings with errors are excluded from Google for Jobs until the errors are fixed. Common errors include missing required fields, incorrect date formats, and incomplete organization or location objects. Use the [Rich Results Test](https://search.google.com/test/rich-results) to validate before deploying.

### Do I need structured data on every job listing page?

Yes. Each job listing page needs its own `JobPosting` JSON-LD block with details specific to that role. You cannot put multiple job postings in a single structured data block on one page — Google requires one `JobPosting` per URL. This is why having [individual URLs per job listing](/blog/career-page-seo) is a prerequisite.

## The Bottom Line

Google for Jobs structured data is the most direct path to free, high-intent applicant traffic. The implementation is a JSON-LD block on each job listing page with the required fields: title, description, date posted, hiring organization, and location. Add salary data and direct apply flags for higher visibility. Validate with Google's Rich Results Test, monitor in Search Console, and automate lifecycle management through your ATS so closed jobs don't linger in search results.

The companies that get this right stop paying job boards for traffic that Google would have sent them for free.

---

*[Reqcore](/) is an open-source applicant tracking system with transparent AI, no per-seat pricing, and full data ownership. [Try the live demo](/auth/sign-in) or explore the [product roadmap](/roadmap).*
