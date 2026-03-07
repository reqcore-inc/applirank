# Topical Authority Map: Open Source ATS

> **Status:** Living roadmap — check off articles as they are published.
>
> **Goal:** Build definitive topical authority for "open source applicant tracking systems" across 9 tightly-linked content clusters.
>
> **Total articles:** 132 | **Target pace:** ~1 per day | **Timeline:** ~4 months (Phases 1–4) + ongoing refresh

---

## How This Map Works

### Design Principles
- **Tight `siteFocusScore`** — every article reinforces the core topic (open-source ATS, recruitment technology, self-hosted hiring software).
- **Minimal `siteRadius`** — no generic HR, career advice, or resume-tip content. Everything serves the topical graph.
- **Deep cluster coverage** — each cluster has one comprehensive pillar + focused supporting articles.
- **Strong internal linking** — every supporting article links to its pillar + 2–3 siblings. Cross-cluster links are noted explicitly.

### Exclusions
Generic HR content, general career advice, resume tips for job seekers. These dilute focus and attract unqualified traffic.

### Intent Tags
| Tag | Meaning | Typical Format |
|-----|---------|----------------|
| 🔵 | Informational | Guide, explainer, glossary |
| 🟢 | Commercial | Comparison, roundup, buyer's guide |
| 🔴 | Transactional | Checklist, migration tool, scorecard |

### Linking Rules
- Every supporting article **must** link to its cluster pillar.
- Every pillar **must** link to all its supporting articles.
- Cross-cluster links are noted with `→ [Cluster X]` and must be implemented as internal links.
- Follow the internal linking rules in [`.agents/skills/seo-skill/SKILL.md`](.agents/skills/seo-skill/SKILL.md) §9.

### Content Quality Standards
All articles must follow the SEO Skill ([`.agents/skills/seo-skill/SKILL.md`](.agents/skills/seo-skill/SKILL.md)):
- **Pillars:** 2,500+ words, hub page with links to every supporting article.
- **Supporting articles:** 1,200–2,000 words, links to pillar + 2–3 siblings.
- Every article must include at least one of: original screenshot, data point, code snippet, decision framework, or template.
- No filler paragraphs — every section teaches something specific.
- First-person experience from building Reqcore wherever relevant (E-E-A-T).
- Answer the query in the first 100 words (featured snippet + AI Overview optimization).
- Apply the full [SEO Quality Checklist](.agents/skills/seo-skill/SKILL.md) §15 before publishing.
- Update every pillar page quarterly (freshness signal).

### File Conventions
- Blog articles go in `content/blog/<slug>.md`
- Filename = URL slug (no dates, no uppercase, hyphens only) — see SEO Skill §5
- Complete frontmatter required (title, description, date, author, image, tags) — see SEO Skill §2

---

## Phase 1: Foundation + Money (Weeks 1–4)

> Write the money cluster first to capture commercial-intent traffic immediately, then the foundation cluster to give Google base topical context.

### Cluster 2: Choosing & Comparing ATS Solutions (Money Cluster) — 25 articles

> Highest commercial intent. People searching these are actively evaluating tools. #1 revenue-driving cluster.

**Pillar:**
- [x] Best open source applicant tracking systems [2026] 🟢 — [`best-open-source-applicant-tracking-systems.md`](content/blog/best-open-source-applicant-tracking-systems.md)

**Supporting — Roundups:**
- [ ] Best free ATS software for startups 🟢
- [ ] Best self-hosted ATS platforms compared 🟢
- [ ] Best ATS for small businesses (under 50 employees) 🟢
- [ ] Best ATS for recruiting agencies (open source options) 🟢
- [ ] Best ATS with transparent AI scoring 🟢 → [Cluster 3]
- [ ] Best lightweight ATS for teams that hate bloated software 🟢

**Supporting — Head-to-head comparisons:**
- [ ] Greenhouse vs open source ATS: honest comparison 🟢
- [ ] Lever vs open source ATS: features, cost, and flexibility 🟢
- [ ] Ashby vs open source ATS: modern ATS showdown 🟢
- [ ] Workable vs open source ATS: which is more flexible? 🟢
- [ ] JazzHR vs open source ATS: budget-friendly comparison 🟢
- [ ] BambooHR vs open source ATS: best for small teams? 🟢
- [ ] Recruitee vs open source ATS: customization compared 🟢
- [ ] Manatal vs open source ATS: AI features compared 🟢 → [Cluster 3]
- [ ] Zoho Recruit vs open source ATS: ecosystem comparison 🟢
- [ ] iCIMS vs open source ATS: legacy vs modern 🟢
- [ ] SmartRecruiters vs open source ATS: enterprise vs DIY 🟢
- [x] OpenCATS vs Reqcore: open source ATS head-to-head 🟢 — [`opencats-vs-reqcore.md`](content/blog/opencats-vs-reqcore.md)

