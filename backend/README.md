# Mini ERP + CRM Operations Portal — Backend

Backend API for a wholesale/distribution company's internal ops portal: customer CRM,
product/inventory management, and a sales challan flow with stock-deduction business rules.

## Tech Stack

- Node.js + TypeScript
- Express.js
- PostgreSQL via Prisma ORM
- JWT authentication, bcrypt password hashing
- Zod for request validation

## Project Structure

```
src/
  controllers/   business logic per module
  routes/        route wiring + role-based access rules
  middleware/     auth, validation, centralized error handling
  lib/prisma.ts   Prisma client singleton
  utils/          JWT helpers, ApiError, asyncHandler
  seed.ts         creates one test user per role + sample products
prisma/schema.prisma   full data model
```

## Setup — Local

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Get a free Postgres database** — easiest options:
   - [Neon](https://neon.tech) (recommended, generous free tier)
   - [Supabase](https://supabase.com)
   - Or run Postgres locally via Docker:
     ```bash
     docker run --name erp-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=erp_crm -p 5432:5432 -d postgres:16
     ```

3. **Environment variables** — copy `.env.example` to `.env` and fill in:
   ```bash
   cp .env.example .env
   ```
   - `DATABASE_URL` — your Postgres connection string
   - `JWT_SECRET` — any long random string
   - `PORT` — defaults to 4000
   - `CORS_ORIGIN` — your frontend's URL (e.g. `http://localhost:5173`)

4. **Generate Prisma client and run migrations**
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```

5. **Seed test users (one per role) and sample products**
   ```bash
   npm run seed
   ```
   Test credentials (all use password `password123`):
   | Role      | Email                  |
   |-----------|------------------------|
   | Admin     | admin@erp.test         |
   | Sales     | sales@erp.test         |
   | Warehouse | warehouse@erp.test     |
   | Accounts  | accounts@erp.test      |

6. **Run the dev server**
   ```bash
   npm run dev
   ```
   API available at `http://localhost:4000/api`. Health check: `GET /health`.

## How Environment Variables Are Managed

`.env` is git-ignored; `.env.example` documents every required variable with no real
secrets. In production (Render/Railway), the same variables are set via the platform's
environment variable dashboard rather than committed to the repo.

## Deployment

- **Database**: Neon / Supabase / Render Postgres (free tier)
- **Backend**: Render or Railway
  1. Push this repo to GitHub
  2. Create a new Web Service pointing at the repo
  3. Build command: `npm install && npm run build && npx prisma generate`
  4. Start command: `npm start`
  5. Set the same environment variables from `.env` in the platform's dashboard
  6. Run `npx prisma migrate deploy` once (via the platform's shell, or a release command)
- **Frontend**: Vercel or Netlify, pointing its API base URL at the deployed backend

AWS deployment was treated as the optional bonus per the assignment and was not pursued
given the free-hosting-preferred, no-spend guidance.

## API Overview

All endpoints are prefixed with `/api`. All routes except `/auth/login` require
`Authorization: Bearer <token>`.

| Method | Route | Roles | Notes |
|---|---|---|---|
| POST | `/auth/login` | public | Returns JWT + user |
| GET | `/auth/me` | any authenticated | Current user |
| GET | `/customers` | any authenticated | `?search=&status=&page=&pageSize=` |
| POST | `/customers` | Admin, Sales | |
| GET | `/customers/:id` | any authenticated | Includes follow-ups, challans |
| PUT | `/customers/:id` | Admin, Sales | Partial update |
| POST | `/customers/:id/follow-ups` | Admin, Sales | |
| GET | `/products` | any authenticated | `?search=&category=&lowStock=true&page=&pageSize=` |
| POST | `/products` | Admin, Warehouse | |
| GET | `/products/:id` | any authenticated | Includes recent stock movements |
| PUT | `/products/:id` | Admin, Warehouse | `currentStock` not editable here by design |
| POST | `/products/:id/stock-movements` | Admin, Warehouse | The only way `currentStock` changes; blocks negative stock |
| GET | `/challans` | any authenticated | `?status=&page=&pageSize=` |
| POST | `/challans` | Admin, Sales | Always created as DRAFT; snapshots product name/SKU/price |
| GET | `/challans/:id` | any authenticated | |
| POST | `/challans/:id/confirm` | Admin, Sales | Deducts stock atomically; fails whole request (no partial deduction) if any line item is short |
| POST | `/challans/:id/cancel` | Admin, Sales | Only for DRAFT challans |

## Key Business Logic

- **Stock never goes negative.** Both the direct stock-movement endpoint and challan
  confirmation check `currentStock - quantity >= 0` inside a database transaction before
  writing, and return `400` with a clear message if insufficient.
- **Challans snapshot product data** (name, SKU, unit price) at creation time onto
  `ChallanItem`, not just a `productId` foreign key — so a later product rename or price
  change doesn't rewrite history on an already-issued challan.
- **Confirmation is atomic across all line items** — if any single product on a challan
  has insufficient stock, the entire confirm request fails and nothing is deducted,
  rather than partially applying some line items.
- **Auto-generated challan numbers** follow `CH-<year>-<sequence>` per calendar year.

## Assumptions Made

- "Sales" role can both create customers and manage challans (spec didn't separate these).
- Warehouse role owns product/stock CRUD; Accounts role currently has read access to all
  modules but no write access to any — the spec didn't define Accounts-specific write
  actions, so this was left conservative.
- Follow-up notes are append-only (a running log), not editable/deletable, matching a
  typical CRM audit trail.

## Known Limitations / Incomplete Parts

- **Frontend not included in this package** — backend was prioritized given the time
  constraint; a React admin UI consuming these APIs is the next step.
- No automated test suite (unit/integration tests) was written given the deadline.
- No AWS deployment (explicitly optional per the assignment).
- No PDF export, S3 image upload, Docker, or CI/CD pipeline (bonus items, not attempted
  given time constraints).
- Invoice module was not implemented — the assignment's core-required scope focused on
  auth, CRM, inventory, and sales challans; invoicing was treated as out of scope for
  this timeframe.
