---
name: 'Composables & Client Utilities'
description: 'Vue 3 composable authoring patterns, Nuxt 4 data-fetching composables, SSR-safe state, auth composables, and CRUD patterns for Applirank'
applyTo: 'app/composables/**,app/utils/**'
---

# Composables & Client Utilities

Applirank composables live in `app/composables/` (auto-imported). Client utilities live in `app/utils/` (also auto-imported).
This file covers **authoring** composables — structure, state management, data fetching, forms, and multi-tenant patterns.

Reference docs:
- [Vue composables](https://vuejs.org/guide/reusability/composables.html)
- [Nuxt data fetching](https://nuxt.com/docs/getting-started/data-fetching)
- [Vue Composition API](https://vuejs.org/api/#composition-api)

---

## 1. Directory Layout & Auto-Import Rules

```
app/
├── composables/             # Auto-imported composables (useXxx)
│   ├── useCurrentOrg.ts     # Active org/session state
│   ├── useJobs.ts           # Jobs CRUD
│   ├── useCandidates.ts     # Candidates CRUD
│   ├── useApplications.ts   # Applications CRUD
│   ├── usePagination.ts     # Pagination state
│   └── useFormValidation.ts # Form validation helpers
└── utils/                   # Auto-imported utility functions
    ├── auth-client.ts       # Better Auth Vue client (DO NOT MOVE)
    └── format.ts            # Formatters (dates, names, etc.)
```

### Rules

| Rule | Details |
|------|---------|
| Composables go in `app/composables/` | Named `useXxx.ts` — auto-imported, no manual `import` needed |
| Utils go in `app/utils/` | Stateless helpers — formatters, validators, constants |
| File name = export name | `useJobs.ts` exports `function useJobs()` |
| Always prefix with `use` | Vue/Nuxt convention — required for auto-import to work correctly |
| Never put server code here | `server/utils/` is separate — Nitro auto-imports server utils |
| `auth-client.ts` stays in `app/utils/` | DO NOT rename or move — it's the foundation for all auth composables |

### Composable vs Utility — When to use which

| Use a **composable** (`app/composables/`) | Use a **utility** (`app/utils/`) |
|---|---|
| Manages reactive state (`ref`, `computed`, `watch`) | Pure functions — no reactive state |
| Uses Vue lifecycle hooks (`onMounted`, `onUnmounted`) | No lifecycle hooks |
| Wraps `useFetch` / `useAsyncData` / `useState` | Formatting, parsing, constants |
| Returns refs and functions | Returns plain values |
| Must be called in `<script setup>` context | Can be called anywhere |

---

## 2. Composable Structure — The Blueprint

Every composable follows this internal structure:

```ts
// app/composables/useXxx.ts
import type { SomeType } from '~/types'   // Only for non-auto-imported types

export function useXxx(options?: { filter?: string }) {
  // ═══════════════════════════════════════════
  // 1. DEPENDENCIES — other composables, session
  // ═══════════════════════════════════════════
  const { data: session } = authClient.useSession(useFetch)

  // ═══════════════════════════════════════════
  // 2. REACTIVE STATE — refs, useState, useFetch
  // ═══════════════════════════════════════════
  const { data, status, error, refresh } = useFetch('/api/xxx', {
    key: 'xxx',
    headers: useRequestHeaders(['cookie']),
  })

  // ═══════════════════════════════════════════
  // 3. DERIVED STATE — computed from refs
  // ═══════════════════════════════════════════
  const isEmpty = computed(() => !data.value?.length)
  const total = computed(() => data.value?.length ?? 0)

  // ═══════════════════════════════════════════
  // 4. ACTIONS — functions that mutate state
  // ═══════════════════════════════════════════
  async function create(payload: CreatePayload) {
    const result = await $fetch('/api/xxx', {
      method: 'POST',
      body: payload,
    })
    await refresh()
    return result
  }

  // ═══════════════════════════════════════════
  // 5. RETURN — plain object of refs + functions
  // ═══════════════════════════════════════════
  return {
    data,
    status,
    error,
    isEmpty,
    total,
    refresh,
    create,
  }
}
```

### Rules for return values

```ts
// ✅ CORRECT — return plain object of refs → destructure-safe
return { data, status, error, refresh, create }

// ❌ WRONG — reactive() wrapper → destructuring LOSES reactivity
return reactive({ data, status, error })

// ❌ WRONG — single ref → no room to expand API surface
return data
```

---

## 3. State Management — `ref` vs `useState` vs `useFetch`

### Decision tree

| Need | Use | Why |
|------|-----|-----|
| Component-local UI state (modals, toggles) | `ref()` | Doesn't survive navigation, component-scoped |
| Cross-component shared state, SSR-safe | `useState('key', () => init)` | Single instance, serialized to client on SSR |
| Server data with SSR | `useFetch()` / `useAsyncData()` | Fetches on server, transfers payload to client |
| User-triggered mutations | `$fetch()` | No SSR, direct call after interaction |

### `ref()` — local, ephemeral state

```ts
export function useModal() {
  const isOpen = ref(false)
  const title = ref('')

  function open(t: string) {
    title.value = t
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
    title.value = ''
  }

  return { isOpen, title, open, close }
}
```

Each component calling `useModal()` gets its **own** copy. This is correct for UI state.

### `useState()` — shared, SSR-safe state

```ts
export function useSidebarState() {
  // Same key = same ref across ALL components and SSR
  const isCollapsed = useState('sidebar-collapsed', () => false)

  function toggle() { isCollapsed.value = !isCollapsed.value }

  return { isCollapsed, toggle }
}
```

**CRITICAL:** Never use bare `ref()` for state that should be shared across components or survive navigation. It causes:
- Multiple instances (each component gets its own copy)
- Hydration mismatches (server and client state diverge)

### `useFetch()` — server data with singleton keys

```ts
export function useJobs() {
  return useFetch('/api/jobs', {
    key: 'jobs',
    headers: useRequestHeaders(['cookie']),
  })
}
```

**Nuxt 4 singleton rule:** All calls to `useFetch`/`useAsyncData` with the **same key** share the **same** `data`, `error`, and `status` refs. This means:
- Two components calling `useJobs()` make only **one** API request
- Both get the same reactive `data` ref
- But ALL calls with the same key **MUST** have identical `deep`, `transform`, `pick`, `getCachedData`, and `default` options
- **This is why data-fetching logic MUST live in composables** — to prevent option mismatches

---

## 4. Data-Fetching Composables

### Pattern: Read composable (list endpoint)

```ts
// app/composables/useJobs.ts
export function useJobs(options?: {
  status?: Ref<string | undefined> | string
}) {
  const query = computed(() => ({
    ...(toValue(options?.status) && { status: toValue(options?.status) }),
  }))

  const { data, status: fetchStatus, error, refresh } = useFetch('/api/jobs', {
    key: 'jobs',
    query,
    headers: useRequestHeaders(['cookie']),
  })

  const activeJobs = computed(() =>
    data.value?.data?.filter(j => j.status === 'open') ?? []
  )

  async function createJob(payload: { title: string; description?: string }) {
    const created = await $fetch('/api/jobs', {
      method: 'POST',
      body: payload,
    })
    await refresh()
    return created
  }

  async function deleteJob(id: string) {
    await $fetch(`/api/jobs/${id}`, { method: 'DELETE' })
    await refresh()
  }

  return {
    jobs: data,
    activeJobs,
    fetchStatus,
    error,
    refresh,
    createJob,
    deleteJob,
  }
}
```

### Pattern: Detail composable (single resource)

```ts
// app/composables/useJob.ts
export function useJob(id: MaybeRefOrGetter<string>) {
  const jobId = computed(() => toValue(id))

  const { data: job, status, error, refresh } = useFetch(
    () => `/api/jobs/${jobId.value}`,
    {
      key: computed(() => `job-${jobId.value}`),
      headers: useRequestHeaders(['cookie']),
    }
  )

  async function updateJob(payload: Partial<{ title: string; status: string }>) {
    const updated = await $fetch(`/api/jobs/${jobId.value}`, {
      method: 'PATCH',
      body: payload,
    })
    await refresh()
    return updated
  }

  return { job, status, error, refresh, updateJob }
}
```

### Key patterns

| Pattern | Implementation |
|---------|----------------|
| **Accept reactive inputs** | Use `MaybeRefOrGetter<T>` + `toValue()` for params that could be ref, getter, or plain value |
| **Reactive query params** | Pass `computed` to `useFetch`'s `query` option → auto-refetch on change |
| **Reactive URL** | Pass getter function `() => \`/api/jobs/${id.value}\`` → auto-refetch |
| **Forward cookies for SSR** | Always include `headers: useRequestHeaders(['cookie'])` in data-fetching composables |
| **Mutations use `$fetch`** | CREATE, UPDATE, DELETE are user-triggered → use `$fetch`, then `await refresh()` |
| **Invalidate after mutation** | Call `refresh()` on the composable, or `refreshNuxtData('key')` from outside it |

---

## 5. Auth & Multi-Tenant Composables

### Core auth composable — `useCurrentOrg`

```ts
// app/composables/useCurrentOrg.ts

/**
 * Provides the current authenticated user, session, and active organization.
 * Must be called in <script setup> context.
 */
export function useCurrentOrg() {
  const { data: session } = authClient.useSession(useFetch)

  const user = computed(() => session.value?.user ?? null)
  const isAuthenticated = computed(() => !!session.value)

  const orgId = computed(() =>
    session.value?.session.activeOrganizationId ?? null
  )
  const isOrgSelected = computed(() => !!orgId.value)

  return {
    session,
    user,
    isAuthenticated,
    orgId,
    isOrgSelected,
  }
}
```

### Using `authClient` — the rules

```ts
// ✅ CORRECT — pass useFetch for SSR-safe session access
const { data: session } = authClient.useSession(useFetch)

// ❌ WRONG — client-only, causes flicker on SSR pages
const { data: session } = authClient.useSession()

// ✅ Auth actions (client-only, user-triggered — $fetch is fine)
await authClient.signIn.email({ email, password })
await authClient.signUp.email({ email, password, name })
await authClient.signOut()

// ✅ Organization management
await authClient.organization.setActive({ organizationId: 'org_xxx' })
const { data: orgs } = authClient.organization.list(useFetch)
```

**NEVER** import from `better-auth/client` or `better-auth/react` — always `better-auth/vue`.

---

## 6. Pagination & Filtering Composables

### Reusable pagination composable

```ts
// app/composables/usePagination.ts
export function usePagination(options?: { defaultLimit?: number }) {
  const page = ref(1)
  const limit = ref(options?.defaultLimit ?? 20)
  const total = ref(0)

  const totalPages = computed(() => Math.ceil(total.value / limit.value))
  const hasNextPage = computed(() => page.value < totalPages.value)
  const hasPrevPage = computed(() => page.value > 1)

  function nextPage() {
    if (hasNextPage.value) page.value++
  }
  function prevPage() {
    if (hasPrevPage.value) page.value--
  }
  function goToPage(p: number) {
    page.value = Math.max(1, Math.min(p, totalPages.value))
  }
  function reset() {
    page.value = 1
  }

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage,
    hasPrevPage,
    nextPage,
    prevPage,
    goToPage,
    reset,
  }
}
```

### Using pagination in a data composable

```ts
// app/composables/useJobsList.ts
export function useJobsList() {
  const { page, limit, total, ...pagination } = usePagination({ defaultLimit: 20 })

  const statusFilter = ref<string | undefined>(undefined)

  const query = computed(() => ({
    page: page.value,
    limit: limit.value,
    ...(statusFilter.value && { status: statusFilter.value }),
  }))

  const { data, status: fetchStatus, error, refresh } = useFetch('/api/jobs', {
    key: 'jobs-list',
    query,
    headers: useRequestHeaders(['cookie']),
  })

  // Sync total from server response
  watch(data, (val) => {
    if (val) total.value = val.total
  }, { immediate: true })

  // Reset page when filter changes
  watch(statusFilter, () => {
    page.value = 1
  })

  return {
    jobs: computed(() => data.value?.data ?? []),
    fetchStatus,
    error,
    refresh,
    page,
    limit,
    total,
    statusFilter,
    ...pagination,
  }
}
```

---

## 7. Form Composables

### Pattern: form state + validation + submission

```ts
// app/composables/useJobForm.ts
import { z } from 'zod'

const jobFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  location: z.string().optional(),
  type: z.enum(['full_time', 'part_time', 'contract', 'internship']),
})

type JobFormData = z.infer<typeof jobFormSchema>

export function useJobForm(options?: {
  initialData?: Partial<JobFormData>
  onSuccess?: () => void
}) {
  // Form state
  const form = ref<Partial<JobFormData>>({
    title: '',
    type: 'full_time',
    ...options?.initialData,
  })

  // Submission state
  const isSubmitting = ref(false)
  const errors = ref<Record<string, string>>({})
  const submitError = ref<string | null>(null)

  // Validate
  function validate(): boolean {
    const result = jobFormSchema.safeParse(form.value)
    if (!result.success) {
      errors.value = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0]?.toString()
        if (field) errors.value[field] = issue.message
      }
      return false
    }
    errors.value = {}
    return true
  }

  // Submit
  async function submit() {
    submitError.value = null
    if (!validate()) return

    isSubmitting.value = true
    try {
      const job = await $fetch('/api/jobs', {
        method: 'POST',
        body: form.value,
      })
      await refreshNuxtData('jobs')
      options?.onSuccess?.()
      return job
    } catch (err: any) {
      submitError.value = err.data?.statusMessage ?? 'Something went wrong'
    } finally {
      isSubmitting.value = false
    }
  }

  // Field-level error helper
  function fieldError(field: keyof JobFormData) {
    return computed(() => errors.value[field] ?? null)
  }

  return {
    form,
    errors,
    submitError,
    isSubmitting,
    validate,
    submit,
    fieldError,
  }
}
```

### Using the form composable in a page

```vue
<script setup lang="ts">
const { form, errors, isSubmitting, submit, fieldError } = useJobForm({
  onSuccess: () => navigateTo('/dashboard/jobs'),
})
</script>

<template>
  <form @submit.prevent="submit">
    <input v-model="form.title" placeholder="Job title" />
    <p v-if="fieldError('title').value" class="text-red-500">
      {{ fieldError('title').value }}
    </p>

    <button type="submit" :disabled="isSubmitting">
      {{ isSubmitting ? 'Creating...' : 'Create Job' }}
    </button>
  </form>
</template>
```

---

## 8. Composable Composition — Composables Calling Composables

Composables can (and should) compose with other composables:

```ts
// app/composables/useDashboard.ts
export function useDashboard() {
  // ✅ Composables can call other composables
  const { orgId, isAuthenticated } = useCurrentOrg()
  const { jobs, fetchStatus: jobsStatus } = useJobs()

  const { data: stats, status: statsStatus } = useFetch('/api/stats', {
    key: 'dashboard-stats',
    headers: useRequestHeaders(['cookie']),
  })

  const isLoading = computed(() =>
    jobsStatus.value === 'pending' || statsStatus.value === 'pending'
  )

  return {
    orgId,
    isAuthenticated,
    jobs,
    stats,
    isLoading,
  }
}
```

### Rules for composition

- Composables calling composables MUST also be called in `<script setup>` context — the restriction propagates.
- Never call a composable inside an event handler, `setTimeout`, `watch` callback, or `onMounted` hook (except simple composables that don't rely on component lifecycle).
- If you need data in an event handler, get the ref from a composable called in `<script setup>`, then read `.value` in the handler.

```ts
// ✅ CORRECT
const { jobs, refresh } = useJobs()

async function handleRefresh() {
  await refresh()       // Reading ref value in handler is fine
  console.log(jobs.value) // Accessing .value in handler is fine
}

// ❌ WRONG — composable called inside handler
async function handleRefresh() {
  const { jobs } = useJobs()  // WILL BREAK — not in setup context
}
```

---

## 9. Accepting Reactive Inputs — `MaybeRefOrGetter`

When composables accept parameters that might change, use `toValue()` to normalize:

```ts
import type { MaybeRefOrGetter } from 'vue'

export function useJobApplications(jobId: MaybeRefOrGetter<string>) {
  // toValue() normalizes: ref → .value, getter → call(), plain → as-is
  const id = computed(() => toValue(jobId))

  const { data, refresh } = useFetch(
    () => `/api/jobs/${id.value}/applications`,
    {
      key: computed(() => `job-applications-${id.value}`),
      headers: useRequestHeaders(['cookie']),
    }
  )

  return { applications: data, refresh }
}

// All of these work:
useJobApplications('abc-123')                  // plain string
useJobApplications(ref('abc-123'))             // ref
useJobApplications(() => route.params.id)      // getter
```

### When to use which pattern

| Input type | Pattern |
|------------|---------|
| Static value (doesn't change) | Accept plain `string` / `number` |
| Might be reactive | Accept `MaybeRefOrGetter<T>`, use `toValue()` |
| Always reactive (from route) | Accept `Ref<T>` or `ComputedRef<T>` |

---

## 10. Shallow Reactivity — The Nuxt 4 Default

`useFetch` and `useAsyncData` return `shallowRef` data in Nuxt 4. You MUST understand the implications:

```ts
const { data } = useFetch('/api/jobs')

// ❌ SILENT FAILURE — Vue won't detect this change
data.value.someField = 'new'

// ✅ Replace the entire value
data.value = { ...data.value, someField: 'new' }

// ✅ Force reactivity update with triggerRef
import { triggerRef } from 'vue'
data.value.someField = 'new'
triggerRef(data)

// ✅ Opt into deep reactivity (use sparingly — performance cost)
const { data } = useFetch('/api/jobs', { deep: true })
```

### When to use `deep: true`

- Forms that bind to nested fields with `v-model`
- Data structures where you frequently modify nested properties
- **NOT** for list/read views — shallowRef is fine when you replace entire objects

---

## 11. SSR Considerations

### Cookie forwarding (REQUIRED for authenticated APIs)

During server-side rendering, the browser's cookies are not automatically sent with `useFetch` / `useAsyncData` calls. You MUST forward them:

```ts
// ✅ REQUIRED for all authenticated data-fetching composables
const { data } = useFetch('/api/jobs', {
  headers: useRequestHeaders(['cookie']),
})

// ❌ WRONG — returns 401 during SSR (no cookies forwarded)
const { data } = useFetch('/api/jobs')
```

### Automatic cleanup

In Nuxt 4, when the **last component** using a `useAsyncData` key unmounts, the cached data is automatically cleaned up. You don't need to manually clear state.

### `getCachedData` with context

```ts
const { data } = useAsyncData('jobs', () => $fetch('/api/jobs'), {
  getCachedData: (key, nuxtApp, ctx) => {
    // ctx.cause: 'initial' | 'refresh:hook' | 'refresh:manual' | 'watch'
    if (ctx.cause === 'refresh:manual') return undefined  // force refetch
    return nuxtApp.payload.data[key] || nuxtApp.static.data[key]
  },
})
```

---

## 12. Error Handling in Composables

### Pattern: wrap errors for consumer

```ts
export function useJobs() {
  const { data, error, status, refresh } = useFetch('/api/jobs', {
    key: 'jobs',
    headers: useRequestHeaders(['cookie']),
  })

  // Derived error state for easy template consumption
  const errorMessage = computed(() => {
    if (!error.value) return null
    return error.value.statusMessage ?? 'Failed to load jobs'
  })

  const isNotFound = computed(() => error.value?.statusCode === 404)
  const isUnauthorized = computed(() => error.value?.statusCode === 401)

  return {
    jobs: data,
    error,
    errorMessage,
    isNotFound,
    isUnauthorized,
    status,
    refresh,
  }
}
```

### Pattern: action error handling

```ts
async function deleteJob(id: string) {
  try {
    await $fetch(`/api/jobs/${id}`, { method: 'DELETE' })
    await refresh()
    return { success: true }
  } catch (err: any) {
    return {
      success: false,
      message: err.data?.statusMessage ?? 'Failed to delete job',
    }
  }
}
```

---

## 13. Watchers in Composables

### Watch reactive inputs for side effects

```ts
export function useJobSearch(searchQuery: Ref<string>) {
  const debouncedQuery = ref(searchQuery.value)
  let timeout: ReturnType<typeof setTimeout>

  // Debounce search input
  watch(searchQuery, (val) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      debouncedQuery.value = val
    }, 300)
  })

  const { data, status } = useFetch('/api/jobs/search', {
    key: 'job-search',
    query: computed(() => ({ q: debouncedQuery.value })),
    headers: useRequestHeaders(['cookie']),
  })

  // Cleanup timer on unmount
  onUnmounted(() => clearTimeout(timeout))

  return { results: data, status }
}
```

### Cleanup side effects

Always clean up timers, event listeners, and subscriptions in `onUnmounted()`:

```ts
export function useWindowResize() {
  const width = ref(0)
  const height = ref(0)

  function update() {
    width.value = window.innerWidth
    height.value = window.innerHeight
  }

  onMounted(() => {
    update()
    window.addEventListener('resize', update)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', update)
  })

  return { width, height }
}
```

**SSR note:** DOM-specific side effects (`window`, `document`) MUST be in `onMounted` / `onUnmounted` — these hooks only run in the browser.

---

## 14. The `app/utils/` Directory

`app/utils/` is for auto-imported **stateless** functions. Not composables.

### `auth-client.ts` — the one exception

```ts
// app/utils/auth-client.ts — DO NOT MODIFY without good reason
import { createAuthClient } from 'better-auth/vue'
import { organizationClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  plugins: [
    organizationClient(),
  ],
})
```

This is auto-imported as `authClient` throughout the app. It provides:
- `authClient.useSession(useFetch)` — SSR-safe session access
- `authClient.signIn.email()` / `authClient.signUp.email()` / `authClient.signOut()`
- `authClient.organization.list()` / `.create()` / `.setActive()`

### Example utility functions

```ts
// app/utils/format.ts
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

export function formatRelativeTime(date: string | Date): string {
  const now = Date.now()
  const then = new Date(date).getTime()
  const diff = now - then
  const minutes = Math.floor(diff / 60000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function truncate(str: string, length: number): string {
  return str.length > length ? `${str.slice(0, length)}…` : str
}
```

---

## 15. Typing Composables

### Let TypeScript infer return types

```ts
// ✅ CORRECT — TypeScript infers the full return type
export function useJobs() {
  const { data } = useFetch('/api/jobs')
  return { data }
}

// ❌ WRONG — manual return typing is fragile and redundant
export function useJobs(): { data: Ref<Job[] | null> } {
  const { data } = useFetch('/api/jobs')
  return { data }
}
```

### Type parameters for generic composables

```ts
export function useEntityDetail<T>(
  endpoint: MaybeRefOrGetter<string>,
  key: MaybeRefOrGetter<string>,
) {
  const { data, status, error, refresh } = useFetch<T>(
    () => toValue(endpoint),
    {
      key: computed(() => toValue(key)),
      headers: useRequestHeaders(['cookie']),
    }
  )

  return { data, status, error, refresh }
}

// Usage — type is inferred from API response
const { data: job } = useEntityDetail('/api/jobs/abc', 'job-abc')
```

### Server response types

Nuxt auto-generates types from server route return values. `useFetch('/api/jobs')` is typed based on what `server/api/jobs/index.get.ts` returns — no manual type duplication needed.

---

## 16. NEVER Do These

| Anti-pattern | Why | Do this instead |
|-------------|-----|-----------------|
| Use bare `ref()` for shared cross-component state | Creates separate instances, hydration mismatch | Use `useState('key', () => init)` |
| Return `reactive()` from composable | Destructuring loses reactivity | Return plain object of `ref`s |
| Call composable inside event handler | Vue can't track component lifecycle | Call in `<script setup>`, use returned refs in handlers |
| Call composable inside `watch` / `onMounted` callback | Same restriction — must be in setup context | Call in `<script setup>`, pass refs if needed |
| Skip cookie forwarding in data-fetching composable | 401 during SSR — no session sent to server | Always add `headers: useRequestHeaders(['cookie'])` |
| Skip `useFetch` for `authClient.useSession()` | Client-only session → flash/flicker on SSR pages | Always `authClient.useSession(useFetch)` |
| Import `authClient` manually | Auto-imported from `app/utils/` | Just use `authClient` directly |
| Use `$fetch` in `<script setup>` for page data | Double fetch (SSR + hydration) | Use `useFetch` or `useAsyncData` |
| Mutate nested `shallowRef` data | Won't trigger reactivity in Nuxt 4 | Replace entire value or use `deep: true` |
| Use same `useFetch` key with different options | Nuxt 4 singleton keys — causes undefined behavior | Extract shared fetches into composables with fixed options |
| Access `window`/`document` outside `onMounted` | Crashes during SSR (no DOM on server) | Guard with `onMounted` or `import.meta.client` |
| Create composable file without `use` prefix | Nuxt auto-import won't recognize it | Name file and function `useXxx` |
| Put composables in `server/utils/` | Server auto-imports are separate from client | Client composables go in `app/composables/` |
| Trust org ID from URL params | Tenant spoofing — security vulnerability | Get org ID from `useCurrentOrg().orgId` (from session) |

---

## 17. Complete Composable Example — Full CRUD

```ts
// app/composables/useCandidates.ts

export function useCandidates(options?: {
  immediate?: boolean
}) {
  // Auth & Org
  const { orgId } = useCurrentOrg()

  // Pagination
  const { page, limit, total, ...pagination } = usePagination()

  // Filters
  const search = ref('')

  // Query (reactive — auto-refetches on change)
  const query = computed(() => ({
    page: page.value,
    limit: limit.value,
    ...(search.value && { q: search.value }),
  }))

  // Fetch
  const { data, status, error, refresh } = useFetch('/api/candidates', {
    key: 'candidates',
    query,
    headers: useRequestHeaders(['cookie']),
    immediate: options?.immediate ?? true,
  })

  // Sync total from response
  watch(data, (val) => {
    if (val) total.value = val.total
  }, { immediate: true })

  // Reset page on search change
  watch(search, () => { page.value = 1 })

  // Derived state
  const candidates = computed(() => data.value?.data ?? [])
  const isEmpty = computed(() =>
    status.value === 'success' && candidates.value.length === 0
  )

  // Actions
  async function createCandidate(payload: {
    firstName: string
    lastName: string
    email: string
    phone?: string
  }) {
    const created = await $fetch('/api/candidates', {
      method: 'POST',
      body: payload,
    })
    await refresh()
    return created
  }

  async function deleteCandidate(id: string) {
    await $fetch(`/api/candidates/${id}`, { method: 'DELETE' })
    await refresh()
  }

  return {
    // Data
    candidates,
    isEmpty,
    status,
    error,
    refresh,

    // Pagination
    page,
    limit,
    total,
    ...pagination,

    // Filters
    search,

    // Actions
    createCandidate,
    deleteCandidate,
  }
}
```