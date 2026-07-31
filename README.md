# F-INVOICE

Private invoice management (MVP) — invite-only, IDR integer money, DesignModel light mono UI.

- **PRD:** `PRD/prdawal.txt`
- **Design system:** `DesignModel/`
- **Architecture:** `docs/DESIGN-F-INVOICE-MVP.md`
- **Remote:** `git@github.com:kuker24/F-INVOICE.git`

## Stack

Next.js 15 App Router · TypeScript · Tailwind v4 · Supabase (Auth/Postgres/RLS/Storage) · Vercel Cron · `@react-pdf/renderer`

## Features (MVP)

| Area | Routes / APIs |
|------|----------------|
| Auth | `/login`, forgot/reset password, rate limits |
| Master | customers, products, business settings, payment methods |
| Invoices | draft/edit/send/cancel, integer calc, sequences, CSV export |
| Public | `/i/[token]`, VIEWED, payment confirm API, rate limits |
| PDF | `/api/invoices/[id]/pdf` (+ HMAC signed public URL) |
| Payments | staff record, portal/public confirm, verify/reject/cancel |
| Subscriptions | CRUD, manual generate DRAFT, cron + overdue cron |
| Portal | invoices, payments, subscriptions, profile |
| Ops | users invite, activity log, notifications, dashboard |

## Setup

```bash
pnpm install
cp .env.example .env.local
# fill secrets (APP_ENCRYPTION_KEY ≥ 32 chars)
pnpm dev
```

### Env

| Var | Purpose |
|-----|---------|
| `NEXT_PUBLIC_*` | App URL + Supabase anon |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only mutations, public token path |
| `CRON_SECRET` | Authorize cron handlers |
| `PDF_SIGNING_SECRET` | HMAC PDF download links (≤5 min) |
| `APP_ENCRYPTION_KEY` | Reserved MVP (validated, unused) |

### Supabase

Linked project (this workspace): **`ojdlvrtkmvwsjluwjvny`** (ap-southeast-1).

1. Auth → disable public signups (invite-only) in Dashboard.
2. Apply migrations:

```bash
pnpm exec supabase login
pnpm exec supabase link --project-ref ojdlvrtkmvwsjluwjvny
pnpm exec supabase db push
```

Or run SQL files in order under `supabase/migrations/`.

**Note:** RLS helper is `public.app_role()` (not `current_role()` — PG keyword clash).

3. Seed staff + demo master (non-prod):

```bash
pnpm seed
pnpm check:smoke
```

| Email | Role | Home |
|-------|------|------|
| developer@finvoice.local | DEVELOPER | `/dashboard` |
| admin@finvoice.local | ADMIN | `/dashboard` |
| customer@finvoice.local | USER | `/portal` |

Default password: `password123` (`SEED_PASSWORD`).

### Vercel

Production: **https://f-invoice-orpin.vercel.app** (project `anonim2/f-invoice`).

```bash
# set env vars in project settings (all of .env.example)
pnpm exec vercel link
pnpm exec vercel --prod
```

Crons in `vercel.json`:

- `0 18 * * *` → `/api/cron/subscriptions` (01:00 WIB)
- `0 19 * * *` → `/api/cron/overdue` (02:00 WIB)

Header: `Authorization: Bearer $CRON_SECRET`.

## Scripts

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Dev server |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint |
| `pnpm check:money` | Invoice math golden tests |
| `pnpm check:rate-limit` | Rate-limit smoke |
| `pnpm check:smoke` | Auth + schema + buckets (needs `.env.local`) |
| `pnpm check` | money + rate-limit + lint + build |
| `pnpm seed` | Seed dev users + demo customer/product |

## Layering

`UI → Server Action / Route Handler → Service → Supabase (RLS or service role)`

Money: pure `src/lib/money/invoice-math.ts` (bigint IDR, half-up tax bp). Client totals never trusted.

## Rollback notes

- Migrations additive; avoid destructive renames.
- Payment cancel recompute can reopen invoice status from VERIFIED payments.
- Sequence numbers never reuse (row lock `invoice_sequences`).
