"use server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requirePermission, hashPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { enqueue, notify, processOutbox } from "@/lib/outbox";
import { canAssignRole } from "@/lib/rbac";
import { ROLES } from "@/lib/constants";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { completionEligibility, issueCredential, revokeCredential } from "@/lib/credential";
import { confirmOrderPaid } from "@/lib/payments";
import { randomToken } from "@/lib/crypto";

const go = (path: string, msg: string, kind: "ok" | "error" = "ok"): never => redirect(`${path}${path.includes("?") ? "&" : "?"}${kind}=${encodeURIComponent(msg)}`);
const str = (fd: FormData, k: string, max = 500) => String(fd.get(k) || "").trim().slice(0, max);

export async function decideApplication(fd: FormData) {
  const u = await requirePermission("applications.review");
  const app = await db.application.findUnique({ where: { id: str(fd, "id") }, include: { programme: true, student: true } });
  if (!app || !["SUBMITTED", "UNDER_REVIEW"].includes(app.status)) return go("/admin/applications", "Application not pending", "error");
  const decision = str(fd, "decision");
  const note = str(fd, "note");
  if (decision === "reject" && !note) go("/admin/applications", "Reason required to reject", "error");
  if (decision === "approve") {
    if (!app.cohortId) go("/admin/applications", "No cohort selected", "error");
    await db.$transaction(async (tx) => {
      await tx.application.update({ where: { id: app.id }, data: { status: "APPROVED", reviewNote: note || null, reviewedById: u.id, decidedAt: new Date() } });
      await tx.enrollment.create({ data: { studentId: app.studentId, cohortId: app.cohortId!, applicationId: app.id, status: app.programme.feePaise > 0 ? "PENDING_PAYMENT" : "ACTIVE", activatedAt: app.programme.feePaise > 0 ? null : new Date() } });
      await audit({ actorId: u.id, actorRole: u.role, action: "APPLICATION_APPROVE", targetType: "Application", targetId: app.id, studentId: app.studentId, reason: note }, tx);
      await notify(app.studentId, "Application approved", `You are selected for ${app.programme.title}. Complete payment to activate.`, "/dashboard/payments", tx);
      await enqueue({ to: app.student.email, subject: "Application approved", body: `Approved for ${app.programme.title}.`, key: `approve:${app.id}` }, tx);
    });
  } else {
    await db.application.update({ where: { id: app.id }, data: { status: decision === "review" ? "UNDER_REVIEW" : "REJECTED", reviewNote: note || null, reviewedById: u.id, decidedAt: decision === "review" ? null : new Date() } });
    await audit({ actorId: u.id, actorRole: u.role, action: decision === "review" ? "APPLICATION_REVIEW" : "APPLICATION_REJECT", targetType: "Application", targetId: app.id, studentId: app.studentId, reason: note });
    if (decision !== "review") await notify(app.studentId, "Application update", `Your application for ${app.programme.title} was not approved: ${note}`, "/dashboard/applications");
  }
  go("/admin/applications", "Decision recorded");
}

export async function decideException(fd: FormData) {
  const u = await requirePermission("eligibility.exception");
  const ex = await db.exceptionRequest.findUnique({ where: { id: str(fd, "id") } });
  if (!ex || !["REQUESTED", "UNDER_REVIEW"].includes(ex.status)) return go("/admin/exceptions", "Not pending", "error");
  if (ex.requestedById === u.id) go("/admin/exceptions", "Maker-checker: you cannot approve your own request", "error");
  const note = str(fd, "note");
  if (!note) go("/admin/exceptions", "Decision note required", "error");
  const status = str(fd, "decision") === "approve" ? "APPROVED" : "REJECTED";
  await db.exceptionRequest.update({ where: { id: ex.id }, data: { status, decidedById: u.id, decisionNote: note, decidedAt: new Date() } });
  await audit({ actorId: u.id, actorRole: u.role, action: `EXCEPTION_${status}`, targetType: "ExceptionRequest", targetId: ex.id, studentId: ex.studentId, reason: note, approvalId: ex.id });
  if (ex.studentId) await notify(ex.studentId, `Request ${status.toLowerCase()}`, note, "/dashboard/attendance");
  go("/admin/exceptions", `Request ${status.toLowerCase()}`);
}

