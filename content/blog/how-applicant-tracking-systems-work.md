---
title: "How Does an Applicant Tracking System Work?"
description: "Learn how an ATS works from the employer side — job posting, resume parsing, pipeline tracking, AI scoring, and the data flow connecting each stage."
date: 2026-03-04
author: "Reqcore Team"
image: "/og-image.png"
tags: ["applicant-tracking-system", "ats", "how-ats-works", "recruitment", "hiring"]
---

# How Does an Applicant Tracking System Work?

An applicant tracking system (ATS) works by centralizing every step of hiring — job posting, application collection, resume parsing, candidate scoring, and pipeline tracking — into a single database that replaces spreadsheets, email threads, and shared folders. When a candidate applies, the ATS parses their resume into structured data fields, scores them against the job requirements, and places them into a configurable pipeline where recruiters track progress from application to offer.

Most articles about ATS are written for job seekers trying to "beat" the system. This one is for the other side of the table — recruiters, hiring managers, and founders who need to understand what an ATS actually does under the hood before choosing one. If you want a broader overview of what open source options exist, start with our [guide to open source applicant tracking systems](/blog/open-source-applicant-tracking-system).

## The ATS Workflow: From Job Posting to Hiring Decision

Every ATS follows the same core workflow, regardless of vendor or deployment model. The differences lie in how much control you have over each step.

| Step | What Happens | Data Created |
|------|-------------|-------------|
| **1. Job creation** | Recruiter defines the role: title, description, requirements, location, salary range | Job record with metadata and requirements |
| **2. Distribution** | ATS publishes the job to career pages, job boards (Indeed, LinkedIn), and social platforms | Distribution log — which channels received the posting |
| **3. Application** | Candidate submits resume, cover letter, and form responses via a web form or email | Candidate record + uploaded documents |
| **4. Parsing** | ATS extracts structured data from the resume — name, email, work history, skills, education | Parsed profile fields in the database |
| **5. Scoring** | System ranks the candidate against job requirements using keyword matching, rules, or AI | Match score + scoring rationale (if the ATS supports transparency) |
| **6. Pipeline tracking** | Recruiter moves the candidate through stages: applied → screened → interviewed → offered | Stage history with timestamps |
| **7. Collaboration** | Hiring managers add interview notes, scorecards, and feedback | Per-candidate evaluation records |
| **8. Decision** | Team selects a candidate and extends an offer; rejected candidates are archived for future roles | Outcome record; candidate retained in talent pool |

This table represents the data flow of a modern ATS. Each step generates structured data that feeds the next. The system's value comes from connecting these steps — a recruiter opening a candidate profile can see the parsed resume, the match score, every interview note, and the current pipeline stage in one view.

## How Resume Parsing Works Inside an ATS

Resume parsing is the first automated step after a candidate applies. The ATS reads an uploaded file (PDF, DOCX, or plain text), extracts information, and maps it to database fields.

**What the parser extracts:**

- **Contact information** — name, email, phone number, location
- **Work history** — job titles, company names, employment dates, descriptions
- **Education** — degrees, institutions, graduation dates
- **Skills** — technical skills, certifications, languages
- **Custom fields** — anything the application form explicitly asks for (visa status, salary expectations, availability)

**How parsing actually works:** Most ATS parsers use a combination of regular expressions (for predictable patterns like email addresses and phone numbers) and natural language processing (for unstructured sections like job descriptions). The parser identifies section boundaries — "Work Experience", "Education", "Skills" — and extracts content within each section into the corresponding database fields.

Parsing accuracy varies significantly between systems. Legacy ATS platforms that rely purely on keyword extraction miss context. A resume that says "managed a team of 12 engineers" might get tagged with "management" as a skill, but a more sophisticated parser recognizes "12 engineers" as a team size indicator and "managed" as leadership experience.

When we built Reqcore's parsing pipeline, we found that the biggest challenge was not extracting text — it was handling the diversity of resume formats. Candidates use tables, columns, headers, footers, and graphics that break simple text extraction. PDF files are particularly difficult because they store visual positioning data, not semantic structure. The parser needs to reconstruct reading order from coordinates, which is why some ATS platforms [recommend DOCX over PDF](https://www.indeed.com/career-advice/resumes-cover-letters/ats-resume).

## How ATS Pipeline Stages Track Candidates

The pipeline is the operational core of any ATS. It represents the hiring process as a sequence of stages that every candidate moves through.

**A typical pipeline looks like this:**

