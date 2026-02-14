---
title: [Short descriptive title of the feature]
date_created: [YYYY-MM-DD]
last_updated: [YYYY-MM-DD]
github_issue: [#issue-number or N/A]
---

# Implementation Plan: [Feature Name]

[Brief description of the requirements, goals, and the problem this feature solves.]

## Context & Motivation

- **Why**: [Why is this feature needed? What user problem does it solve?]
- **Who**: [Which user persona benefits? Recruiter, Hiring Manager, Admin, etc.]
- **Where**: [Which part of the system is affected? Frontend, API, database, storage?]

## Architecture & Design

### Data Model Changes

[Describe any new tables, columns, enums, or schema modifications. Reference existing tables from `server/database/schema/`.]

```ts
// Example: new table or column additions
```

### API Endpoints

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/...` | ... | Yes |
| POST | `/api/...` | ... | Yes |

### Frontend Components & Pages

[Describe new pages, components, composables, or modifications to existing ones.]

### Security Considerations

- [ ] All queries scoped by `organizationId` from session
- [ ] Input validation with Zod v4 schemas
- [ ] Auth guard on all new endpoints
- [ ] No org ID from user input (body, query, URL params)

## Tasks

Break down the implementation into ordered, manageable tasks:

- [ ] **Task 1**: [Description]
  - Acceptance: [What makes this task "done"?]
  - Files: [Which files are created or modified?]

- [ ] **Task 2**: [Description]
  - Acceptance: [What makes this task "done"?]
  - Files: [Which files are created or modified?]

- [ ] **Task 3**: [Description]
  - Acceptance: [What makes this task "done"?]
  - Files: [Which files are created or modified?]

## Testing Strategy

- [ ] API endpoints return correct responses for valid input
- [ ] API endpoints return proper errors for invalid input (400, 401, 403, 404)
- [ ] Tenant isolation verified — org A cannot access org B data
- [ ] UI renders correctly in loading, empty, error, and success states
- [ ] SSR works (cookie forwarding, no hydration mismatches)

## Open Questions

1. [Question or uncertainty that needs clarification before or during implementation]
2. [Another open question]
3. [Another open question]

## Out of Scope

[Explicitly list things that are NOT part of this implementation to avoid scope creep.]