export async function raiseException(fd: FormData) {
  const u = await requirePermission("student360.view");
  const ex = await db.exceptionRequest.create({ data: { type: str(fd, "type"), studentId: str(fd, "studentId") || null, targetType: str(fd, "targetType") || "General", targetId: str(fd, "targetId") || null, reason: str(fd, "reason", 2000), evidenceRef: str(fd, "evidenceRef") || null, payload: str(fd, "payload", 2000) || "{}", requestedById: u.id } });
  await audit({ actorId: u.id, actorRole: u.role, action: "EXCEPTION_RAISE", targetType: "ExceptionRequest", targetId: ex.id, studentId: ex.studentId, reason: ex.reason });
  go("/admin/exceptions", "Exception raised — a different authorised officer must approve it");
}

export async function changeMarks(fd: FormData) {
  const u = await requirePermission("marks.change");
  const a = await db.examAttempt.findUnique({ where: { id: str(fd, "id") }, include: { exam: true } });
  if (!a || a.maxScore == null) return go("/admin/results", "Attempt not found", "error");
  const score = Number(fd.get("score"));
  const reason = str(fd, "reason");
  if (!Number.isFinite(score) || score < 0 || score > a.maxScore || !reason) go("/admin/results", "Valid score and reason required", "error");
  const percent = Math.round((score / a.maxScore) * 100);
  await db.examAttempt.update({ where: { id: a.id }, data: { score, percent, passed: percent >= a.exam.passPercent } });
  await audit({ actorId: u.id, actorRole: u.role, action: "MARKS_ADJUST", targetType: "ExamAttempt", targetId: a.id, studentId: a.userId, oldValue: a.score, newValue: score, reason, evidenceRef: str(fd, "evidenceRef") || null });
  await notify(a.userId, "Result updated", `${a.exam.title}: ${percent}% (${reason})`, "/dashboard/exams");
  go("/admin/results", "Marks updated and audited");
}

export async function updateProgramme(fd: FormData) {
  const u = await requirePermission("programmes.manage");
  const p = await db.programme.findUnique({ where: { id: str(fd, "id") } });
  if (!p) return go("/admin/programmes", "Not found", "error");
  const fee = Math.round(Number(fd.get("feeRupees")) * 100);
  const status = str(fd, "publicationStatus");
  if (!["CATALOGUE", "PUBLISHED", "ARCHIVED"].includes(status) || !(fee >= 0)) go(`/admin/programmes/${p.id}`, "Invalid values", "error");
  const data = { publicationStatus: status, feePaise: fee, titleHi: str(fd, "titleHi") || null, description: str(fd, "description", 3000) || null, outcomes: str(fd, "outcomes", 3000) || null, durationHours: Number(fd.get("durationHours")) || 120 };
  await db.programme.update({ where: { id: p.id }, data });
  await audit({ actorId: u.id, actorRole: u.role, action: "PROGRAMME_UPDATE", targetType: "Programme", targetId: p.id, oldValue: { status: p.publicationStatus, fee: p.feePaise }, newValue: { status, fee } });
  go(`/admin/programmes/${p.id}`, "Programme saved");
}

