# InternVerse — internship platform

Full-stack implementation of the InternVerse V14 master specification (source bundle 2026-11-24): public discovery of the 1,221-title LNMU/Mithila catalogue, student portal, mentor portal, admin/owner command centre, employer portal, certificate studio with QR verification, payments, LMS with server-side watch tracking, live-class attendance, exams, logbooks, support/grievance and audit.

**Stack:** Next.js 14 (App Router, server actions) · TypeScript · Tailwind · Prisma (SQLite for dev/demo, PostgreSQL for production) · bcrypt · zod · qrcode · vitest.

## Quick start

```bash
cp .env.example .env        # dev values only
npm install
npm run setup               # prisma db push + seed (1,221 programmes, 11 launch-ready, demo data)
npm run dev                 # http://localhost:3000
```

Demo accounts (synthetic data, password `Demo@12345`) are listed on `/login` unless `DEMO_MODE=false`:
`owner@`, `admin@`, `academic@`, `finance@`, `certs@`, `college@`, `support@`, `auditor@`, `mentor@`, `mentor2@`, `employer@`, `student@`, `student2@` — all `@internverse.local`.

## Checks

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

`npm test` runs unit tests (RBAC, watch-progress anti-seek/replay, attendance gaps/overlap, exam answer-stripping/determinism/grading, webhook signatures, credential IDs, CSV injection) and integration tests on a throwaway SQLite DB (payment amount tampering + idempotent webhook/callback replay, credential issue/supersede/revoke/idempotency, eligibility scoping, outbox dedupe/concurrent processing).

## Areas

| Area | Routes |
|---|---|
| Public | `/`, `/programmes`, `/programmes/[code]`, `/how-it-works`, `/lnmu`, `/colleges`, `/organisations`, `/mentors`, `/jobs`, `/verify`, `/verify/[token]`, `/about`, `/faq`, `/accessibility`, `/contact`, `/legal/{privacy,terms,refund,certificate-policy,grievance}` |
| Student | `/dashboard` + applications, payments/checkout, learning (YouTube lessons, sequential unlock at 90% unique coverage), live (heartbeat attendance + Q&A), attendance & correction requests, logbook (+print), assignments, exams (timed, autosave), certificates (QR), jobs, support, notifications, profile/consents/privacy rights |
| Mentor | `/mentor` — assigned cohorts only: students, logbook approvals, grading, live/offline sessions, audited attendance marking, Q&A |
| Admin | `/admin` — command centre, Student 360, applications, exceptions (maker-checker), results/marks, programmes & cohorts, payments/reconciliation/refunds, certificate studio (32 docs × 10 themes, issue/reissue/revoke), support inbox, users & roles, jobs/employer verification, announcements, outbox, reports/CSV exports, audit log, AI approvals, backup checkpoints, settings/signatories, launch checklist |
| Employer | `/employer` — post jobs (review until verified), manage applicants |

Menus are role-filtered, but every page and server action re-checks permissions on the server (`src/lib/rbac.ts`, `requirePermission`).

## Integrations

- **Payments:** with no `RAZORPAY_*` env vars, a SANDBOX adapter runs and still goes through the signed-webhook confirmation path. Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` and point the Razorpay webhook to `/api/payments/webhook`. Enrolment activates only on verified, amount-matched confirmation.
- **Email/SMS/WhatsApp:** queued in the outbox; without `EMAIL_PROVIDER` the log transport only prints metadata (no real delivery). Schedule `/api/cron/outbox` with `Authorization: Bearer $CRON_SECRET`.

## Truthfulness rules

The platform never claims university affiliation, UGC/AICTE approval, MoUs, registrations or signatory authority on its own. Legal identity, GSTIN, signatories and issuer verification are owner settings that stay blank or unverified until set with evidence; `/admin/launch` lists what is still outstanding. Catalogue titles are marked as suggestions until published.

See `docs/OPERATIONS.md` for production deployment and `docs/PROGRESS.md` for the implementation log.
