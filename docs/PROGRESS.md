# InternVerse build progress (working notes)

Source bundle: ~/attachments/5978a338-42fd-4a04-bce9-c0f19d8d8859/bundle/INTERNVERSE_COMPLETE_MASTER_SOURCE_BUNDLE_2026-11-24/
Key specs: 02_SOURCE_ORIGINALS/InternVerse_V14_Master_Spec.md, INTERNVERSE_MASTER_AI_AGENT_IMPLEMENTATION_PROMPT_V2.txt
Data exported to data/: catalogue-1221.json (code,family,title,sourceStatus,streams,evidence,mode,launchNote), catalogue-936-legacy.json,
lnmu-reference.json (Family Summary, LNMU Degree Mapping, LNMU Internship Rules, Regional Priority Map, Sources & Evidence, Programme Delivery Blueprint),
admin-control-matrix.json, documents-themes.json ({docs:[id,title,kind,desc] x32, themes:[id,name,primary,accent,paper,desc] x10}).

Stack: Next.js 14.2 app router (src/), TS, Tailwind, Prisma 5.22 + SQLite (prisma/schema.prisma, strings for enums), bcryptjs, zod, qrcode, tsx, vitest. Node via nvm (source ~/.nvm/nvm.sh).

## Done
- prisma/schema.prisma (all models), .env (DATABASE_URL file:./dev.db, APP_SECRET)
- src/lib: db, constants, rbac (ROLE_PERMISSIONS, can, canAssignRole), crypto (sha256,hmac,safeEqualHex,credentialCode,credentialToken,seededRandom,shuffle), format (rupees,fmtDate,toCsv,mask*), audit(audit()), outbox(enqueue,notify,processOutbox), settings(getSettings,getSetting,getNumber, DEFAULT_SETTINGS)

- lib: auth, i18n, watch(applyHeartbeat), attendance(creditLiveGap,attendanceStatus,hasOverlap), exam(buildPaper,grade,sanitizeAnswers), payments(activeProvider,createProviderOrder,verifyCheckoutSignature,verifyWebhookSignature,confirmOrderPaid,markOrderFailed,webhookSecret), credential(DOCS,THEMES,completionEligibility,issueCredential,revokeCredential,publicStatus)

- prisma/seed.ts (npm run db:seed; 11 published programmes, demo users *@internverse.local pw Demo@12345), globals.css component classes (btn-primary, card, input, badge, table, h1...), layout.tsx, components ui.tsx (Badge, PageHeader, Stat, Empty, Progress, Notice, Flash), SiteHeader, SiteFooter, PortalShell(nav,title,user)
- (public)/layout, home, programmes, programmes/[code]; api: lang, auth/logout, watch, live/heartbeat, exam/save, payments/webhook, cron/outbox, export/[kind]
- actions/auth.ts (login, register, requestReset, resetPassword, changePassword), actions/student.ts (applyToProgramme, withdrawApplication, startPayment, sandboxPay, submitWorkLog, submitAssignment, startExam, finalizeAttempt, submitExam, getPaper, createTicket, replyTicket, updateProfile, setConsent, privacyRequest, requestCorrection, applyJob, askLiveQuestion, markNotificationsRead)

- public pages: verify, verify/[token], login, register, forgot/reset-password, how-it-works, lnmu, colleges, organisations, mentors, about, faq, accessibility, legal/[slug] (privacy,terms,refund,certificate-policy,grievance), contact (public ticket), support (redirect), jobs; not-found, error; components/Article
- legal guide html = owner business compliance checklist (MCA Pvt Ltd, GST, MSME/Udyam, Startup India, trademark cl.41, bank, Shop Act, ROC; offline centre; never claim Govt/UGC/AICTE). Fee ₹499 default, ₹299 college bulk -> build admin /admin/launch checklist page

- dashboard: layout(nav 14 items), page, applications, payments, payments/checkout/[orderId]; components/RazorpayCheckout. TODO in dashboard: learning, learning/[lessonId], live, live/[id], attendance, logbook, assignments, exams, exams/[attemptId], certificates, certificates/[id], support, support/[id], jobs, profile, notifications; /receipt/[id] printable

- done also: dashboard learning, learning/[lessonId] (components/LessonPlayer), live, live/[id] (components/LiveRoom)

- done also: dashboard attendance, logbook, logbook/print, assignments, exams, exams/[attemptId] (components ExamRunner, PrintButton)

- done also: dashboard certificates, certificates/[id] (components/CredentialDocument w/ QR+theme), support, support/[id], jobs, notifications, profile; /receipt/[id]. STUDENT PORTAL COMPLETE.

- actions/mentor.ts (cohortScope, reviewWorkLog, reviewSubmission, answerQuestion, scheduleLive (offline => youtubeId "OFFLINE"), markAttendance). NEXT: /mentor pages (layout, page, logbooks, submissions, live, live/[id], students), then actions/admin.ts + /admin pages (see summary list), /employer page

- /mentor pages DONE (layout, page, students, logbooks, submissions, live, live/[id]). actions/admin.ts DONE (all admin server actions; ExceptionRequest status REQUESTED|UNDER_REVIEW). NEXT /admin pages: home(stats), student360 list+[id], applications (approve->Enrollment PENDING_PAYMENT, reject), exceptions (approve/deny), attendance corrections, results/marks change, programmes (publish, fee, cohorts), users/roles (canAssignRole), payments (reconcile, refund), credentials studio (issue w/ eligibility, revoke, reissue, 32 docs x 10 themes preview), support inbox, outbox (process), audit log, settings (DEFAULT_SETTINGS keys), launch checklist (legal guide), ai recommendations, backups (BackupEvent), exports, jobs/employers verify, announcements; /employer page

## Next
- lib: auth (sessions cookie iv_session, getUser, requireUser, requirePermission, login rate-limit), i18n (cookie lang en|hi), payments (SANDBOX + RAZORPAY adapters, confirmOrderPaid atomic), watch (10s buckets, max delta 35s), attendance, exam (shuffle, grade, no answer leak), credential (eligibility, issue, revoke, reissue)
- prisma/seed.ts: families+1221 programmes (publish ~12 featured with courses/lessons/exams), demo users per role (password Demo@12345), cohorts, live sessions, jobs, signatory, settings
- UI components, public pages, student /dashboard/*, /mentor/*, /admin/*, API routes (/api/watch, /api/live/heartbeat, /api/exam/save, /api/payments/webhook, /api/cron/*, /api/export/*)
- tests (vitest) for libs, docs, build, PR to studiodigitalworking-sys/INTERNSHIP-Completed (empty repo: push initial commit to main first)
- /admin DONE: layout, page, students, students/[id], applications, exceptions, results
- /admin DONE also: programmes, programmes/[id], payments, credentials, credentials/[id], support, support/[id], users
- /admin DONE also: jobs, announcements, outbox, reports, audit, ai, backup, settings, launch; /employer. ALL PORTALS DONE. NEXT: tests (vitest), lint, build, docs/OPERATIONS.md + README, run+preview, commit, PR
- tests: tests/unit.test.ts (21) + tests/integration.test.ts (9) pass via vitest (test.db). Fixed coveragePercent cap bug. .env.example, .gitignore updated. NEXT: lint, build
- lint clean; next build OK (69 pages). NEXT: run server, smoke, docs, commit, PR
- README + docs/OPERATIONS.md written
- requirePermission redirects to /forbidden; cookie secure iff APP_URL https; scripts/smoke.ts authenticated route smoke
