---
name: nuxt-4-skill
description: This skill ensures AI agents write correct, modern Nuxt 4 code and avoid common mistakes from outdated Nuxt 3 patterns. Always read this before writing any Nuxt code.
---
# Nuxt 4 Development Skill

> **Purpose**: This skill ensures AI agents write correct, modern Nuxt 4 code and avoid common mistakes from outdated Nuxt 3 patterns. Always read this before writing any Nuxt code.
> **Last verified**: February 2025 | Nuxt 4.x stable (released July 2025)

---

## 1. Critical Context: Nuxt 4 vs Nuxt 3

Nuxt 4 was officially released in July 2025. It is a **stability-focused** major release that builds on Nuxt 3 with breaking changes in project structure, data fetching, TypeScript, and tooling. Nuxt 3 reaches end-of-maintenance in January 2026.

**If you have training data from Nuxt 3, many patterns are now outdated.** Always prefer the patterns documented in this skill.

### Key Differences at a Glance

| Area | Nuxt 3 (Old) | Nuxt 4 (Current) |
|---|---|---|
| Directory structure | Flat root (`pages/`, `components/` at root) | `app/` directory (source code lives in `app/`) |
| Data fetching reactivity | Deep reactive refs by default | `shallowRef` by default for better performance |
| Data fetching keys | Independent per call | Singleton: shared refs for same key |
| Route middleware | `defineNuxtRouteMiddleware` (some guides) | `defineNuxtRouteMiddleware` with async support |
| `<head>` management | Unhead v1 | Unhead v2 (removed `vmid`, `hid`, `children`) |
| Component names | Vue default naming | Normalized to match Nuxt auto-import pattern |
| Module loading in layers | Project modules loaded first (incorrect) | Layer modules first, project modules last (correct) |
| Route metadata | Available on both `route.name` and `route.meta.name` | Only on `route.name` (deduplicated) |
| Page meta scanning | Before `pages:extend` hook | After `pages:extend` hook |
| Node.js requirement | 16+ | 18.20+ (LTS 20+ recommended) |
| Generate config | `generate.exclude`, `generate.routes` | Removed. Use `nitro.prerender` instead |
| Inline styles | All CSS inlined | Only Vue component CSS inlined; global CSS as separate file |

---

## 2. Project Structure (CRITICAL CHANGE)

### Nuxt 4 Default Structure

```
my-nuxt-app/
├── app/                    # ← ALL application source code goes here
│   ├── assets/
│   ├── components/
│   ├── composables/
│   ├── layouts/
│   ├── middleware/          # Route middleware (client-side)
│   ├── pages/
│   ├── plugins/
│   ├── utils/
│   ├── app.vue
│   ├── app.config.ts
│   ├── error.vue
│   ├── router.options.ts
│   └── spa-loading-template.html
├── content/                # Nuxt Content (at root, NOT inside app/)
├── layers/                 # Nuxt Layers (at root)
├── modules/                # Local modules (at root)
├── public/                 # Static assets (at root)
├── shared/                 # Shared code between app and server
├── server/                 # Server code (at root, NOT inside app/)
│   ├── api/
│   ├── middleware/          # Server middleware (Nitro/h3)
│   ├── plugins/
│   ├── routes/
│   └── utils/
├── nuxt.config.ts
├── package.json
└── tsconfig.json
```

### Rules

- The `~` alias now points to `app/` by default (your `srcDir`).
- `~/components` resolves to `app/components/`, `~/pages` to `app/pages/`, etc.
- `server/`, `content/`, `layers/`, `modules/`, and `public/` stay at the **project root**, NOT inside `app/`.
- If the project still uses the flat (Nuxt 3) structure, Nuxt auto-detects it — but **always prefer the new structure for new projects**.

### Why This Matters

1. **Performance**: Prevents `.git/` and `node_modules/` from being scanned by file watchers.
2. **IDE Type Safety**: Separates app context from server context for accurate auto-completion.

### Reverting to Nuxt 3 Structure (if needed)

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  srcDir: '.',
  dir: {
    app: 'app',
  },
})
```

---

## 3. Data Fetching (SIGNIFICANT CHANGES)

### The Three Methods

| Method | Use Case |
|---|---|
| `useFetch` | Simple data fetching in components (wrapper around `useAsyncData` + `$fetch`) |
| `useAsyncData` | Complex async operations, custom fetch logic |
| `$fetch` | Direct HTTP calls (event handlers, non-component code, client-only actions) |

### Critical Nuxt 4 Changes

#### 3.1 Shallow Reactivity by Default

```ts
// Nuxt 4: data is a shallowRef (NOT deeply reactive)
const { data } = await useFetch('/api/users')

