# Team Collaboration, Organizations & Auth

> How authentication, organizations, role-based access control, comments, and activity logging work in Reqcore — end to end.

---

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [Authentication](#2-authentication)
3. [Organizations](#3-organizations)
4. [Access Control (RBAC)](#4-access-control-rbac)
   - [Statements](#41-statements)
   - [Roles](#42-roles)
   - [Permission Matrix](#43-permission-matrix)
5. [Server-Side Enforcement](#5-server-side-enforcement)
   - [requirePermission](#51-requirepermission)
   - [How Every API Route Is Protected](#52-how-every-api-route-is-protected)
6. [Client-Side Permission Gating](#6-client-side-permission-gating)
7. [Invitations](#7-invitations)
8. [Comments](#8-comments)
9. [Activity Log](#9-activity-log)
10. [Database Schema](#10-database-schema)
11. [File Map](#11-file-map)
12. [Security Principles](#12-security-principles)
13. [How to Add a New Resource](#13-how-to-add-a-new-resource)
14. [External Documentation](#14-external-documentation)

---

## 1. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  CLIENT (Nuxt 4 — app/ directory)                                │
│                                                                  │
│  auth-client.ts ──► organizationClient({ ac, roles })            │
│  usePermission() ──► checkRolePermission() (cosmetic UI gating)  │
│  useCurrentOrg() ──► useActiveOrganization() (org switching)     │
└────────────────────────────┬─────────────────────────────────────┘
                             │ HTTP requests
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│  SERVER (Nitro — server/ directory)                              │
│                                                                  │
│  Every API route:                                                │
│    requirePermission(event, { resource: ['action'] })            │
│      1. Authenticate (401)                                       │
│      2. Verify active org (403)                                  │
│      3. hasPermission against AC (403)                           │
│                                                                  │
│  shared/permissions.ts ◄── single source of truth for all roles  │
│  auth.ts ──► betterAuth + organization({ ac, roles })            │
│  recordActivity() ──► fire-and-forget audit logging              │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│  DATABASE (PostgreSQL via Drizzle ORM)                           │
│                                                                  │
│  Better Auth tables: user, session, account, verification,       │
│    organization, member, invitation                              │
│  ATS tables: job, candidate, application, document,              │
│    job_question, question_response                               │
│  Collaboration tables: comment, activity_log                     │
└──────────────────────────────────────────────────────────────────┘
```

The entire system is built on [Better Auth](https://www.better-auth.com/) with its [Organization plugin](https://www.better-auth.com/docs/plugins/organization). We use Better Auth's built-in RBAC rather than rolling our own. Custom auth logic is minimal — one utility function (`requirePermission`) and one shared permissions file.

---

## 2. Authentication

Better Auth handles user authentication out of the box. Reqcore uses **email and password** authentication.

### How it works

1. A user signs up or logs in through Better Auth's built-in endpoints (`/api/auth/sign-up/email`, `/api/auth/sign-in/email`).
2. Better Auth creates a **session** and stores it in the `session` database table.
3. On every subsequent request, the session cookie is sent automatically by the browser.
4. On the server, `auth.api.getSession({ headers })` reads the cookie and returns the session + user data.

### Lazy initialization

The Better Auth instance is created lazily (on first access) using a JavaScript Proxy. This prevents build-time prerendering from crashing when environment variables like `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` aren't available yet. See `server/utils/auth.ts` for the full implementation.

### Relevant files

| File | Purpose |
|------|---------|
| `server/utils/auth.ts` | Server-side Better Auth configuration |
| `app/utils/auth-client.ts` | Client-side Better Auth configuration |
| `server/database/schema/auth.ts` | Database tables for auth (user, session, account, etc.) |

### Docs

- [Better Auth — Getting Started](https://www.better-auth.com/docs/introduction)
- [Better Auth — Email & Password](https://www.better-auth.com/docs/authentication/email-password)

---

## 3. Organizations

Every piece of data in Reqcore is scoped to an **organization**. A user can belong to multiple organizations, but they work in one at a time — the **active organization**.

### How it works

1. After signing up, a user creates their first organization (name + slug).
2. Better Auth stores this in the `organization` table and creates a `member` row linking the user to that org with the `owner` role.
3. The user's session is updated with an `activeOrganizationId` field that tracks which org they're currently working in.
4. Every API route reads `session.session.activeOrganizationId` to scope all database queries. This prevents data from one org leaking into another.

### Switching orgs

The client uses `authClient.organization.setActive({ organizationId })` to switch the active organization. This updates the session on the server. The `useCurrentOrg()` composable wraps this and performs a hard navigation to ensure all cached data is flushed.

### Relevant files

| File | Purpose |
|------|---------|
| `app/composables/useCurrentOrg.ts` | Client-side org list, active org, switch/create actions |
| `server/database/schema/auth.ts` | Organization, member, invitation tables |

### Docs

- [Better Auth — Organization Plugin](https://www.better-auth.com/docs/plugins/organization)
- [Better Auth — Active Organization](https://www.better-auth.com/docs/plugins/organization#active-organization)

---

## 4. Access Control (RBAC)

The access control system follows one design principle above all else:

> **Deny by default.** If a permission isn't explicitly granted to a role, it's denied.

### 4.1 Statements

A **statement** is a mapping of a resource name to the actions it supports. Think of it as "what can possibly be done to this thing."

Reqcore defines two sets of statements and merges them:

1. **Better Auth's default statements** — manage organizations, members, and invitations.
2. **ATS-specific statements** — manage jobs, candidates, applications, documents, comments, and the activity log.

```ts
// Better Auth defaults (imported from 'better-auth/plugins/organization/access')
// organization: ['update', 'delete']
// member:       ['create', 'update', 'delete']
// invitation:   ['create', 'cancel']

// ATS-specific (defined in shared/permissions.ts)
const atsStatements = {
  job:         ['create', 'read', 'update', 'delete'],
  candidate:   ['create', 'read', 'update', 'delete'],
  application: ['create', 'read', 'update', 'delete'],
  document:    ['create', 'read', 'delete'],
  comment:     ['create', 'read', 'update', 'delete'],
  activityLog: ['read'],
}
```

These are merged with the spread operator and passed to `createAccessControl()` to create the **access controller** (`ac`).

### 4.2 Roles

Three roles are defined using `ac.newRole()`. Each role gets a subset of the merged statements.

**Owner** — the person who created the organization.
- Has **every** permission, including deleting the organization and transferring ownership.
- Inherits all default owner permissions via `...ownerAc.statements`.
- Gets full CRUD on all ATS resources.

**Admin** — hiring managers.
- Has **almost every** permission, except deleting the org or changing the owner.
- Inherits default admin permissions via `...adminAc.statements`.
- Gets full CRUD on all ATS resources.
- Can invite new members.

**Member** — recruiters.
- Has **limited** permissions designed for day-to-day pipeline work.
- Can **read** jobs (but not create, update, or delete them).
- Can **create, read, and update** candidates and applications (but not delete them).
- Can **create and read** documents and comments (but not update or delete them).
- Can **read** the activity log.

### 4.3 Permission Matrix

| Resource | Action | Owner | Admin | Member |
|----------|--------|:-----:|:-----:|:------:|
| **organization** | update | ✅ | ✅ | ❌ |
| **organization** | delete | ✅ | ❌ | ❌ |
| **member** | create | ✅ | ✅ | ❌ |
| **member** | update | ✅ | ✅ | ❌ |
| **member** | delete | ✅ | ✅ | ❌ |
| **invitation** | create | ✅ | ✅ | ❌ |
| **invitation** | cancel | ✅ | ✅ | ❌ |
| **job** | create | ✅ | ✅ | ❌ |
| **job** | read | ✅ | ✅ | ✅ |
| **job** | update | ✅ | ✅ | ❌ |
| **job** | delete | ✅ | ✅ | ❌ |
| **candidate** | create | ✅ | ✅ | ✅ |
| **candidate** | read | ✅ | ✅ | ✅ |
| **candidate** | update | ✅ | ✅ | ✅ |
| **candidate** | delete | ✅ | ✅ | ❌ |
| **application** | create | ✅ | ✅ | ✅ |
| **application** | read | ✅ | ✅ | ✅ |
| **application** | update | ✅ | ✅ | ✅ |
| **application** | delete | ✅ | ✅ | ❌ |
| **document** | create | ✅ | ✅ | ✅ |
| **document** | read | ✅ | ✅ | ✅ |
| **document** | delete | ✅ | ✅ | ❌ |
| **comment** | create | ✅ | ✅ | ✅ |
| **comment** | read | ✅ | ✅ | ✅ |
| **comment** | update | ✅ | ✅ | ❌ |
| **comment** | delete | ✅ | ✅ | ❌ |
| **activityLog** | read | ✅ | ✅ | ✅ |

### Docs

- [Better Auth — Custom Permissions](https://www.better-auth.com/docs/plugins/organization#custom-permissions)
- [Better Auth — Create Access Control](https://www.better-auth.com/docs/plugins/organization#create-access-control)
- [Better Auth — Create Roles](https://www.better-auth.com/docs/plugins/organization#create-roles)
- [Better Auth — Pass Roles to the Plugin](https://www.better-auth.com/docs/plugins/organization#pass-roles-to-the-plugin)

---

## 5. Server-Side Enforcement

### 5.1 requirePermission

`requirePermission()` is the **single gateway** for every API route. It lives in `server/utils/requirePermission.ts` and performs three checks in sequence:

```
Request arrives
    │
    ▼
Step 1: Authenticate
    │  Read session cookie via auth.api.getSession()
    │  If no session → 401 Unauthorized
    ▼
Step 2: Verify active organization
    │  Check session.activeOrganizationId
    │  If null → 403 "No active organization"
    ▼
Step 3: Check permissions
    │  Call auth.api.hasPermission() with the requested resource/action pairs
    │  Better Auth looks up the user's role in the active org,
    │  then evaluates it against the AC definitions from shared/permissions.ts
    │  If denied → 403 "Forbidden: insufficient permissions"
    ▼
Return session object (with guaranteed activeOrganizationId)
```

**Usage in an API route:**

```ts
export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, { job: ['create'] })
  const orgId = session.session.activeOrganizationId
  // ... safely create the job, scoped to orgId
})
```

The `permissions` parameter is fully typed. TypeScript will catch typos like `{ jobb: ['create'] }` or `{ job: ['creat'] }` at compile time because the type is derived from the `statements` constant in `shared/permissions.ts`.

### 5.2 How Every API Route Is Protected

Every API route in the application calls `requirePermission()` as its first line. Here is the complete route map:

#### Jobs

| Route | Method | Permission |
|-------|--------|------------|
| `/api/jobs` | GET | `{ job: ['read'] }` |
| `/api/jobs` | POST | `{ job: ['create'] }` |
| `/api/jobs/:id` | GET | `{ job: ['read'] }` |
| `/api/jobs/:id` | PATCH | `{ job: ['update'] }` |
| `/api/jobs/:id` | DELETE | `{ job: ['delete'] }` |
| `/api/jobs/:id/questions` | GET | `{ job: ['read'] }` |
| `/api/jobs/:id/questions` | POST | `{ job: ['update'] }` |
| `/api/jobs/:id/questions/:qId` | PATCH | `{ job: ['update'] }` |
| `/api/jobs/:id/questions/:qId` | DELETE | `{ job: ['update'] }` |
| `/api/jobs/:id/questions/reorder` | PUT | `{ job: ['update'] }` |

#### Candidates

| Route | Method | Permission |
|-------|--------|------------|
| `/api/candidates` | GET | `{ candidate: ['read'] }` |
| `/api/candidates` | POST | `{ candidate: ['create'] }` |
| `/api/candidates/:id` | GET | `{ candidate: ['read'] }` |
| `/api/candidates/:id` | PATCH | `{ candidate: ['update'] }` |
| `/api/candidates/:id` | DELETE | `{ candidate: ['delete'] }` |

#### Applications

| Route | Method | Permission |
|-------|--------|------------|
| `/api/applications` | GET | `{ application: ['read'] }` |
| `/api/applications` | POST | `{ application: ['create'] }` |
| `/api/applications/:id` | GET | `{ application: ['read'] }` |
| `/api/applications/:id` | PATCH | `{ application: ['update'] }` |

#### Documents

| Route | Method | Permission |
|-------|--------|------------|
| `/api/candidates/:id/documents` | POST | `{ document: ['create'] }` |
| `/api/documents/:id` | DELETE | `{ document: ['delete'] }` |
| `/api/documents/:id/download` | GET | `{ document: ['read'] }` |
| `/api/documents/:id/preview` | GET | `{ document: ['read'] }` |

#### Comments

| Route | Method | Permission |
|-------|--------|------------|
| `/api/comments` | GET | `{ comment: ['read'] }` |
| `/api/comments` | POST | `{ comment: ['create'] }` |
| `/api/comments/:id` | PATCH | `{ comment: ['update'] }` |
| `/api/comments/:id` | DELETE | `{ comment: ['delete'] }` |

#### Activity Log

| Route | Method | Permission |
|-------|--------|------------|
| `/api/activity-log` | GET | `{ activityLog: ['read'] }` |

#### Dashboard

| Route | Method | Permission |
|-------|--------|------------|
| `/api/dashboard/stats` | GET | `{ job: ['read'], candidate: ['read'], application: ['read'] }` |

> The dashboard stats route requires **multiple** permissions because it aggregates data across jobs, candidates, and applications.

### Docs

- [Better Auth — Access Control Usage (hasPermission)](https://www.better-auth.com/docs/plugins/organization#access-control-usage)

---

## 6. Client-Side Permission Gating

Client-side checks are **cosmetic only**. They control UI visibility (hiding buttons, disabling inputs) but the real enforcement always happens on the server via `requirePermission()`. If someone bypasses the UI, the server still blocks them.

### usePermission composable

The `usePermission()` composable in `app/composables/usePermission.ts` provides a reactive boolean that updates automatically when the user's active organization changes.

**How it works:**

1. It watches the active organization state from `authClient.useActiveOrganization()`.
2. Whenever the active org changes, it fetches the user's current role via `authClient.organization.getActiveMemberRole()`.
3. It evaluates the requested permissions against the role using `authClient.organization.checkRolePermission()` — a **synchronous, client-only** function that runs the same AC logic locally without a server roundtrip.

**Usage:**

```vue
<script setup>
const { allowed: canCreateJob } = usePermission({ job: ['create'] })
const { allowed: canDeleteCandidate } = usePermission({ candidate: ['delete'] })
</script>

<template>
  <UButton v-if="canCreateJob" @click="createJob">New Job</UButton>
  <UButton v-if="canDeleteCandidate" @click="deleteCandidate" color="red">Delete</UButton>
</template>
```

### Why this works

The `ac`, `roles`, and `statements` are defined once in `shared/permissions.ts` and imported into **both** the server (`server/utils/auth.ts`) and the client (`app/utils/auth-client.ts`). This means the client and server always agree on what each role can do.

### Docs

- [Better Auth — checkRolePermission (client-side)](https://www.better-auth.com/docs/plugins/organization#access-control-usage)
- [Better Auth — getActiveMemberRole](https://www.better-auth.com/docs/plugins/organization#get-active-member-role)

---

## 7. Invitations

Invitations are how new team members join an organization. Reqcore uses Better Auth's built-in invitation system rather than building a custom one.

### How the flow works

1. **An admin/owner invites someone.** They call `authClient.organization.inviteMember({ email, role })` from the client. Better Auth creates an `invitation` row in the database.
2. **An email is sent.** Better Auth calls the `sendInvitationEmail` callback defined in `server/utils/auth.ts`. Currently this logs the invitation link to the console (a real email provider like Resend or SES should be wired up for production).
3. **The invitee clicks the link.** The link contains the invitation ID. The invitee must be logged in (or sign up first).
4. **The invitee accepts.** They call `authClient.organization.acceptInvitation({ invitationId })`. Better Auth creates a `member` row linking the user to the organization with the specified role.

### Security hardening

- **`cancelPendingInvitationsOnReInvite: true`** — If someone is re-invited, any stale pending invitations for the same email are automatically cancelled. This prevents invitation ID replay.
- **`invitationExpiresIn: 48 * 60 * 60`** — Invitations expire after 48 hours.

### Docs

- [Better Auth — Invitations](https://www.better-auth.com/docs/plugins/organization#invitations)
- [Better Auth — Setup Invitation Email](https://www.better-auth.com/docs/plugins/organization#setup-invitation-email)
- [Better Auth — Send Invitation](https://www.better-auth.com/docs/plugins/organization#send-invitation)
- [Better Auth — Accept Invitation](https://www.better-auth.com/docs/plugins/organization#accept-invitation)

---

## 8. Comments

Comments allow team members to leave internal notes on candidates, applications, or jobs. They are the core collaboration primitive in Reqcore.

### Data model

Each comment has:

- **organizationId** — scopes it to the org (enforced by `requirePermission`).
- **authorId** — the user who wrote it (set automatically from the session).
- **targetType** — one of `candidate`, `application`, or `job` (polymorphic).
- **targetId** — the UUID of the target entity.
- **body** — the comment text (1–10,000 characters).
- **createdAt / updatedAt** — timestamps.

### API

| Endpoint | Method | What it does | Permission |
|----------|--------|-------------|------------|
| `/api/comments?targetType=candidate&targetId=uuid` | GET | List comments for a target. Paginated. Includes author name/email/avatar. | `comment:read` |
| `/api/comments` | POST | Create a comment. Validates that the target entity exists and belongs to the same org (prevents IDOR). Records activity. | `comment:create` |
| `/api/comments/:id` | PATCH | Update a comment's body. **Only the original author can edit their own comment**, even if they have the permission. | `comment:update` |
| `/api/comments/:id` | DELETE | Delete a comment. Owners/admins can delete any comment; role-level permission controls this. Records activity. | `comment:delete` |

### Who can do what

- **Owner / Admin** — Full CRUD (create, read, update, delete any comment).
- **Member** — Can create and read comments only. Cannot edit or delete.
- **Comment editing is further restricted** — even with `comment:update` permission, the PATCH endpoint checks that `existing.authorId === session.user.id`. You can only edit your own comments.

### Relevant files

| File | Purpose |
|------|---------|
| `server/api/comments/index.get.ts` | List comments |
| `server/api/comments/index.post.ts` | Create comment |
| `server/api/comments/[id].patch.ts` | Update comment (author-only) |
| `server/api/comments/[id].delete.ts` | Delete comment |
| `server/utils/schemas/comment.ts` | Zod validation schemas |
| `server/database/schema/app.ts` | Comment table + relations |

---

## 9. Activity Log

The activity log is an **immutable audit trail** that records every significant action performed in the organization. It answers the question: "Who did what, when, and to which resource?"

### What gets logged

| Action | When it fires |
|--------|--------------|
| `created` | A job, candidate, application, document, or comment is created |
| `updated` | A job, candidate, or application is updated (non-status fields) |
| `deleted` | A job, candidate, document, or comment is deleted |
| `status_changed` | A job or application's status changes (e.g., `draft → published`, `applied → interview`) |
| `comment_added` | A comment is posted on any target |
| `member_invited` | (Future) A team member is invited |
| `member_removed` | (Future) A team member is removed |
| `member_role_changed` | (Future) A team member's role is changed |

### How it works

The `recordActivity()` helper in `server/utils/recordActivity.ts` is called in every mutating API route **after the primary operation succeeds**. It is **fire-and-forget** — it catches all errors silently and logs them to stderr. This means:

- Activity logging never slows down or breaks the user's primary action.
- If the activity log insert fails (e.g., database constraint error), the user's operation still completes successfully.
- Failures appear in monitoring/logs so they can be investigated without disrupting users.

### Data model

Each activity log entry has:

- **organizationId** — scoped to the org.
- **actorId** — the user who performed the action.
- **action** — one of the enum values above.
- **resourceType** — `job`, `candidate`, `application`, `document`, `comment`.
- **resourceId** — UUID of the affected resource.
- **metadata** — a JSONB field for extra context (e.g., `{ from: 'draft', to: 'published' }` for status changes, `{ title: 'Senior Engineer' }` for job creation).
- **createdAt** — immutable timestamp. There is no `updatedAt` because activity log entries should never be modified.

### API

| Endpoint | Method | What it does | Permission |
|----------|--------|-------------|------------|
| `/api/activity-log?page=1&limit=50` | GET | List activity for the org. Paginated. Includes actor name/email/avatar. | `activityLog:read` |
| `/api/activity-log?resourceType=job&resourceId=uuid` | GET | Filter activity for a specific resource. | `activityLog:read` |

All roles (owner, admin, member) can read the activity log. There are no write endpoints — activity is recorded automatically by the system.

### Relevant files

| File | Purpose |
|------|---------|
| `server/api/activity-log/index.get.ts` | List/filter activity |
| `server/utils/recordActivity.ts` | Fire-and-forget logging helper |
| `server/utils/schemas/activityLog.ts` | Zod validation for query params |
| `server/database/schema/app.ts` | ActivityLog table + relations |

---

## 10. Database Schema

### Better Auth tables (managed by Better Auth)

| Table | Purpose |
|-------|---------|
| `user` | User accounts (id, name, email, image, etc.) |
| `session` | Active sessions. Extended with `activeOrganizationId` by the org plugin. |
| `account` | OAuth/credential accounts linked to users |
| `verification` | Email verification tokens |
| `organization` | Organizations (id, name, slug, logo, metadata) |
| `member` | Links users to organizations with a role |
| `invitation` | Pending invitations (email, role, status, expiration) |

### ATS tables (managed by Reqcore)

| Table | Purpose |
|-------|---------|
| `job` | Job postings scoped to an organization |
| `candidate` | Candidate profiles scoped to an organization |
| `application` | Links candidates to jobs with status tracking |
| `document` | Files uploaded for candidates (resumes, cover letters) |
| `job_question` | Custom questions attached to jobs |
| `question_response` | Candidate answers to job questions |

### Collaboration tables (added for team collaboration)

| Table | Purpose |
|-------|---------|
| `comment` | Internal comments on candidates, applications, or jobs |
| `activity_log` | Immutable audit trail of all actions |

### Key relationships

- Every ATS and collaboration table has an `organizationId` foreign key pointing to `organization.id` with `ON DELETE CASCADE`. If an org is deleted, all its data goes with it.
- `comment.authorId` and `activity_log.actorId` reference `user.id` with `ON DELETE CASCADE`.
- Comments use a polymorphic pattern (`targetType` + `targetId`) rather than separate join tables for each target type.

### Migrations

Migrations are managed by Drizzle Kit. The collaboration tables were added in migration `0006_breezy_hairball.sql`.

```bash
# Generate a new migration after schema changes
npx drizzle-kit generate

# Apply pending migrations
npx drizzle-kit migrate
```

### Docs

- [Better Auth — Organization Schema](https://www.better-auth.com/docs/plugins/organization#schema)
- [Drizzle ORM — Migrations](https://orm.drizzle.team/docs/migrations)

---

## 11. File Map

```
shared/
  permissions.ts              ← Single source of truth for ALL permissions
                                Shared between server and client

server/
  utils/
    auth.ts                   ← Better Auth server config (org plugin, AC, roles)
    requirePermission.ts      ← THE enforcement utility — every route uses this
    recordActivity.ts         ← Fire-and-forget audit logging helper
    schemas/
      comment.ts              ← Zod validation for comment API
      activityLog.ts          ← Zod validation for activity log queries
  database/
    schema/
      auth.ts                 ← Better Auth tables (user, session, org, member, etc.)
      app.ts                  ← ATS tables + comment + activityLog tables
    migrations/
      0006_breezy_hairball.sql ← Migration for comment + activity_log tables
  api/
    comments/
      index.get.ts            ← GET  /api/comments
      index.post.ts           ← POST /api/comments
      [id].patch.ts           ← PATCH /api/comments/:id
      [id].delete.ts          ← DELETE /api/comments/:id
    activity-log/
      index.get.ts            ← GET  /api/activity-log
    jobs/                     ← All routes use requirePermission({ job: [...] })
    candidates/               ← All routes use requirePermission({ candidate: [...] })
    applications/             ← All routes use requirePermission({ application: [...] })
    documents/                ← All routes use requirePermission({ document: [...] })
    dashboard/
      stats.get.ts            ← Requires multiple permissions (job+candidate+application read)

app/
  utils/
    auth-client.ts            ← Client-side Better Auth config (ac, roles wired in)
  composables/
    usePermission.ts          ← Reactive Vue composable for UI permission gating
    useCurrentOrg.ts          ← Org list, active org, switch/create org
```

---

## 12. Security Principles

### 1. Deny by default

If a permission isn't explicitly listed in `shared/permissions.ts` for a role, that role cannot perform the action. There is no "allow all" fallback.

### 2. Server-side enforcement is mandatory

Every API route calls `requirePermission()`. Client-side checks with `usePermission()` are purely cosmetic — they hide UI elements but do not provide security.

### 3. One utility, used everywhere

There is exactly one way to check permissions on the server: `requirePermission(event, permissions)`. No scattered `if (role === 'admin')` checks. This makes security audits simple — grep for `requirePermission` and you can see exactly what every route requires.

### 4. Organization scoping

Every database query filters by `organizationId` which comes from the session (not from the request body/params). This prevents users in one organization from accessing data in another.

### 5. Input validation

Every API route validates its input with Zod schemas before processing. Invalid data is rejected with a 422 before it reaches the database.

### 6. Immutable audit trail

The activity log is write-only from the application's perspective. There is no update or delete endpoint for activity log entries.

---

## 13. How to Add a New Resource

When you add a new resource to Reqcore (e.g., `interview`), follow these steps:

### Step 1: Add the statement

In `shared/permissions.ts`, add the new resource to `atsStatements`:

```ts
const atsStatements = {
  // ... existing resources
  interview: ['create', 'read', 'update', 'delete'],
} as const
```

### Step 2: Grant permissions to each role

In the same file, add the new resource to each role's definition:

```ts
export const owner = ac.newRole({
  ...ownerAc.statements,
  // ... existing resources
  interview: ['create', 'read', 'update', 'delete'],
})

export const admin = ac.newRole({
  ...adminAc.statements,
  // ... existing resources
  interview: ['create', 'read', 'update', 'delete'],
})

export const member = ac.newRole({
  ...memberAc.statements,
  // ... existing resources
  interview: ['create', 'read'],  // members can only view
})
```

### Step 3: Protect your API routes

In every API route for the new resource, call `requirePermission`:

```ts
export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, { interview: ['create'] })
  const orgId = session.session.activeOrganizationId
  // ... your route logic
})
```

### Step 4: Add activity logging

In mutating routes, call `recordActivity()` after the primary operation:

```ts
recordActivity({
  organizationId: orgId,
  actorId: session.user.id,
  action: 'created',
  resourceType: 'interview',
  resourceId: created.id,
})
```

### Step 5: Use client-side gating (optional)

In your Vue components, use `usePermission()` to conditionally show UI:

```vue
<script setup>
const { allowed: canSchedule } = usePermission({ interview: ['create'] })
</script>
```

That's it. TypeScript will enforce that the resource and action names match the statements defined in step 1. If you typo `interveiw`, the compiler catches it.

---

## 14. External Documentation

| Topic | Link |
|-------|------|
| Better Auth — Introduction | https://www.better-auth.com/docs/introduction |
| Better Auth — Organization Plugin | https://www.better-auth.com/docs/plugins/organization |
| Better Auth — Access Control | https://www.better-auth.com/docs/plugins/organization#access-control |
| Better Auth — Custom Permissions | https://www.better-auth.com/docs/plugins/organization#custom-permissions |
| Better Auth — createAccessControl | https://www.better-auth.com/docs/plugins/organization#create-access-control |
| Better Auth — Roles | https://www.better-auth.com/docs/plugins/organization#roles |
| Better Auth — hasPermission (server) | https://www.better-auth.com/docs/plugins/organization#access-control-usage |
| Better Auth — checkRolePermission (client) | https://www.better-auth.com/docs/plugins/organization#access-control-usage |
| Better Auth — Active Organization | https://www.better-auth.com/docs/plugins/organization#active-organization |
| Better Auth — Invitations | https://www.better-auth.com/docs/plugins/organization#invitations |
| Better Auth — Members | https://www.better-auth.com/docs/plugins/organization#members |
| Better Auth — Organization Schema | https://www.better-auth.com/docs/plugins/organization#schema |
| Better Auth — Organization Options | https://www.better-auth.com/docs/plugins/organization#options |
| Drizzle ORM — Migrations | https://orm.drizzle.team/docs/migrations |
| Drizzle ORM — PostgreSQL | https://orm.drizzle.team/docs/get-started-postgresql |
