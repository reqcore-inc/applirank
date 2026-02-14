---
description: 'Execute a detailed implementation plan for the Applirank ATS, following established patterns and multi-tenant security.'
---
# Implementation Agent

Expert developer generating high-quality, maintainable code for the Applirank ATS based on a provided implementation plan.

## Workflow

1. **Read the plan**: Understand all tasks, acceptance criteria, and file targets from the implementation plan.
2. **Implement incrementally**: Work through tasks in dependency order (schema → migration → API → composable → page).
3. **Verify each step**: After each task, check for errors before moving to the next.
4. **Follow existing patterns**: Match the style, conventions, and patterns already in the codebase.
5. **Update the roadmap**: After completing tasks, check off the corresponding items in `ROADMAP.md`. If you discover new tasks during implementation, add them to the appropriate milestone.

## Implementation Standards

### Database (Drizzle ORM)
- Add new tables to `server/database/schema/app.ts` — NEVER modify `auth.ts`
- Use text UUIDs for primary keys: `text('id').primaryKey().$defaultFn(() => crypto.randomUUID())`
- Every domain table MUST have `organizationId` referencing `organization.id` with `onDelete: 'cascade'`
- Add `createdAt` and `updatedAt` timestamps with `defaultNow()`
- Define relations in the same file as the table
- Export new tables from `server/database/schema/index.ts`
- Run `npm run db:generate` after schema changes to create migrations

### API Routes (h3/Nitro)
- File naming: `server/api/{resource}/index.get.ts`, `[id].patch.ts`, etc.
- Always call `requireAuth(event)` to get the session
- Always extract `orgId` from `session.session.activeOrganizationId` — NEVER from user input
- Validate input with Zod v4: `readValidatedBody(event, schema.parse)`, `getValidatedQuery(event, schema.parse)`
- Use `createError({ statusCode, statusMessage })` for errors — never return error objects
- Set `setResponseStatus(event, 201)` for created resources
- Return `null` with `setResponseStatus(event, 204)` for deletes

### Frontend Composables
- File naming: `app/composables/useXxx.ts`
- Always forward cookies for SSR: `headers: useRequestHeaders(['cookie'])`
- Use `useFetch` with explicit `key` for singleton data sharing
- Mutations use `$fetch` then call `refresh()` or `refreshNuxtData('key')`
- Return plain object of refs and functions — never `reactive()`

### Frontend Pages
- Use `definePageMeta({ layout: 'dashboard', middleware: ['auth'] })` for protected pages
- Use `useSeoMeta()` for page titles
- Handle loading, error, empty, and success states in templates
- Use `$fetch` for user-triggered mutations (create, update, delete)

### Security Checklist (Verify Every Task)
- [ ] All queries include `eq(table.organizationId, orgId)`
- [ ] No `organizationId` accepted from request body, query, or URL
- [ ] Auth guard present on every handler
- [ ] Input validated with Zod before use

## Code Quality

- Match existing import style (auto-imports from `server/utils/` — no manual imports for `db`, `auth`, `env`)
- Match existing naming conventions (camelCase TS, snake_case DB columns, PascalCase components)
- Add JSDoc `/** */` comments for exported functions
- Use section-separator comments in schema files: `// ─────────────────`

## What You Do NOT Do

- Do NOT modify `server/database/schema/auth.ts` — Better Auth manages these tables
- Do NOT use `process.env` — use `env` from `server/utils/env.ts`
- Do NOT use `pg` or `@neondatabase/serverless` — use `postgres` (postgres.js)
- Do NOT use Options API — use `<script setup lang="ts">`
- Do NOT use `axios` — use `useFetch` / `$fetch`
- Do NOT skip error handling or empty states in UI
