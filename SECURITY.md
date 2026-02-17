# Security Policy

## Supported Versions

Applirank is under active development on the `main` branch.

- `main`: Supported
- Tagged releases: Security support windows are defined per release once stable releases begin.

## Reporting a Vulnerability

Please do **not** report security vulnerabilities through public GitHub issues.

Report privately by email: security@applirank.com

Include as much detail as possible:

- Affected area (API route, auth flow, storage, etc.)
- Reproduction steps or proof of concept
- Impact assessment (data exposure, privilege escalation, tenant isolation risk, etc.)
- Suggested mitigation (optional)

## Response Expectations

- Initial acknowledgment: within 3 business days
- Triage and severity assessment: as quickly as possible
- Fix timeline: depends on severity and exploitability
- Coordinated disclosure: after a fix is available and affected users are notified when needed

## Scope Priorities

Given Applirank's architecture, the highest-priority findings include:

- Multi-tenant data isolation bypass (`organizationId` scope issues)
- Authentication or authorization bypass
- Sensitive document access bypass
- Secret leakage or insecure default configuration
- Injection vulnerabilities in API or DB access paths

## Safe Harbor

If you act in good faith, avoid privacy violations and service disruption, and give us reasonable time to resolve findings before disclosure, we will treat your research as authorized and welcomed.
