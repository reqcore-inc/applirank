/**
 * Seeds the database with realistic demo data for Reqcore.
 *
 * Creates:
 * - 1 demo user (demo@reqcore.com / demo1234)
 * - 1 organization ("Reqcore Demo")
 * - 5 jobs with varying statuses
 * - 30 candidates
 * - 65+ applications across all pipeline stages
 * - Custom questions on select jobs
 * - Question responses on applications
 * - 35+ scheduled/completed interviews across the pipeline
 * - 200+ activity log entries covering all action types (for Timeline page)
 *
 * Usage: npx tsx server/scripts/seed.ts
 * Requires DATABASE_URL in .env (loaded via dotenv or shell env).
 *
 * Idempotent — checks if demo org exists before running.
 */

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { eq } from 'drizzle-orm'
import { hashPassword } from 'better-auth/crypto'
import * as schema from '../database/schema'
import { encrypt } from '../utils/encryption'

// ─────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────

const processWithLoadEnv = process as NodeJS.Process & {
  loadEnvFile?: (path?: string) => void
}

if (!process.env.DATABASE_URL && typeof processWithLoadEnv.loadEnvFile === 'function') {
  try {
    processWithLoadEnv.loadEnvFile('.env')
  }
  catch {
    // .env is optional in hosted environments like Railway
  }
}

function resolveDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL ?? ''

  try {
    const parsed = new URL(raw)
    if (parsed.hostname) return raw
  }
  catch {
    // fall through to individual-variable reconstruction
  }

  const host = process.env.PGHOST ?? process.env.RAILWAY_TCP_PROXY_DOMAIN ?? ''
  const port = process.env.PGPORT ?? process.env.RAILWAY_TCP_PROXY_PORT ?? '5432'
  const user = process.env.PGUSER ?? 'postgres'
  const password = process.env.PGPASSWORD ?? ''
  const database = process.env.PGDATABASE ?? 'railway'

  if (host) {
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`
  }

  return ''
}

const DATABASE_URL = resolveDatabaseUrl()
if (!DATABASE_URL) {
  console.error('DATABASE_URL is required. Set it in .env or export it.')
  process.exit(1)
}

const DEMO_EMAIL = 'demo@reqcore.com'
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? 'demo1234'
const DEMO_ORG_NAME = 'Reqcore Demo'
const DEMO_ORG_SLUG = 'reqcore-demo'

// Legacy values from the old applirank.com domain — cleaned up on seed
const LEGACY_DEMO_EMAIL = 'demo@applirank.com'
const LEGACY_ORG_SLUG = 'applirank-demo'

// ─────────────────────────────────────────────
// Database connection
// ─────────────────────────────────────────────

const client = postgres(DATABASE_URL, { max: 1 })
const db = drizzle(client, { schema })

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function id(): string {
  return crypto.randomUUID()
}

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

/** Create a date offset from today with a specific time. Positive = future, negative = past. */
function dateWithOffset(daysOffset: number, hour: number, minute: number = 0): Date {
  const d = new Date()
  d.setDate(d.getDate() + daysOffset)
  d.setHours(hour, minute, 0, 0)
  return d
}

function getArrayItemOrThrow<T>(arr: readonly T[], index: number, context: string): T {
  const value = arr[index]
  if (value === undefined) {
    throw new Error(`Missing ${context} at index ${index}`)
  }
  return value
}

function generateSlug(title: string, uuid: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
  const shortId = uuid.replace(/-/g, '').slice(0, 8)
  return `${base}-${shortId}`
}

// ─────────────────────────────────────────────
// Seed Data Definitions
// ─────────────────────────────────────────────

const JOBS_DATA = [
  {
    title: 'Senior Full-Stack Engineer',
    description: `We're hiring a Senior Full-Stack Engineer to help scale the core Reqcore platform used by growing hiring teams. You will own high-impact features across product, API, and data layers using TypeScript, Nuxt, and PostgreSQL in a pragmatic, fast-moving environment.\n\n**What you'll do**\n- Deliver end-to-end features from discovery and technical design to production rollout\n- Shape architecture decisions for multi-tenant workflows, performance, and reliability\n- Partner with product and design to turn recruiter pain points into elegant UX\n- Raise engineering quality through thoughtful code review, testing, and observability\n- Mentor team members and improve development standards across the stack\n\n**What we're looking for**\n- 5+ years building and shipping production web applications\n- Strong TypeScript proficiency across frontend and backend services\n- Experience with modern component architectures (Vue, React, or similar)\n- Practical PostgreSQL skills including query tuning and schema evolution\n- Familiarity with CI/CD, Dockerized environments, and cloud deployment workflows\n- Clear communication and ownership mindset in cross-functional teams\n\n**Nice to have**\n- Experience building internal tools, ATS/HR products, or workflow-heavy B2B software\n- Interest in transparent, explainable AI experiences`,
    location: 'Berlin, Germany (Hybrid)',
    type: 'full_time' as const,
    status: 'open' as const,
  },
  {
    title: 'Product Designer',
    description: `Join Reqcore as a Product Designer and craft the daily workflows used by recruiters to evaluate talent fairly and efficiently. You'll collaborate closely with engineering and product to design intuitive, high-trust experiences across dashboard, pipeline, and candidate flows.\n\n**What you'll do**\n- Lead design work from discovery through polished UI and production handoff\n- Translate complex hiring workflows into clear, low-friction user journeys\n- Run lightweight research and usability testing with real recruiting users\n- Evolve our design system and interaction patterns for speed and consistency\n- Partner with engineers to ensure high-quality implementation and accessibility\n\n**What we're looking for**\n- 3+ years in product design, ideally in B2B SaaS or workflow tools\n- Strong portfolio demonstrating end-to-end problem-solving and measurable outcomes\n- Advanced Figma skills including components, variants, and prototyping\n- Experience balancing visual polish with delivery constraints\n- Solid understanding of accessibility, hierarchy, and information architecture\n\n**Nice to have**\n- Experience designing data-rich interfaces or collaborative tooling\n- Familiarity with recruiting, HR, or marketplace products`,
    location: 'Remote (EU)',
    type: 'full_time' as const,
    status: 'open' as const,
  },
  {
    title: 'DevOps Engineer',
    description: `We are looking for a DevOps Engineer to harden and streamline our delivery platform across hosted and self-hosted environments. You will own deployment reliability, operational visibility, and developer productivity with a strong focus on secure, repeatable infrastructure.\n\n**What you'll do**\n- Build and improve CI/CD pipelines for faster, safer releases\n- Maintain containerized environments and infrastructure automation\n- Improve runtime observability with meaningful alerts, dashboards, and runbooks\n- Strengthen backup, restore, and disaster recovery practices for Postgres and storage\n- Document deployment standards to make enterprise self-hosting predictable\n\n**What we're looking for**\n- 3+ years of DevOps or platform engineering experience\n- Deep Docker and Linux operations knowledge\n- Hands-on CI/CD experience (GitHub Actions, GitLab CI, or similar)\n- Practical understanding of reverse proxies, TLS, and networking fundamentals\n- Experience with database operations and incident response\n\n**Nice to have**\n- IaC experience (Terraform, Pulumi, or equivalent)\n- Experience supporting compliance-sensitive B2B workloads`,
    location: 'Remote (Worldwide)',
    type: 'contract' as const,
    status: 'open' as const,
  },
  {
    title: 'Technical Writer (Part-Time)',
    description: `We're hiring a part-time Technical Writer to make Reqcore documentation clear, actionable, and enterprise-ready. Your work will directly improve product adoption by helping recruiters, admins, and developers succeed quickly.\n\n**What you'll do**\n- Create and maintain setup guides, API docs, and troubleshooting playbooks\n- Improve onboarding flows for first-time teams and self-hosted deployments\n- Standardize tone, structure, and quality across product documentation\n- Work with engineering and product to document new releases and migrations\n- Identify knowledge gaps from support and feedback loops\n\n**What we're looking for**\n- 2+ years writing technical documentation for software products\n- Ability to explain complex systems in simple, practical language\n- Strong Markdown/docs-as-code workflow habits\n- Attention to clarity, consistency, and user intent\n- Experience editing developer-facing and operations-focused content\n\n**Nice to have**\n- Open-source documentation contributions\n- Familiarity with hiring/recruiting software terminology`,
    location: 'Remote (EU)',
    type: 'part_time' as const,
    status: 'open' as const,
  },
  {
    title: 'Frontend Engineering Intern',
    description: `Start your frontend career on a real product with real users. In this 6-month internship, you'll contribute production code to Reqcore while learning modern frontend engineering practices from an experienced team.\n\n**What you'll work on**\n- Build and ship Vue/Nuxt interface components used in daily recruiting workflows\n- Improve usability, accessibility, and performance of existing screens\n- Collaborate in code reviews and iterative delivery cycles\n- Learn how product, design, and engineering collaborate in a modern SaaS team\n\n**What we're looking for**\n- Currently enrolled in computer science, software engineering, or equivalent program\n- Strong foundations in HTML, CSS, and JavaScript\n- Basic familiarity with TypeScript and component-based frameworks is a plus\n- Curiosity, coachability, and attention to detail\n- Ability to communicate clearly and ask good questions\n\n**Internship details**\n- Structured mentorship, weekly feedback, and clear growth goals\n- Opportunity to present shipped work at the end of the internship`,
    location: 'Berlin, Germany (On-site)',
    type: 'internship' as const,
    status: 'draft' as const,
  },
]

const CANDIDATES_DATA = [
  { firstName: 'Emma', lastName: 'Schmidt', email: 'emma.schmidt@example.com', phone: '+49 170 1234567' },
  { firstName: 'Liam', lastName: 'Müller', email: 'liam.mueller@example.com', phone: '+49 171 2345678' },
  { firstName: 'Sofia', lastName: 'Dubois', email: 'sofia.dubois@example.com', phone: '+33 6 12 34 56 78' },
  { firstName: 'Noah', lastName: 'van der Berg', email: 'noah.vdberg@example.com', phone: '+31 6 12345678' },
  { firstName: 'Olivia', lastName: 'Rossi', email: 'olivia.rossi@example.com', phone: '+39 320 1234567' },
  { firstName: 'James', lastName: 'O\'Brien', email: 'james.obrien@example.com', phone: '+44 7700 123456' },
  { firstName: 'Amara', lastName: 'Okafor', email: 'amara.okafor@example.com', phone: '+234 801 234 5678' },
  { firstName: 'Yuki', lastName: 'Tanaka', email: 'yuki.tanaka@example.com', phone: '+81 90 1234 5678' },
  { firstName: 'Lucas', lastName: 'Andersson', email: 'lucas.andersson@example.com', phone: '+46 70 123 45 67' },
  { firstName: 'Priya', lastName: 'Sharma', email: 'priya.sharma@example.com', phone: '+91 98765 43210' },
  { firstName: 'Mateo', lastName: 'García', email: 'mateo.garcia@example.com', phone: '+34 612 345 678' },
  { firstName: 'Aisha', lastName: 'Hassan', email: 'aisha.hassan@example.com', phone: '+971 50 123 4567' },
  { firstName: 'Felix', lastName: 'Weber', email: 'felix.weber@example.com', phone: '+49 172 3456789' },
  { firstName: 'Chloe', lastName: 'Martin', email: 'chloe.martin@example.com', phone: '+33 7 12 34 56 78' },
  { firstName: 'David', lastName: 'Kim', email: 'david.kim@example.com', phone: '+82 10 1234 5678' },
  { firstName: 'Elena', lastName: 'Petrova', email: 'elena.petrova@example.com', phone: '+7 916 123 4567' },
  { firstName: 'Alexander', lastName: 'Johansson', email: 'alex.johansson@example.com', phone: '+46 73 234 56 78' },
  { firstName: 'Maria', lastName: 'Costa', email: 'maria.costa@example.com', phone: '+351 912 345 678' },
  { firstName: 'Ryan', lastName: 'Chen', email: 'ryan.chen@example.com', phone: '+1 415 234 5678' },
  { firstName: 'Laura', lastName: 'Nguyen', email: 'laura.nguyen@example.com', phone: '+84 90 123 4567' },
  { firstName: 'Henrik', lastName: 'Larsen', email: 'henrik.larsen@example.com', phone: '+45 20 12 34 56' },
  { firstName: 'Fatima', lastName: 'Al-Rashid', email: 'fatima.alrashid@example.com', phone: '+962 79 123 4567' },
  { firstName: 'Tom', lastName: 'Kowalski', email: 'tom.kowalski@example.com', phone: '+48 501 234 567' },
  { firstName: 'Sarah', lastName: 'Williams', email: 'sarah.williams@example.com', phone: '+1 212 345 6789' },
  { firstName: 'Raj', lastName: 'Patel', email: 'raj.patel@example.com', phone: '+91 99887 76655' },
  { firstName: 'Anna', lastName: 'Becker', email: 'anna.becker@example.com', phone: '+49 175 4567890' },
  { firstName: 'Marcus', lastName: 'Eriksson', email: 'marcus.eriksson@example.com', phone: '+46 76 345 67 89' },
  { firstName: 'Ines', lastName: 'da Silva', email: 'ines.dasilva@example.com', phone: '+55 11 98765 4321' },
  { firstName: 'Kevin', lastName: 'Dupont', email: 'kevin.dupont@example.com', phone: '+33 6 98 76 54 32' },
  { firstName: 'Zara', lastName: 'Khan', email: 'zara.khan@example.com', phone: '+92 300 1234567' },
]

// Questions for the Senior Full-Stack Engineer job
const FULLSTACK_QUESTIONS = [
  { type: 'short_text' as const, label: 'Years of TypeScript experience', required: true },
  { type: 'single_select' as const, label: 'Preferred frontend framework', options: ['Vue', 'React', 'Svelte', 'Angular', 'Solid'], required: true },
  { type: 'long_text' as const, label: 'Describe a challenging technical problem you solved recently', required: true },
  { type: 'url' as const, label: 'Link to your GitHub profile or portfolio', required: false },
  { type: 'single_select' as const, label: 'When can you start?', options: ['Immediately', '2 weeks', '1 month', '2-3 months'], required: true },
]

// Questions for Product Designer
const DESIGNER_QUESTIONS = [
  { type: 'url' as const, label: 'Link to your portfolio', required: true },
  { type: 'single_select' as const, label: 'Primary design tool', options: ['Figma', 'Sketch', 'Adobe XD', 'Framer'], required: true },
  { type: 'long_text' as const, label: 'Walk us through your design process for a recent project', required: true },
  { type: 'checkbox' as const, label: 'I have experience with design systems', required: false },
]

// Questions for DevOps Engineer
const DEVOPS_QUESTIONS = [
  { type: 'multi_select' as const, label: 'Which cloud platforms have you worked with?', options: ['AWS', 'GCP', 'Azure', 'Hetzner', 'DigitalOcean', 'Other'], required: true },
  { type: 'short_text' as const, label: 'Years of Docker experience', required: true },
  { type: 'single_select' as const, label: 'Preferred CI/CD platform', options: ['GitHub Actions', 'GitLab CI', 'Jenkins', 'CircleCI', 'Other'], required: true },
]

// ─────────────────────────────────────────────
// Application distribution map
// Ensures realistic pipeline distribution across all stages
// ─────────────────────────────────────────────

type AppStatus = 'new' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected'

interface ApplicationAssignment {
  candidateIndex: number
  status: AppStatus
  score?: number
  notes?: string
}

