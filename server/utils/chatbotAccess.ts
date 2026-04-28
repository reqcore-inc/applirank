/**
 * Server-side gate for the chatbot feature.
 *
 * Performs auth, scope, AND feature flag check in one helper so every chatbot
 * endpoint short-circuits with a 404 when the flag is off (we hide rather than
 * reveal that the endpoint exists).
 */
import type { H3Event } from 'h3'
import { resolveServerFeatureFlag } from './featureFlags'

export async function requireChatbotAccess(event: H3Event) {
  // Minimal permission set — chatbot reads jobs/candidates/applications/docs.
  const session = await requirePermission(event, {
    job: ['read'],
    candidate: ['read'],
    application: ['read'],
    document: ['read'],
  })

  const enabled = await resolveServerFeatureFlag('chatbot-experience', {
    distinctId: session.user.id,
    groups: { organization: session.session.activeOrganizationId },
  })

  if (!enabled) {
    // Hide existence of the endpoint when the flag is off.
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  return session
}
