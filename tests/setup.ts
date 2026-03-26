/**
 * Vitest global setup — stubs Nitro auto-imported server utilities
 * that are unavailable outside the Nuxt/Nitro runtime.
 */
import { vi } from 'vitest'

// Stub the structured logger functions (auto-imported from server/utils/logger.ts)
vi.stubGlobal('logInfo', vi.fn())
vi.stubGlobal('logWarn', vi.fn())
vi.stubGlobal('logError', vi.fn())
vi.stubGlobal('logDebug', vi.fn())