// Job 0: Senior Full-Stack Engineer — high volume, full funnel
const JOB_0_APPS: ApplicationAssignment[] = [
  { candidateIndex: 0, status: 'hired', score: 96, notes: 'Outstanding architecture interview and strong leadership examples. Accepted offer.' },
  { candidateIndex: 1, status: 'offer', score: 92, notes: 'Excellent systems design and pragmatic decision-making. Offer package in final approval.' },
  { candidateIndex: 2, status: 'offer', score: 89, notes: 'Strong backend depth and clear communication. Final compensation discussion scheduled.' },
  { candidateIndex: 3, status: 'interview', score: 86, notes: 'Great take-home submission. Final panel interview planned next week.' },
  { candidateIndex: 4, status: 'interview', score: 84, notes: 'Consistent coding quality. Proceeding to architecture round.' },
  { candidateIndex: 5, status: 'interview', score: 81, notes: 'Positive recruiter and hiring manager feedback. Interview loop in progress.' },
  { candidateIndex: 6, status: 'screening', score: 78, notes: 'Relevant multi-tenant SaaS experience. Scheduling technical screen.' },
  { candidateIndex: 7, status: 'screening', score: 75, notes: 'Solid TypeScript background. Waiting on availability for first call.' },
  { candidateIndex: 8, status: 'new', score: 73, notes: 'Promising CV with production Nuxt experience. Pending initial review.' },
  { candidateIndex: 9, status: 'new', score: 70, notes: 'Good open-source profile. Recruiter triage queued.' },
  { candidateIndex: 10, status: 'new', score: 68 },
  { candidateIndex: 11, status: 'new', score: 66 },
  { candidateIndex: 12, status: 'rejected', score: 44, notes: 'Experience level below senior expectations for this role.' },
  { candidateIndex: 13, status: 'rejected', score: 39, notes: 'Limited backend ownership in recent roles.' },
]

// Job 1: Product Designer — strong mid-funnel representation
const JOB_1_APPS: ApplicationAssignment[] = [
  { candidateIndex: 14, status: 'offer', score: 91, notes: 'Exceptional portfolio depth and design-system leadership. Preparing offer.' },
  { candidateIndex: 15, status: 'interview', score: 88, notes: 'Strong product thinking and workshop facilitation skills.' },
  { candidateIndex: 16, status: 'interview', score: 86, notes: 'High-quality case studies with clear impact metrics.' },
  { candidateIndex: 17, status: 'interview', score: 83, notes: 'Great cross-functional collaboration examples.' },
  { candidateIndex: 18, status: 'screening', score: 79, notes: 'Compelling research approach. Moving to portfolio walkthrough.' },
  { candidateIndex: 19, status: 'screening', score: 76, notes: 'Strong visual craft. Reviewing B2B experience depth.' },
  { candidateIndex: 20, status: 'new', score: 74, notes: 'Interesting transition from frontend engineering into product design.' },
  { candidateIndex: 21, status: 'new', score: 71 },
  { candidateIndex: 22, status: 'new', score: 69 },
  { candidateIndex: 23, status: 'new', score: 67 },
  { candidateIndex: 24, status: 'rejected', score: 46, notes: 'Portfolio focus is primarily brand and campaign design.' },
  { candidateIndex: 25, status: 'rejected', score: 41, notes: 'Limited product discovery and usability testing examples.' },
]

// Job 2: DevOps Engineer — healthy pipeline for a contract position
const JOB_2_APPS: ApplicationAssignment[] = [
  { candidateIndex: 5, status: 'hired', score: 94, notes: 'Strong container orchestration and observability setup. Contract signed.' },
  { candidateIndex: 6, status: 'offer', score: 90, notes: 'Excellent platform reliability background. Offer sent.' },
  { candidateIndex: 7, status: 'interview', score: 85, notes: 'Deep CI/CD experience. Final technical interview scheduled.' },
  { candidateIndex: 8, status: 'interview', score: 83, notes: 'Strong automation mindset and incident response examples.' },
  { candidateIndex: 9, status: 'screening', score: 79, notes: 'Good cloud fundamentals. Validating production ownership scope.' },
  { candidateIndex: 10, status: 'screening', score: 76, notes: 'Relevant Docker and IaC stack. Recruiter follow-up pending.' },
  { candidateIndex: 26, status: 'new', score: 72, notes: 'Promising profile. Awaiting first availability window.' },
  { candidateIndex: 27, status: 'new', score: 70 },
  { candidateIndex: 28, status: 'new', score: 67 },
  { candidateIndex: 29, status: 'rejected', score: 45, notes: 'Skillset weighted toward support operations, limited platform engineering depth.' },
  { candidateIndex: 13, status: 'rejected', score: 40, notes: 'Primary experience with legacy on-prem tooling; limited cloud-native track record.' },
]

// Job 3: Technical Writer — consistent pipeline quality
const JOB_3_APPS: ApplicationAssignment[] = [
  { candidateIndex: 12, status: 'offer', score: 90, notes: 'Clear, structured writing samples and strong docs-as-code workflow.' },
  { candidateIndex: 14, status: 'interview', score: 86, notes: 'Great API documentation examples and editorial discipline.' },
  { candidateIndex: 16, status: 'interview', score: 83, notes: 'Strong technical depth and clean information architecture approach.' },
  { candidateIndex: 18, status: 'screening', score: 78, notes: 'Good writing quality; validating long-form technical ownership.' },
  { candidateIndex: 20, status: 'screening', score: 75, notes: 'Strong communication style. Intro call booked.' },
  { candidateIndex: 22, status: 'new', score: 72 },
  { candidateIndex: 24, status: 'new', score: 69 },
  { candidateIndex: 26, status: 'new', score: 66 },
  { candidateIndex: 28, status: 'rejected', score: 49, notes: 'Writing portfolio is mostly social and campaign content.' },
  { candidateIndex: 29, status: 'rejected', score: 43, notes: 'Limited experience with developer-focused documentation.' },
]

// Job 4: Frontend Engineering Intern — active early-career funnel
const JOB_4_APPS: ApplicationAssignment[] = [
  { candidateIndex: 0, status: 'interview', score: 88, notes: 'Impressive internship project quality and thoughtful code reviews in GitHub profile.' },
  { candidateIndex: 2, status: 'interview', score: 84, notes: 'Strong fundamentals in Vue and Tailwind. Team fit interview scheduled.' },
  { candidateIndex: 4, status: 'screening', score: 79, notes: 'Good learning velocity and clean component architecture examples.' },
  { candidateIndex: 6, status: 'screening', score: 76, notes: 'Strong front-end fundamentals; evaluating SSR understanding.' },
  { candidateIndex: 11, status: 'screening', score: 74, notes: 'Promising portfolio with clear UX thinking for early-career level.' },
  { candidateIndex: 15, status: 'new', score: 71 },
  { candidateIndex: 17, status: 'new', score: 69 },
  { candidateIndex: 19, status: 'new', score: 67 },
  { candidateIndex: 21, status: 'new', score: 65 },
  { candidateIndex: 23, status: 'rejected', score: 46, notes: 'Limited JavaScript fundamentals demonstrated in practical assessment.' },
]

const JOB_APPLICATIONS = [JOB_0_APPS, JOB_1_APPS, JOB_2_APPS, JOB_3_APPS, JOB_4_APPS]

// ─────────────────────────────────────────────
// AI Scoring — Criteria definitions per job
// ─────────────────────────────────────────────

type CriterionCategory = 'technical' | 'experience' | 'soft_skills' | 'education' | 'culture' | 'custom'

interface ScoringCriterionSeed {
  key: string
  name: string
  description: string
  category: CriterionCategory
  maxScore: number
  weight: number
  displayOrder: number
}

// Job 0: Senior Full-Stack Engineer — technical rubric
const JOB_0_CRITERIA: ScoringCriterionSeed[] = [
  {
    key: 'core_tech_stack',
    name: 'Core Tech Stack Match',
    description: 'How well the candidate\'s technical skills match TypeScript, Vue/Nuxt, and PostgreSQL — the primary technologies required for this role.',
    category: 'technical',
    maxScore: 10,
    weight: 70,
    displayOrder: 0,
  },
  {
    key: 'system_design',
    name: 'System Design & Architecture',
    description: 'Evidence of system design experience including multi-tenant architecture, scalability thinking, and architectural decision-making in production systems.',
    category: 'technical',
    maxScore: 10,
    weight: 55,
    displayOrder: 1,
  },
  {
    key: 'engineering_practices',
    name: 'Engineering Practices',
    description: 'Testing discipline, CI/CD experience, code review culture, documentation habits, and software development lifecycle maturity.',
    category: 'technical',
    maxScore: 10,
    weight: 40,
    displayOrder: 2,
  },
  {
    key: 'relevant_experience',
    name: 'Relevant Experience',
    description: 'Years and depth of experience shipping production web applications, ideally in B2B SaaS, internal tools, or workflow-heavy products.',
    category: 'experience',
    maxScore: 10,
    weight: 50,
    displayOrder: 3,
  },
  {
    key: 'leadership_collab',
    name: 'Leadership & Collaboration',
    description: 'Evidence of mentoring, tech leadership, cross-team collaboration, and clear communication in cross-functional settings.',
    category: 'soft_skills',
    maxScore: 10,
    weight: 30,
    displayOrder: 4,
  },
]

// Job 1: Product Designer — design-specific rubric
const JOB_1_CRITERIA: ScoringCriterionSeed[] = [
  {
    key: 'portfolio_quality',
    name: 'Portfolio Quality & Impact',
    description: 'Depth and quality of design portfolio, demonstrating end-to-end problem-solving, measurable business outcomes, and polished deliverables.',
    category: 'experience',
    maxScore: 10,
    weight: 70,
    displayOrder: 0,
  },
  {
    key: 'design_process',
    name: 'Design Process & Research',
    description: 'Evidence of structured design thinking: user research methods, discovery, ideation, prototyping, usability testing, and iteration based on data.',
    category: 'soft_skills',
    maxScore: 10,
    weight: 55,
    displayOrder: 1,
  },
  {
    key: 'ux_visual_craft',
    name: 'UX & Visual Craft',
    description: 'Quality of information architecture, interaction design, visual hierarchy, and attention to accessibility and design system consistency.',
    category: 'technical',
    maxScore: 10,
    weight: 50,
    displayOrder: 2,
  },
  {
    key: 'cross_functional',
    name: 'Cross-Functional Collaboration',
    description: 'Ability to partner effectively with engineering, product, and stakeholders. Evidence of clear design handoff and communication practices.',
    category: 'soft_skills',
    maxScore: 10,
    weight: 40,
    displayOrder: 3,
  },
  {
    key: 'domain_knowledge',
    name: 'B2B SaaS & Product Thinking',
    description: 'Relevant experience designing data-rich interfaces, workflow tools, or B2B SaaS products. Understanding of business context and user needs.',
    category: 'experience',
    maxScore: 10,
    weight: 35,
    displayOrder: 4,
  },
]

// Job 2: DevOps Engineer — infrastructure rubric
const JOB_2_CRITERIA: ScoringCriterionSeed[] = [
  {
    key: 'infrastructure',
    name: 'Infrastructure & Cloud Expertise',
    description: 'Depth of experience with container orchestration, cloud platforms, Linux operations, and infrastructure automation (IaC).',
    category: 'technical',
    maxScore: 10,
    weight: 65,
    displayOrder: 0,
  },
  {
    key: 'cicd_automation',
    name: 'CI/CD & Automation',
    description: 'Hands-on experience building and maintaining CI/CD pipelines, deployment automation, and release workflows at scale.',
    category: 'technical',
    maxScore: 10,
    weight: 55,
    displayOrder: 1,
  },
  {
    key: 'observability',
    name: 'Observability & Incident Response',
    description: 'Experience setting up monitoring, alerting, dashboards, runbooks, and structured incident response practices.',
    category: 'technical',
    maxScore: 10,
    weight: 45,
    displayOrder: 2,
  },
  {
    key: 'security_compliance',
    name: 'Security & Compliance',
    description: 'Understanding of TLS, secrets management, network security, backup/restore practices, and compliance-sensitive workloads.',
    category: 'technical',
    maxScore: 10,
    weight: 40,
    displayOrder: 3,
  },
  {
    key: 'relevant_experience',
    name: 'Relevant Experience',
    description: 'Years and depth of DevOps or platform engineering experience, ideally supporting SaaS products or self-hosted enterprise deployments.',
    category: 'experience',
    maxScore: 10,
    weight: 45,
    displayOrder: 4,
  },
]

const JOB_CRITERIA = [JOB_0_CRITERIA, JOB_1_CRITERIA, JOB_2_CRITERIA]

// ─────────────────────────────────────────────
// AI Scoring — Per-application criterion scores
// Each entry scores one application across all criteria for its job.
// ─────────────────────────────────────────────

interface CriterionScoreSeed {
  criterionKey: string
  maxScore: number
  applicantScore: number
  confidence: number
  evidence: string
  strengths: string[]
  gaps: string[]
}

interface ApplicationScoringSeed {
  jobIndex: number
  candidateIndex: number
  compositeScore: number
  scores: CriterionScoreSeed[]
  summary: string
}

