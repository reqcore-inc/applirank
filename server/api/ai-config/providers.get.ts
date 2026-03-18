import { PROVIDER_REGISTRY } from '../../utils/ai/provider'

/**
 * GET /api/ai-config/providers
 * Returns the list of supported AI providers with their model options and setup URLs.
 * Public within org (no secrets exposed).
 */
export default defineEventHandler(async (event) => {
  await requirePermission(event, { scoring: ['read'] })
  return PROVIDER_REGISTRY
})
