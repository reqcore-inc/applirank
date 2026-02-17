# Contributing to Applirank

Thanks for contributing to Applirank.

## Before You Start

- Read [PRODUCT.md](PRODUCT.md), [ARCHITECTURE.md](ARCHITECTURE.md), and [ROADMAP.md](ROADMAP.md) for product and technical context.
- For bug reports and feature ideas, use GitHub Issues.
- For security reports, do **not** open a public issue. Follow [SECURITY.md](SECURITY.md).

## Development Setup

```bash
git clone https://github.com/applirank/applirank.git
cd applirank
cp .env.example .env
docker compose up -d
npm install
npm run dev
```

## Branch and Commit Workflow

1. Create a topic branch from `main`.
2. Keep commits focused and atomic.
3. Ensure every commit includes a **DCO sign-off**.
4. Open a pull request with a clear summary and testing notes.

### DCO Sign-off (Required)

Applirank uses the Developer Certificate of Origin (DCO) instead of a CLA.

Sign every commit with:

```bash
git commit -s -m "feat: add candidate search"
```

This adds a `Signed-off-by:` line to your commit message. Pull requests fail CI if commits are missing sign-off.

## Pull Request Checklist

- [ ] I scoped changes to one concern.
- [ ] I tested the change locally.
- [ ] I updated docs when behavior or policy changed.
- [ ] I did not introduce tenant-scope or auth regressions.
- [ ] All commits are DCO signed (`git commit -s`).

## Coding and Product Conventions

- Follow Nuxt 4 `app/` + root `server/` structure.
- Use Tailwind CSS v4 utilities and `lucide-vue-next` icons.
- Use `env` from `server/utils/env.ts` (never `process.env` directly in server code).
- For domain data, always scope server queries by `organizationId` from session.

## Documentation

If your changes affect behavior, architecture, or roadmap status, update:

- [CHANGELOG.md](CHANGELOG.md)
- [ROADMAP.md](ROADMAP.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [PRODUCT.md](PRODUCT.md)

## Code of Conduct

By participating, you agree to follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
