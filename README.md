# Gettin’ Paid

Monorepo for a game inventory app: track editions and owned copies, pull **PriceCharting** market snapshots, and record purchases and sales.

**Stack:** pnpm workspace · NestJS API + Prisma + PostgreSQL · TanStack Start (React) frontend + Panda CSS.

---

## Prerequisites

- **[Node.js](https://nodejs.org/)** (LTS recommended)
- **[pnpm](https://pnpm.io/)** — install globally (`npm install -g pnpm`) or enable via Corepack
- **[PostgreSQL](https://www.postgresql.org/download/)** — required locally so Prisma can connect and run migrations. Install the server, start it, and create a database (example below).

---

## Local setup

### 1. Install PostgreSQL and create a database

Install PostgreSQL for your OS, ensure the service is running, then create a database for this project (name can match your `DATABASE_URL`):

```sql
CREATE DATABASE gettin_paid;
```

The default connection string in `.env.example` assumes:

- host `localhost`, port `5432`
- user `postgres`, password `postgres`
- database `gettin_paid`

Adjust `DATABASE_URL` if your install differs.

### 2. Install dependencies

From the repository root:

```bash
pnpm install
```

This runs `prisma generate` for the backend (`postinstall`). If that fails on Windows (file locks), run:

```bash
pnpm --filter @gettin-paid/backend exec prisma generate
```

### 3. Environment files

Copy the templates and edit values:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

You can also copy the root [`.env.example`](./.env.example) for a single reference file — **Nest/Prisma load `backend/.env`**, not the repo root, unless you export variables yourself.

### 4. Apply database migrations

```bash
pnpm db:migrate
```

For a fresh dev database you can use Prisma migrate dev from the backend package instead:

```bash
pnpm --filter @gettin-paid/backend exec prisma migrate dev
```

### 5. Run the app

Starts the API (default **port 4000**) and the frontend (default **port 3000**) together:

```bash
pnpm dev
```

- **Frontend:** http://localhost:3000  
- **API:** http://localhost:4000 · routes are under **`/api`** (e.g. `GET http://localhost:4000/api/editions`)

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| **`DATABASE_URL`** | Yes | PostgreSQL connection string for Prisma (`postgresql://USER:PASSWORD@HOST:PORT/DATABASE`). |
| **`PORT`** | No | API listen port; default `4000`. |
| **`FRONTEND_URL`** | No | Browser origin for CORS (e.g. `http://localhost:3000`). Use comma-separated values if you need more than one. |
| **`PRICECHARTING_API_TOKEN`** | No | Enables PriceCharting API calls (product lookup, market refresh). If unset, those features fail or skip where documented. |
| **`PRICECHARTING_MIN_INTERVAL_MS`** | No | Minimum delay between outbound PriceCharting requests (ms). Backend enforces at least **4000**; default `4000`. |

### Frontend (`frontend/.env` or `frontend/.env.local`)

Only variables prefixed with **`VITE_`** are available in the browser.

| Variable | Required | Description |
|----------|----------|-------------|
| **`VITE_API_URL`** | Yes (for API calls) | Base URL of the Nest API **without** a path suffix. The client calls `${VITE_API_URL}/api/...`. Default in template: `http://localhost:4000`. |

See **[`.env.example`](./.env.example)** at the repo root for notes including optional deployment (e.g. Railway).

---

## Useful scripts (root)

| Script | Purpose |
|--------|---------|
| `pnpm dev` | Frontend + backend in parallel |
| `pnpm dev:frontend` / `pnpm dev:api` | One package only |
| `pnpm build` | Shared package → backend → frontend |
| `pnpm db:migrate` | `prisma migrate deploy` (backend) |
| `pnpm db:generate` | Regenerate Prisma Client |
| `pnpm lint` / `pnpm format` / `pnpm check` | Biome across the repo |

Backend-only scripts (e.g. one-off CSV → SQL import) are in **`backend/package.json`**.

---

## Production build

```bash
pnpm build
```

Run outputs depend on each package (Nest `dist/`, TanStack Start `.output/`, etc.).

---

## Linting & formatting

This repo uses [Biome](https://biomejs.dev/):

```bash
pnpm lint
pnpm format
pnpm check
```

---

## Learn more

- [TanStack Router](https://tanstack.com/router) · [TanStack Start](https://tanstack.com/start)
- [NestJS](https://nestjs.com/) · [Prisma](https://www.prisma.io/)