**Supporting — Decision frameworks:**
- [ ] ATS features that actually matter (and which are bloat) 🟢
- [ ] Red flags when evaluating an applicant tracking system 🟢
- [x] Total cost of ownership: SaaS ATS vs self-hosted open source 🟢 → [Cluster 4]
- [ ] How to run an ATS proof of concept before committing 🟢
- [ ] Questions to ask in an ATS demo that vendors don't want you to ask 🟢
- [ ] The ATS buyer's scorecard: how to evaluate and rank options 🔴

---

### Cluster 1: What Is an Open Source ATS (Foundation Pillar) — 10 articles

> Build first awareness and capture top-of-funnel informational queries. Establishes the right to rank for everything else.

**Pillar:**
- [x] What is an open source applicant tracking system? (The complete guide) 🔵 — [`open-source-applicant-tracking-system.md`](content/blog/open-source-applicant-tracking-system.md)

**Supporting:**
- [x] How does an applicant tracking system work? (The basics explained) 🔵 — [`how-applicant-tracking-systems-work.md`](content/blog/how-applicant-tracking-systems-work.md)
- [ ] Open source vs proprietary ATS: what's the real difference? 🔵 → [Cluster 2]
- [x] Open source vs free ATS: why "free" and "open source" aren't the same thing 🔵 — [`open-source-vs-free-ats.md`](content/blog/open-source-vs-free-ats.md)
- [ ] What does open source licensing mean for ATS software? (MIT, GPL, Apache explained) 🔵
- [ ] Who uses open source ATS? Use cases by company size and type 🔵 → [Cluster 6]
- [ ] The true cost of running an open source ATS 🟢 → [Cluster 2]
- [ ] Is open source ATS secure enough for candidate data? 🔵 → [Cluster 5]
- [x] What "self-hosted" means and why it matters for recruiting software 🔵 → [Cluster 4] — [`self-hosted-vs-cloud-ats.md`](content/blog/self-hosted-vs-cloud-ats.md)
- [ ] Open source ATS glossary: 50 terms every recruiter should know 🔵

---

**Phase 1 total: 35 articles** | Progress: 4/35

---

## Phase 2: Differentiation (Weeks 5–8)

> These are Reqcore's moat. No competitor covers transparent AI scoring or self-hosted data ownership with this depth.

### Cluster 3: AI & Automation in Your ATS (Differentiation Cluster) — 17 articles

> Where Reqcore's transparent AI positioning shines. High interest, under-served by competitors.

**Pillar:**
- [ ] How AI works in modern applicant tracking systems (the honest guide) 🔵

**Supporting — How AI works:**
- [ ] How AI candidate scoring actually works inside an ATS 🔵
- [ ] AI resume parsing explained: how your ATS reads resumes 🔵
- [ ] Keyword matching vs semantic matching: how modern ATS rank candidates 🔵
- [ ] How to configure AI scoring rules that reflect your hiring values 🔵
- [ ] AI skills extraction: automatically mapping candidate competencies 🔵

**Supporting — Transparency & bias:**
- [ ] Transparent AI scoring vs black-box algorithms: why it matters 🔵
- [ ] AI bias in applicant tracking systems: real risks and how to mitigate them 🔵
- [ ] How to audit your ATS for algorithmic fairness 🔵
- [ ] Explainable AI in recruiting: why candidates deserve to know how they're scored 🔵
- [ ] The legal landscape of AI in hiring (NYC Local Law 144, EU AI Act) 🔵 → [Cluster 5]

**Supporting — Practical AI automation:**
- [ ] Automating candidate screening without losing the human touch 🔵
- [ ] How to use AI to write better job descriptions 🔵
- [ ] AI-powered candidate matching: how to set it up in your ATS 🔵
- [ ] Automated email sequences for candidate nurturing in your ATS 🔵
- [ ] Using LLMs to summarize interview feedback 🔵
- [ ] When AI should NOT make the hiring decision 🔵

---

### Cluster 4: Self-Hosting, Data Ownership & Setup (Moat Cluster) — 16 articles

> Nobody else writes this content well. Own the conversation and build unique authority.

**Pillar:**
- [ ] The complete guide to self-hosting your applicant tracking system 🔵