export async function createCohort(fd: FormData) {
  const u = await requirePermission("programmes.manage");
  const p = await db.programme.findUnique({ where: { id: str(fd, "programmeId") } });
  if (!p) return go("/admin/programmes", "Not found", "error");
  const start = new Date(str(fd, "startDate")), end = new Date(str(fd, "endDate"));
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) go(`/admin/programmes/${p.id}`, "Invalid dates", "error");
  const n = (await db.cohort.count({ where: { programmeId: p.id } })) + 1;
  const c = await db.cohort.create({ data: { code: `${p.code}-C${n}`, programmeId: p.id, startDate: start, endDate: end, mode: str(fd, "mode") || "HYBRID", seats: Number(fd.get("seats")) || 40, mentorId: str(fd, "mentorId") || null, hostName: str(fd, "hostName") || null, status: "OPEN" } });
  await audit({ actorId: u.id, actorRole: u.role, action: "COHORT_CREATE", targetType: "Cohort", targetId: c.id });
  go(`/admin/programmes/${p.id}`, `Cohort ${c.code} created`);
}

export async function createUser(fd: FormData) {
  const u = await requirePermission("users.manage");
  const role = str(fd, "role");
  if (!ROLES.includes(role as never) || !canAssignRole(u.role, role)) go("/admin/users", "You cannot assign that role", "error");
  const email = str(fd, "email").toLowerCase();
  if (await db.user.findUnique({ where: { email } })) go("/admin/users", "Email already exists", "error");
  const temp = `Iv-${randomToken(6)}1`;
  const nu = await db.user.create({ data: { email, name: str(fd, "name", 100), role, passwordHash: await hashPassword(temp), institutionId: str(fd, "institutionId") || null } });
  await enqueue({ to: email, subject: "Your InternVerse staff account", body: `Temporary password: ${temp} — change it after first login.`, priority: 0, key: `staff:${nu.id}` });
  await audit({ actorId: u.id, actorRole: u.role, action: "USER_CREATE", targetType: "User", targetId: nu.id, newValue: { email, role } });
  go("/admin/users", `User created. Temporary password queued in outbox for ${email}.`);
}

export async function updateUser(fd: FormData) {
  const u = await requirePermission("users.manage");
  const t = await db.user.findUnique({ where: { id: str(fd, "id") } });
  if (!t) return go("/admin/users", "Not found", "error");
  const role = str(fd, "role"), status = str(fd, "status");
  if (t.id === u.id) go("/admin/users", "You cannot change your own role or status", "error");
  if ((role !== t.role && (!canAssignRole(u.role, role) || !canAssignRole(u.role, t.role))) || !["ACTIVE", "SUSPENDED"].includes(status)) go("/admin/users", "Not permitted", "error");
  await db.user.update({ where: { id: t.id }, data: { role, status } });
  if (status === "SUSPENDED") await db.session.updateMany({ where: { userId: t.id, revokedAt: null }, data: { revokedAt: new Date() } });
  await audit({ actorId: u.id, actorRole: u.role, action: "USER_UPDATE", targetType: "User", targetId: t.id, oldValue: { role: t.role, status: t.status }, newValue: { role, status }, reason: str(fd, "reason") || null });
  go("/admin/users", "User updated");
}

export async function reconcileOrder(fd: FormData) {
  const u = await requirePermission("payments.manage");
  const o = await db.order.findUnique({ where: { id: str(fd, "id") } });
  const ref = str(fd, "providerPaymentId"), reason = str(fd, "reason");
  if (!o || !ref || !reason) return go("/admin/payments", "Order, gateway payment ID and reason are required", "error");
  const r = await confirmOrderPaid({ providerOrderId: o.providerOrderId, providerPaymentId: ref, amountPaise: o.amountPaise, source: "RECONCILIATION" });
  await audit({ actorId: u.id, actorRole: u.role, action: "PAYMENT_RECONCILE", targetType: "Order", targetId: o.id, studentId: o.studentId, reason, evidenceRef: ref, result: r.ok ? "SUCCESS" : "FAILED" });
  go("/admin/payments", r.ok ? "Order reconciled" : `Failed: ${r.reason}`, r.ok ? "ok" : "error");
}