// If you need deep reactivity (rare, impacts performance):
const { data } = await useFetch('/api/users', { deep: true })
```

**Do NOT** set `deep: true` globally unless absolutely necessary. ShallowRef provides massive performance improvements on nested data structures.

#### 3.2 Singleton Data Fetching (Shared Refs)

All calls to `useAsyncData`/`useFetch` with the **same key** now share the same `data`, `error`, and `status` refs.

```ts
// ✅ CORRECT: Same key = shared data across components
// Component A
const { data: product } = await useFetch(`/api/products/${id}`, {
  key: `product-${id}`
})

// Component B (different file, same key)
const { data: product } = await useFetch(`/api/products/${id}`, {
  key: `product-${id}`
})
// → No duplicate API call! Uses the same shared ref.
```

**Important Rules:**
- All calls with the same explicit key **must have identical** `deep`, `transform`, `pick`, `getCachedData`, and `default` options.
- Extract shared data fetching into composables to avoid inconsistencies:

```ts
// app/composables/useProduct.ts
export function useProduct(productId: string) {
  return useAsyncData(
    `product-${productId}`,
    () => $fetch(`/api/products/${productId}`),
    {
      deep: true,
      transform: (product) => ({
        ...product,
        formattedPrice: `${product.price.toFixed(2)} kr`,
      }),
    }
  )
}
```

#### 3.3 `getCachedData` Now Receives Context

```ts
// Nuxt 4: getCachedData has a context parameter
useAsyncData('key', fetchFunction, {
  getCachedData: (key, nuxtApp, ctx) => {
    // ctx.cause can be: 'initial' | 'refresh:hook' | 'refresh:manual' | 'watch'
    
    // Example: Always refetch on manual refresh
    if (ctx.cause === 'refresh:manual') return undefined
    
    return nuxtApp.payload.data[key] || nuxtApp.static.data[key]
  }
})
```

#### 3.4 Reactive Keys

```ts
// Nuxt 4: Keys can be reactive (computed, ref, getter)
const id = computed(() => route.params.id)

const { data: post } = await useFetch(() => `/api/posts/${id.value}`)
// → Automatically refetches when id changes
```

#### 3.5 Automatic Data Cleanup

When the **last component** using a `useAsyncData` key unmounts, Nuxt automatically removes the cached data to prevent memory leaks.

#### 3.6 Common Data Fetching Mistakes to Avoid

```ts
// ❌ WRONG: Using $fetch in component setup (causes double fetch on SSR + hydration)
const data = ref(null)
data.value = await $fetch('/api/users')

// ✅ CORRECT: Use useFetch or useAsyncData in components
const { data } = await useFetch('/api/users')

// ❌ WRONG: Conflicting options with same key
const { data: a } = useAsyncData('users', () => $fetch('/api/users'), { deep: false })
const { data: b } = useAsyncData('users', () => $fetch('/api/users'), { deep: true })
// → Nuxt 4 will warn about this!

// ✅ CORRECT: Use $fetch in server routes and event handlers
// server/api/combined.get.ts
export default defineEventHandler(async () => {
  const [users, posts] = await Promise.all([
    $fetch('/api/users'),
    $fetch('/api/posts'),
  ])
  return { users, posts }
})
```

---

## 4. Server API Routes

Server routes live in `server/` at the project root (NOT inside `app/`).

### File-Based Routing

```
server/
├── api/
│   ├── hello.ts            → GET/POST/etc. /api/hello
│   ├── hello.get.ts        → GET /api/hello
│   ├── hello.post.ts       → POST /api/hello
│   ├── users/
│   │   ├── index.get.ts    → GET /api/users
│   │   ├── index.post.ts   → POST /api/users
│   │   └── [id].get.ts     → GET /api/users/:id
├── routes/
│   └── health.ts           → /health (no /api prefix)
├── middleware/
│   └── log.ts              → Runs on every request
├── plugins/
│   └── startup.ts          → Nitro server plugins
└── utils/
    └── auth.ts             → Auto-imported server utilities
```

### Writing Event Handlers

```ts
// server/api/users.get.ts
export default defineEventHandler(async (event) => {
  // Read query parameters
  const query = getQuery(event)
  
  // Return data (auto-serialized as JSON)
  return { users: ['Alice', 'Bob'] }
})

// server/api/users.post.ts
export default defineEventHandler(async (event) => {
  // Read and validate body
  const body = await readValidatedBody(event, z.object({
    name: z.string().min(1),
    email: z.string().email(),
  }).parse)
  
  // Return created resource
  return { user: body }
})

