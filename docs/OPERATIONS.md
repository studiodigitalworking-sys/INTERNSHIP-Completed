# Operations runbook

## Production deployment
1. Provision managed PostgreSQL with point-in-time recovery. In `prisma/schema.prisma` set `provider = "postgresql"`, run `prisma migrate dev --name init` locally against Postgres, commit migrations, then `prisma migrate deploy` in CI.
2. Set env: `DATABASE_URL`, `APP_URL` (https), `APP_SECRET` (≥32 random bytes), `DEMO_MODE=false`, Razorpay keys + webhook secret, `CRON_SECRET`, provider credentials when an outbox adapter is added.
3. Do not run `prisma/seed.ts` in production (it resets demo data). Create the ROOT_OWNER manually, then other staff from `/admin/users`.
4. `npm ci && npm run build && npm start` behind HTTPS (Vercel, Render, or a VM with a reverse proxy). Set secure cookies by serving over HTTPS (`NODE_ENV=production`).
5. Schedule `POST /api/cron/outbox` every minute with `Authorization: Bearer $CRON_SECRET`.
6. Recommended database hardening: row-level security for student-scoped tables, a DB role without UPDATE/DELETE on `AuditEvent`, private object storage for uploads/evidence.

## Backups & restore drill
- Daily encrypted `pg_dump` to separate storage plus provider PITR. Retain 30 daily / 12 monthly.
- Monthly: restore into staging, compare row counts against the latest checkpoint in `/admin/backup`, record a `RESTORE_DRILL` checkpoint.

## Payments
- Live mode only after `/admin/launch` items for payments are met and ROOT_OWNER switches `payments.mode` to LIVE.
- Stuck orders: verify in the Razorpay dashboard, then use **Reconcile** in `/admin/payments` with the gateway payment ID and a reason (audited). Refunds via **Refund** (partial/full, audited; full refund withdraws the enrolment). Process the actual gateway refund in Razorpay until the refund API adapter is enabled.

## Certificates
- Completion documents (01/05/13) require eligibility (approved hours, host hours, final exam, reviewed assignments) or an approved `CERTIFICATE_MANUAL_ISSUANCE` exception by a different officer.
- Corrections → **Reissue** (new code + token, old version SUPERSEDED). Fraud/error → **Revoke** (public page shows revoked).

## Load testing
Expensive load tests were not run in this environment. Suggested method: k6 against staging with 500 concurrent students sending watch heartbeats every 10 s and live heartbeats every 30 s; targets p95 < 300 ms and zero lost/duplicated outbox messages.

## Known gaps (not implemented yet)
- Real email/SMS/WhatsApp provider adapters (log transport only).
- Razorpay refund API call (refunds are recorded; gateway refund done manually).
- File uploads to private storage (evidence is by link).
- PDF export is via browser print-to-PDF of the certificate view; no server-side PDF renderer. Hindi rendering uses Noto Sans Devanagari web font and has not been visually verified in PDFs.
- Maithili UI strings (architecture supports additional languages in `src/lib/i18n.ts`).