export async function refundPayment(fd: FormData) {
  const u = await requirePermission("payments.manage");
  const p = await db.payment.findUnique({ where: { id: str(fd, "paymentId") }, include: { refunds: true, order: true } });
  const amount = Math.round(Number(fd.get("amountRupees")) * 100), reason = str(fd, "reason");
  if (!p || !reason) return go("/admin/payments", "Payment and reason required", "error");
  const refunded = p.refunds.filter((r) => r.status !== "FAILED").reduce((a, r) => a + r.amountPaise, 0);
  if (!(amount > 0) || amount + refunded > p.amountPaise) go("/admin/payments", "Refund exceeds captured amount", "error");
  const full = amount + refunded === p.amountPaise;
  await db.$transaction(async (tx) => {
    await tx.refund.create({ data: { paymentId: p.id, amountPaise: amount, reason, status: "PROCESSED", providerRefundId: p.order.provider === "SANDBOX" ? `sandbox_rfnd_${randomToken(6)}` : null, createdById: u.id } });
    if (full) { await tx.order.update({ where: { id: p.orderId }, data: { status: "REFUNDED" } }); await tx.enrollment.update({ where: { id: p.order.enrollmentId }, data: { status: "WITHDRAWN" } }); }
    await audit({ actorId: u.id, actorRole: u.role, action: "REFUND", targetType: "Payment", targetId: p.id, studentId: p.order.studentId, newValue: { amount, full }, reason }, tx);
    await notify(p.order.studentId, "Refund processed", `₹${(amount / 100).toFixed(2)} refunded: ${reason}`, "/dashboard/payments", tx);
  });
  go("/admin/payments", "Refund recorded");
}

