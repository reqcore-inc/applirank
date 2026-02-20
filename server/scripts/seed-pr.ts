import { eq } from 'drizzle-orm'
import { hashPassword } from 'better-auth/crypto'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../database/schema'

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('DATABASE_URL is required')
  process.exit(1)
}

const PR_ORG_NAME = 'Applirank PR Environment'
const PR_ORG_SLUG = 'applirank-pr-environment'
const PR_PASSWORD = process.env.PR_SEED_PASSWORD

if (!PR_PASSWORD) {
  console.error('PR_SEED_PASSWORD is required')
  process.exit(1)
}

const client = postgres(DATABASE_URL, { max: 1 })
const db = drizzle(client, { schema })

function id(): string {
  return crypto.randomUUID()
}

function daysAgo(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

function slugify(title: string, uniqueId: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)

  const shortId = uniqueId.replace(/-/g, '').slice(0, 8)
  return `${base}-${shortId}`
}

const users = [
  { name: 'Alice Recruiter', email: 'alice.pr@applirank.dev', role: 'owner' },
  { name: 'Bruno Recruiter', email: 'bruno.pr@applirank.dev', role: 'member' },
  { name: 'Clara Recruiter', email: 'clara.pr@applirank.dev', role: 'member' },
  { name: 'Dario Recruiter', email: 'dario.pr@applirank.dev', role: 'member' },
  { name: 'Elena Recruiter', email: 'elena.pr@applirank.dev', role: 'member' },
] as const

const jobs = [
  { title: 'Frontend Engineer', location: 'Berlin, Germany', type: 'full_time' as const, status: 'open' as const },
  { title: 'Backend Engineer', location: 'Remote (EU)', type: 'full_time' as const, status: 'open' as const },
  { title: 'Product Designer', location: 'Remote (Worldwide)', type: 'contract' as const, status: 'open' as const },
  { title: 'DevOps Engineer', location: 'Amsterdam, Netherlands', type: 'full_time' as const, status: 'open' as const },
  { title: 'Technical Writer', location: 'Paris, France', type: 'part_time' as const, status: 'draft' as const },
] as const

const candidates = [
  { firstName: 'Maya', lastName: 'Jensen', email: 'maya.jensen.pr@example.com' },
  { firstName: 'Noor', lastName: 'Haddad', email: 'noor.haddad.pr@example.com' },
  { firstName: 'Oscar', lastName: 'Martinez', email: 'oscar.martinez.pr@example.com' },
  { firstName: 'Priya', lastName: 'Singh', email: 'priya.singh.pr@example.com' },
  { firstName: 'Quentin', lastName: 'Moreau', email: 'quentin.moreau.pr@example.com' },
] as const

const applications = [
  { candidateIndex: 0, jobIndex: 0, status: 'new' as const, score: 74 },
  { candidateIndex: 1, jobIndex: 1, status: 'screening' as const, score: 82 },
  { candidateIndex: 2, jobIndex: 2, status: 'interview' as const, score: 88 },
  { candidateIndex: 3, jobIndex: 3, status: 'offer' as const, score: 93 },
  { candidateIndex: 4, jobIndex: 0, status: 'rejected' as const, score: 49 },
] as const

async function seedPrEnvironment() {
  console.log('🌱 Seeding Railway PR environment data...')

  const existingOrg = await db
    .select({ id: schema.organization.id })
    .from(schema.organization)
    .where(eq(schema.organization.slug, PR_ORG_SLUG))
    .limit(1)

  if (existingOrg.length > 0) {
    console.log('✅ PR seed data already exists, skipping.')
    await client.end()
    return
  }

  const orgId = id()
  const hashedPassword = await hashPassword(PR_PASSWORD)

  await db.insert(schema.organization).values({
    id: orgId,
    name: PR_ORG_NAME,
    slug: PR_ORG_SLUG,
    createdAt: daysAgo(7),
  })

  for (let userIndex = 0; userIndex < users.length; userIndex++) {
    const userData = users[userIndex]
    const userId = id()

    await db.insert(schema.user).values({
      id: userId,
      name: userData.name,
      email: userData.email,
      emailVerified: true,
      createdAt: daysAgo(7 - userIndex),
      updatedAt: daysAgo(7 - userIndex),
    })

    await db.insert(schema.account).values({
      id: id(),
      userId,
      accountId: userId,
      providerId: 'credential',
      password: hashedPassword,
      createdAt: daysAgo(7 - userIndex),
      updatedAt: daysAgo(7 - userIndex),
    })

    await db.insert(schema.member).values({
      id: id(),
      userId,
      organizationId: orgId,
      role: userData.role,
      createdAt: daysAgo(7 - userIndex),
    })
  }

  const jobIds: string[] = []
  for (let jobIndex = 0; jobIndex < jobs.length; jobIndex++) {
    const jobData = jobs[jobIndex]
    const jobId = id()
    jobIds.push(jobId)

    await db.insert(schema.job).values({
      id: jobId,
      organizationId: orgId,
      title: jobData.title,
      slug: slugify(jobData.title, jobId),
      description: `PR environment demo job for ${jobData.title}.`,
      location: jobData.location,
      type: jobData.type,
      status: jobData.status,
      createdAt: daysAgo(5 - jobIndex),
      updatedAt: daysAgo(5 - jobIndex),
    })
  }

  const candidateIds: string[] = []
  for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex++) {
    const candidateData = candidates[candidateIndex]
    const candidateId = id()
    candidateIds.push(candidateId)

    await db.insert(schema.candidate).values({
      id: candidateId,
      organizationId: orgId,
      firstName: candidateData.firstName,
      lastName: candidateData.lastName,
      email: candidateData.email,
      createdAt: daysAgo(4 - candidateIndex),
      updatedAt: daysAgo(4 - candidateIndex),
    })
  }

  for (let applicationIndex = 0; applicationIndex < applications.length; applicationIndex++) {
    const app = applications[applicationIndex]

    await db.insert(schema.application).values({
      id: id(),
      organizationId: orgId,
      candidateId: candidateIds[app.candidateIndex],
      jobId: jobIds[app.jobIndex],
      status: app.status,
      score: app.score,
      notes: 'Auto-generated PR environment demo application.',
      createdAt: daysAgo(3 - applicationIndex),
      updatedAt: daysAgo(3 - applicationIndex),
    })
  }

  console.log(`✅ Created ${users.length} users in PR org`)
  console.log(`✅ Created ${jobs.length} jobs in PR org`)
  console.log(`✅ Created ${applications.length} applications in PR org`)

  console.log('🔐 Demo sign-in password for all PR users loaded from PR_SEED_PASSWORD')

  await client.end()
}

seedPrEnvironment().catch(async (error) => {
  console.error('❌ PR seed failed:', error)
  await client.end()
  process.exit(1)
})