**Supporting — Data ownership:**
- [ ] Why data ownership matters in recruiting technology 🔵
- [ ] Vendor lock-in in ATS: how it happens and how to avoid it 🔵
- [ ] What happens to your candidate data when your ATS vendor shuts down 🔵
- [ ] Data portability in recruiting: why it should be non-negotiable 🔵
- [ ] Self-hosted vs cloud ATS: a data ownership perspective 🟢 → [Cluster 2]

**Supporting — Deployment guides:**
- [ ] How to deploy an open source ATS with Docker (step-by-step) 🔵
- [ ] Deploying an open source ATS on AWS 🔵
- [ ] Deploying an open source ATS on DigitalOcean 🔵
- [ ] Deploying an open source ATS on Railway / Render / Fly.io 🔵
- [ ] One-click deploy: getting your ATS running in under 10 minutes 🔵

**Supporting — Operations:**
- [ ] Backup and disaster recovery for your self-hosted ATS 🔵
- [ ] Monitoring and uptime for self-hosted ATS 🔵
- [ ] Scaling your self-hosted ATS as your team grows 🔵
- [ ] ATS security hardening: SSL, access control, and audit logs 🔵 → [Cluster 5]
- [ ] Cost breakdown: self-hosted ATS infrastructure month by month 🟢 → [Cluster 2]

---

**Phase 2 total: 33 articles** | Progress: 0/33

---

## Phase 3: Practitioner Depth (Weeks 9–12)

> High dwell-time content that proves genuine usefulness via `lastLongestClicks`. Feeds Reddit strategy — how-tos and metric breakdowns are highly shareable.

### Cluster 6: ATS Setup, Workflows & Daily Use (Practitioner Cluster) — 16 articles

> Targets people who already have (or are about to get) an ATS. Long reads, how-tos, step-by-steps.

**Pillar:**
- [ ] How to set up your ATS from scratch: the complete workflow guide 🔵

**Supporting — Initial setup:**
- [ ] How to design your hiring pipeline stages 🔵
- [ ] Configuring custom workflows in your ATS 🔵
- [ ] Setting up user roles and permissions 🔵
- [ ] How to configure ATS email templates and SMTP settings 🔵
- [ ] Customizing application forms for different roles 🔵
- [ ] Setting up your first job posting in an open source ATS 🔵

**Supporting — Integrations:**
- [ ] How to integrate your ATS with job boards (Indeed, LinkedIn) 🔵
- [ ] Calendar and scheduling integrations for your ATS 🔵
- [ ] Slack and Teams integrations for hiring collaboration 🔵
- [ ] Zapier and n8n automation workflows for your ATS 🔵
- [ ] How to build a career page connected to your ATS 🔵 → [Cluster 8]
- [ ] Using your ATS API: developer quickstart guide 🔵

**Supporting — Migration:**
- [ ] How to migrate from spreadsheets to an ATS 🟢 → [Cluster 2]
- [ ] How to migrate candidate data between ATS platforms 🔵
- [ ] How to export your data from Greenhouse / Lever / Workable 🔵 → [Cluster 4]

---

### Cluster 7: Recruiting Metrics & ATS Analytics (Data Cluster) — 15 articles

> Data-driven content demonstrating expertise. Recruiter leaders search these when building reports for leadership.

**Pillar:**
- [ ] The recruiting metrics that actually matter (and how to track them in your ATS) 🔵

**Supporting — Core metrics:**
- [ ] How to calculate cost-per-hire accurately 🔵
- [ ] Time-to-fill vs time-to-hire: the difference and why it matters 🔵
- [ ] Quality of hire: how to measure it with ATS data 🔵
- [ ] Offer acceptance rate: benchmarks and how to improve 🔵
- [ ] Source of hire tracking: attributing candidates to channels 🔵

**Supporting — Pipeline analytics:**
- [ ] Pipeline conversion rates: diagnosing where you lose candidates 🔵
- [ ] Candidate drop-off analysis: finding and fixing bottlenecks 🔵
- [ ] Recruiter productivity metrics: what to measure without micromanaging 🔵
- [ ] Application completion rate: how your forms affect your funnel 🔵 → [Cluster 6]

**Supporting — Reporting:**
- [ ] How to build a recruiting dashboard with your ATS data 🔵
- [ ] Presenting recruiting data to leadership: the 5 numbers they care about 🔵
- [ ] Using ATS data to forecast hiring needs 🔵
- [ ] Diversity hiring metrics: what to track and how 🔵
- [ ] How to benchmark your recruiting against industry standards 🔵