export async function issueDocument(fd: FormData) {
  const u = await requirePermission("credentials.issue");
  const enrollmentId = str(fd, "enrollmentId");
  const userId = enrollmentId ? (await db.enrollment.findUnique({ where: { id: enrollmentId } }))?.studentId ?? null : str(fd, "userId") || null;
  const docType = str(fd, "docType"), theme = str(fd, "theme") || "02";
  const exceptionId = str(fd, "exceptionId");
  let verifiedHours: number | null = null, programmeTitle: string | null = null, programmeCode: string | null = null, cohortCode: string | null = null, hostName: string | null = null, startDate: Date | null = null, endDate: Date | null = null;
  let recipientName = str(fd, "recipientName", 150);
  let approvedById: string | null = null, isException = false, exceptionReason: string | null = null;
  if (userId) { const su = await db.user.findUnique({ where: { id: userId } }); if (su) recipientName = su.name; }
  if (enrollmentId && userId) {
    const el = await completionEligibility(userId, enrollmentId);
    const e = el.enrollment;
    if (e) { programmeTitle = e.cohort.programme.title; programmeCode = e.cohort.programme.code; cohortCode = e.cohort.code; hostName = e.cohort.hostName; startDate = e.cohort.startDate; endDate = e.cohort.endDate; verifiedHours = el.verifiedHours; }
    if (["01", "05", "13"].includes(docType) && !el.eligible) {
      const ex = exceptionId ? await db.exceptionRequest.findFirst({ where: { id: exceptionId, studentId: userId, status: "APPROVED", type: "CERTIFICATE_MANUAL_ISSUANCE" } }) : null;
      if (!ex) go("/admin/credentials", "Student is not eligible. An APPROVED 'Certificate manual issuance' exception ID is required.", "error");
      approvedById = ex!.decidedById; isException = true; exceptionReason = ex!.reason;
    }
  } else if (["01", "05", "13"].includes(docType)) go("/admin/credentials", "Completion documents require a student and enrolment", "error");
  if (!recipientName) go("/admin/credentials", "Recipient required", "error");
  try {
    const c = await issueCredential({ actor: u, userId, recipientName, docType, theme, programmeTitle, programmeCode, cohortCode, hostName, verifiedHours, startDate, endDate, isException, exceptionReason, approvedById, evidenceRef: str(fd, "evidenceRef") || null, idempotencyKey: str(fd, "idem") || null });
    go(`/admin/credentials/${c.id}`, `Issued ${c.code}`);
  } catch (e) {
    if ((e as Error).message === "NEXT_REDIRECT" || (e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e;
    go("/admin/credentials", (e as Error).message, "error");
  }
}

export async function revokeDocument(fd: FormData) {
  const u = await requirePermission("credentials.revoke");
  await revokeCredential(str(fd, "id"), u, str(fd, "reason"));
  go(`/admin/credentials/${str(fd, "id")}`, "Credential revoked");
}

export async function reissueDocument(fd: FormData) {
  const u = await requirePermission("credentials.issue");
  const prev = await db.credential.findUnique({ where: { id: str(fd, "id") } });
  const reason = str(fd, "reason");
  if (!prev || !reason) return go("/admin/credentials", "Reason required", "error");
  const c = await issueCredential({ actor: u, userId: prev.userId, recipientName: str(fd, "recipientName", 150) || prev.recipientName, docType: prev.docType, theme: str(fd, "theme") || prev.theme, programmeTitle: prev.programmeTitle, programmeCode: prev.programmeCode, cohortCode: prev.cohortCode, hostName: prev.hostName, verifiedHours: prev.verifiedHours, startDate: prev.startDate, endDate: prev.endDate, supersedesId: prev.id, exceptionReason: reason, isException: prev.isException, approvedById: prev.approvedById });
  go(`/admin/credentials/${c.id}`, `Reissued as ${c.code} (v${c.version})`);
}

export async function staffReplyTicket(fd: FormData) {
  const u = await requirePermission("support.manage");
  const t = await db.supportTicket.findUnique({ where: { id: str(fd, "id") } });
  if (!t) return go("/admin/support", "Not found", "error");
  const body = str(fd, "body", 5000), internal = fd.get("internal") === "on", status = str(fd, "status") || t.status;
  if (body) await db.ticketMessage.create({ data: { ticketId: t.id, authorId: u.id, authorName: `${u.name} (staff)`, body, internal } });
  await db.supportTicket.update({ where: { id: t.id }, data: { status, assignedToId: t.assignedToId ?? u.id } });
  if (body && !internal) { if (t.userId) await notify(t.userId, "Support replied", t.subject, `/dashboard/support/${t.id}`); await enqueue({ to: t.email, subject: `Re: ${t.subject}`, body, key: `ticket:${t.id}:${Date.now()}` }); }
  await audit({ actorId: u.id, actorRole: u.role, action: "TICKET_UPDATE", targetType: "SupportTicket", targetId: t.id, newValue: { status, internal } });
  go(`/admin/support/${t.id}`, "Updated");
}

export async function runOutbox() {
  await requirePermission("outbox.manage");
  const r = await processOutbox(100);
  go("/admin/outbox", `Processed ${r.processed}: ${r.sent} sent (log transport), ${r.failed} failed`);
}

export async function saveSettings(fd: FormData) {
  const u = await requirePermission("settings.manage");
  const rootOnly = ["payments.mode", "flags.maintenance", "issuer.verified"];
  const changed: Record<string, string> = {};
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    if (key === "receipt.seq" || !fd.has(key)) continue;
    if (rootOnly.includes(key) && u.role !== "ROOT_OWNER") continue;
    const value = str(fd, key, 1000);
    const cur = await db.setting.findUnique({ where: { key } });
    if ((cur?.value ?? DEFAULT_SETTINGS[key as keyof typeof DEFAULT_SETTINGS]) !== value) {
      await db.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
      changed[key] = value;
    }
  }
  if (Object.keys(changed).length) await audit({ actorId: u.id, actorRole: u.role, action: "SETTINGS_UPDATE", targetType: "Setting", newValue: changed });
  go("/admin/settings", `Saved ${Object.keys(changed).length} change(s)`);
}

export async function saveSignatory(fd: FormData) {
  const u = await requirePermission("settings.root");
  const s = await db.signatory.create({ data: { name: str(fd, "name", 100), title: str(fd, "title", 100), authorityEvidence: str(fd, "authorityEvidence") || null } });
  if (fd.get("makeActive") === "on") await db.signatory.updateMany({ where: { id: { not: s.id } }, data: { active: false } });
  await audit({ actorId: u.id, actorRole: u.role, action: "SIGNATORY_ADD", targetType: "Signatory", targetId: s.id });
  go("/admin/settings", "Signatory saved");
}

export async function decideAi(fd: FormData) {
  const u = await requirePermission("ai.control");
  const status = str(fd, "decision") === "accept" ? "ACCEPTED" : "DISMISSED";
  await db.aiRecommendation.update({ where: { id: str(fd, "id") }, data: { status, decidedById: u.id, decidedAt: new Date() } });
  await audit({ actorId: u.id, actorRole: u.role, action: `AI_${status}`, targetType: "AiRecommendation", targetId: str(fd, "id") });
  go("/admin/ai", `Recommendation ${status.toLowerCase()}`);
}

export async function recordBackup(fd: FormData) {
  const u = await requirePermission("backup.run");
  const counts = { users: await db.user.count(), credentials: await db.credential.count(), orders: await db.order.count(), audit: await db.auditEvent.count() };
  await db.backupEvent.create({ data: { kind: str(fd, "kind") || "SNAPSHOT_CHECK", detail: JSON.stringify(counts), createdById: u.id } });
  await audit({ actorId: u.id, actorRole: u.role, action: "BACKUP_RECORD", targetType: "System", newValue: counts });
  go("/admin/backup", "Backup checkpoint recorded (see runbook for actual database dump)");
}

export async function manageJob(fd: FormData) {
  const u = await requirePermission("jobs.manage");
  if (fd.get("verifyEmployer")) { await db.employer.update({ where: { id: str(fd, "verifyEmployer") }, data: { verified: true } }); await audit({ actorId: u.id, actorRole: u.role, action: "EMPLOYER_VERIFY", targetType: "Employer", targetId: str(fd, "verifyEmployer"), evidenceRef: str(fd, "evidenceRef") || null }); return go("/admin/jobs", "Employer verified"); }
  if (fd.get("jobId")) { await db.job.update({ where: { id: str(fd, "jobId") }, data: { status: str(fd, "status") } }); return go("/admin/jobs", "Job updated"); }
  if (fd.get("appId")) { await db.jobApplication.update({ where: { id: str(fd, "appId") }, data: { status: str(fd, "status") } }); return go(str(fd, "back") || "/admin/jobs", "Application updated"); }
  let employerId = str(fd, "employerId");
  if (!employerId) employerId = (await db.employer.create({ data: { name: str(fd, "employerName", 150), contact: u.email } })).id;
  await db.job.create({ data: { employerId, title: str(fd, "title", 150), location: str(fd, "location", 100), mode: str(fd, "mode", 50), stipend: str(fd, "stipend", 100) || null, description: str(fd, "description", 3000), skills: str(fd, "skills", 300) || null, status: "OPEN", closesAt: fd.get("closesAt") ? new Date(str(fd, "closesAt")) : null } });
  go(str(fd, "back") || "/admin/jobs", "Job posted");
}

export async function saveAnnouncement(fd: FormData) {
  const u = await requirePermission("cms.manage");
  if (fd.get("toggle")) { const a = await db.announcement.findUnique({ where: { id: str(fd, "toggle") } }); if (a) await db.announcement.update({ where: { id: a.id }, data: { published: !a.published } }); return go("/admin/announcements", "Updated"); }
  await db.announcement.create({ data: { title: str(fd, "title", 200), titleHi: str(fd, "titleHi", 200) || null, body: str(fd, "body", 2000), published: fd.get("published") === "on" } });
  await audit({ actorId: u.id, actorRole: u.role, action: "ANNOUNCEMENT_CREATE", targetType: "Announcement" });
  go("/admin/announcements", "Announcement saved");
}