const AI_SCORING_DATA: ApplicationScoringSeed[] = [
  // ──────────────────────────────────────────
  // Job 0: Senior Full-Stack Engineer
  // ──────────────────────────────────────────

  // Emma Schmidt (hired, score: 96)
  {
    jobIndex: 0, candidateIndex: 0, compositeScore: 96,
    summary: 'Exceptional candidate with deep full-stack expertise across TypeScript, Vue/Nuxt, and PostgreSQL. Demonstrates strong system design thinking with production multi-tenant architecture experience. Clear leadership trajectory and outstanding engineering practices. One of the strongest technical profiles evaluated for this role.',
    scores: [
      {
        criterionKey: 'core_tech_stack', maxScore: 10, applicantScore: 10, confidence: 95,
        evidence: 'Resume shows 6+ years of daily TypeScript usage across frontend (Vue 3, Nuxt 3) and backend (Node.js, Express). Built and maintained PostgreSQL databases with complex query optimization. Authored internal TypeScript utility libraries used across 3 product teams.',
        strengths: ['Expert-level TypeScript with both frontend and backend depth', 'Production Nuxt 3 experience including SSR and hybrid rendering', 'Advanced PostgreSQL skills including partitioning and query plan analysis'],
        gaps: [],
      },
      {
        criterionKey: 'system_design', maxScore: 10, applicantScore: 9, confidence: 92,
        evidence: 'Led architecture of a multi-tenant SaaS platform serving 200+ organizations. Designed event-driven workflows with PostgreSQL LISTEN/NOTIFY and Redis pub/sub. Resume explicitly mentions ownership of database schema evolution across 15+ migrations.',
        strengths: ['Hands-on multi-tenant architecture experience at scale', 'Event-driven design patterns with real-world production validation', 'Strong database modeling and migration management discipline'],
        gaps: ['No explicit mention of distributed systems or microservices decomposition'],
      },
      {
        criterionKey: 'engineering_practices', maxScore: 10, applicantScore: 10, confidence: 93,
        evidence: 'Resume highlights 95%+ test coverage targets on core modules, GitHub Actions CI/CD pipelines with automated canary deployments, and structured code review process mentoring 4 junior engineers.',
        strengths: ['Automated testing champion with measurable coverage targets', 'CI/CD pipeline design with progressive rollout strategies', 'Active code review mentor fostering team quality standards'],
        gaps: [],
      },
      {
        criterionKey: 'relevant_experience', maxScore: 10, applicantScore: 9, confidence: 90,
        evidence: '7 years of production web application development. Last 4 years at B2B SaaS companies building workflow-heavy internal tools. Previous role involved building a recruitment-adjacent HR platform, directly relevant to Reqcore\'s domain.',
        strengths: ['7 years of progressive web development experience', 'B2B SaaS background with workflow-heavy product experience', 'Direct HR/recruitment domain experience from previous role'],
        gaps: ['No open-source project maintainership mentioned'],
      },
      {
        criterionKey: 'leadership_collab', maxScore: 10, applicantScore: 9, confidence: 88,
        evidence: 'Mentored 4 junior engineers over 2 years with structured growth plans. Led cross-functional feature squads with product managers and designers. Resume notes "drove technical decision-making in architecture reviews across 3 teams."',
        strengths: ['Structured mentoring with documented growth outcomes', 'Cross-functional squad leadership with product and design', 'Technical decision-making influence across multiple teams'],
        gaps: ['No formal engineering management or people leadership title'],
      },
    ],
  },

  // Liam Müller (offer, score: 92)
  {
    jobIndex: 0, candidateIndex: 1, compositeScore: 92,
    summary: 'Very strong senior engineer with excellent systems thinking and pragmatic technical decision-making. Deep PostgreSQL optimization knowledge and solid full-stack delivery track record. Minor gap in frontend framework depth but compensated by outstanding backend architecture skills.',
    scores: [
      {
        criterionKey: 'core_tech_stack', maxScore: 10, applicantScore: 9, confidence: 91,
        evidence: 'Resume shows 5 years of TypeScript backend development with Node.js and extensive PostgreSQL expertise. Vue experience limited to 1.5 years but includes Nuxt 2 → 3 migration. Strong database layer with custom ORM abstractions.',
        strengths: ['Deep TypeScript backend expertise with type-safe API design', 'Strong PostgreSQL skills including performance tuning and indexing strategies', 'Hands-on Nuxt migration experience showing modern framework adoption'],
        gaps: ['Vue/Nuxt experience (1.5 years) is less deep than backend skills'],
      },
      {
        criterionKey: 'system_design', maxScore: 10, applicantScore: 9, confidence: 93,
        evidence: 'Architected a real-time collaboration platform handling 10K concurrent WebSocket connections. Designed caching strategies reducing P95 latency by 60%. Resume mentions leading database sharding evaluation for a growing multi-tenant product.',
        strengths: ['Real-time system design with proven scalability metrics', 'Performance optimization with measurable latency improvements', 'Database scaling strategy experience at multi-tenant level'],
        gaps: ['No mention of infrastructure-as-code or deployment architecture ownership'],
      },
      {
        criterionKey: 'engineering_practices', maxScore: 10, applicantScore: 8, confidence: 87,
        evidence: 'Implemented integration testing framework that caught 40% more issues before production. Active code reviewer with documented review guidelines. CI pipeline work mentioned but limited detail on deployment automation.',
        strengths: ['Integration testing framework builder with measurable quality impact', 'Code review culture contributor with written guidelines', 'Quality-focused engineering mindset with data-driven approach'],
        gaps: ['Limited detail on CI/CD pipeline design and deployment automation'],
      },
      {
        criterionKey: 'relevant_experience', maxScore: 10, applicantScore: 9, confidence: 90,
        evidence: '6 years shipping production web applications. 3 years in B2B SaaS with multi-tenant data isolation requirements. Previous role at a project management tool company building complex workflow features.',
        strengths: ['6 years of production web development across multiple companies', 'B2B SaaS experience with multi-tenant architecture challenges', 'Workflow-heavy product background directly relevant to ATS domain'],
        gaps: ['No direct HR/recruitment industry experience'],
      },
      {
        criterionKey: 'leadership_collab', maxScore: 10, applicantScore: 8, confidence: 85,
        evidence: 'Led a team of 3 on a critical platform migration project. Resume mentions regular cross-functional collaboration with product managers. Presented technical decisions to engineering leadership quarterly.',
        strengths: ['Project-level technical leadership with team coordination', 'Regular cross-functional collaboration with product stakeholders', 'Technical communication to leadership through structured presentations'],
        gaps: ['No explicit mentoring or coaching of junior engineers mentioned'],
      },
    ],
  },

  // Sofia Dubois (offer, score: 89)
  {
    jobIndex: 0, candidateIndex: 2, compositeScore: 89,
    summary: 'Strong backend-leaning full-stack engineer with clean code discipline and excellent testing habits. Solid PostgreSQL and TypeScript skills with a thoughtful approach to API design. Frontend skills are developing and cover letter shows genuine motivation for the open-source mission.',
    scores: [
      {
        criterionKey: 'core_tech_stack', maxScore: 10, applicantScore: 8, confidence: 88,
        evidence: 'Resume shows 5 years of TypeScript with strong backend depth. Vue experience spans 2 years with component library contributions. PostgreSQL is a clear strength with query optimization and schema design examples.',
        strengths: ['Strong TypeScript proficiency across full stack', '2 years of Vue with component library contributions', 'PostgreSQL schema design and query optimization experience'],
        gaps: ['No production Nuxt/SSR experience mentioned'],
      },
      {
        criterionKey: 'system_design', maxScore: 10, applicantScore: 8, confidence: 85,
        evidence: 'Designed RESTful API architecture for a multi-service e-commerce platform. Resume mentions database modeling for complex order workflows and event sourcing patterns.',
        strengths: ['API architecture design for complex business domains', 'Event sourcing patterns for audit trail and state management', 'Database modeling for workflow-heavy applications'],
        gaps: ['No explicit multi-tenant architecture experience', 'Limited evidence of scalability testing or capacity planning'],
      },
      {
        criterionKey: 'engineering_practices', maxScore: 10, applicantScore: 9, confidence: 90,
        evidence: 'Resume highlights "test-driven development advocate" with unit, integration, and E2E test coverage. Authored team testing guidelines. Active open-source contributor with clean commit history and documentation.',
        strengths: ['Strong TDD advocate with comprehensive test coverage approach', 'Open-source contributor demonstrating code quality standards', 'Authored testing guidelines adopted by the engineering team'],
        gaps: [],
      },
      {
        criterionKey: 'relevant_experience', maxScore: 10, applicantScore: 8, confidence: 86,
        evidence: '5 years of production web development. Previous roles focused on e-commerce and fintech platforms. Cover letter specifically mentions motivation to work on open-source ATS software.',
        strengths: ['5 years of production web application experience', 'Complex domain experience in e-commerce and fintech', 'Genuine motivation for the open-source recruitment space'],
        gaps: ['No direct B2B SaaS or HR/recruitment domain experience'],
      },
      {
        criterionKey: 'leadership_collab', maxScore: 10, applicantScore: 7, confidence: 80,
        evidence: 'Resume mentions "paired with designers on UX reviews" and "participated in architecture decision records." No formal leadership or mentoring roles listed.',
        strengths: ['Cross-functional collaboration with design team', 'Participation in architecture decision processes'],
        gaps: ['No formal mentoring or leadership responsibilities mentioned', 'Limited evidence of driving technical decisions independently'],
      },
    ],
  },

  // Noah van der Berg (interview, score: 86)
  {
    jobIndex: 0, candidateIndex: 3, compositeScore: 86,
    summary: 'Solid senior engineer with strong multi-tenant SaaS background and practical TypeScript skills. Good breadth across the stack with particular strength in backend services and database design. Advancing to architecture round based on relevant experience profile.',
    scores: [
      {
        criterionKey: 'core_tech_stack', maxScore: 10, applicantScore: 8, confidence: 86,
        evidence: 'Resume shows 4 years of TypeScript development. Built REST and GraphQL APIs with Node.js. Vue 3 experience at current role. PostgreSQL with row-level security for multi-tenant isolation.',
        strengths: ['TypeScript across both API and frontend layers', 'PostgreSQL row-level security for multi-tenant data isolation', 'Both REST and GraphQL API experience'],
        gaps: ['No Nuxt framework experience mentioned', 'Vue experience limited to current role (1 year)'],
      },
      {
        criterionKey: 'system_design', maxScore: 10, applicantScore: 8, confidence: 84,
        evidence: 'Designed tenant isolation strategy using PostgreSQL RLS policies. Resume mentions microservice decomposition for a payments platform and message queue architectures.',
        strengths: ['Multi-tenant isolation design with PostgreSQL RLS', 'Microservice architecture experience in payments domain', 'Message queue architecture for async processing'],
        gaps: ['Limited detail on performance optimization or scalability metrics'],
      },
      {
        criterionKey: 'engineering_practices', maxScore: 10, applicantScore: 7, confidence: 82,
        evidence: 'Resume lists "automated test suites" and "Docker-based development environments." Mentions code review participation but limited detail on testing philosophy or CI/CD pipelines.',
        strengths: ['Automated testing with Docker-based dev environments', 'Active code review participant'],
        gaps: ['Limited detail on testing strategy and coverage approaches', 'No specific CI/CD pipeline design experience mentioned'],
      },
      {
        criterionKey: 'relevant_experience', maxScore: 10, applicantScore: 9, confidence: 89,
        evidence: '6 years of web development. Last 3 years exclusively in multi-tenant B2B SaaS environments. Previous experience at a fintech startup building compliance-heavy workflow features.',
        strengths: ['3 years of dedicated multi-tenant B2B SaaS experience', 'Workflow-heavy product experience in compliance-sensitive domains', '6 years of progressive web development career'],
        gaps: ['No direct HR/recruitment domain exposure'],
      },
      {
        criterionKey: 'leadership_collab', maxScore: 10, applicantScore: 7, confidence: 78,
        evidence: 'Resume mentions "cross-team API design reviews" and "onboarded 2 new team members." No formal tech lead or mentoring role described.',
        strengths: ['Cross-team API design review participation', 'New team member onboarding experience'],
        gaps: ['No formal tech lead or mentoring responsibilities', 'Limited evidence of driving strategic technical decisions'],
      },
    ],
  },

  // Olivia Rossi (interview, score: 84)
  {
    jobIndex: 0, candidateIndex: 4, compositeScore: 84,
    summary: 'Consistent full-stack engineer with solid frontend depth and growing backend capabilities. Clean coding style with good component architecture thinking. Needs more evidence of senior-level system design ownership but shows strong potential.',
    scores: [
      {
        criterionKey: 'core_tech_stack', maxScore: 10, applicantScore: 8, confidence: 85,
        evidence: 'Resume shows 4 years of TypeScript with strong Vue 3 expertise. Built a component library used across 3 products. PostgreSQL experience through backend API development. No explicit Nuxt production usage.',
        strengths: ['Strong Vue 3 expertise with shared component library ownership', '4 years of TypeScript development across the stack', 'PostgreSQL experience through API development'],
        gaps: ['No production Nuxt or SSR framework experience'],
      },
      {
        criterionKey: 'system_design', maxScore: 10, applicantScore: 7, confidence: 78,
        evidence: 'Resume mentions contributing to architecture discussions and designing a notification service. Limited evidence of full system ownership or multi-tenant design experience.',
        strengths: ['Notification service design as an independent module', 'Active contributor to architecture discussions'],
        gaps: ['No multi-tenant architecture experience mentioned', 'Limited evidence of end-to-end system design ownership'],
      },
      {
        criterionKey: 'engineering_practices', maxScore: 10, applicantScore: 8, confidence: 84,
        evidence: 'Resume highlights Vitest and Playwright testing experience. Mentions "automated visual regression testing pipeline" and consistent code review participation.',
        strengths: ['Modern testing stack with Vitest and Playwright', 'Visual regression testing pipeline implementation', 'Consistent code review engagement'],
        gaps: ['No mention of CI/CD pipeline design or deployment strategies'],
      },
      {
        criterionKey: 'relevant_experience', maxScore: 10, applicantScore: 7, confidence: 82,
        evidence: '4 years of production web development. Currently at a B2B analytics platform. Previous experience at a marketing automation startup.',
        strengths: ['B2B product experience at an analytics platform', 'Startup environment adaptability and broad scope of work'],
        gaps: ['4 years total may be light for a senior role', 'No direct workflow-tool or HR domain experience'],
      },
      {
        criterionKey: 'leadership_collab', maxScore: 10, applicantScore: 7, confidence: 76,
        evidence: 'Resume mentions "design pairing sessions" and "sprint planning facilitation." Lead on component library project but no direct reports or mentoring described.',
        strengths: ['Cross-functional pairing sessions with designers', 'Component library ownership showing initiative'],
        gaps: ['No mentoring or coaching experience mentioned', 'Sprint facilitation is not technical leadership depth'],
      },
    ],
  },

  // James O'Brien (interview, score: 81)
  {
    jobIndex: 0, candidateIndex: 5, compositeScore: 81,
    summary: 'Good full-stack generalist with broad technology exposure and positive collaboration signals. TypeScript skills are solid, but Vue/Nuxt experience is nascent. Backend strength compensates for frontend gaps. Worth exploring further in the technical interview.',
    scores: [
      {
        criterionKey: 'core_tech_stack', maxScore: 10, applicantScore: 7, confidence: 80,
        evidence: 'Resume shows 4 years of TypeScript primarily on the backend with Express and Fastify. React experience noted but Vue is listed under "learning." PostgreSQL usage confirmed through API development.',
        strengths: ['Strong TypeScript backend skills with Express and Fastify', 'PostgreSQL experience through production API work', 'Active learner with Vue listed as current focus'],
        gaps: ['No production Vue or Nuxt experience — currently learning', 'Frontend framework experience is React-based, not Vue'],
      },
      {
        criterionKey: 'system_design', maxScore: 10, applicantScore: 7, confidence: 77,
        evidence: 'Resume mentions "designed API gateway for microservice mesh" and "database schema for tenant-scoped billing system." Shows system thinking but limited detail on scale or complexity.',
        strengths: ['API gateway design for microservice architecture', 'Tenant-scoped database schema design experience'],
        gaps: ['Limited detail on system scale or performance metrics', 'No end-to-end architecture ownership described'],
      },
      {
        criterionKey: 'engineering_practices', maxScore: 10, applicantScore: 7, confidence: 79,
        evidence: 'Resume lists Jest and Supertest for API testing. Mentions Docker Compose setups for local development. GitHub Actions experience but limited CI/CD design detail.',
        strengths: ['API testing discipline with Jest and Supertest', 'Docker Compose for reproducible development environments'],
        gaps: ['Limited CI/CD pipeline design detail', 'No mention of E2E or integration testing frameworks'],
      },
      {
        criterionKey: 'relevant_experience', maxScore: 10, applicantScore: 7, confidence: 81,
        evidence: '5 years of web development across 3 companies. Mix of B2B and B2C experience. No direct SaaS or HR domain background.',
        strengths: ['5 years of diverse production web development', 'Multi-company experience showing adaptability'],
        gaps: ['Mixed B2B/B2C without deep SaaS specialization', 'No HR or recruitment domain background'],
      },
      {
        criterionKey: 'leadership_collab', maxScore: 10, applicantScore: 7, confidence: 75,
        evidence: 'Resume mentions "collaborated with product on feature scoping" and "documented API contracts for partner integrations." No formal leadership titles or mentoring.',
        strengths: ['Product collaboration on feature scoping', 'API documentation for partner integrations'],
        gaps: ['No formal leadership or mentoring experience', 'Limited evidence of driving technical strategy'],
      },
    ],
  },

  // Amara Okafor (screening, score: 78)
  {
    jobIndex: 0, candidateIndex: 6, compositeScore: 78,
    summary: 'Promising candidate with relevant multi-tenant SaaS experience and a solid TypeScript foundation. Resume shows depth in backend services with growing frontend skills. Scheduling technical screen to validate architecture understanding.',
    scores: [
      {
        criterionKey: 'core_tech_stack', maxScore: 10, applicantScore: 7, confidence: 76,
        evidence: 'Resume lists TypeScript (3 years), Node.js backend development, and PostgreSQL. Vue mentioned as "used in current project" without depth indicators. No Nuxt experience.',
        strengths: ['3 years of TypeScript with backend focus', 'PostgreSQL production usage confirmed'],
        gaps: ['Vue experience appears shallow — current project only', 'No Nuxt or SSR framework experience'],
      },
      {
        criterionKey: 'system_design', maxScore: 10, applicantScore: 7, confidence: 74,
        evidence: 'Resume mentions "contributed to tenant isolation design" and "designed queue-based notification service." Shows system design exposure but in a contributing rather than leading capacity.',
        strengths: ['Multi-tenant design contribution experience', 'Queue-based service design for notifications'],
        gaps: ['Contributing rather than leading architecture decisions', 'Limited scale or complexity indicators'],
      },
      {
        criterionKey: 'engineering_practices', maxScore: 10, applicantScore: 7, confidence: 75,
        evidence: 'Resume mentions automated testing and Docker development environments. Limited detail on testing strategy or CI/CD pipeline ownership.',
        strengths: ['Automated testing awareness', 'Docker-based development workflow'],
        gaps: ['Limited detail on testing depth and strategies', 'No CI/CD pipeline ownership mentioned'],
      },
      {
        criterionKey: 'relevant_experience', maxScore: 10, applicantScore: 8, confidence: 82,
        evidence: '4 years of web development. Current role at a multi-tenant SaaS company building B2B collaboration tools. Strong domain relevance for Reqcore.',
        strengths: ['Current multi-tenant SaaS experience directly relevant', 'B2B collaboration tool background matches ATS workflow needs'],
        gaps: ['4 years total experience is moderate for senior level'],
      },
      {
        criterionKey: 'leadership_collab', maxScore: 10, applicantScore: 6, confidence: 70,
        evidence: 'Resume mentions "team standups" and "feature demos to stakeholders." No formal leadership, mentoring, or cross-functional project ownership described.',
        strengths: ['Stakeholder demo experience showing communication skills'],
        gaps: ['No mentoring or leadership experience described', 'No cross-functional project ownership evidence'],
      },
    ],
  },

  // Yuki Tanaka (screening, score: 75)
  {
    jobIndex: 0, candidateIndex: 7, compositeScore: 75,
    summary: 'Solid TypeScript backend engineer with good fundamentals. Frontend experience is React-based with no Vue exposure. PostgreSQL skills are strong. Would benefit from validation of full-stack flexibility and willingness to adopt Vue/Nuxt stack.',
    scores: [
      {
        criterionKey: 'core_tech_stack', maxScore: 10, applicantScore: 6, confidence: 74,
        evidence: 'Resume shows strong TypeScript and Node.js backend (4 years). Frontend experience is React and Next.js — no Vue or Nuxt. PostgreSQL is well-demonstrated with query optimization examples.',
        strengths: ['Strong TypeScript backend skills (4 years)', 'PostgreSQL expertise with query optimization examples', 'Modern framework experience (React/Next.js) showing frontend capability'],
        gaps: ['No Vue or Nuxt experience — entirely React-based frontend background', 'Framework switch would require ramp-up time'],
      },
      {
        criterionKey: 'system_design', maxScore: 10, applicantScore: 7, confidence: 76,
        evidence: 'Resume describes "designed REST API for a marketplace platform" and "database sharding evaluation for growing user base." Demonstrates system thinking at moderate scale.',
        strengths: ['API design for marketplace domain', 'Database scaling evaluation experience'],
        gaps: ['No multi-tenant architecture experience explicitly mentioned'],
      },
      {
        criterionKey: 'engineering_practices', maxScore: 10, applicantScore: 7, confidence: 77,
        evidence: 'Resume mentions Jest testing, GitHub Actions CI, and Docker containerization. Solid engineering habits but no standout practices described.',
        strengths: ['Solid testing with Jest and GitHub Actions CI', 'Docker containerization for development and deployment'],
        gaps: ['No advanced testing practices or quality leadership described'],
      },
      {
        criterionKey: 'relevant_experience', maxScore: 10, applicantScore: 7, confidence: 78,
        evidence: '5 years of web development. Marketplace and e-commerce product experience. No B2B SaaS or HR domain background.',
        strengths: ['5 years of production web development', 'Complex domain experience in marketplace products'],
        gaps: ['No B2B SaaS specialization', 'No HR or recruitment domain exposure'],
      },
      {
        criterionKey: 'leadership_collab', maxScore: 10, applicantScore: 6, confidence: 72,
        evidence: 'Resume mentions "participated in sprint retrospectives" and "code review feedback." No leadership titles or mentoring described.',
        strengths: ['Active code review participant'],
        gaps: ['No mentoring or leadership experience', 'Limited cross-functional collaboration evidence'],
      },
    ],
  },

  // ──────────────────────────────────────────
  // Job 1: Product Designer
  // ──────────────────────────────────────────

  // David Kim (offer, score: 91)
  {
    jobIndex: 1, candidateIndex: 14, compositeScore: 91,
    summary: 'Outstanding product designer with exceptional portfolio depth and clear business impact metrics. Demonstrates sophisticated design process, strong systems thinking, and proven cross-functional leadership. Highly aligned with the role requirements for B2B workflow design.',
    scores: [
      {
        criterionKey: 'portfolio_quality', maxScore: 10, applicantScore: 9, confidence: 94,
        evidence: 'Portfolio showcases 6 end-to-end case studies with clear problem statements, research insights, design iterations, and measurable outcomes. One project demonstrated a 35% reduction in user onboarding time through redesigned information architecture.',
        strengths: ['End-to-end case studies with measurable business outcomes', 'Clear design narrative from problem to solution with data', 'High visual polish and consistent design system application'],
        gaps: ['Most portfolio work is from a single company — limited diversity of contexts'],
      },
      {
        criterionKey: 'design_process', maxScore: 10, applicantScore: 9, confidence: 92,
        evidence: 'Resume describes structured research methodology: user interviews, journey mapping, Jobs-to-be-Done framework, rapid prototyping, and usability testing with 5+ users per cycle. Mentions running design sprints for cross-functional alignment.',
        strengths: ['Structured research methodology with JTBD framework', 'Design sprint facilitation for cross-functional teams', 'Regular usability testing integrated into delivery cadence'],
        gaps: ['No quantitative research methods mentioned (A/B testing, analytics-driven design)'],
      },
      {
        criterionKey: 'ux_visual_craft', maxScore: 10, applicantScore: 9, confidence: 91,
        evidence: 'Portfolio demonstrates strong information architecture for complex data tables, elegant interaction patterns, and coherent visual hierarchy. Resume mentions maintaining and extending a 200+ component design system in Figma.',
        strengths: ['Complex data table design with clear information hierarchy', 'Design system ownership at scale (200+ components)', 'Accessibility-conscious design with WCAG compliance mentioned'],
        gaps: [],
      },
      {
        criterionKey: 'cross_functional', maxScore: 10, applicantScore: 8, confidence: 87,
        evidence: 'Resume notes "embedded in engineering squad for 2 years" and "design handoff documentation reduced implementation questions by 60%." Partners closely with PMs on roadmap prioritization.',
        strengths: ['Embedded squad model with close engineering partnership', 'Design handoff process with 60% reduction in implementation questions', 'Active roadmap participation with product managers'],
        gaps: ['Limited evidence of stakeholder management with executives or customers directly'],
      },
      {
        criterionKey: 'domain_knowledge', maxScore: 10, applicantScore: 8, confidence: 85,
        evidence: 'Previous role designing a B2B project management tool with complex workflow states. Portfolio includes data dashboard and analytics interface design. Resume mentions "interest in recruitment technology" in career objectives.',
        strengths: ['B2B workflow tool design experience directly relevant', 'Data-rich dashboard and analytics interface design', 'Stated interest in recruitment technology domain'],
        gaps: ['No direct HR or recruiting product experience'],
      },
    ],
  },

  // Elena Petrova (interview, score: 88)
  {
    jobIndex: 1, candidateIndex: 15, compositeScore: 88,
    summary: 'Strong product designer with excellent design thinking and research skills. Portfolio shows impressive workshop facilitation and user empathy. Slightly less depth in visual craft compared to top candidates but compensated by outstanding product thinking.',
    scores: [
      {
        criterionKey: 'portfolio_quality', maxScore: 10, applicantScore: 8, confidence: 89,
        evidence: 'Portfolio features 4 case studies with strong problem framing and research-driven insights. Impact metrics included for 2 projects. Visual presentation is clean but not as polished as top-tier candidates.',
        strengths: ['Strong problem framing with research-backed insights', 'Impact metrics tied to business outcomes in key projects', 'Clear design rationale throughout case studies'],
        gaps: ['Visual polish could be elevated in portfolio presentation', 'Only 4 case studies — could show broader range'],
      },
      {
        criterionKey: 'design_process', maxScore: 10, applicantScore: 9, confidence: 90,
        evidence: 'Resume describes running weekly user research sessions, affinity mapping workshops, and rapid prototype testing cycles. Mentions implementing a design ops process that reduced research-to-insight time by 40%.',
        strengths: ['Weekly user research cadence embedded in workflow', 'Design ops process with measurable time reduction', 'Workshop facilitation skills for team alignment'],
        gaps: [],
      },
      {
        criterionKey: 'ux_visual_craft', maxScore: 10, applicantScore: 7, confidence: 84,
        evidence: 'Portfolio shows solid UX foundations with good task flow design. Visual design is functional and clean but lacks the distinctive craft or design system depth seen in stronger portfolios.',
        strengths: ['Solid UX foundations with clear task flow design', 'Functional and accessible visual design approach'],
        gaps: ['Visual design lacks distinctive polish compared to top candidates', 'No design system ownership or creation mentioned'],
      },
      {
        criterionKey: 'cross_functional', maxScore: 10, applicantScore: 9, confidence: 88,
        evidence: 'Resume highlights "facilitated 12+ design workshops with engineering and product teams." Mentions structured design critique sessions and clear handoff documentation with Figma annotations.',
        strengths: ['Prolific workshop facilitator with engineering and product', 'Structured design critique process leadership', 'Detailed Figma annotation handoff workflow'],
        gaps: [],
      },
      {
        criterionKey: 'domain_knowledge', maxScore: 10, applicantScore: 8, confidence: 83,
        evidence: 'Experience designing CRM and customer support tools — adjacent to HR/recruitment workflows. Resume mentions designing complex state management UIs with multi-step forms.',
        strengths: ['CRM tool design experience adjacent to ATS workflows', 'Complex multi-step form and state management UI experience'],
        gaps: ['No direct recruitment or HR product experience'],
      },
    ],
  },

  // Alexander Johansson (interview, score: 86)
  {
    jobIndex: 1, candidateIndex: 16, compositeScore: 86,
    summary: 'Well-rounded designer with excellent visual craft and strong B2B SaaS experience. Case studies demonstrate clear impact metrics and thoughtful design thinking. Research methodology could be more structured but overall profile is very strong.',
    scores: [
      {
        criterionKey: 'portfolio_quality', maxScore: 10, applicantScore: 8, confidence: 88,
        evidence: 'Portfolio showcases 5 case studies with clear business impact statements. Strongest pieces are data visualization and table design work for an enterprise analytics product.',
        strengths: ['Impact-focused case studies with business metrics', 'Strong data visualization and table design work', 'Enterprise analytics product design experience'],
        gaps: ['Some case studies lack depth in research methodology section'],
      },
      {
        criterionKey: 'design_process', maxScore: 10, applicantScore: 7, confidence: 82,
        evidence: 'Resume mentions user interviews and prototype testing but lacks detail on systematic research methodology. Design process is described as "iterative" without structured framework references.',
        strengths: ['User interview and prototype testing experience', 'Iterative design approach with stakeholder feedback loops'],
        gaps: ['No structured research framework mentioned (JTBD, design sprints)', 'Limited evidence of quantitative research methods'],
      },
      {
        criterionKey: 'ux_visual_craft', maxScore: 10, applicantScore: 9, confidence: 90,
        evidence: 'Portfolio demonstrates exceptional visual hierarchy in complex data interfaces. Resume mentions building and maintaining a design system from scratch for a 50-person engineering team.',
        strengths: ['Exceptional visual hierarchy in data-dense interfaces', 'Design system creation and maintenance from scratch', 'Strong typographic and color system sensibility'],
        gaps: [],
      },
      {
        criterionKey: 'cross_functional', maxScore: 10, applicantScore: 8, confidence: 84,
        evidence: 'Resume notes "partnered with front-end engineers on component specs" and "presented design rationale to product leadership." Active in design review process.',
        strengths: ['Engineering partnership on component specifications', 'Design rationale presentations to leadership', 'Active design review process participation'],
        gaps: ['No mention of running workshops or facilitation skills'],
      },
      {
        criterionKey: 'domain_knowledge', maxScore: 10, applicantScore: 8, confidence: 86,
        evidence: 'Current role at a B2B enterprise analytics company designing data-rich interfaces. Previous experience at a marketplace platform. Resume mentions interest in "people-focused tooling."',
        strengths: ['B2B enterprise product design with data-rich interfaces', 'Marketplace platform design experience (multi-sided)', 'Expressed interest in people-focused tooling'],
        gaps: ['No direct HR, ATS, or recruitment tool experience'],
      },
    ],
  },

  // Maria Costa (interview, score: 83)
  {
    jobIndex: 1, candidateIndex: 17, compositeScore: 83,
    summary: 'Thoughtful designer with strong cross-functional collaboration skills and an interesting perspective on accessible design. Portfolio shows good breadth but could demonstrate more depth in individual case studies. Moving forward to design exercise to validate craft depth.',
    scores: [
      {
        criterionKey: 'portfolio_quality', maxScore: 10, applicantScore: 7, confidence: 83,
        evidence: 'Portfolio features 4 projects with clear problem statements. Impact data present for 1 project. Visual presentation is clean and professional but individual case studies could go deeper into design rationale.',
        strengths: ['Clean, professional portfolio presentation', 'Clear problem statement framing in each project'],
        gaps: ['Limited impact metrics across portfolio', 'Case studies could demonstrate deeper design rationale'],
      },
      {
        criterionKey: 'design_process', maxScore: 10, applicantScore: 8, confidence: 85,
        evidence: 'Resume describes "accessibility-first design process" and "inclusive user research with diverse participant pools." Mentions WCAG audits as a regular practice and inclusive design workshops.',
        strengths: ['Accessibility-first design process is distinctive and valuable', 'Inclusive research practices with diverse participants', 'WCAG compliance as a regular practice'],
        gaps: ['Traditional UX research depth (user interviews, analytics) less emphasized'],
      },
      {
        criterionKey: 'ux_visual_craft', maxScore: 10, applicantScore: 7, confidence: 81,
        evidence: 'Portfolio shows accessible, well-structured interfaces with strong information hierarchy. Color contrast and keyboard navigation considered. Visual design is functional but not as distinctive.',
        strengths: ['Strong accessibility implementation in every project', 'Good information hierarchy and structure'],
        gaps: ['Visual design is functional but lacks distinctiveness', 'No design system ownership or creation mentioned'],
      },
      {
        criterionKey: 'cross_functional', maxScore: 10, applicantScore: 8, confidence: 86,
        evidence: 'Resume highlights "ran accessibility workshops for engineering and QA teams" and "established design-engineering pairing sessions." Strong collaboration evidence with non-design stakeholders.',
        strengths: ['Accessibility workshop facilitation for engineering teams', 'Design-engineering pairing sessions initiative', 'Strong non-design stakeholder communication'],
        gaps: [],
      },
      {
        criterionKey: 'domain_knowledge', maxScore: 10, applicantScore: 7, confidence: 79,
        evidence: 'Experience designing healthcare and public sector tools — accessibility-focused domains. No direct B2B SaaS or workflow tool experience mentioned.',
        strengths: ['Healthcare and public sector design with high accessibility standards', 'Experience with compliance-heavy design requirements'],
        gaps: ['No B2B SaaS or workflow tool experience', 'No recruitment or HR domain background'],
      },
    ],
  },

  // Ryan Chen (screening, score: 79)
  {
    jobIndex: 1, candidateIndex: 18, compositeScore: 79,
    summary: 'Promising designer with a compelling research approach and interesting transition from frontend engineering. Technical background adds depth to engineering collaboration. Moving to portfolio walkthrough to assess design craft and process maturity.',
    scores: [
      {
        criterionKey: 'portfolio_quality', maxScore: 10, applicantScore: 7, confidence: 80,
        evidence: 'Portfolio is relatively new (transition from frontend engineering). 3 case studies show solid problem-solving but the design maturity is still developing. Technical implementation perspective is a unique strength.',
        strengths: ['Unique technical perspective from engineering background', 'Strong problem-solving approach in case studies'],
        gaps: ['Portfolio is newer with fewer case studies', 'Design maturity still developing compared to experienced designers'],
      },
      {
        criterionKey: 'design_process', maxScore: 10, applicantScore: 7, confidence: 78,
        evidence: 'Resume describes "data-informed design decisions" leveraging analytics background from engineering. User testing mentioned but research methodology less developed than pure design candidates.',
        strengths: ['Data-informed design approach leveraging analytics skills', 'Ability to validate designs through code prototypes'],
        gaps: ['Formal UX research methodology less developed', 'No mention of user interview techniques or workshops'],
      },
      {
        criterionKey: 'ux_visual_craft', maxScore: 10, applicantScore: 7, confidence: 76,
        evidence: 'Portfolio shows clean, functional interfaces with good usability. Technical feasibility awareness in all designs. Visual craft is solid but room for growth in visual sophistication.',
        strengths: ['Designs are technically feasible — strong implementation awareness', 'Clean, functional interfaces with good usability'],
        gaps: ['Visual sophistication and design system depth could improve'],
      },
      {
        criterionKey: 'cross_functional', maxScore: 10, applicantScore: 9, confidence: 88,
        evidence: 'As a former frontend engineer, collaboration with engineering is a natural strength. Resume notes "bridge between design and engineering teams" and "mentored designers on technical constraints."',
        strengths: ['Natural engineering collaboration from technical background', 'Bridges design-engineering communication gap effectively', 'Mentors designers on technical feasibility constraints'],
        gaps: [],
      },
      {
        criterionKey: 'domain_knowledge', maxScore: 10, applicantScore: 6, confidence: 73,
        evidence: 'Previous engineering role at a consumer app company. Design work focused on developer tools. Limited B2B SaaS or workflow product experience.',
        strengths: ['Developer tools design — technical product experience'],
        gaps: ['No B2B SaaS product design experience', 'No workflow tool or HR domain exposure'],
      },
    ],
  },

  // Laura Nguyen (screening, score: 76)
  {
    jobIndex: 1, candidateIndex: 19, compositeScore: 76,
    summary: 'Designer with strong visual craft and emerging B2B experience. Portfolio shows good aesthetic sensibility but needs more evidence of structured design process and research depth. Reviewing B2B experience depth before scheduling portfolio walkthrough.',
    scores: [
      {
        criterionKey: 'portfolio_quality', maxScore: 10, applicantScore: 7, confidence: 79,
        evidence: 'Portfolio features visually polished work with strong attention to detail. 3 case studies primarily focused on visual redesign rather than end-to-end product design. Impact metrics are limited.',
        strengths: ['High visual polish and attention to detail', 'Strong aesthetic sensibility across all projects'],
        gaps: ['Case studies lean toward visual redesign over full product design', 'Limited business impact metrics'],
      },
      {
        criterionKey: 'design_process', maxScore: 10, applicantScore: 6, confidence: 75,
        evidence: 'Resume mentions "user feedback sessions" and "iterative design cycles" but lacks detail on structured research methodology or discovery practices.',
        strengths: ['User feedback integration into design cycles'],
        gaps: ['No structured research methodology described', 'Limited evidence of discovery or problem framing practices'],
      },
      {
        criterionKey: 'ux_visual_craft', maxScore: 10, applicantScore: 8, confidence: 85,
        evidence: 'Portfolio demonstrates strong visual design skills with excellent typography, color, and layout. Resume mentions "Figma component library contributions" and "design token system."',
        strengths: ['Excellent typography, color, and layout skills', 'Design token system implementation experience', 'Figma component library contributions'],
        gaps: [],
      },
      {
        criterionKey: 'cross_functional', maxScore: 10, applicantScore: 6, confidence: 73,
        evidence: 'Resume mentions "worked with developers on implementation" but limited detail on structured handoff, workshops, or product collaboration.',
        strengths: ['Developer collaboration experience'],
        gaps: ['No structured handoff process described', 'Limited product or stakeholder collaboration evidence'],
      },
      {
        criterionKey: 'domain_knowledge', maxScore: 10, applicantScore: 6, confidence: 72,
        evidence: 'Experience split between consumer apps and a recent B2B SaaS role. B2B experience is 1 year. No workflow tool or HR domain background.',
        strengths: ['Recent transition to B2B SaaS shows career direction'],
        gaps: ['B2B SaaS experience is only 1 year', 'No workflow tool or recruitment domain experience'],
      },
    ],
  },

  // ──────────────────────────────────────────
  // Job 2: DevOps Engineer
  // ──────────────────────────────────────────

  // James O'Brien (hired, score: 94)
  {
    jobIndex: 2, candidateIndex: 5, compositeScore: 94,
    summary: 'Exceptional DevOps engineer with deep container orchestration expertise, outstanding CI/CD pipeline design, and strong security awareness. Demonstrates production ownership across hosted and self-hosted environments — precisely the profile needed for this role.',
    scores: [
      {
        criterionKey: 'infrastructure', maxScore: 10, applicantScore: 10, confidence: 94,
        evidence: 'Resume shows 6 years of infrastructure management. Expert Docker and Kubernetes experience with custom operator development. Managed AWS and Hetzner environments for multi-region SaaS deployments. Terraform IaC for all infrastructure.',
        strengths: ['Expert Kubernetes with custom operator development', 'Multi-region cloud infrastructure across AWS and Hetzner', 'Infrastructure-as-Code discipline with Terraform'],
        gaps: [],
      },
      {
        criterionKey: 'cicd_automation', maxScore: 10, applicantScore: 9, confidence: 93,
        evidence: 'Built GitHub Actions pipelines with automated canary deployments, rollback triggers, and artifact management. Resume mentions "deployment frequency increased from weekly to 15+ per day" after pipeline improvements.',
        strengths: ['GitHub Actions pipeline expertise with canary deployments', 'Measurable deployment frequency improvement (weekly to 15+/day)', 'Automated rollback and artifact management'],
        gaps: ['No multi-cloud CI/CD orchestration experience mentioned'],
      },
      {
        criterionKey: 'observability', maxScore: 10, applicantScore: 9, confidence: 91,
        evidence: 'Implemented Prometheus/Grafana monitoring stack with custom alerting rules. Resume describes "structured incident response process with 15-minute MTTD" and "published 20+ runbooks for common operational scenarios."',
        strengths: ['Full observability stack implementation (Prometheus/Grafana)', '15-minute MTTD with structured incident response', 'Comprehensive runbook library (20+) for operational resilience'],
        gaps: ['No distributed tracing experience mentioned (Jaeger, OpenTelemetry)'],
      },
      {
        criterionKey: 'security_compliance', maxScore: 10, applicantScore: 9, confidence: 90,
        evidence: 'Resume highlights "secrets management with HashiCorp Vault," "TLS certificate automation with cert-manager," and "SOC 2 audit preparation." Strong security-first mindset throughout infrastructure work.',
        strengths: ['HashiCorp Vault for secrets management', 'Automated TLS certificate management', 'SOC 2 compliance preparation experience'],
        gaps: ['No penetration testing or security audit leadership mentioned'],
      },
      {
        criterionKey: 'relevant_experience', maxScore: 10, applicantScore: 9, confidence: 92,
        evidence: '6 years of DevOps and platform engineering. Last 3 years supporting B2B SaaS products with both hosted and self-hosted deployment models. Resume mentions "documented self-hosted deployment guides for enterprise customers."',
        strengths: ['6 years of dedicated DevOps/platform engineering', 'B2B SaaS with both hosted and self-hosted deployment support', 'Enterprise self-hosted deployment documentation experience'],
        gaps: [],
      },
    ],
  },

  // Amara Okafor (offer, score: 90)
  {
    jobIndex: 2, candidateIndex: 6, compositeScore: 90,
    summary: 'Strong platform engineer with excellent reliability focus and deep Linux expertise. Brings robust CI/CD automation skills and a strong disaster recovery background. Minor gap in container orchestration beyond Docker Compose but compensated by outstanding operational discipline.',
    scores: [
      {
        criterionKey: 'infrastructure', maxScore: 10, applicantScore: 8, confidence: 88,
        evidence: 'Resume shows 5 years of Linux system administration and Docker expertise. Managed bare-metal and cloud infrastructure on AWS and Hetzner. Docker Compose for service orchestration — no production Kubernetes.',
        strengths: ['Deep Linux system administration expertise (5 years)', 'Multi-cloud experience across AWS and Hetzner', 'Docker expertise with production deployment experience'],
        gaps: ['No production Kubernetes experience — Docker Compose only', 'Limited container orchestration at scale'],
      },
      {
        criterionKey: 'cicd_automation', maxScore: 10, applicantScore: 9, confidence: 90,
        evidence: 'Built GitLab CI pipelines with automated testing, staging deployments, and production promotion. Resume mentions "zero-downtime deployment strategy using blue-green deployments" with measured rollback times.',
        strengths: ['GitLab CI pipeline expertise with full automation', 'Blue-green deployment strategy for zero-downtime releases', 'Measurable rollback procedures with tested recovery times'],
        gaps: [],
      },
      {
        criterionKey: 'observability', maxScore: 10, applicantScore: 8, confidence: 86,
        evidence: 'Implemented ELK stack for log aggregation and Grafana dashboards for infrastructure metrics. Resume mentions "on-call rotation with structured escalation procedures." Limited detail on alerting sophistication.',
        strengths: ['ELK stack implementation for centralized logging', 'Grafana dashboards for infrastructure monitoring', 'On-call rotation with structured escalation'],
        gaps: ['Limited detail on alerting rule sophistication', 'No mention of SLO/SLA-based monitoring'],
      },
      {
        criterionKey: 'security_compliance', maxScore: 10, applicantScore: 9, confidence: 89,
        evidence: 'Resume highlights "automated security scanning in CI pipeline," "network segmentation with firewall rules," and "encrypted backup procedures with tested restore processes."',
        strengths: ['CI-integrated security scanning automation', 'Network segmentation and firewall management', 'Encrypted backup with tested restore procedures'],
        gaps: [],
      },
      {
        criterionKey: 'relevant_experience', maxScore: 10, applicantScore: 9, confidence: 90,
        evidence: '5 years of DevOps experience. Current role supporting a B2B SaaS platform with 500+ organizations. Strong disaster recovery and data protection focus.',
        strengths: ['5 years of dedicated DevOps experience', 'B2B SaaS support at scale (500+ organizations)', 'Strong disaster recovery and data protection discipline'],
        gaps: ['No self-hosted deployment documentation experience'],
      },
    ],
  },

  // Yuki Tanaka (interview, score: 85)
  {
    jobIndex: 2, candidateIndex: 7, compositeScore: 85,
    summary: 'Well-rounded DevOps engineer with strong CI/CD expertise and good cloud fundamentals. Deep GitHub Actions experience aligns well with the team\'s tooling. Kubernetes experience is theoretical rather than production-depth. Scheduling final technical interview.',
    scores: [
      {
        criterionKey: 'infrastructure', maxScore: 10, applicantScore: 7, confidence: 82,
        evidence: 'Resume shows Docker and cloud infrastructure management on AWS. Kubernetes listed under "proficient" but production experience limited to staging environments. Good Linux fundamentals.',
        strengths: ['Docker production experience on AWS', 'Linux system administration fundamentals', 'Kubernetes knowledge (staging environment level)'],
        gaps: ['Kubernetes experience limited to staging — not production', 'Single cloud provider experience (AWS only)'],
      },
      {
        criterionKey: 'cicd_automation', maxScore: 10, applicantScore: 9, confidence: 91,
        evidence: 'Built complex GitHub Actions workflows with matrix builds, reusable workflows, and automated release tagging. Resume mentions "reduced CI pipeline time by 65% through caching and parallelization strategies."',
        strengths: ['Advanced GitHub Actions with reusable workflows', '65% CI pipeline time reduction through optimization', 'Matrix builds and parallelization expertise'],
        gaps: [],
      },
      {
        criterionKey: 'observability', maxScore: 10, applicantScore: 7, confidence: 80,
        evidence: 'Resume lists CloudWatch and custom dashboards. Mentions "pager rotation" and "post-incident reviews" but limited detail on monitoring architecture or alerting sophistication.',
        strengths: ['CloudWatch monitoring and custom dashboards', 'Post-incident review process participation'],
        gaps: ['No full observability stack implementation mentioned', 'Limited alerting sophistication detail'],
      },
      {
        criterionKey: 'security_compliance', maxScore: 10, applicantScore: 7, confidence: 79,
        evidence: 'Resume mentions "TLS configuration" and "environment variable management for secrets." Basic security awareness but limited depth in compliance or advanced security practices.',
        strengths: ['TLS configuration and certificate management', 'Secure environment variable handling'],
        gaps: ['No compliance framework experience (SOC 2, GDPR)', 'No advanced secrets management tools mentioned'],
      },
      {
        criterionKey: 'relevant_experience', maxScore: 10, applicantScore: 8, confidence: 84,
        evidence: '4 years of DevOps experience. Previous role at a SaaS startup with rapid deployment cycles. Strong automation mindset and good documentation habits.',
        strengths: ['SaaS startup DevOps experience with rapid deployment cycles', 'Strong automation mindset and documentation habits'],
        gaps: ['4 years total experience is moderate for the scope of this role'],
      },
    ],
  },

  // Lucas Andersson (interview, score: 83)
  {
    jobIndex: 2, candidateIndex: 8, compositeScore: 83,
    summary: 'Solid DevOps engineer with strong automation mindset and good incident response practices. Brings practical experience across Docker and CI/CD. Cloud expertise could be deeper but compensated by excellent troubleshooting skills and operational discipline.',
    scores: [
      {
        criterionKey: 'infrastructure', maxScore: 10, applicantScore: 7, confidence: 80,
        evidence: 'Resume shows Docker Compose production deployments and DigitalOcean cloud management. Some AWS experience. Limited IaC depth — mentions "shell scripts for provisioning" rather than Terraform.',
        strengths: ['Docker Compose production deployment experience', 'Multi-cloud exposure (DigitalOcean and AWS)', 'Practical troubleshooting and debugging skills'],
        gaps: ['No IaC tools (Terraform, Pulumi) — relies on shell scripts', 'No container orchestration beyond Docker Compose'],
      },
      {
        criterionKey: 'cicd_automation', maxScore: 10, applicantScore: 8, confidence: 85,
        evidence: 'Built GitLab CI pipelines with automated testing and deployment. Resume mentions "deployment automation scripts with rollback capability" and "staging environment auto-provisioning."',
        strengths: ['GitLab CI pipeline automation', 'Deployment scripts with rollback capability', 'Staging environment auto-provisioning'],
        gaps: ['No advanced deployment strategies mentioned (canary, blue-green)'],
      },
      {
        criterionKey: 'observability', maxScore: 10, applicantScore: 8, confidence: 83,
        evidence: 'Resume describes "custom alerting with PagerDuty integration" and "structured log analysis for root cause determination." Mentions incident retrospectives as a team practice.',
        strengths: ['PagerDuty alerting integration', 'Structured log analysis for root cause investigations', 'Incident retrospective facilitation'],
        gaps: ['No full monitoring stack implementation described'],
      },
      {
        criterionKey: 'security_compliance', maxScore: 10, applicantScore: 7, confidence: 77,
        evidence: 'Resume mentions "SSL certificate management" and "firewall configuration." Basic security practices but no compliance framework or advanced security tooling experience.',
        strengths: ['SSL certificate management', 'Firewall configuration and network security basics'],
        gaps: ['No compliance framework experience', 'No secrets management tooling mentioned'],
      },
      {
        criterionKey: 'relevant_experience', maxScore: 10, applicantScore: 8, confidence: 82,
        evidence: '4 years of DevOps experience across 2 companies. Current role supporting a SaaS product with Docker-based deployments. Good documentation and knowledge-sharing habits.',
        strengths: ['Multi-company DevOps experience', 'SaaS product support with Docker deployments', 'Strong documentation and knowledge-sharing culture'],
        gaps: ['No enterprise self-hosted support experience'],
      },
    ],
  },

  // Priya Sharma (screening, score: 79)
  {
    jobIndex: 2, candidateIndex: 9, compositeScore: 79,
    summary: 'Good cloud fundamentals with practical Docker and CI/CD experience. Shows solid operational awareness and a systematic approach to infrastructure management. Validating production ownership scope before moving to interviews.',
    scores: [
      {
        criterionKey: 'infrastructure', maxScore: 10, applicantScore: 7, confidence: 78,
        evidence: 'Resume shows AWS cloud management (EC2, RDS, S3) and Docker container deployments. Linux administration mentioned. No IaC or container orchestration beyond basic Docker.',
        strengths: ['AWS cloud management across core services', 'Docker container deployment experience', 'Linux system administration'],
        gaps: ['No IaC experience', 'No container orchestration (Kubernetes, Swarm)'],
      },
      {
        criterionKey: 'cicd_automation', maxScore: 10, applicantScore: 7, confidence: 79,
        evidence: 'Resume mentions "GitHub Actions for automated testing and deployment" and "deployment scripts for staging and production environments."',
        strengths: ['GitHub Actions CI/CD experience', 'Automated testing and deployment scripts'],
        gaps: ['No advanced deployment strategies or pipeline optimization mentioned'],
      },
      {
        criterionKey: 'observability', maxScore: 10, applicantScore: 6, confidence: 74,
        evidence: 'Resume mentions "CloudWatch monitoring" and "log review during incidents." Limited evidence of proactive monitoring or alerting system design.',
        strengths: ['CloudWatch monitoring familiarity', 'Incident log review experience'],
        gaps: ['No proactive monitoring or alerting system design', 'No structured incident response process described'],
      },
      {
        criterionKey: 'security_compliance', maxScore: 10, applicantScore: 7, confidence: 76,
        evidence: 'Resume notes "security group configuration" and "IAM role management in AWS." Basic cloud security but no advanced practices or compliance experience.',
        strengths: ['AWS security group and IAM management', 'Cloud security basics'],
        gaps: ['No compliance framework experience', 'No advanced security tooling'],
      },
      {
        criterionKey: 'relevant_experience', maxScore: 10, applicantScore: 7, confidence: 80,
        evidence: '3 years of DevOps experience in a growing startup environment. Broad operational responsibilities including database management and infrastructure monitoring.',
        strengths: ['Startup DevOps with broad operational ownership', 'Database management alongside infrastructure work'],
        gaps: ['3 years is relatively early career for this scope', 'No enterprise or self-hosted deployment experience'],
      },
    ],
  },

  // Mateo García (screening, score: 76)
  {
    jobIndex: 2, candidateIndex: 10, compositeScore: 76,
    summary: 'Relevant Docker and IaC experience with a good automation mindset. Resume shows potential but depth of operational experience needs validation. Recruiter follow-up pending to assess production readiness.',
    scores: [
      {
        criterionKey: 'infrastructure', maxScore: 10, applicantScore: 7, confidence: 77,
        evidence: 'Resume lists Docker, Hetzner cloud, and "experimenting with Terraform." Linux server management as part of current role. Infrastructure exposure is practical but not production-depth.',
        strengths: ['Docker and Hetzner cloud experience', 'Linux server management', 'Terraform learning initiative shows growth mindset'],
        gaps: ['Terraform is experimental rather than production usage', 'No container orchestration experience'],
      },
      {
        criterionKey: 'cicd_automation', maxScore: 10, applicantScore: 7, confidence: 78,
        evidence: 'Resume mentions "GitHub Actions for build and deploy" and "Bash automation scripts for deployment." Basic CI/CD pipeline operation.',
        strengths: ['GitHub Actions for build and deployment', 'Bash automation scripting'],
        gaps: ['Basic pipeline operation — no advanced features described', 'No pipeline optimization or complex workflow experience'],
      },
      {
        criterionKey: 'observability', maxScore: 10, applicantScore: 6, confidence: 72,
        evidence: 'Resume mentions "server monitoring with Netdata." Limited detail on alerting, incident response, or operational runbooks.',
        strengths: ['Basic server monitoring with Netdata'],
        gaps: ['No structured alerting or incident response', 'No runbook or operational documentation mentioned'],
      },
      {
        criterionKey: 'security_compliance', maxScore: 10, applicantScore: 6, confidence: 73,
        evidence: 'Resume mentions "firewall setup" and "SSH key management." Basic security fundamentals without depth in compliance or advanced security practices.',
        strengths: ['Firewall and SSH key management basics'],
        gaps: ['No compliance or advanced security experience', 'No secrets management tooling'],
      },
      {
        criterionKey: 'relevant_experience', maxScore: 10, applicantScore: 7, confidence: 76,
        evidence: '3 years of DevOps-adjacent work transitioning from system administration. Current role combines sys admin and DevOps responsibilities.',
        strengths: ['System administration foundation transitioning to DevOps', '3 years of progressive infrastructure experience'],
        gaps: ['Still transitioning from sys admin — DevOps depth developing', 'No SaaS product support experience'],
      },
    ],
  },
]