---

**Phase 3 total: 31 articles** | Progress: 0/31

---

## Phase 4: Trust + Conversion (Weeks 13–16)

> Compliance content attracts backlinks from legal/HR blogs. Migration content converts people convinced by comparison posts.

### Cluster 5: Compliance, Privacy & Candidate Data (Trust Cluster) — 15 articles

> Builds E-E-A-T trust signals. Compliance content gets linked by legal blogs and HR publications — backlink magnet.

**Pillar:**
- [ ] ATS compliance guide: GDPR, EEOC, and candidate data privacy 🔵

**Supporting — Data privacy:**
- [ ] GDPR compliance for your applicant tracking system 🔵
- [ ] CCPA and candidate data: what your ATS needs to handle 🔵
- [ ] Right to deletion: handling candidate data requests in your ATS 🔵
- [ ] Consent management for candidate data collection 🔵
- [ ] Data retention policies: how long should you keep candidate data? 🔵
- [ ] International data transfers and your ATS (EU-US, PIPEDA, LGPD) 🔵

**Supporting — Employment law:**
- [ ] EEO and OFCCP reporting with your ATS 🔵
- [ ] Ban-the-box laws: how to configure your ATS 🔵
- [ ] Pay transparency laws and your job postings 🔵
- [ ] Adverse impact analysis using your ATS data 🔵
- [ ] AI hiring regulations: what your ATS needs to comply with 🔵 → [Cluster 3]

**Supporting — Security frameworks:**
- [ ] Open source ATS and SOC 2: what you need to know 🔵
- [ ] Candidate data encryption: at rest and in transit 🔵 → [Cluster 4]
- [ ] How to create a data processing agreement (DPA) for your ATS 🔵

---

### Cluster 8: Career Pages & Employer Brand (Conversion Cluster) — 9 articles

> Captures people optimizing their hiring presence. Naturally links to ATS setup and integrations.

**Pillar:**
- [ ] How to build a career page that converts (the ATS-powered guide) 🔵

**Supporting:**
- [ ] Career page SEO: getting your job listings found on Google 🔵
- [ ] Google for Jobs: structured data implementation guide 🔵
- [ ] Application form design: reducing candidate drop-off 🔵 → [Cluster 7]
- [ ] Mobile career pages: why they matter and how to optimize 🔵
- [ ] Custom career page vs ATS-generated page: pros and cons 🔵
- [ ] How your ATS shapes the candidate experience 🔵
- [ ] Employer branding on a budget for small teams 🔵
- [ ] How to A/B test your job application flow with ATS data 🔵 → [Cluster 7]

---

### Cluster 9: Migration & Switching ATS (Action Cluster) — 9 articles

> Pure conversion content. People searching these are ready to switch. Tightest path to Reqcore adoption.

**Pillar:**
- [ ] How to switch your ATS without losing data or momentum 🔴

**Supporting:**
- [ ] Signs it's time to replace your current ATS 🟢
- [ ] How to convince your team to switch ATS platforms 🟢
- [ ] The real cost of switching ATS (time, data, disruption) 🟢 → [Cluster 2]
- [ ] ATS data migration checklist: nothing gets left behind 🔴
- [ ] How to export candidate data from any ATS 🔵 → [Cluster 4]
- [ ] Mapping fields between ATS platforms: the data translation guide 🔵
- [ ] How to handle duplicate candidates during migration 🔵
- [ ] Post-migration validation: making sure nothing broke 🔵

---

**Phase 4 total: 33 articles** | Progress: 0/33

---

## Phase 5: Ongoing Refresh Cycle

After Phase 4, return to Phase 1 content and upgrade:

- [ ] Review and update all Cluster 2 comparison posts with new data, screenshots, and refreshed dates
- [ ] Review and update all Cluster 1 pillar + supporting articles
- [ ] Add new competitor comparison articles as the market evolves
- [ ] Expand thin articles with deeper sections
- [ ] Check and fix all internal and external links across all clusters
- [ ] Update every pillar page (quarterly cadence per SEO Skill §13)
- [ ] Monitor ranking drops and fill content gaps identified by SERP analysis

---

## Cross-Cluster Linking Map

