# Applirank

**The Sovereign Recruitment Engine** — an open-source Applicant Tracking System (ATS) that gives you full ownership of your hiring data.

Applirank is the **Glass Box** alternative to Black Box incumbents. No per-seat pricing. No data lock-in. No secret algorithms.

- **Own your data** — Postgres + MinIO on your infrastructure. Your talent pool is a permanent asset.
- **Auditable AI** — Every AI ranking comes with a visible Matching Logic summary. No opaque algorithms.
- **No seat tax** — Scale your hiring team without scaling your software bill.
- **Privacy-first** — Support for local AI (Ollama) and local storage. Candidate PII never has to leave your network.

> **Status**: Early development — foundation and database schema are complete, building the first UI screens. See the [Roadmap](ROADMAP.md) for details.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Nuxt 4](https://nuxt.com) (Vue 3 + Nitro) |
| Database | PostgreSQL 16 |
| ORM | [Drizzle ORM](https://orm.drizzle.team) + postgres.js |
| Auth | [Better Auth](https://www.better-auth.com) (sessions, orgs, OAuth) |
| Object Storage | [MinIO](https://min.io) (S3-compatible) |
| Validation | [Zod v4](https://zod.dev) |
| Infrastructure | Docker Compose |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) 20+
- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- npm (ships with Node.js)

### 1. Clone the repository

```bash
git clone https://github.com/your-org/applirank.git
cd applirank
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Configure the following in `.env`:

```env
# Database
DB_USER=applirank
DB_PASSWORD=your-secure-password
DB_NAME=applirank
DATABASE_URL=postgresql://applirank:your-secure-password@localhost:5432/applirank

# Auth
BETTER_AUTH_SECRET=your-secret-at-least-32-characters-long
BETTER_AUTH_URL=http://localhost:3000

# Object Storage (MinIO)
STORAGE_USER=minioadmin
STORAGE_PASSWORD=minioadmin
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=applirank
```

### 3. Start infrastructure

```bash
docker compose up -d
```

This starts:

| Service | URL | Purpose |
|---------|-----|---------|
| PostgreSQL | `localhost:5432` | Database |
| MinIO Console | [localhost:9001](http://localhost:9001) | Object storage admin |
| MinIO S3 API | `localhost:9000` | S3-compatible API |
| Adminer | [localhost:8080](http://localhost:8080) | Database GUI |

### 4. Install dependencies and start the dev server

```bash
npm install
npm run dev
```

The app is now running at [http://localhost:3000](http://localhost:3000).

Database migrations are applied automatically on startup.

## Project Structure

```
app/                  # Frontend (pages, components, composables)
server/
  api/                # API routes
  database/
    schema/           # Drizzle ORM table definitions
    migrations/       # Generated SQL migrations
  utils/              # Auto-imported server utilities (db, auth, env)
  plugins/            # Server lifecycle plugins
docker-compose.yml    # Local infrastructure
```

For full architecture details, see [ARCHITECTURE.md](ARCHITECTURE.md).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run db:generate` | Generate migrations from schema changes |
| `npm run db:migrate` | Run pending migrations |
| `npm run db:studio` | Open Drizzle Studio (database browser) |

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the full implementation plan and current progress.

See [PRODUCT.md](PRODUCT.md) for the product vision and feature goals.

## Contributing

Applirank is in early development and contributions are welcome. Check the [Roadmap](ROADMAP.md) for unchecked tasks in the current focus milestone — those are the best places to start.

## License

[MIT](LICENSE)