// ─────────────────────────────────────────────
// Interview definitions — realistic multi-stage loops
// ─────────────────────────────────────────────

interface InterviewSeed {
  jobIndex: number
  candidateIndex: number
  title: string
  type: 'phone' | 'video' | 'in_person' | 'panel' | 'technical' | 'take_home'
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  /** Days from seed date. Positive = future, negative = past. */
  daysOffset: number
  hour: number
  minute?: number
  duration: number
  location: string | null
  notes: string | null
  interviewers: string[]
  candidateResponse: 'pending' | 'accepted' | 'declined' | 'tentative'
  timezone: string
}

const INTERVIEWS_DATA: InterviewSeed[] = [
  // ──────────────────────────────────────────
  // Job 0: Senior Full-Stack Engineer
  // ──────────────────────────────────────────

  // Emma Schmidt (hired) — full 3-round loop, all completed
  {
    jobIndex: 0, candidateIndex: 0,
    title: 'Initial Phone Screen',
    type: 'phone', status: 'completed',
    daysOffset: -18, hour: 10, duration: 30,
    location: null,
    notes: 'Strong communication skills. Clear motivation and relevant experience. Advancing to technical round.',
    interviewers: ['Anna Weiss'],
    candidateResponse: 'accepted',
    timezone: 'Europe/Berlin',
  },
  {
    jobIndex: 0, candidateIndex: 0,
    title: 'Technical Interview — System Design & Coding',
    type: 'technical', status: 'completed',
    daysOffset: -12, hour: 14, duration: 90,
    location: 'Google Meet',
    notes: 'Exceptional system design approach. Solved the distributed caching problem elegantly. Strong TypeScript patterns and testing discipline.',
    interviewers: ['Marcus Reiter', 'Sarah Chen'],
    candidateResponse: 'accepted',
    timezone: 'Europe/Berlin',
  },
  {
    jobIndex: 0, candidateIndex: 0,
    title: 'Final Panel — Culture & Leadership',
    type: 'panel', status: 'completed',
    daysOffset: -7, hour: 11, duration: 60,
    location: 'Reqcore HQ, Friedrichstraße 123, Berlin',
    notes: 'Unanimous strong hire from the panel. Great leadership examples and clear alignment with team values. Offer approved.',
    interviewers: ['Thomas Berger', 'Sarah Chen', 'Lisa Hoffmann'],
    candidateResponse: 'accepted',
    timezone: 'Europe/Berlin',
  },

  // Liam Müller (offer) — 3 rounds completed, offer pending
  {
    jobIndex: 0, candidateIndex: 1,
    title: 'Recruiter Screen',
    type: 'phone', status: 'completed',
    daysOffset: -16, hour: 9, minute: 30, duration: 30,
    location: null,
    notes: 'Well-prepared candidate. Salary expectations within band. Moving forward.',
    interviewers: ['Anna Weiss'],
    candidateResponse: 'accepted',
    timezone: 'Europe/Berlin',
  },
  {
    jobIndex: 0, candidateIndex: 1,
    title: 'Technical Deep-Dive — Full-Stack Architecture',
    type: 'technical', status: 'completed',
    daysOffset: -10, hour: 15, duration: 90,
    location: 'Google Meet',
    notes: 'Excellent systems thinking. Strong PostgreSQL optimization knowledge. Good tradeoff analysis on caching strategies.',
    interviewers: ['Marcus Reiter', 'Daniel Krause'],
    candidateResponse: 'accepted',
    timezone: 'Europe/Berlin',
  },
  {
    jobIndex: 0, candidateIndex: 1,
    title: 'Hiring Manager Interview',
    type: 'video', status: 'completed',
    daysOffset: -5, hour: 13, duration: 45,
    location: 'Google Meet',
    notes: 'Great cultural fit. Proactive mindset and excellent collaboration examples. Preparing offer package.',
    interviewers: ['Sarah Chen'],
    candidateResponse: 'accepted',
    timezone: 'Europe/Berlin',
  },

  // Sofia Dubois (offer) — 2 rounds completed
  {
    jobIndex: 0, candidateIndex: 2,
    title: 'Introductory Call',
    type: 'phone', status: 'completed',
    daysOffset: -14, hour: 11, duration: 30,
    location: null,
    notes: 'Strong backend focus with solid frontend skills. Motivated by the open-source mission.',
    interviewers: ['Anna Weiss'],
    candidateResponse: 'accepted',
    timezone: 'Europe/Paris',
  },
  {
    jobIndex: 0, candidateIndex: 2,
    title: 'Technical Assessment — Live Coding',
    type: 'technical', status: 'completed',
    daysOffset: -8, hour: 14, minute: 30, duration: 75,
    location: 'Google Meet',
    notes: 'Clean code structure and strong testing habits. Handled edge cases well during the API design exercise.',
    interviewers: ['Marcus Reiter'],
    candidateResponse: 'accepted',
    timezone: 'Europe/Paris',
  },

  // Noah van der Berg (interview) — 1 completed, 1 upcoming
  {
    jobIndex: 0, candidateIndex: 3,
    title: 'Recruiter Phone Screen',
    type: 'phone', status: 'completed',
    daysOffset: -6, hour: 10, duration: 30,
    location: null,
    notes: 'Good technical background. Previous multi-tenant SaaS experience. Proceeding to technical round.',
    interviewers: ['Anna Weiss'],
    candidateResponse: 'accepted',
    timezone: 'Europe/Amsterdam',
  },
  {
    jobIndex: 0, candidateIndex: 3,
    title: 'Technical Interview — Architecture & Problem Solving',
    type: 'technical', status: 'scheduled',
    daysOffset: 3, hour: 14, duration: 90,
    location: 'Google Meet',
    notes: 'Focus on system design, database modeling, and real-time collaboration patterns.',
    interviewers: ['Marcus Reiter', 'Sarah Chen'],
    candidateResponse: 'accepted',
    timezone: 'Europe/Amsterdam',
  },

  // Olivia Rossi (interview) — 1 upcoming
  {
    jobIndex: 0, candidateIndex: 4,
    title: 'Initial Video Screen',
    type: 'video', status: 'scheduled',
    daysOffset: 2, hour: 11, duration: 45,
    location: 'Google Meet',
    notes: 'Review portfolio projects and discuss full-stack experience with Vue/Nuxt.',
    interviewers: ['Sarah Chen'],
    candidateResponse: 'accepted',
    timezone: 'Europe/Rome',
  },

  // James O\'Brien (interview) — 1 upcoming, pending response
  {
    jobIndex: 0, candidateIndex: 5,
    title: 'Phone Screen',
    type: 'phone', status: 'scheduled',
    daysOffset: 5, hour: 15, duration: 30,
    location: null,
    notes: 'Discuss background, role expectations, and availability.',
    interviewers: ['Anna Weiss'],
    candidateResponse: 'pending',
    timezone: 'Europe/London',
  },

  // ──────────────────────────────────────────
  // Job 1: Product Designer
  // ──────────────────────────────────────────

  // David Kim (offer) — 2 rounds completed
  {
    jobIndex: 1, candidateIndex: 14,
    title: 'Portfolio Review & Design Discussion',
    type: 'video', status: 'completed',
    daysOffset: -15, hour: 10, duration: 60,
    location: 'Google Meet',
    notes: 'Exceptional portfolio depth. Clear articulation of design decisions and business impact. Strong systems thinking.',
    interviewers: ['Julia Engel'],
    candidateResponse: 'accepted',
    timezone: 'Asia/Seoul',
  },
  {
    jobIndex: 1, candidateIndex: 14,
    title: 'Design Challenge Debrief & Team Fit',
    type: 'panel', status: 'completed',
    daysOffset: -8, hour: 9, duration: 75,
    location: 'Google Meet',
    notes: 'Design challenge solution was thoughtful and user-centered. Excellent collaboration style during critique. Strong hire recommendation.',
    interviewers: ['Julia Engel', 'Lisa Hoffmann', 'Thomas Berger'],
    candidateResponse: 'accepted',
    timezone: 'Asia/Seoul',
  },

  // Elena Petrova (interview) — 1 upcoming
  {
    jobIndex: 1, candidateIndex: 15,
    title: 'Portfolio Walkthrough & Design Process',
    type: 'video', status: 'scheduled',
    daysOffset: 4, hour: 13, duration: 60,
    location: 'Google Meet',
    notes: 'Review 2-3 case studies. Assess design thinking, research methods, and handoff practices.',
    interviewers: ['Julia Engel'],
    candidateResponse: 'accepted',
    timezone: 'Europe/Berlin',
  },

  // Alexander Johansson (interview) — 1 upcoming, tentative response
  {
    jobIndex: 1, candidateIndex: 16,
    title: 'Introductory Design Interview',
    type: 'video', status: 'scheduled',
    daysOffset: 6, hour: 10, minute: 30, duration: 45,
    location: 'Google Meet',
    notes: 'Discuss portfolio highlights, design process, and interest in B2B SaaS products.',
    interviewers: ['Julia Engel', 'Lisa Hoffmann'],
    candidateResponse: 'tentative',
    timezone: 'Europe/Stockholm',
  },

  // Maria Costa (interview) — 1 completed, 1 upcoming
  {
    jobIndex: 1, candidateIndex: 17,
    title: 'Initial Screening Call',
    type: 'phone', status: 'completed',
    daysOffset: -5, hour: 14, duration: 30,
    location: null,
    notes: 'Strong cross-functional collaboration background. Interesting perspective on accessible design.',
    interviewers: ['Anna Weiss'],
    candidateResponse: 'accepted',
    timezone: 'Europe/Lisbon',
  },
  {
    jobIndex: 1, candidateIndex: 17,
    title: 'Design Exercise Review & Discussion',
    type: 'video', status: 'scheduled',
    daysOffset: 7, hour: 11, duration: 90,
    location: 'Google Meet',
    notes: 'Review take-home design exercise. Assess problem framing, research approach, and visual execution.',
    interviewers: ['Julia Engel', 'Lisa Hoffmann'],
    candidateResponse: 'accepted',
    timezone: 'Europe/Lisbon',
  },

  // ──────────────────────────────────────────
  // Job 2: DevOps Engineer
  // ──────────────────────────────────────────

  // James O\'Brien (hired) — 2 rounds completed
  {
    jobIndex: 2, candidateIndex: 5,
    title: 'Technical Screen — Infrastructure & CI/CD',
    type: 'technical', status: 'completed',
    daysOffset: -20, hour: 14, duration: 60,
    location: 'Google Meet',
    notes: 'Deep Docker expertise and strong GitHub Actions experience. Excellent incident response examples.',
    interviewers: ['Daniel Krause'],
    candidateResponse: 'accepted',
    timezone: 'Europe/London',
  },
  {
    jobIndex: 2, candidateIndex: 5,
    title: 'System Design — Deployment Architecture',
    type: 'technical', status: 'completed',
    daysOffset: -14, hour: 11, duration: 90,
    location: 'Google Meet',
    notes: 'Outstanding architecture proposal for multi-region deployment with automated failover. Strong security awareness. Contract approved.',
    interviewers: ['Daniel Krause', 'Thomas Berger'],
    candidateResponse: 'accepted',
    timezone: 'Europe/London',
  },

  // Amara Okafor (offer) — 2 rounds completed
  {
    jobIndex: 2, candidateIndex: 6,
    title: 'Introductory Technical Call',
    type: 'video', status: 'completed',
    daysOffset: -12, hour: 13, duration: 45,
    location: 'Google Meet',
    notes: 'Strong platform engineering background. Good experience with Terraform and observability tooling.',
    interviewers: ['Daniel Krause'],
    candidateResponse: 'accepted',
    timezone: 'Africa/Lagos',
  },
  {
    jobIndex: 2, candidateIndex: 6,
    title: 'Hands-On Technical Challenge Review',
    type: 'technical', status: 'completed',
    daysOffset: -6, hour: 15, duration: 75,
    location: 'Google Meet',
    notes: 'Well-structured solution to the Dockerized deployment exercise. Clean IaC approach. Offer being prepared.',
    interviewers: ['Daniel Krause', 'Marcus Reiter'],
    candidateResponse: 'accepted',
    timezone: 'Africa/Lagos',
  },

  // Yuki Tanaka (interview) — 1 upcoming
  {
    jobIndex: 2, candidateIndex: 7,
    title: 'Technical Assessment — Container Orchestration',
    type: 'technical', status: 'scheduled',
    daysOffset: 3, hour: 9, duration: 60,
    location: 'Google Meet',
    notes: 'Focus on Docker best practices, CI pipeline design, and monitoring strategies.',
    interviewers: ['Daniel Krause'],
    candidateResponse: 'accepted',
    timezone: 'Asia/Tokyo',
  },

  // Lucas Andersson (interview) — 1 completed, 1 upcoming
  {
    jobIndex: 2, candidateIndex: 8,
    title: 'Initial Phone Screen',
    type: 'phone', status: 'completed',
    daysOffset: -4, hour: 10, duration: 30,
    location: null,
    notes: 'Good automation mindset. Relevant experience with GitHub Actions and Postgres ops. Moving to technical round.',
    interviewers: ['Anna Weiss'],
    candidateResponse: 'accepted',
    timezone: 'Europe/Stockholm',
  },
  {
    jobIndex: 2, candidateIndex: 8,
    title: 'Technical Deep-Dive — Infrastructure as Code',
    type: 'technical', status: 'scheduled',
    daysOffset: 8, hour: 14, duration: 75,
    location: 'Google Meet',
    notes: 'Practical exercise: design a CI/CD pipeline for a multi-service deployment with rollback support.',
    interviewers: ['Daniel Krause', 'Thomas Berger'],
    candidateResponse: 'pending',
    timezone: 'Europe/Stockholm',
  },

  // ──────────────────────────────────────────
  // Job 3: Technical Writer
  // ──────────────────────────────────────────

  // Felix Weber (offer) — 2 rounds completed
  {
    jobIndex: 3, candidateIndex: 12,
    title: 'Writing Sample Review & Discussion',
    type: 'video', status: 'completed',
    daysOffset: -11, hour: 10, duration: 45,
    location: 'Google Meet',
    notes: 'Excellent technical writing samples. Clear information architecture and reader-first approach.',
    interviewers: ['Lisa Hoffmann'],
    candidateResponse: 'accepted',
    timezone: 'Europe/Berlin',
  },
  {
    jobIndex: 3, candidateIndex: 12,
    title: 'Editorial Discussion & Team Integration',
    type: 'video', status: 'completed',
    daysOffset: -4, hour: 14, duration: 60,
    location: 'Google Meet',
    notes: 'Strong docs-as-code experience and excellent editorial judgment. Great fit for the team. Offer recommended.',
    interviewers: ['Lisa Hoffmann', 'Sarah Chen'],
    candidateResponse: 'accepted',
    timezone: 'Europe/Berlin',
  },

  // David Kim (interview) — 1 upcoming
  {
    jobIndex: 3, candidateIndex: 14,
    title: 'Technical Writing Assessment Review',
    type: 'video', status: 'scheduled',
    daysOffset: 5, hour: 10, duration: 60,
    location: 'Google Meet',
    notes: 'Review submitted API documentation sample. Discuss approach to developer docs and information architecture.',
    interviewers: ['Lisa Hoffmann'],
    candidateResponse: 'accepted',
    timezone: 'Asia/Seoul',
  },

  // Alexander Johansson (interview) — 1 cancelled + rescheduled
  {
    jobIndex: 3, candidateIndex: 16,
    title: 'Introductory Call',
    type: 'phone', status: 'cancelled',
    daysOffset: -3, hour: 15, duration: 30,
    location: null,
    notes: 'Candidate requested reschedule due to conflict. Rebooked for next week.',
    interviewers: ['Lisa Hoffmann'],
    candidateResponse: 'declined',
    timezone: 'Europe/Stockholm',
  },
  {
    jobIndex: 3, candidateIndex: 16,
    title: 'Introductory Call (Rescheduled)',
    type: 'video', status: 'scheduled',
    daysOffset: 6, hour: 13, duration: 30,
    location: 'Google Meet',
    notes: 'Rescheduled from last week. Discuss writing background and interest in the role.',
    interviewers: ['Lisa Hoffmann'],
    candidateResponse: 'accepted',
    timezone: 'Europe/Stockholm',
  },

  // ──────────────────────────────────────────
  // Job 4: Frontend Engineering Intern
  // ──────────────────────────────────────────

  // Emma Schmidt (interview) — 1 completed, 1 upcoming
  {
    jobIndex: 4, candidateIndex: 0,
    title: 'Intro Call — Internship Overview',
    type: 'video', status: 'completed',
    daysOffset: -5, hour: 14, duration: 30,
    location: 'Google Meet',
    notes: 'Very enthusiastic and well-prepared. Impressive personal projects using Vue and Tailwind. Strong learning velocity.',
    interviewers: ['Sarah Chen'],
    candidateResponse: 'accepted',
    timezone: 'Europe/Berlin',
  },
  {
    jobIndex: 4, candidateIndex: 0,
    title: 'Technical Screen — Frontend Fundamentals',
    type: 'technical', status: 'scheduled',
    daysOffset: 4, hour: 10, duration: 60,
    location: 'Google Meet',
    notes: 'Assess HTML/CSS/JS fundamentals, component thinking, and basic Vue.js understanding.',
    interviewers: ['Marcus Reiter'],
    candidateResponse: 'accepted',
    timezone: 'Europe/Berlin',
  },

  // Sofia Dubois (interview) — 1 upcoming
  {
    jobIndex: 4, candidateIndex: 2,
    title: 'Internship Interview — Skills & Motivation',
    type: 'video', status: 'scheduled',
    daysOffset: 2, hour: 16, duration: 45,
    location: 'Google Meet',
    notes: 'Discuss academic projects, frontend experience, and career goals in software engineering.',
    interviewers: ['Sarah Chen', 'Marcus Reiter'],
    candidateResponse: 'accepted',
    timezone: 'Europe/Paris',
  },
]

