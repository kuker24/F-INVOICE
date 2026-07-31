# Post-MVP roadmap (prepared)

MVP live. Items below are **scaffolded or documented** so next phase is wiring, not redesign.

## Done in this prep pass

| Area | Status |
|------|--------|
| Public pay honeypot | Form + API silent drop |
| Rate limit Upstash path | `src/lib/rate-limit` — memory default, Redis if env |
| WhatsApp share | `wa.me` link staff + public (no Business API) |
| Payment gateway adapter | Midtrans Snap + Xendit invoice + webhook route |
| Dark mode tokens | CSS vars + header toggle + FOUC script |
| Playwright E2E | `e2e/auth-and-public.spec.ts` |
| DESIGN.md root | Copied from DesignModel |

## Payment gateway (enable when keys ready)

1. Set env (see `.env.example`):
   - `PAYMENT_GATEWAY=midtrans` + `MIDTRANS_SERVER_KEY` (+ optional `MIDTRANS_IS_PRODUCTION`)
   - or `PAYMENT_GATEWAY=xendit` + `XENDIT_SECRET_KEY` + `XENDIT_CALLBACK_TOKEN`
2. Point provider webhook → `POST /api/webhooks/payment-gateway`
3. Finish auto-PAID: map `externalId` → invoice, call existing `verifyPayment` path
4. UI: “Bayar online” button on public invoice when `gatewayEnabled()`

## Multi-business (schema path — not migrated yet)

Today: single `owner_id` = DEVELOPER on all business rows. RLS `current_owner_id()`.

**Next schema (when needed):**

```text
organizations (id, name, slug, created_at)
organization_members (org_id, profile_id, role: OWNER|ADMIN|MEMBER)
-- migrate: owner_id → organization_id on customers/invoices/...
-- RLS: member of org instead of current_owner_id()
```

No dual-write until product needs second legal entity. Invite flow already uses `owner_id` root.

## WhatsApp Business API (later)

Current: client `wa.me` deep link only.  
Later: Meta Cloud API for templates/reminders — needs WABA token, not in env yet.

## Rate limit multi-instance

Optional:

```bash
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

Without keys, in-memory limit still applies (single instance / best-effort).

## Out of scope until requested

- Public signup
- Multi-currency / tax engine
- Mobile apps
- Accounting sync