1. **Applied** — candidate submitted an application
2. **Screened** — recruiter reviewed the parsed profile and decided the candidate is worth evaluating
3. **Phone screen** — initial conversation to validate fit
4. **Interview** — structured or unstructured interview with the hiring team
5. **Reference check** — verification of claims and background
6. **Offer** — formal offer extended
7. **Hired** — candidate accepted and onboarding begins

At each stage transition, the ATS records a timestamp, the user who made the move, and any notes attached to the decision. This audit trail serves two purposes: operational visibility (where are all my candidates right now?) and compliance documentation (why was this candidate rejected at this stage?).

**Why rigid pipelines fail:** When we built Reqcore's pipeline system, we learned that rigid 5-stage pipelines break immediately in practice. An engineering team might need a take-home assignment stage between phone screen and interview. A retail company might skip phone screens entirely. A government contractor might require a security clearance stage after the offer. Every team structures hiring differently, which means configurable stages are not optional — they are a core requirement for any production ATS.

The best ATS platforms let you define custom stages per job, not per organization. A senior developer role and an entry-level customer support role should not share the same pipeline.

## How Candidate Scoring Works in an ATS

Candidate scoring is where ATS platforms diverge most. There are three approaches, and understanding the differences matters for both hiring quality and legal compliance.

| Scoring Method | How It Works | Strengths | Weaknesses |
|---------------|-------------|-----------|------------|
| **Keyword matching** | Compares resume text against job description keywords; counts matches | Simple, fast, predictable | Misses synonyms ("JavaScript" vs "JS"), penalizes non-standard resumes |
| **Weighted rules** | Recruiter assigns point values to criteria (5 years experience = 10 pts, Python = 5 pts) | Transparent, customizable | Manual setup per job, doesn't scale |
| **AI/ML scoring** | Model analyzes resume semantically and predicts candidate-job fit | Handles synonyms, context, and inferred skills | Often opaque — recruiter cannot see why a score was assigned |