// Sample responses for questions
function generateResponses(jobIndex: number, candidateIndex: number): Record<string, string | string[] | boolean> {
  const candidate = CANDIDATES_DATA[candidateIndex]
  if (!candidate) {
    return {}
  }

  if (jobIndex === 0) {
    const years = ['3', '4', '5', '6', '7', '8+']
    const frameworks = ['Vue', 'React', 'Svelte', 'Vue', 'React', 'Vue']
    const starts = ['Immediately', '2 weeks', '1 month', '2 weeks', '1 month', '2-3 months']
    const problems = [
      'Migrated a monolithic REST API to a GraphQL federation with zero downtime across 12 microservices.',
      'Built a real-time collaboration engine using CRDTs that supports 500+ concurrent users editing the same document.',
      'Redesigned our database schema to support multi-tenancy, reducing query latency by 60% and storage costs by 40%.',
      'Implemented an automated canary deployment pipeline that reduced production incidents by 75%.',
      'Built a custom state management solution for a complex form wizard with 20+ conditional steps and offline support.',
      'Created a type-safe API client generator from OpenAPI specs that eliminated an entire class of runtime errors.',
    ]
    const i = candidateIndex % years.length
    const year = getArrayItemOrThrow(years, i, 'TypeScript years response')
    const framework = getArrayItemOrThrow(frameworks, i, 'framework response')
    const problem = getArrayItemOrThrow(problems, i, 'problem response')
    const start = getArrayItemOrThrow(starts, i, 'start date response')
    return {
      'Years of TypeScript experience': year,
      'Preferred frontend framework': framework,
      'Describe a challenging technical problem you solved recently': problem,
      'Link to your GitHub profile or portfolio': `https://github.com/${candidate.firstName.toLowerCase()}${candidate.lastName.toLowerCase().replace(/['\s]/g, '')}`,
      'When can you start?': start,
    }
  }
  if (jobIndex === 1) {
    const tools = ['Figma', 'Figma', 'Sketch', 'Figma']
    const processes = [
      'I start with stakeholder interviews to understand goals, then user research (interviews + analytics). I create low-fi wireframes in FigJam, iterate with the team, then move to high-fidelity in Figma with a component library.',
      'My process: Research → Competitive analysis → User flows → Wireframes → Prototypes → User testing → Iteration. I always validate with real users before implementation.',
      'I follow a double diamond approach: Discover (research), Define (insights), Develop (ideation), Deliver (testing). I document everything in a design spec for handoff.',
      'I believe in rapid prototyping. Quick sketches → Figma prototypes → guerrilla testing → iteration. Speed of learning beats perfection.',
    ]
    const i = candidateIndex % tools.length
    const tool = getArrayItemOrThrow(tools, i, 'design tool response')
    const process = getArrayItemOrThrow(processes, i, 'design process response')
    return {
      'Link to your portfolio': `https://dribbble.com/${candidate.firstName.toLowerCase()}${candidate.lastName.toLowerCase().charAt(0)}`,
      'Primary design tool': tool,
      'Walk us through your design process for a recent project': process,
      'I have experience with design systems': candidateIndex % 2 === 0,
    }
  }
  if (jobIndex === 2) {
    const platforms = [['AWS', 'Hetzner'], ['GCP', 'AWS', 'Azure'], ['AWS', 'DigitalOcean'], ['Hetzner', 'DigitalOcean'], ['AWS', 'GCP'], ['Azure']]
    const ciPlatforms = ['GitHub Actions', 'GitLab CI', 'GitHub Actions', 'Jenkins', 'GitHub Actions', 'CircleCI']
    const dockerYears = ['3', '4', '5', '6', '2', '7']
    const i = candidateIndex % platforms.length
    const platformList = getArrayItemOrThrow(platforms, i, 'cloud platform response')
    const ciPlatform = getArrayItemOrThrow(ciPlatforms, i, 'CI/CD platform response')
    const dockerYear = getArrayItemOrThrow(dockerYears, i, 'docker years response')
    return {
      'Which cloud platforms have you worked with?': platformList,
      'Years of Docker experience': dockerYear,
      'Preferred CI/CD platform': ciPlatform,
    }
  }
  return {}
}

