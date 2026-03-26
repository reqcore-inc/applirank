import { eq, and, desc, gte, lte, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { activityLog, user, job, candidate, application, interview } from '../../database/schema'

const timelineQuerySchema = z.object({
  before: z.string().datetime().optional(),
  after: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  resourceType: z.enum(['job', 'candidate', 'application', 'interview', 'member']).optional(),
})

/**
 * GET /api/activity-log/timeline
 *
 * Fetches activity-log entries for the organisation, enriched with
 * resource names so the frontend can render clickable timeline items.
 *
 * Supports cursor-based pagination:
 *   ?before=<ISO datetime>  — load older events
 *   ?after=<ISO datetime>   — load newer / future events
 *   ?limit=100
 *   ?resourceType=job|candidate|application  (optional filter)
 */
export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, { activityLog: ['read'] })
  const orgId = session.session.activeOrganizationId

  const query = await getValidatedQuery(event, timelineQuerySchema.parse)

  const conditions = [eq(activityLog.organizationId, orgId)]

  if (query.resourceType) {
    conditions.push(eq(activityLog.resourceType, query.resourceType))
  }

  if (query.before) {
    conditions.push(lte(activityLog.createdAt, new Date(query.before)))
  }

  if (query.after) {
    conditions.push(gte(activityLog.createdAt, new Date(query.after)))
  }

  const where = and(...conditions)

  // Fetch activity entries with actor info
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
    .where(where)
    .orderBy(desc(activityLog.createdAt))
    .limit(query.limit + 1) // fetch one extra to know if there's more

  const hasMore = data.length > query.limit
  const items = hasMore ? data.slice(0, query.limit) : data

  // Collect resource IDs for enrichment
  const jobIds = new Set<string>()
  const candidateIds = new Set<string>()
  const applicationIds = new Set<string>()
  const interviewIds = new Set<string>()

  for (const item of items) {
    switch (item.resourceType) {
      case 'job': jobIds.add(item.resourceId); break
      case 'candidate': candidateIds.add(item.resourceId); break
      case 'application': applicationIds.add(item.resourceId); break
      case 'interview': interviewIds.add(item.resourceId); break
    }
  }

  // Enrich resource names in parallel
  const [jobNames, candidateNames, applicationInfo, interviewInfo] = await Promise.all([
    jobIds.size > 0
      ? db.select({ id: job.id, title: job.title }).from(job)
          .where(and(
            eq(job.organizationId, orgId),
            inArray(job.id, Array.from(jobIds)),
          ))
      : Promise.resolve([]),
    candidateIds.size > 0
      ? db.select({ id: candidate.id, firstName: candidate.firstName, lastName: candidate.lastName }).from(candidate)
          .where(and(
            eq(candidate.organizationId, orgId),
            inArray(candidate.id, Array.from(candidateIds)),
          ))
      : Promise.resolve([]),
    applicationIds.size > 0
      ? db.select({
          id: application.id,
          jobId: application.jobId,
          candidateId: application.candidateId,
          jobTitle: job.title,
          candidateFirstName: candidate.firstName,
          candidateLastName: candidate.lastName,
        })
          .from(application)
          .innerJoin(job, eq(job.id, application.jobId))
          .innerJoin(candidate, eq(candidate.id, application.candidateId))
          .where(and(
            eq(application.organizationId, orgId),
            inArray(application.id, Array.from(applicationIds)),
          ))
      : Promise.resolve([]),
    interviewIds.size > 0
      ? db.select({
          id: interview.id,
          scheduledAt: interview.scheduledAt,
          type: interview.type,
          applicationId: interview.applicationId,
          jobId: application.jobId,
          candidateId: application.candidateId,
          jobTitle: job.title,
          candidateFirstName: candidate.firstName,
          candidateLastName: candidate.lastName,
        })
          .from(interview)
          .innerJoin(application, eq(application.id, interview.applicationId))
          .innerJoin(job, eq(job.id, application.jobId))
          .innerJoin(candidate, eq(candidate.id, application.candidateId))
          .where(and(
            eq(interview.organizationId, orgId),
            inArray(interview.id, Array.from(interviewIds)),
          ))
      : Promise.resolve([]),
  ])

  // Build lookup maps
  const jobMap = new Map(jobNames.map(j => [j.id, j.title]))
  const candidateMap = new Map(candidateNames.map(c => [c.id, `${c.firstName} ${c.lastName}`]))
  const applicationMap = new Map(applicationInfo.map(a => [a.id, {
    jobTitle: a.jobTitle,
    candidateName: `${a.candidateFirstName} ${a.candidateLastName}`,
    jobId: a.jobId,
    candidateId: a.candidateId,
  }]))
  const interviewMap = new Map(interviewInfo.map(i => [i.id, {
    scheduledAt: i.scheduledAt,
    type: i.type,
    applicationId: i.applicationId,
    jobId: i.jobId,
    candidateId: i.candidateId,
    jobTitle: i.jobTitle,
    candidateName: `${i.candidateFirstName} ${i.candidateLastName}`,
  }]))

  // Enrich items with resource display names
  const enriched = items.map((item) => {
    let resourceName: string | null = null
    let resourceUrl: string | null = null
    let jobId: string | null = null
    let jobName: string | null = null
    let extra: Record<string, unknown> = {}

    switch (item.resourceType) {
      case 'job': {
        resourceName = jobMap.get(item.resourceId) ?? null
        resourceUrl = `/dashboard/jobs/${item.resourceId}`
        jobId = item.resourceId
        jobName = resourceName
        break
      }
      case 'candidate': {
        resourceName = candidateMap.get(item.resourceId) ?? null
        resourceUrl = `/dashboard/candidates/${item.resourceId}`
        break
      }
      case 'application': {
        const appInfo = applicationMap.get(item.resourceId)
        if (appInfo) {
          resourceName = `${appInfo.candidateName} → ${appInfo.jobTitle}`
          resourceUrl = `/dashboard/applications/${item.resourceId}`
          jobId = appInfo.jobId
          jobName = appInfo.jobTitle
          extra = { candidateId: appInfo.candidateId, candidateName: appInfo.candidateName }
        }
        break
      }
      case 'interview': {
        const intInfo = interviewMap.get(item.resourceId)
        if (intInfo) {
          resourceName = `${intInfo.candidateName} — ${intInfo.type} interview`
          resourceUrl = `/dashboard/interviews/${item.resourceId}`
          jobId = intInfo.jobId
          jobName = intInfo.jobTitle
          extra = { scheduledAt: intInfo.scheduledAt, applicationId: intInfo.applicationId, candidateId: intInfo.candidateId, candidateName: intInfo.candidateName }
        }
        break
      }
      case 'member': {
        resourceUrl = `/dashboard/settings/members`
        break
      }
    }

    return {
      ...item,
      resourceName,
      resourceUrl,
      jobId,
      jobName,
      ...extra,
    }
  })

  // Fetch upcoming interviews as future "planned" events
  // Only include when no filter is active, or when filtering specifically for interviews
  let upcoming: Array<Record<string, unknown>> = []
  if (!query.before && !query.after && (!query.resourceType || query.resourceType === 'interview')) {
    const upcomingInterviews = await db
      .select({
        id: interview.id,
        scheduledAt: interview.scheduledAt,
        type: interview.type,
        applicationId: interview.applicationId,
        candidateId: application.candidateId,
        candidateFirstName: candidate.firstName,
        candidateLastName: candidate.lastName,
        jobId: application.jobId,
        jobTitle: job.title,
      })
      .from(interview)
      .innerJoin(application, eq(application.id, interview.applicationId))
      .innerJoin(candidate, eq(candidate.id, application.candidateId))
      .innerJoin(job, eq(job.id, application.jobId))
      .where(and(
        eq(interview.organizationId, orgId),
        gte(interview.scheduledAt, new Date()),
        eq(interview.status, 'scheduled'),
      ))
      .orderBy(interview.scheduledAt)
      .limit(20)

    upcoming = upcomingInterviews.map(i => ({
      id: `upcoming-${i.id}`,
      action: 'scheduled' as any,
      resourceType: 'interview',
      resourceId: i.id,
      metadata: { type: i.type, scheduledAt: i.scheduledAt },
      createdAt: i.scheduledAt,
      actorId: '',
      actorName: null,
      actorEmail: null,
      actorImage: null,
      resourceName: `${i.candidateFirstName} ${i.candidateLastName} — ${i.type} interview`,
      resourceUrl: `/dashboard/interviews/${i.id}`,
      applicationId: i.applicationId,
      jobId: i.jobId,
      jobName: i.jobTitle,
      candidateId: i.candidateId,
      candidateName: `${i.candidateFirstName} ${i.candidateLastName}`,
      isUpcoming: true,
    }))
  }

  return {
    items: enriched,
    upcoming,
    hasMore,
    oldestTimestamp: items.length > 0 ? items[items.length - 1]!.createdAt : null,
    newestTimestamp: items.length > 0 ? items[0]!.createdAt : null,
  }
})
