import { eq, and, desc, or, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { activityLog, user, application, job, candidate } from '../../database/schema'

const querySchema = z.object({
  candidateId: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

/**
 * GET /api/activity-log/candidate-timeline?candidateId=…
 *
 * Returns activity-log entries related to a specific candidate:
 *   - Direct candidate-resource events
 *   - Events on any application belonging to this candidate
 *
 * Used by the CandidateDetailSidebar "Timeline" tab.
 */
export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, { activityLog: ['read'] })
  const orgId = session.session.activeOrganizationId

  const query = await getValidatedQuery(event, querySchema.parse)

  // 1. Load application IDs for this candidate (within the org)
  const candidateApps = await db
    .select({ id: application.id })
    .from(application)
    .where(and(
      eq(application.organizationId, orgId),
      eq(application.candidateId, query.candidateId),
    ))

  const appIds = candidateApps.map(a => a.id)

  // 2. Build OR conditions for resource matching
  const resourceConditions = [
    and(eq(activityLog.resourceType, 'candidate'), eq(activityLog.resourceId, query.candidateId)),
  ]
  if (appIds.length > 0) {
    resourceConditions.push(
      and(eq(activityLog.resourceType, 'application'), inArray(activityLog.resourceId, appIds)),
    )
  }

  // 3. Fetch activity entries
  const data = await db
    .select({
      id: activityLog.id,
      action: activityLog.action,
      resourceType: activityLog.resourceType,
      resourceId: activityLog.resourceId,
      metadata: activityLog.metadata,
      createdAt: activityLog.createdAt,
      actorId: activityLog.actorId,
      actorName: user.name,
      actorEmail: user.email,
      actorImage: user.image,
    })
    .from(activityLog)
    .innerJoin(user, eq(user.id, activityLog.actorId))
    .where(and(
      eq(activityLog.organizationId, orgId),
      or(...resourceConditions),
    ))
    .orderBy(desc(activityLog.createdAt))
    .limit(query.limit)

  // 4. Enrich application events with job title
  const jobIdsForApps = new Set<string>()
  if (appIds.length > 0) {
    const appJobs = await db
      .select({ id: application.id, jobId: application.jobId, jobTitle: job.title })
      .from(application)
      .innerJoin(job, eq(job.id, application.jobId))
      .where(inArray(application.id, appIds))
    for (const aj of appJobs) {
      jobIdsForApps.add(aj.jobId)
    }
    var appJobMap = new Map(appJobs.map(a => [a.id, { jobId: a.jobId, jobTitle: a.jobTitle }]))
  }

  // 5. Get candidate name for display
  const [cand] = await db
    .select({ firstName: candidate.firstName, lastName: candidate.lastName })
    .from(candidate)
    .where(and(eq(candidate.id, query.candidateId), eq(candidate.organizationId, orgId)))
    .limit(1)

  const candidateName = cand ? `${cand.firstName} ${cand.lastName}` : 'Unknown'

  // 6. Enrich items
  const items = data.map((item) => {
    let resourceName: string | null = null
    let jobTitle: string | null = null

    if (item.resourceType === 'candidate') {
      resourceName = candidateName
    } else if (item.resourceType === 'application' && appJobMap) {
      const info = appJobMap.get(item.resourceId)
      if (info) {
        resourceName = `${candidateName} → ${info.jobTitle}`
        jobTitle = info.jobTitle
      }
    }

    return {
      ...item,
      resourceName,
      jobTitle,
      candidateName,
    }
  })

  return { items, candidateId: query.candidateId, candidateName }
})