// server/api/users/[id].get.ts
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  // Or with validation:
  // const { id } = await getValidatedRouterParams(event, z.object({ id: z.string() }).parse)
  return { id, name: 'Alice' }
})
```

### Error Handling in Server Routes

```ts
// ✅ CORRECT: Use createError to throw proper HTTP errors
export default defineEventHandler(async (event) => {
  const user = await findUser(event)
  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'User not found',
    })
  }
  return user
})

// ❌ WRONG: Returning error objects (sends 200 with error body)
export default defineEventHandler(async (event) => {
  const user = await findUser(event)
  if (!user) {
    return { code: 404, message: 'User not found' } // DON'T DO THIS
  }
  return user
})
```

### Server Middleware vs Server Utils (Important Pattern)

**Prefer server utils over global server middleware for route-specific logic:**

```ts
// server/utils/auth.ts (Auto-imported)
export async function requireAuth(event: H3Event) {
  const session = await getUserSession(event)
  if (!session) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  return session
}

// server/api/protected-data.get.ts
export default defineEventHandler(async (event) => {
  const session = await requireAuth(event) // Explicit, clear
  return { secret: 'data' }
})
```

**Only use global server middleware for truly global concerns** (logging, CORS headers):

```ts
// server/middleware/log.ts
export default defineEventHandler((event) => {
  console.log('Request:', getRequestURL(event))
  // Don't return anything — middleware should not respond
})
```

### Event Handler with Guards Pattern (Nuxt 4 / h3)

```ts
// server/api/admin/dashboard.get.ts
export default defineEventHandler({
  onRequest: [
    (event) => requireAuth(event),
    (event) => requireRole(event, 'admin'),
  ],
  handler: async (event) => {
    return { dashboard: 'data' }
  },
})
```

---

## 5. Route Middleware (Client-Side)

Route middleware lives in `app/middleware/` and runs in the **Vue/browser context** (not server).

### Types of Middleware

1. **Named**: `app/middleware/auth.ts` → applied via `definePageMeta`
2. **Global**: `app/middleware/tracking.global.ts` → runs on every route change
3. **Inline**: Defined directly in `definePageMeta`

```ts
// app/middleware/auth.ts
export default defineNuxtRouteMiddleware((to, from) => {
  const { isLoggedIn } = useAuth()
  if (!isLoggedIn) {
    return navigateTo('/login')
  }
})

// Usage in a page:
// app/pages/dashboard.vue

definePageMeta({
  middleware: ['auth'], // or middleware: 'auth'
})

```

### Nuxt 4: Async Middleware Support

```ts
// Nuxt 4 allows async middleware natively
export default defineNuxtRouteMiddleware(async (to, from) => {
  const { data } = await useFetch('/api/auth/check')
  if (!data.value?.authenticated) {
    return navigateTo('/login')
  }
})
```

### Return Values

- `undefined` or nothing → continue navigation
- `navigateTo('/path')` → redirect (302 on server)
- `navigateTo('/path', { redirectCode: 301 })` → permanent redirect
- `abortNavigation()` → cancel navigation
- `abortNavigation(error)` → cancel with error

---

## 6. `nuxt.config.ts` — Nuxt 4 Patterns

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  // ✅ Nuxt 4 defaults — no compatibilityVersion needed
  
  // Runtime config (with full IntelliSense in Nuxt 4)
  runtimeConfig: {
    apiSecret: '', // Server-only, set via NUXT_API_SECRET env var
    public: {
      apiBase: '', // Client + Server, set via NUXT_PUBLIC_API_BASE
    },
  },

  // Modules
  modules: [
    '@nuxtjs/supabase',
    '@nuxt/ui',
  ],

  // ❌ REMOVED in Nuxt 4 — don't use:
  // generate: { exclude: [...], routes: [...] }
  
  // ✅ Use nitro.prerender instead:
  nitro: {
    prerender: {
      ignore: ['/admin', '/private'],
      routes: ['/sitemap.xml'],
    },
  },

  // Route rules (SSR, caching, redirects)
  routeRules: {
    '/': { prerender: true },
    '/api/**': { cache: { maxAge: 60 * 60 } },
    '/old-page': { redirect: { to: '/new-page', statusCode: 302 } },
  },

  // Testing Nuxt 5 features early (optional)
  // future: {
  //   compatibilityVersion: 5,
  // },
})
```

---

## 7. `<head>` Management (Unhead v2)

### Removed Props

```ts
// ❌ Nuxt 3 / Unhead v1 — REMOVED in Nuxt 4
useHead({
  meta: [{ name: 'description', content: '...', vmid: 'desc', hid: 'desc' }]
})

// ✅ Nuxt 4 / Unhead v2
useHead({
  meta: [{ name: 'description', content: '...' }]
})
```

