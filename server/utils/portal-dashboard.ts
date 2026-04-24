import { eq, and, desc, asc } from 'drizzle-orm'
import {
  application,
  job,
  candidate,
  interview,
  organization,
  document,
  activityLog,
  applicationStatusEnum,
} from '../database/schema'

/**
 * Pipeline stage definitions with human-friendly labels and descriptions.
 * Used to show applicants where they are in the process.
 */
const PIPELINE_STAGES = [
  { key: 'new', label: 'Applied', description: 'Your application has been received and is in the queue.' },
  { key: 'screening', label: 'Screening', description: 'A recruiter is reviewing your application and qualifications.' },
  { key: 'interview', label: 'Interview', description: 'You\'ve been selected for an interview stage.' },
  { key: 'offer', label: 'Offer', description: 'An offer is being prepared or has been extended to you.' },
  { key: 'hired', label: 'Hired', description: 'Congratulations! You\'ve been hired.' },
] as const

/**
 * Fetch complete dashboard data for a single application.
 * Used by both token-based and authenticated portal endpoints.
 *
 * All data is READ-ONLY — no mutations happen in this function.
 * Sensitive internal data (notes, scores, internal comments) is excluded.
 */
export async function getApplicationDashboard(
  applicationId: string,
  candidateId: string,
  organizationId: string,
) {
  // Fetch application with job and organization in parallel
  const [app, org, interviews, documents, statusHistory] = await Promise.all([
    db.query.application.findFirst({
      where: and(
        eq(application.id, applicationId),
        eq(application.candidateId, candidateId),
        eq(application.organizationId, organizationId),
      ),
      columns: {
        id: true,
        status: true,
        viewedAt: true,
        createdAt: true,
        updatedAt: true,
        // Explicitly exclude sensitive fields
        // notes: excluded
        // score: excluded
      },
      with: {
        job: {
          columns: {
            id: true,
            title: true,
            location: true,
            type: true,
            status: true,
            remoteStatus: true,
          },
        },
      },
    }),

    db.query.organization.findFirst({
      where: eq(organization.id, organizationId),
      columns: {
        name: true,
        logo: true,
      },
    }),

    // Upcoming & past interviews (only applicant-visible fields)
    db.query.interview.findMany({
      where: and(
        eq(interview.applicationId, applicationId),
        eq(interview.organizationId, organizationId),
      ),
      columns: {
        id: true,
        title: true,
        type: true,
        status: true,
        scheduledAt: true,
        duration: true,
        location: true,
        timezone: true,
        candidateResponse: true,
        // Exclude: notes, interviewers (internal)
      },
      orderBy: [asc(interview.scheduledAt)],
    }),

    // Uploaded documents (names only — no download links)
    db.select({
      id: document.id,
      type: document.type,
      originalFilename: document.originalFilename,
      createdAt: document.createdAt,
    })
      .from(document)
      .where(and(
        eq(document.candidateId, candidateId),
        eq(document.organizationId, organizationId),
      ))
      .orderBy(desc(document.createdAt)),

    // Status change history from activity log
    db.select({
      id: activityLog.id,
      action: activityLog.action,
      metadata: activityLog.metadata,
      createdAt: activityLog.createdAt,
    })
      .from(activityLog)
      .where(and(
        eq(activityLog.organizationId, organizationId),
        eq(activityLog.resourceType, 'application'),
        eq(activityLog.resourceId, applicationId),
      ))
      .orderBy(desc(activityLog.createdAt))
      .limit(50),
  ])

  if (!app) return null

  // Build pipeline progress
  const currentStatus = app.status
  const isRejected = currentStatus === 'rejected'
  const currentIndex = PIPELINE_STAGES.findIndex((s) => s.key === currentStatus)
  const pipeline = PIPELINE_STAGES.map((stage, index) => ({
    ...stage,
    status: isRejected
      ? 'inactive' as const
      : index < currentIndex
        ? 'completed' as const
        : index === currentIndex
          ? 'current' as const
          : 'upcoming' as const,
  }))

  // Build timeline from activity log + application creation
  const timeline = [
    {
      id: 'applied',
      type: 'status_change' as const,
      title: 'Application Submitted',
      description: `You applied for ${app.job.title}`,
      date: app.createdAt,
    },
    // Viewed by hiring team entry
    ...(app.viewedAt
      ? [{
          id: 'viewed',
          type: 'status_change' as const,
          title: 'Viewed by Hiring Team',
          description: 'A member of the hiring team reviewed your application.',
          date: app.viewedAt,
        }]
      : []),
    ...statusHistory
      .filter((entry) => entry.action === 'status_changed')
      .map((entry) => {
        const meta = entry.metadata as Record<string, unknown> | null
        const to = meta?.to as string | undefined
        const from = meta?.from as string | undefined
        return {
          id: entry.id,
          type: 'status_change' as const,
          title: getStatusChangeTitle(from, to),
          description: getStatusChangeDescription(to),
          date: entry.createdAt,
        }
      }),
    ...interviews.map((iv) => ({
      id: iv.id,
      type: 'interview' as const,
      title: iv.title,
      description: `${formatInterviewType(iv.type)} scheduled`,
      date: iv.scheduledAt,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Separate upcoming vs past interviews
  const now = new Date()
  const upcomingInterviews = interviews.filter(
    (iv) => new Date(iv.scheduledAt) > now && iv.status === 'scheduled',
  )
  const pastInterviews = interviews.filter(
    (iv) => new Date(iv.scheduledAt) <= now || iv.status !== 'scheduled',
  )

  return {
    application: {
      id: app.id,
      status: app.status,
      appliedAt: app.createdAt,
      lastUpdated: app.updatedAt,
      viewedAt: app.viewedAt,
      isRejected,
    },
    job: {
      title: app.job.title,
      location: app.job.location,
      type: formatJobType(app.job.type),
      remoteStatus: app.job.remoteStatus,
      isOpen: app.job.status === 'open',
    },
    organization: {
      name: org?.name ?? 'Unknown',
      logo: org?.logo,
    },
    pipeline,
    timeline,
    upcomingInterviews: upcomingInterviews.map(formatInterview),
    pastInterviews: pastInterviews.map(formatInterview),
    documents: documents.map((doc) => ({
      id: doc.id,
      type: doc.type,
      filename: doc.originalFilename,
      uploadedAt: doc.createdAt,
    })),
  }
}

/**
 * Fetch all applications for a candidate email (authenticated portal).
 */
export async function getApplicantDashboardByEmail(email: string) {
  const candidates = await db.query.candidate.findMany({
    where: eq(candidate.email, email.toLowerCase()),
    columns: { id: true, organizationId: true },
  })

  if (candidates.length === 0) return []

  const applications = []

  for (const cand of candidates) {
    const apps = await db.query.application.findMany({
      where: and(
        eq(application.candidateId, cand.id),
        eq(application.organizationId, cand.organizationId),
      ),
      columns: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      with: {
        job: {
          columns: {
            id: true,
            title: true,
            location: true,
            type: true,
            status: true,
            remoteStatus: true,
          },
        },
      },
      orderBy: [desc(application.createdAt)],
    })

    if (apps.length === 0) continue

    // Get org details
    const org = await db.query.organization.findFirst({
      where: eq(organization.id, cand.organizationId),
      columns: { name: true, logo: true },
    })

    for (const app of apps) {
      const currentStatus = app.status
      const isRejected = currentStatus === 'rejected'
      const currentIndex = PIPELINE_STAGES.findIndex((s) => s.key === currentStatus)
      const pipeline = PIPELINE_STAGES.map((stage, index) => ({
        ...stage,
        status: isRejected
          ? 'inactive' as const
          : index < currentIndex
            ? 'completed' as const
            : index === currentIndex
              ? 'current' as const
              : 'upcoming' as const,
      }))

      // Count upcoming interviews
      const interviews = await db.query.interview.findMany({
        where: and(
          eq(interview.applicationId, app.id),
          eq(interview.organizationId, cand.organizationId),
          eq(interview.status, 'scheduled'),
        ),
        columns: { id: true, scheduledAt: true },
      })

      const upcomingCount = interviews.filter(
        (iv) => new Date(iv.scheduledAt) > new Date(),
      ).length

      applications.push({
        id: app.id,
        candidateId: cand.id,
        organizationId: cand.organizationId,
        status: app.status,
        appliedAt: app.createdAt,
        lastUpdated: app.updatedAt,
        isRejected,
        job: {
          title: app.job.title,
          location: app.job.location,
          type: formatJobType(app.job.type),
          remoteStatus: app.job.remoteStatus,
        },
        organization: {
          name: org?.name ?? 'Unknown',
          logo: org?.logo,
        },
        pipeline,
        upcomingInterviewCount: upcomingCount,
      })
    }
  }

  return applications
}

// ─── Formatting Helpers ────────────────────────────────

function formatJobType(type: string): string {
  const map: Record<string, string> = {
    full_time: 'Full Time',
    part_time: 'Part Time',
    contract: 'Contract',
    internship: 'Internship',
  }
  return map[type] ?? type
}

function formatInterviewType(type: string): string {
  const map: Record<string, string> = {
    phone: 'Phone Screen',
    video: 'Video Call',
    in_person: 'In-Person',
    panel: 'Panel Interview',
    technical: 'Technical Interview',
    take_home: 'Take-Home Assessment',
  }
  return map[type] ?? type
}

function formatInterview(iv: {
  id: string
  title: string
  type: string
  status: string
  scheduledAt: Date
  duration: number
  location: string | null
  timezone: string
  candidateResponse: string
}) {
  return {
    id: iv.id,
    title: iv.title,
    type: formatInterviewType(iv.type),
    status: iv.status,
    scheduledAt: iv.scheduledAt,
    duration: iv.duration,
    location: iv.location,
    timezone: iv.timezone,
    candidateResponse: iv.candidateResponse,
  }
}

function getStatusChangeTitle(from: string | undefined, to: string | undefined): string {
  if (to === 'rejected') return 'Application Not Moving Forward'
  if (to === 'hired') return 'You\'re Hired!'
  if (to === 'offer') return 'Offer Extended'
  if (to === 'interview') return 'Moving to Interview'
  if (to === 'screening') return 'Under Review'
  if (to === 'new' && from === 'rejected') return 'Application Reopened'
  return `Status Updated`
}

function getStatusChangeDescription(to: string | undefined): string {
  if (to === 'rejected') return 'The team has decided not to proceed with your application at this time.'
  if (to === 'hired') return 'Congratulations! The team has extended a hire. Expect to hear from them shortly.'
  if (to === 'offer') return 'Great news! An offer is being prepared for you.'
  if (to === 'interview') return 'The team would like to interview you. Watch for scheduling details.'
  if (to === 'screening') return 'A recruiter is now reviewing your qualifications.'
  return 'Your application status has been updated.'
}