**The transparency problem:** Most commercial ATS platforms that use AI scoring hide the algorithm. A recruiter sees "87% match" but cannot determine whether that score reflects genuine qualification alignment or a statistical artifact. The [EU AI Act classifies employment-decision AI as high-risk](https://artificialintelligenceact.eu/), requiring transparency and human oversight — requirements that opaque scoring cannot meet.

Transparent ATS platforms take a different approach. Reqcore's planned AI matching will produce a readable summary explaining *why* each candidate scored the way they did — which qualifications matched, which were missing, and how heavily each factor was weighted. Every ranking decision should be explainable and auditable, not hidden behind a proprietary algorithm.

This distinction matters beyond compliance. Recruiters who understand *why* a candidate scored well can make faster, more confident decisions. Recruiters who see only a number have to second-guess the system or blindly trust it — neither of which produces good hiring outcomes.

## What Happens to Your Data Inside an ATS

Understanding the data layer matters because it determines who owns your candidate information and what happens if you switch systems.

**The ATS database stores:**

- **Candidate profiles** — parsed resume data, contact info, custom fields
- **Documents** — resumes, cover letters, portfolios (stored as files or in object storage)
- **Job records** — descriptions, requirements, posting metadata
- **Applications** — the link between a candidate and a job, with status and timeline
- **Pipeline history** — every stage transition with timestamps
- **Evaluations** — interview notes, scorecards, hiring manager feedback
- **Communications** — emails sent through the ATS
- **Analytics data** — time-to-fill, source-of-hire, conversion rates

In a cloud ATS (Greenhouse, Lever, Workable), this data lives on the vendor's servers. You access it through the vendor's interface and API. If you cancel your subscription, exporting this data is often incomplete — custom fields, pipeline stages, and scorecards rarely survive migration intact. For a deeper analysis of this trade-off, see our [self-hosted vs cloud ATS comparison](/blog/self-hosted-vs-cloud-ats).

In a [self-hosted ATS](/blog/open-source-applicant-tracking-system), the database runs on infrastructure you control. We chose PostgreSQL 16 for Reqcore specifically because its JSON column support handles custom application form schemas — every organization asks different questions on their application forms, and a relational database needs flexible schema support to accommodate this without schema migrations for every new field. A standard `pg_dump` gives you a complete, portable backup that works with any PostgreSQL-compatible tool.

**The practical difference:** With a cloud ATS, your candidate database is a rental. With a self-hosted ATS, it is an asset you own. According to [SHRM research](https://www.shrm.org/topics-tools/news/talent-acquisition), the average cost-per-hire sits around $4,700 — much of that cost is wasted if the candidate data you collect disappears when you switch vendors.

## How an ATS Connects to Your Hiring Stack

No ATS operates in isolation. The system's value increases when it integrates with the tools your team already uses.

**Common ATS integrations:**

- **Job boards** — [Indeed](https://www.indeed.com/), [LinkedIn](https://www.linkedin.com/), Google for Jobs. The ATS pushes job postings to these platforms and pulls applications back in.
- **Career page** — Your own [branded career page](/blog/career-page-that-converts) where candidates apply directly. The ATS generates individual job URLs and can add [structured data for Google for Jobs](/blog/google-for-jobs-structured-data) automatically.
- **Calendar tools** — Google Calendar, Outlook. Interview scheduling syncs automatically.
- **Communication** — Email (SMTP), Slack, Microsoft Teams. Candidate notifications and team discussions flow through the ATS.
- **Background checks** — Third-party services triggered directly from the pipeline when a candidate reaches the reference check stage.
- **HRIS/Payroll** — Once a candidate is hired, their data transfers to the HR information system for onboarding.

The integration model differs between proprietary and open source ATS. Proprietary platforms ship pre-built connectors — Greenhouse lists 500+ integrations — but these connectors are vendor-controlled. If the integration breaks, you wait for the vendor to fix it.

Open source ATS platforms take an API-first approach. They expose candidate, job, and application data through REST or GraphQL APIs. You build the specific integrations your team needs using tools like [Zapier](https://zapier.com/), [n8n](https://n8n.io/), or custom scripts. The trade-off: fewer turnkey connectors, but full control over the data flow.

According to [Jobscan](https://www.jobscan.co/blog/fortune-500-use-applicant-tracking-systems/), 98.4% of Fortune 500 companies use an ATS. At that scale, integration quality — not feature count — determines whether the ATS accelerates or bottlenecks the hiring process.

## Frequently Asked Questions

### Does an ATS automatically reject candidates?

An ATS does not automatically reject candidates in most configurations. It scores and ranks applicants based on criteria, but a human recruiter makes the final decision to advance or reject. Some enterprise ATS platforms offer auto-rejection rules for candidates who do not meet minimum qualifications (for example, lacking a required certification), but this feature requires explicit configuration by the recruiting team.

### How is an ATS different from a CRM?

An ATS manages active job applications — candidates who have applied to a specific role. A candidate relationship management (CRM) system manages passive talent — people you want to engage for future roles who have not yet applied. Many modern ATS platforms include CRM features, but the core workflows are different. The ATS tracks "applied → screened → interviewed → hired." The CRM tracks "sourced → nurtured → converted to applicant."

### Can a small business benefit from an ATS?

Yes. The break-even point is lower than most teams expect. If you receive more than 20 applications per open role or hire more than 5 people per year, an ATS saves meaningful time over spreadsheets and email. Open source ATS platforms like [Reqcore](/) eliminate the cost barrier entirely — there are no licensing fees, and a self-hosted deployment runs on infrastructure costing [$5–$20 per month](/blog/total-cost-of-ownership-saas-ats-vs-self-hosted).

### What data does an ATS collect?

An ATS collects candidate contact information, parsed resume data (work history, education, skills), application form responses, documents (resumes, cover letters), interview notes, pipeline stage history, communication logs, and evaluation scores. In a [self-hosted open source ATS](/blog/open-source-applicant-tracking-system), you control all of this data. In a cloud ATS, the vendor stores it on their infrastructure.

## The Bottom Line

An applicant tracking system works by converting the messy, manual hiring process into a structured data pipeline. Resumes become parsed database records. Pipeline stages become an auditable decision trail. Candidate scoring replaces gut-feel screening with structured evaluation — transparent or opaque, depending on the system you choose.

The key questions are not about features. Every ATS parses resumes, tracks pipelines, and sends emails. The questions that actually differentiate ATS platforms are: Who owns the data? Can you see how candidates are scored? Does the cost scale with your team size?

For a deeper comparison of specific platforms that answer these questions differently, see our guide to the [best open source applicant tracking systems](/blog/best-open-source-applicant-tracking-systems).

---

*[Reqcore](/) is an open-source applicant tracking system with transparent AI, no per-seat pricing, and full data ownership. [Try the live demo](/auth/sign-in) or explore the [product roadmap](/roadmap).*