// ─────────────────────────────────────────────
// Main Seed Function
// ─────────────────────────────────────────────

async function seed() {
  console.log('🌱 Seeding Reqcore demo data...\n')

  // ─────────────────────────────────────────────
  // Clean up legacy applirank.com seed data
  // ─────────────────────────────────────────────
  const [legacyOrgResult, legacyUserResult] = await Promise.all([
    db
      .select({ id: schema.organization.id })
      .from(schema.organization)
      .where(eq(schema.organization.slug, LEGACY_ORG_SLUG))
      .limit(1),
    db
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.email, LEGACY_DEMO_EMAIL))
      .limit(1),
  ])
  const [legacyOrg] = legacyOrgResult
  const [legacyUser] = legacyUserResult
  if (legacyOrg || legacyUser) {
    console.log('🧹 Removing legacy applirank.com demo data...')

    if (legacyOrg) {
      // All child tables (jobs, candidates, applications, members, etc.) have
      // onDelete: 'cascade' so deleting the org removes everything beneath it.
      await db.delete(schema.organization).where(eq(schema.organization.id, legacyOrg.id))
      console.log(`   ✅ Deleted legacy org: ${LEGACY_ORG_SLUG}`)
    }

    if (legacyUser) {
      // sessions and accounts also cascade from the user row
      await db.delete(schema.user).where(eq(schema.user.id, legacyUser.id))
      console.log(`   ✅ Deleted legacy user: ${LEGACY_DEMO_EMAIL}`)
    }
  }

  // ─────────────────────────────────────────────
  // Upsert demo user (handles email rename scenarios)
  // ─────────────────────────────────────────────
  const [existingDemoUser] = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.email, DEMO_EMAIL))
    .limit(1)

  const hashedPassword = await hashPassword(DEMO_PASSWORD)
  let userId: string

  if (existingDemoUser) {
    userId = existingDemoUser.id
    // Ensure password is up to date in case it changed
    await db
      .update(schema.account)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(schema.account.userId, userId))
    console.log(`✅ Demo user already exists: ${DEMO_EMAIL}`)
  }
  else {
    userId = id()
    await db.insert(schema.user).values({
      id: userId,
      name: 'Demo Recruiter',
      email: DEMO_EMAIL,
      emailVerified: true,
      createdAt: daysAgo(30),
      updatedAt: daysAgo(30),
    })
    await db.insert(schema.account).values({
      id: id(),
      userId,
      accountId: userId,
      providerId: 'credential',
      password: hashedPassword,
      createdAt: daysAgo(30),
      updatedAt: daysAgo(30),
    })
    console.log(`✅ Created demo user: ${DEMO_EMAIL}`)
  }

  // ─────────────────────────────────────────────
  // Upsert demo org (handles partial migration)
  // ─────────────────────────────────────────────
  const [existingOrg] = await db
    .select({ id: schema.organization.id })
    .from(schema.organization)
    .where(eq(schema.organization.slug, DEMO_ORG_SLUG))
    .limit(1)

  if (existingOrg) {
    // Org exists — ensure the demo user is a member, then stop
    const [existingMember] = await db
      .select({ id: schema.member.id })
      .from(schema.member)
      .where(eq(schema.member.userId, userId))
      .limit(1)

    if (!existingMember) {
      await db.insert(schema.member).values({
        id: id(),
        userId,
        organizationId: existingOrg.id,
        role: 'owner',
        createdAt: daysAgo(30),
      })
      console.log('✅ Linked demo user to existing org as owner')
    }

    console.log('⚠️  Demo organization already exists. Skipping full seed.')
    console.log('   To re-seed all data, delete the organization first or reset the database.')
    await client.end()
    return
  }

  // 2. Create organization (fresh seed path)
  const orgId = id()

  await db.insert(schema.organization).values({
    id: orgId,
    name: DEMO_ORG_NAME,
    slug: DEMO_ORG_SLUG,
    createdAt: daysAgo(30),
  })

  // Add user as owner
  await db.insert(schema.member).values({
    id: id(),
    userId,
    organizationId: orgId,
    role: 'owner',
    createdAt: daysAgo(30),
  })

  console.log(`✅ Created organization: ${DEMO_ORG_NAME}`)

  // 3. Create jobs
  const jobIds: string[] = []

  for (const jobData of JOBS_DATA) {
    const jobId = id()
    jobIds.push(jobId)
    const slug = generateSlug(jobData.title, jobId)
    const createdDaysAgo = 20 + Math.floor(Math.random() * 10)

    await db.insert(schema.job).values({
      id: jobId,
      organizationId: orgId,
      title: jobData.title,
      slug,
      description: jobData.description,
      location: jobData.location,
      type: jobData.type,
      status: jobData.status,
      createdAt: daysAgo(createdDaysAgo),
      updatedAt: daysAgo(Math.floor(createdDaysAgo / 2)),
    })
  }

  console.log(`✅ Created ${JOBS_DATA.length} jobs`)

  // 4. Create candidates
  const candidateIds: string[] = []

  for (const candidateData of CANDIDATES_DATA) {
    const candidateId = id()
    candidateIds.push(candidateId)
    const createdDaysAgo = 5 + Math.floor(Math.random() * 20)

    await db.insert(schema.candidate).values({
      id: candidateId,
      organizationId: orgId,
      firstName: candidateData.firstName,
      lastName: candidateData.lastName,
      email: candidateData.email,
      phone: candidateData.phone,
      createdAt: daysAgo(createdDaysAgo),
      updatedAt: daysAgo(Math.floor(createdDaysAgo / 2)),
    })
  }

  console.log(`✅ Created ${CANDIDATES_DATA.length} candidates`)

  // 5. Create custom questions for first 3 jobs
  const questionSets = [FULLSTACK_QUESTIONS, DESIGNER_QUESTIONS, DEVOPS_QUESTIONS]
  const questionIdsByJob: Map<number, { questionId: string; label: string }[]> = new Map()

  for (let jobIndex = 0; jobIndex < questionSets.length; jobIndex++) {
    const questions = questionSets[jobIndex]
    const jobId = jobIds[jobIndex]
    if (!questions || !jobId) {
      throw new Error(`Invalid seed configuration for questions at job index ${jobIndex}`)
    }

    const questionIds: { questionId: string; label: string }[] = []

    for (let qi = 0; qi < questions.length; qi++) {
      const q = questions[qi]
      if (!q) {
        continue
      }

      const questionId = id()
      questionIds.push({ questionId, label: q.label })

      await db.insert(schema.jobQuestion).values({
        id: questionId,
        organizationId: orgId,
        jobId,
        type: q.type,
        label: q.label,
        required: q.required,
        options: 'options' in q ? q.options : null,
        displayOrder: qi,
        createdAt: daysAgo(18),
        updatedAt: daysAgo(18),
      })
    }

    questionIdsByJob.set(jobIndex, questionIds)
  }

  console.log(`✅ Created custom questions for ${questionSets.length} jobs`)

  // 6. Create applications with status distribution
  let totalApps = 0
  const applicationMap = new Map<string, string>() // key: "jobIndex-candidateIndex" → applicationId

  for (let jobIndex = 0; jobIndex < JOB_APPLICATIONS.length; jobIndex++) {
    const apps = JOB_APPLICATIONS[jobIndex]
    const jobId = jobIds[jobIndex]
    if (!apps || !jobId) {
      throw new Error(`Invalid seed configuration for applications at job index ${jobIndex}`)
    }

    for (const app of apps) {
      const candidateId = candidateIds[app.candidateIndex]
      if (!candidateId) {
        throw new Error(`Missing candidate ID for candidate index ${app.candidateIndex}`)
      }

      const applicationId = id()
      applicationMap.set(`${jobIndex}-${app.candidateIndex}`, applicationId)
      const createdDaysAgo = 1 + Math.floor(Math.random() * 15)

      await db.insert(schema.application).values({
        id: applicationId,
        organizationId: orgId,
        candidateId,
        jobId,
        status: app.status,
        score: app.score ?? null,
        notes: app.notes ?? null,
        createdAt: daysAgo(createdDaysAgo),
        updatedAt: daysAgo(Math.max(0, createdDaysAgo - Math.floor(Math.random() * 5))),
      })

      // Create question responses for jobs that have questions
      const jobQuestions = questionIdsByJob.get(jobIndex)
      if (jobQuestions && app.status !== 'rejected') {
        const responses = generateResponses(jobIndex, app.candidateIndex)

        for (const q of jobQuestions) {
          const responseValue = responses[q.label]
          if (responseValue !== undefined) {
            await db.insert(schema.questionResponse).values({
              id: id(),
              organizationId: orgId,
              applicationId,
              questionId: q.questionId,
              value: responseValue,
              createdAt: daysAgo(createdDaysAgo),
            })
          }
        }
      }

      totalApps++
    }
  }

  console.log(`✅ Created ${totalApps} applications with pipeline distribution`)

  // 7. Create AI scoring criteria and scores for first 3 jobs
  let totalCriteria = 0
  let totalScores = 0
  let totalRuns = 0

  for (let jobIndex = 0; jobIndex < JOB_CRITERIA.length; jobIndex++) {
    const criteria = JOB_CRITERIA[jobIndex]
    const jobId = jobIds[jobIndex]
    if (!criteria || !jobId) continue

    // Insert scoring criteria for this job
    for (const criterion of criteria) {
      await db.insert(schema.scoringCriterion).values({
        id: id(),
        organizationId: orgId,
        jobId,
        key: criterion.key,
        name: criterion.name,
        description: criterion.description,
        category: criterion.category,
        maxScore: criterion.maxScore,
        weight: criterion.weight,
        displayOrder: criterion.displayOrder,
        createdAt: daysAgo(18),
        updatedAt: daysAgo(18),
      })
      totalCriteria++
    }
  }

  console.log(`✅ Created ${totalCriteria} scoring criteria across ${JOB_CRITERIA.length} jobs`)

  // Insert criterion scores and analysis runs for scored applications
  for (const appScoring of AI_SCORING_DATA) {
    const applicationId = applicationMap.get(`${appScoring.jobIndex}-${appScoring.candidateIndex}`)
    if (!applicationId) {
      console.warn(`⚠️  Skipping AI scores — no application for job ${appScoring.jobIndex}, candidate ${appScoring.candidateIndex}`)
      continue
    }

    const criteria = JOB_CRITERIA[appScoring.jobIndex]
    if (!criteria) continue

    // Insert each criterion score
    for (const score of appScoring.scores) {
      await db.insert(schema.criterionScore).values({
        id: id(),
        organizationId: orgId,
        applicationId,
        criterionKey: score.criterionKey,
        maxScore: score.maxScore,
        applicantScore: score.applicantScore,
        confidence: score.confidence,
        evidence: score.evidence,
        strengths: score.strengths,
        gaps: score.gaps,
        createdAt: daysAgo(10 + Math.floor(Math.random() * 5)),
      })
      totalScores++
    }

    // Insert analysis run audit record
    const promptTokens = 1200 + Math.floor(Math.random() * 800)
    const completionTokens = 600 + Math.floor(Math.random() * 400)

    await db.insert(schema.analysisRun).values({
      id: id(),
      organizationId: orgId,
      applicationId,
      status: 'completed',
      provider: 'openai',
      model: 'gpt-4o-mini',
      criteriaSnapshot: criteria.map(c => ({
        key: c.key,
        name: c.name,
        description: c.description,
        category: c.category,
        maxScore: c.maxScore,
        weight: c.weight,
      })),
      compositeScore: appScoring.compositeScore,
      promptTokens,
      completionTokens,
      rawResponse: {
        evaluations: appScoring.scores.map(s => ({
          criterionKey: s.criterionKey,
          maxScore: s.maxScore,
          applicantScore: s.applicantScore,
          confidence: s.confidence,
          evidence: s.evidence,
          strengths: s.strengths,
          gaps: s.gaps,
        })),
        summary: appScoring.summary,
      },
      scoredById: userId,
      createdAt: daysAgo(10 + Math.floor(Math.random() * 5)),
    })
    totalRuns++
  }

  console.log(`✅ Created ${totalScores} criterion scores and ${totalRuns} analysis runs`)

  // Insert AI config with pricing so the dashboard shows costs
  const INPUT_PRICE_PER_1M = '0.1500' // GPT-4o-mini input
  const OUTPUT_PRICE_PER_1M = '0.6000' // GPT-4o-mini output

  const encryptionSecret = process.env.BETTER_AUTH_SECRET ?? 'demo-secret-change-me'
  const demoApiKey = encrypt('sk-demo-placeholder-key', encryptionSecret)

  await db.insert(schema.aiConfig).values({
    id: id(),
    organizationId: orgId,
    provider: 'openai',
    model: 'gpt-4o-mini',
    apiKeyEncrypted: demoApiKey,
    inputPricePer1m: INPUT_PRICE_PER_1M,
    outputPricePer1m: OUTPUT_PRICE_PER_1M,
    maxTokens: 4096,
    createdAt: daysAgo(20),
    updatedAt: daysAgo(20),
  })

  // Compute and log total demo cost
  const allRuns = await db
    .select({
      promptTokens: schema.analysisRun.promptTokens,
      completionTokens: schema.analysisRun.completionTokens,
    })
    .from(schema.analysisRun)
    .where(eq(schema.analysisRun.organizationId, orgId))

  let totalPrompt = 0
  let totalCompletion = 0
  for (const r of allRuns) {
    totalPrompt += r.promptTokens ?? 0
    totalCompletion += r.completionTokens ?? 0
  }
  const totalCost = (totalPrompt / 1_000_000) * Number(INPUT_PRICE_PER_1M)
    + (totalCompletion / 1_000_000) * Number(OUTPUT_PRICE_PER_1M)

  console.log(`✅ Created AI config with pricing (input: $${INPUT_PRICE_PER_1M}/1M, output: $${OUTPUT_PRICE_PER_1M}/1M)`)
  console.log(`   📊 Total demo cost: $${totalCost.toFixed(4)} (${totalPrompt} prompt + ${totalCompletion} completion tokens)`)

  // Enable autoScoreOnApply on the Senior Full-Stack Engineer job to showcase the feature
  const firstJobId = jobIds[0]
  if (firstJobId) {
    await db.update(schema.job).set({ autoScoreOnApply: true }).where(eq(schema.job.id, firstJobId))
    console.log(`✅ Enabled auto-score on apply for: ${JOBS_DATA[0]?.title}`)
  }

  // 8. Create interviews
  let totalInterviews = 0
  const interviewIds: string[] = [] // track IDs for activity log

  for (const iv of INTERVIEWS_DATA) {
    const applicationId = applicationMap.get(`${iv.jobIndex}-${iv.candidateIndex}`)
    if (!applicationId) {
      console.warn(`⚠️  Skipping interview "${iv.title}" — no application found for job ${iv.jobIndex}, candidate ${iv.candidateIndex}`)
      interviewIds.push('') // placeholder to keep index alignment
      continue
    }

    const scheduledAt = dateWithOffset(iv.daysOffset, iv.hour, iv.minute ?? 0)
    const responded = iv.candidateResponse !== 'pending'

    const interviewId = id()
    interviewIds.push(interviewId)

    await db.insert(schema.interview).values({
      id: interviewId,
      organizationId: orgId,
      applicationId,
      title: iv.title,
      type: iv.type,
      status: iv.status,
      scheduledAt,
      duration: iv.duration,
      location: iv.location,
      notes: iv.notes,
      interviewers: iv.interviewers,
      createdById: userId,
      candidateResponse: iv.candidateResponse,
      candidateRespondedAt: responded ? daysAgo(Math.abs(iv.daysOffset) + 2) : null,
      invitationSentAt: responded ? daysAgo(Math.abs(iv.daysOffset) + 3) : null,
      timezone: iv.timezone,
      createdAt: daysAgo(Math.abs(iv.daysOffset) + 4),
      updatedAt: daysAgo(Math.abs(iv.daysOffset) + 1),
    })

    totalInterviews++
  }

  console.log(`✅ Created ${totalInterviews} interviews across the pipeline`)

  // 9. Create activity log entries so the Timeline page is populated
  let totalActivities = 0

  // --- Job creation activities ---
  for (let i = 0; i < JOBS_DATA.length; i++) {
    const jobData = JOBS_DATA[i]
    const jobId = jobIds[i]
    if (!jobData || !jobId) continue

    await db.insert(schema.activityLog).values({
      id: id(),
      organizationId: orgId,
      actorId: userId,
      action: 'created',
      resourceType: 'job',
      resourceId: jobId,
      metadata: { title: jobData.title },
      createdAt: daysAgo(20 + Math.floor(Math.random() * 10)),
    })
    totalActivities++
  }

  // --- Candidate creation activities ---
  for (let i = 0; i < CANDIDATES_DATA.length; i++) {
    const c = CANDIDATES_DATA[i]
    const cId = candidateIds[i]
    if (!c || !cId) continue

    await db.insert(schema.activityLog).values({
      id: id(),
      organizationId: orgId,
      actorId: userId,
      action: 'created',
      resourceType: 'candidate',
      resourceId: cId,
      metadata: { name: `${c.firstName} ${c.lastName}` },
      createdAt: daysAgo(5 + Math.floor(Math.random() * 20)),
    })
    totalActivities++
  }

  // --- Application creation + status change activities ---
  // Maps each application's final status to a realistic sequence of transitions
  const STATUS_PIPELINE: Record<AppStatus, AppStatus[]> = {
    new: [],
    screening: ['screening'],
    interview: ['screening', 'interview'],
    offer: ['screening', 'interview', 'offer'],
    hired: ['screening', 'interview', 'offer', 'hired'],
    rejected: ['rejected'], // rejected can happen at any stage
  }

  for (let jobIndex = 0; jobIndex < JOB_APPLICATIONS.length; jobIndex++) {
    const apps = JOB_APPLICATIONS[jobIndex]
    const jobId = jobIds[jobIndex]
    if (!apps || !jobId) continue

    for (const app of apps) {
      const candidateId = candidateIds[app.candidateIndex]
      const appId = applicationMap.get(`${jobIndex}-${app.candidateIndex}`)
      if (!candidateId || !appId) continue

      // Application created activity
      const appCreatedDays = 1 + Math.floor(Math.random() * 15)
      await db.insert(schema.activityLog).values({
        id: id(),
        organizationId: orgId,
        actorId: userId,
        action: 'created',
        resourceType: 'application',
        resourceId: appId,
        metadata: { candidateId, jobId },
        createdAt: daysAgo(appCreatedDays),
      })
      totalActivities++

      // Status change activities along the pipeline
      const transitions = STATUS_PIPELINE[app.status] ?? []
      let previousStatus: AppStatus = 'new'
      for (let t = 0; t < transitions.length; t++) {
        const toStatus = transitions[t]!
        const transitionDays = Math.max(0, appCreatedDays - (t + 1) * 2)
        await db.insert(schema.activityLog).values({
          id: id(),
          organizationId: orgId,
          actorId: userId,
          action: 'status_changed',
          resourceType: 'application',
          resourceId: appId,
          metadata: { from: previousStatus, to: toStatus },
          createdAt: daysAgo(transitionDays),
        })
        totalActivities++
        previousStatus = toStatus
      }

      // Scored activity for applications with a score
      if (app.score) {
        await db.insert(schema.activityLog).values({
          id: id(),
          organizationId: orgId,
          actorId: userId,
          action: 'scored',
          resourceType: 'application',
          resourceId: appId,
          metadata: { compositeScore: app.score, model: 'gpt-4o-mini', criterionCount: 5 },
          createdAt: daysAgo(Math.max(0, appCreatedDays - 1)),
        })
        totalActivities++
      }
    }
  }

  // --- Interview creation activities ---
  for (let i = 0; i < INTERVIEWS_DATA.length; i++) {
    const iv = INTERVIEWS_DATA[i]
    const interviewId = interviewIds[i]
    if (!iv || !interviewId) continue

    const appId = applicationMap.get(`${iv.jobIndex}-${iv.candidateIndex}`)
    if (!appId) continue

    const scheduledAt = dateWithOffset(iv.daysOffset, iv.hour, iv.minute ?? 0)
    const interviewCreatedDays = Math.abs(iv.daysOffset) + 4

    await db.insert(schema.activityLog).values({
      id: id(),
      organizationId: orgId,
      actorId: userId,
      action: 'created',
      resourceType: 'interview',
      resourceId: interviewId,
      metadata: {
        applicationId: appId,
        title: iv.title,
        scheduledAt: scheduledAt.toISOString(),
      },
      createdAt: daysAgo(interviewCreatedDays),
    })
    totalActivities++
  }

  console.log(`✅ Created ${totalActivities} activity log entries for timeline`)

  // Summary
  const statusCounts: Record<string, number> = {}
  for (const apps of JOB_APPLICATIONS) {
    for (const app of apps) {
      statusCounts[app.status] = (statusCounts[app.status] || 0) + 1
    }
  }

  console.log(`\n📊 Pipeline distribution:`)
  for (const [status, count] of Object.entries(statusCounts)) {
    console.log(`   ${status}: ${count}`)
  }

  console.log(`\n🎉 Seed complete!`)
  console.log(`\n   Sign in with:`)
  console.log(`   Email:    ${DEMO_EMAIL}`)
  console.log(`   Password: ${DEMO_PASSWORD}`)
  console.log(`\n   Then select "${DEMO_ORG_NAME}" as your organization.`)

  await client.end()
}

// ─────────────────────────────────────────────
// Run
// ─────────────────────────────────────────────

seed().catch((err) => {
  console.error('❌ Seed failed:', err)
  client.end().then(() => process.exit(1))
})