### Import from `#imports` Instead of `@unhead/vue`

```ts
// ✅ Preferred in Nuxt 4
import { useHead, useSeoMeta } from '#imports'

// ❌ Still works but not recommended
import { useHead } from '@unhead/vue'
```

### `useSeoMeta` — Preferred for SEO

```ts
// app/pages/about.vue

useSeoMeta({
  title: 'About Us',
  description: 'Learn about our company.',
  ogTitle: 'About Us',
  ogDescription: 'Learn about our company.',
  ogImage: '/images/og-about.png',
})

```

---

## 8. Composables & Auto-Imports

### Where to Place Composables

- `app/composables/` — auto-imported in app context
- `app/utils/` — auto-imported in app context
- `server/utils/` — auto-imported in server context
- `shared/` — shared between app and server (new in Nuxt 4)

### Writing Composables

```ts
// app/composables/useCounter.ts
export function useCounter(initial = 0) {
  const count = useState('counter', () => initial)
  
  function increment() {
    count.value++
  }
  
  return { count, increment }
}

// Usage — auto-imported, no import needed:
// app/pages/index.vue

const { count, increment } = useCounter()

```

### `useState` for Shared State

```ts
// ✅ Use useState for SSR-safe reactive state shared across components
const user = useState('user', () => null)

// ❌ DON'T use plain ref for shared state (causes hydration mismatches)
const user = ref(null)
```

---

## 9. TypeScript in Nuxt 4

Nuxt 4 generates a `tsconfig.json` with **project references** that separate:
- `app/` context (Vue, browser APIs, auto-imports)
- `server/` context (h3, Nitro, Node APIs)
- `shared/` context (code shared between both)
- Configuration files

This means:
- Server utils are NOT available in `app/` code (and vice versa)
- Use `shared/` for types and functions needed in both contexts
- IDE auto-complete is context-aware

### Type-Safe Fetch

```ts
// Nuxt 4 infers API response types from server routes
const { data } = await useFetch('/api/users')
// data is typed based on the return type of server/api/users.ts
```

---

## 10. Common Mistakes & Anti-Patterns

### ❌ Mistake 1: Placing `server/` Inside `app/`

```
# WRONG
app/
  server/     ← Server code must be at project root!
  pages/

# CORRECT
app/
  pages/
server/       ← At root level
```

### ❌ Mistake 2: Using `generate` Config

```ts
// WRONG — removed in Nuxt 4
export default defineNuxtConfig({
  generate: {
    routes: ['/about', '/contact']
  }
})

// CORRECT
export default defineNuxtConfig({
  nitro: {
    prerender: {
      routes: ['/about', '/contact']
    }
  }
})
```

### ❌ Mistake 3: Using `$fetch` in Component Setup

```ts
// WRONG — causes double fetching (SSR + client hydration)

const users = ref([])
users.value = await $fetch('/api/users')


// CORRECT — SSR-safe, transfers payload to client

const { data: users } = await useFetch('/api/users')

```

### ❌ Mistake 4: Using `vmid` or `hid` in `useHead`

```ts
// WRONG — removed in Unhead v2
useHead({ meta: [{ name: 'desc', content: '...', hid: 'desc' }] })

// CORRECT
useHead({ meta: [{ name: 'description', content: '...' }] })
```

### ❌ Mistake 5: Returning Error Objects from Server Routes

```ts
// WRONG — returns 200 with error body
return { statusCode: 404, message: 'Not found' }

// CORRECT — throws proper HTTP error
throw createError({ statusCode: 404, message: 'Not found' })
```

### ❌ Mistake 6: Accessing Route Meta Duplicates

```ts
// WRONG (Nuxt 4) — metadata is no longer duplicated
const name = route.meta.name

// CORRECT
const name = route.name
```

### ❌ Mistake 7: Deep Reactivity Assumptions

```ts
// In Nuxt 4, data from useFetch is a shallowRef
const { data } = await useFetch('/api/nested-object')

// WRONG — mutating nested properties won't trigger reactivity
data.value.nested.property = 'new value'

// CORRECT — replace the entire value or use deep: true
data.value = { ...data.value, nested: { ...data.value.nested, property: 'new value' } }
// OR use deep: true (performance cost):
const { data } = await useFetch('/api/nested-object', { deep: true })
```

### ❌ Mistake 8: Using `pages:extend` to Override Page Meta