```
                    ┌──────────────┐
                    │  Cluster 1   │
                    │ Fundamentals │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
      ┌───────▼──────┐ ┌──▼───────┐ ┌──▼──────────┐
      │  Cluster 2   │ │Cluster 4 │ │  Cluster 3   │
      │ Comparisons  │ │Data Own. │ │  AI & Auto   │
      │  (MONEY)     │ │ (MOAT)   │ │  (DIFFER.)   │
      └──┬───────┬───┘ └──┬───────┘ └──┬───────────┘
         │       │         │            │
         │  ┌────▼─────────▼──┐    ┌────▼──────────┐
         │  │   Cluster 5     │    │   Cluster 6   │
         │  │  Compliance     │    │  Setup & Use  │
         │  └─────────────────┘    └────┬──────────┘
         │                              │
    ┌────▼────────┐  ┌─────────────┐ ┌──▼───────────┐
    │  Cluster 9  │  │  Cluster 8  │ │  Cluster 7   │
    │  Migration  │  │Career Pages │ │   Metrics    │
    │  (ACTION)   │  │             │ │              │
    └─────────────┘  └─────────────┘ └──────────────┘
```

### Key Cross-Cluster Links

| From Article | Links To |
|---|---|
| Open source vs proprietary ATS (C1) | Cluster 2 pillar |
| Who uses open source ATS? (C1) | Cluster 6 pillar |
| The true cost of running an open source ATS (C1) | Cluster 2 pillar |
| Is open source ATS secure enough? (C1) | Cluster 5 pillar |
| Self-hosted means… (C1) | Cluster 4 pillar |
| Best ATS with transparent AI scoring (C2) | Cluster 3 pillar |
| Manatal vs open source ATS (C2) | Cluster 3 pillar |
| Total cost of ownership: SaaS vs self-hosted (C2) | Cluster 4 pillar |
| Legal landscape of AI in hiring (C3) | Cluster 5 pillar |
| Self-hosted vs cloud ATS: data ownership (C4) | Cluster 2 pillar |
| ATS security hardening (C4) | Cluster 5 pillar |
| Cost breakdown: self-hosted infrastructure (C4) | Cluster 2 pillar |
| AI hiring regulations (C5) | Cluster 3 pillar |
| Candidate data encryption (C5) | Cluster 4 pillar |
| How to build a career page (C6) | Cluster 8 pillar |
| Migrate from spreadsheets (C6) | Cluster 2 pillar |
| Export data from Greenhouse/Lever/Workable (C6) | Cluster 4 pillar |
| Application completion rate (C7) | Cluster 6 pillar |
| Application form design (C8) | Cluster 7 pillar |
| A/B test application flow (C8) | Cluster 7 pillar |
| Real cost of switching ATS (C9) | Cluster 2 pillar |
| Export candidate data from any ATS (C9) | Cluster 4 pillar |

---

## Progress Summary

| Cluster | Phase | Articles | Done | Remaining |
|---------|-------|----------|------|-----------|
| 1. Fundamentals | 1 | 10 | 4 | 6 |
| 2. Comparisons | 1 | 25 | 1 | 24 |
| 3. AI & Automation | 2 | 17 | 0 | 17 |
| 4. Data Ownership | 2 | 16 | 0 | 16 |
| 5. Compliance | 4 | 15 | 0 | 15 |
| 6. Setup & Workflows | 3 | 16 | 0 | 16 |
| 7. Metrics | 3 | 15 | 0 | 15 |
| 8. Career Pages | 4 | 9 | 0 | 9 |
| 9. Migration | 4 | 9 | 0 | 9 |
| **Total** | | **132** | **5** | **127** |

---

## SEO Skill Reference

This map is designed to be used alongside the [SEO Skill](.agents/skills/seo-skill/SKILL.md). Key sections to reference when writing each article:

| Writing Step | SEO Skill Section |
|---|---|
| Choose the primary keyword | §1.1 Target One Primary Keyword |
| Validate search intent | §1.2 Match Search Intent |
| Score business potential | §1.3 Business Potential Score |
| Write frontmatter | §2 Article Frontmatter |
| Craft the title | §3 Title Tag Optimization |
| Write meta description | §4 Meta Description Optimization |
| Set the URL slug (filename) | §5 URL Structure |
| Structure headings & content | §6 Content Structure & On-Page SEO |
| Optimize for AI citations | §7 LLM & AI Visibility Optimization |
| Add E-E-A-T signals | §8 E-E-A-T |
| Add internal + external links | §9 Internal & External Linking |
| Optimize images | §10 Image Optimization |
| Add schema markup | §11 Structured Data |
| Set `useSeoMeta()` | §12 Technical SEO Checklist |
| Pre-publish quality check | §15 SEO Quality Checklist |
| Quarterly review | §13 Content Update & Freshness Strategy |
