/**
 * Deletes the demo organization and all cascaded data so seed.ts can re-run.
 * Usage: npx tsx server/scripts/delete-demo-org.ts
 */
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { eq } from 'drizzle-orm'
import * as schema from '../database/schema'

const processWithLoadEnv = process as NodeJS.Process & { loadEnvFile?: (path?: string) => void }
if (!process.env.DATABASE_URL && typeof processWithLoadEnv.loadEnvFile === 'function') {
  try { processWithLoadEnv.loadEnvFile('.env') } catch {}
}

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('DATABASE_URL is required.')
  process.exit(1)
}

const client = postgres(DATABASE_URL, { max: 1 })
const db = drizzle(client, { schema })

async function main() {
  const [org] = await db
    .select({ id: schema.organization.id })
    .from(schema.organization)
    .where(eq(schema.organization.slug, 'reqcore-demo'))
    .limit(1)

  if (org) {
    const orgId = org.id
    // Invalidate sessions referencing the demo org so logged-in users
    // are forced to re-authenticate after reseed
    const deleted = await db.delete(schema.session)
      .where(eq(schema.session.activeOrganizationId, orgId))
      .returning({ id: schema.session.id })
    if (deleted.length)
      console.log(`🔒 Invalidated ${deleted.length} session(s) tied to demo org`)

    // Delete in dependency order to avoid FK violations
    // (some migrations may not have applied CASCADE correctly)
    await db.delete(schema.activityLog).where(eq(schema.activityLog.organizationId, orgId))
    await db.delete(schema.criterionScore).where(eq(schema.criterionScore.organizationId, orgId))
    await db.delete(schema.analysisRun).where(eq(schema.analysisRun.organizationId, orgId))
    await db.delete(schema.scoringCriterion).where(eq(schema.scoringCriterion.organizationId, orgId))
    await db.delete(schema.aiConfig).where(eq(schema.aiConfig.organizationId, orgId))
    await db.delete(schema.comment).where(eq(schema.comment.organizationId, orgId))
    await db.delete(schema.interview).where(eq(schema.interview.organizationId, orgId))
    await db.delete(schema.questionResponse).where(eq(schema.questionResponse.organizationId, orgId))
    await db.delete(schema.application).where(eq(schema.application.organizationId, orgId))
    await db.delete(schema.jobQuestion).where(eq(schema.jobQuestion.organizationId, orgId))
    await db.delete(schema.document).where(eq(schema.document.organizationId, orgId))
    await db.delete(schema.candidate).where(eq(schema.candidate.organizationId, orgId))
    await db.delete(schema.job).where(eq(schema.job.organizationId, orgId))
    await db.delete(schema.emailTemplate).where(eq(schema.emailTemplate.organizationId, orgId))
    await db.delete(schema.inviteLink).where(eq(schema.inviteLink.organizationId, orgId))
    await db.delete(schema.joinRequest).where(eq(schema.joinRequest.organizationId, orgId))
    await db.delete(schema.member).where(eq(schema.member.organizationId, orgId))
    await db.delete(schema.invitation).where(eq(schema.invitation.organizationId, orgId))
    await db.delete(schema.organization).where(eq(schema.organization.id, orgId))
    console.log(`✅ Deleted demo organization and all related data: ${orgId}`)
  }
  else {
    console.log('ℹ️  No demo organization found — nothing to delete.')
  }

  await client.end()
}

main().catch((err) => {
  console.error('❌ Failed:', err)
  client.end().then(() => process.exit(1))
})