```ts
// WRONG in Nuxt 4 — metadata scanning happens after pages:extend
hooks: {
  'pages:extend'(pages) {
    pages[0].meta.layout = 'custom' // May not work
  }
}

// CORRECT — use pages:resolved
hooks: {
  'pages:resolved'(pages) {
    pages[0].meta.layout = 'custom'
  }
}
```

---

## 11. SSR-Safe Cookie and Session Handling

When calling protected API routes during SSR, the cookie is not automatically forwarded:

```ts
// ❌ WRONG — cookie not forwarded during SSR
const { data } = await useFetch('/api/protected')

// ✅ CORRECT — forward cookies during SSR
const { data } = await useFetch('/api/protected', {
  headers: useRequestHeaders(['cookie']),
})
```

For auth patterns, consider using `nuxt-auth-utils` which handles this automatically with `useUserSession()`.

---

## 12. Environment Variables & Runtime Config

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    // Server-only (never exposed to client)
    supabaseServiceKey: '',       // → NUXT_SUPABASE_SERVICE_KEY
    
    // Client + server
    public: {
      supabaseUrl: '',            // → NUXT_PUBLIC_SUPABASE_URL
      supabaseAnonKey: '',        // → NUXT_PUBLIC_SUPABASE_ANON_KEY
    },
  },
})
```

```ts
// In app code (client or server)
const config = useRuntimeConfig()
config.public.supabaseUrl

// In server code only
const config = useRuntimeConfig()
config.supabaseServiceKey // Server-only key
```

---

## 13. Migration Checklist (Nuxt 3 → 4)

1. **Update Node.js** to 18.20+ (LTS 20+ recommended)
2. **Install Nuxt 4**: `npm install nuxt@^4.0.0`
3. **Run codemods**: `npx codemod@0.18.7 nuxt/4/migration-recipe`
4. **Move source files** into `app/` directory
5. **Keep `server/`, `content/`, `public/`** at project root
6. **Replace `generate` config** with `nitro.prerender`
7. **Remove `vmid`/`hid`** from `useHead` calls
8. **Review `getCachedData`** implementations (new context parameter)
9. **Check `useAsyncData` keys** for conflicting options
10. **Update `route.meta.name`** to `route.name`
11. **Update `pages:extend`** meta overrides to `pages:resolved`
12. **Test thoroughly** — especially data fetching, middleware, and SSR

---

## 14. Recommended Module Ecosystem

| Module | Purpose |
|---|---|
| `@nuxt/ui` | UI component library (v4 for Nuxt 4) |
| `@nuxtjs/supabase` | Supabase integration |
| `nuxt-auth-utils` | Session/auth management |
| `@nuxt/content` | Content management (v3 for Nuxt 4) |
| `@nuxtjs/tailwindcss` | Tailwind CSS integration |
| `@nuxt/image` | Image optimization |
| `@nuxt/eslint` | ESLint configuration |
| `@pinia/nuxt` | State management |

**Always check module compatibility with Nuxt 4** before installing. Many popular modules have released Nuxt 4-compatible versions.

---

## 15. Official Documentation Links

- **Nuxt 4 Docs**: https://nuxt.com/docs/4.x
- **Upgrade Guide**: https://nuxt.com/docs/4.x/getting-started/upgrade
- **Data Fetching**: https://nuxt.com/docs/4.x/getting-started/data-fetching
- **Server Directory**: https://nuxt.com/docs/4.x/directory-structure/server
- **Middleware**: https://nuxt.com/docs/4.x/directory-structure/app/middleware
- **Deployment**: https://nuxt.com/docs/4.x/getting-started/deployment
- **API Reference**: https://nuxt.com/docs/4.x/api
- **Nuxt 4 Announcement**: https://nuxt.com/blog/v4
- **Roadmap**: https://nuxt.com/blog/roadmap-v4

---

## Agent Instructions

When writing Nuxt code:

1. **Always use the `app/` directory structure** for new projects.
2. **Never use `$fetch` in component `<script setup>`** — use `useFetch` or `useAsyncData`.
3. **Remember `shallowRef` is the default** — don't assume deep reactivity on fetched data.
4. **Use `createError()` for server route errors**, never return error objects.
5. **Forward cookies with `useRequestHeaders(['cookie'])`** when calling protected APIs during SSR.
6. **Prefer server utils over global server middleware** for route-specific auth/validation.
7. **Use `#imports`** instead of importing from `@unhead/vue` or other Nuxt-provided packages directly.
8. **Check the Nuxt 4 docs** at https://nuxt.com/docs/4.x for anything not covered here.
9. **Nuxt auto-imports** are available — don't manually import `defineEventHandler`, `useFetch`, `useHead`, etc. unless needed for type clarity.
10. **Use `shared/` directory** for code that needs to run in both app and server contexts.