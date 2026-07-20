# CI/CD Learning Project

A production-shaped stack — React frontend, Express API, Postgres — built to
learn CI/CD and AWS deployment. Phases 0 and 1 (the application) are complete;
phases 2–6 build the pipeline around it.

```
frontend/   React 19 + Vite 8, served as static files by nginx
backend/    Express 5 + Prisma 7 + Postgres
```

## Running locally

Everything runs in Docker:

```bash
docker compose up --build
```

| Service  | URL                     |
| -------- | ----------------------- |
| Frontend | http://localhost:8080   |
| API      | http://localhost:3000   |
| Postgres | localhost:5432          |

The `migrate` service runs migrations to completion before the API starts —
the same ordering used in production.

### Running without Docker

```bash
# 1. Database only
docker compose up -d postgres

# 2. API
cd backend
cp .env.example .env
npm install
npm run prisma:generate
npm run migrate:deploy
npm run seed          # optional
npm run dev           # http://localhost:3000

# 3. Frontend, in another terminal
cd frontend
cp .env.example .env
npm install
npm run dev           # http://localhost:5173
```

## Environment variables

Frontend and backend variables behave **fundamentally differently**, and this
is the single easiest thing to get catastrophically wrong.

**Backend — read at runtime.** One image runs in every environment. Locally
they come from `backend/.env`; in production AWS injects them from SSM
Parameter Store. No `.env` file is ever shipped to a server.

**Frontend — baked in at build time, and public.** Vite substitutes
`VITE_API_URL` into the JavaScript bundle during `npm run build`. You can see
it for yourself:

```bash
cd frontend && npm run build
grep -o "http://localhost:3000" dist/assets/*.js
```

That string is in the file every visitor downloads. So:

- Only public values belong in `frontend/.env` — API URLs, feature flags.
- **Never** a database URL, JWT secret, or private API key.
- Each environment needs its own build, since the value is compiled in.

`.env.example` files are committed and document every required variable. The
real `.env` files are gitignored.

## Health endpoints

Two endpoints that look similar and must not be confused:

| Endpoint  | Meaning                    | Checks the DB? |
| --------- | -------------------------- | -------------- |
| `/health` | Is the process alive?      | No             |
| `/ready`  | Can it actually serve?     | Yes            |

`/health` deliberately checks nothing. If it failed during a database blip, the
orchestrator would restart a healthy container and deepen the outage.

`/ready` is what the deploy polls before switching traffic to a new version. If
it lies, broken deploys ship with confidence.

## Migrations

```bash
cd backend
npm run migrate:dev -- --name add_something   # create (development)
npm run migrate:deploy                        # apply (production)
```

**Migrations must be backward compatible.** During a rolling deploy the old and
new versions run simultaneously, so the old code has to keep working against
the new schema. Use expand/contract, split across two deploys:

| Change            | Deploy 1 (expand)                        | Deploy 2 (contract)       |
| ----------------- | ---------------------------------------- | ------------------------- |
| Rename a column   | Add new column, write to both, backfill   | Drop the old column       |
| Drop a column     | Stop reading it in code                   | Drop it                   |
| Add NOT NULL      | Add nullable with a default, backfill     | Add the constraint        |

Ship deploy 2 only once deploy 1 is stable in production. This is what makes a
code rollback always safe — **you roll code backward, never schema.**

## Roadmap

- [x] **Phase 0** — Repo structure, local Docker Compose stack
- [x] **Phase 1** — Express + Prisma + React, health/ready, graceful shutdown
- [ ] **Phase 2** — CI: PR checks, lint, tests against real Postgres, SHA-tagged images
- [ ] **Phase 3** — AWS: ECR, RDS, SSM Parameter Store, GitHub OIDC, Terraform
- [ ] **Phase 4** — CD: blue/green deploy, migration step, rollback workflow
- [ ] **Phase 5** — Frontend on S3 + CloudFront
- [ ] **Phase 6** — CloudWatch logs, metrics, alarms

## Notes on versions

This uses Prisma 7, which differs from most tutorials in two ways:

1. The generated client is **TypeScript**. Node 22.18+/24 strips types at load
   time, so plain JS imports `./generated/prisma/client.ts` directly — the file
   extension is required and `package.json` must be `"type": "module"`.
2. The Rust query engine is gone, replaced by a **JS driver adapter**
   (`@prisma/adapter-pg`). Good news for Docker: no engine binaries and no
   musl/OpenSSL mismatches on Alpine.
