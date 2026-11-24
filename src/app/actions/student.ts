"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireStudent, requireUser, rateLimit } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { enqueue, notify } from "@/lib/outbox";
import { activeProvider, confirmOrderPaid, createProviderOrder, markOrderFailed } from "@/lib/payments";
import { randomToken } from "@/lib/crypto";
import { buildPaper, grade, sanitizeAnswers } from "@/lib/exam";
import { getNumber } from "@/lib/settings";
import { WORK_CATEGORIES, TICKET_CATEGORIES, EXCEPTION_TYPES } from "@/lib/constants";

const go = (path: string, msg: string, kind: "ok" | "error" = "ok"): never => redirect(`${path}${path.includes("?") ? "&" : "?"}${kind}=${encodeURIComponent(msg)}`);

export async function applyToProgramme(fd: FormData) {
  const u = await requireStudent();
  const programmeId = String(fd.get("programmeId"));
  const cohortId = String(fd.get("cohortId"));
  const statement = String(fd.get("statement") || "").trim();
  const programme = await db.programme.findUnique({ where: { id: programmeId } });
  if (!programme) return go("/programmes", "Programme not found", "error");
  const back = `/programmes/${programme.code}`;
  if (programme.publicationStatus !== "PUBLISHED") go(back, "This programme is not open for applications", "error");
  if (fd.get("consent") !== "on") go(back, "Consent is required", "error");
  if (statement.length < 20) go(back, "Please write at least 20 characters", "error");
  const cohort = await db.cohort.findFirst({ where: { id: cohortId, programmeId, status: "OPEN" }, include: { _count: { select: { enrollments: true } } } });
  if (!cohort) go(back, "Cohort is not open", "error");
  if (cohort!._count.enrollments >= cohort!.seats) go(back, "Cohort is full", "error");
  const profile = await db.studentProfile.findUnique({ where: { userId: u.id } });
  const snapshot = { degree: profile?.degree, semester: profile?.semester, college: profile?.college, streams: programme.streams, at: new Date() };
  try {
    const app = await db.application.create({ data: { studentId: u.id, programmeId, cohortId, statement, preferredHost: String(fd.get("preferredHost") || "") || null, consentGiven: true, eligibilitySnapshot: JSON.stringify(snapshot) } });
    await audit({ actorId: u.id, actorRole: u.role, action: "APPLICATION_SUBMIT", targetType: "Application", targetId: app.id, studentId: u.id });
    await notify(u.id, "Application submitted", `Your application for ${programme.title} is under review.`, "/dashboard/applications");
    await enqueue({ to: u.email, subject: "Application received", body: `We received your application for ${programme.title}.`, key: `app:${app.id}` });
  } catch {
    go(back, "You have already applied to this programme", "error");
  }
  go("/dashboard/applications", "Application submitted");
}

export async function withdrawApplication(fd: FormData) {
  const u = await requireStudent();
  const app = await db.application.findFirst({ where: { id: String(fd.get("id")), studentId: u.id } });
  if (!app || !["SUBMITTED", "UNDER_REVIEW"].includes(app.status)) go("/dashboard/applications", "Cannot withdraw this application", "error");
  await db.application.update({ where: { id: app!.id }, data: { status: "WITHDRAWN", decidedAt: new Date() } });
  await audit({ actorId: u.id, actorRole: u.role, action: "APPLICATION_WITHDRAW", targetType: "Application", targetId: app!.id, studentId: u.id });
  go("/dashboard/applications", "Application withdrawn");
}

/** Creates (or reuses) a server-side order with server-computed amount. */
export async function startPayment(fd: FormData) {
  const u = await requireStudent();
  const enr = await db.enrollment.findFirst({ where: { id: String(fd.get("enrollmentId")), studentId: u.id }, include: { cohort: { include: { programme: true } }, orders: true } });
  if (!enr) return go("/dashboard/payments", "Enrollment not found", "error");
  if (enr.status !== "PENDING_PAYMENT") go("/dashboard/payments", "No payment due for this enrollment", "error");
  let order = enr.orders.find((o) => o.status === "CREATED");
  if (!order) {
    const idem = `order:${enr.id}:${enr.orders.length + 1}`;
    const providerOrderId = await createProviderOrder(enr.cohort.programme.feePaise, idem);
    order = await db.order.create({ data: { enrollmentId: enr.id, studentId: u.id, amountPaise: enr.cohort.programme.feePaise, provider: activeProvider(), providerOrderId, idempotencyKey: idem } });
    await audit({ actorId: u.id, actorRole: u.role, action: "ORDER_CREATE", targetType: "Order", targetId: order.id, studentId: u.id, newValue: { amountPaise: order.amountPaise, provider: order.provider } });
  }
  redirect(`/dashboard/payments/checkout/${order.id}`);
}

/**
 * SANDBOX checkout only: simulates the provider sending a signed webhook. The same atomic
 * confirmOrderPaid() path used by real webhooks is executed; disabled when Razorpay is configured.
 */
export async function sandboxPay(fd: FormData) {
  const u = await requireStudent();
  if (activeProvider() !== "SANDBOX") go("/dashboard/payments", "Sandbox disabled", "error");
  const order = await db.order.findFirst({ where: { id: String(fd.get("orderId")), studentId: u.id } });
  if (!order) return go("/dashboard/payments", "Order not found", "error");
  if (fd.get("outcome") === "fail") {
    await markOrderFailed(order.providerOrderId, "Sandbox: simulated failure");
    go("/dashboard/payments", "Payment failed (simulated). You can retry.", "error");
  }
  const r = await confirmOrderPaid({ providerOrderId: order.providerOrderId, providerPaymentId: `sandbox_pay_${randomToken(9)}`, amountPaise: order.amountPaise, method: String(fd.get("method") || "upi"), source: "WEBHOOK" });
  if (!r.ok) go("/dashboard/payments", `Payment not confirmed: ${r.reason}`, "error");
  go("/dashboard/payments", "Payment verified. Your enrolment is active.");
}

export async function submitWorkLog(fd: FormData) {
  const u = await requireStudent();
  const schema = z.object({
    enrollmentId: z.string(), date: z.coerce.date(), minutes: z.coerce.number().int().min(15).max(600),
    category: z.enum(WORK_CATEGORIES), tasks: z.string().trim().min(10).max(3000), learning: z.string().trim().max(2000).optional(), evidenceUrl: z.string().trim().url().optional().or(z.literal("")),
  });
  const p = schema.safeParse(Object.fromEntries(fd));
  if (!p.success) return go("/dashboard/logbook", p.error.issues.map((i) => `${i.path}: ${i.message}`).join("; "), "error");
  const d = p.data;
  const enr = await db.enrollment.findFirst({ where: { id: d.enrollmentId, studentId: u.id, status: "ACTIVE" } });
  if (!enr) go("/dashboard/logbook", "Logbook entries require an active enrollment", "error");
  if (d.date > new Date()) go("/dashboard/logbook", "Cannot log future dates", "error");
  const dayStart = new Date(d.date); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 86400_000);
  const sameDay = await db.workLog.aggregate({ where: { userId: u.id, date: { gte: dayStart, lt: dayEnd }, status: { not: "REJECTED" } }, _sum: { minutes: true } });
  if ((sameDay._sum.minutes ?? 0) + d.minutes > 600) go("/dashboard/logbook", "More than 10 hours in a single day cannot be logged", "error");
  const log = await db.workLog.create({ data: { userId: u.id, enrollmentId: d.enrollmentId, date: d.date, minutes: d.minutes, category: d.category, tasks: d.tasks, learning: d.learning, evidenceUrl: d.evidenceUrl || null } });
  await audit({ actorId: u.id, actorRole: u.role, action: "WORKLOG_SUBMIT", targetType: "WorkLog", targetId: log.id, studentId: u.id });
  go("/dashboard/logbook", "Entry submitted for mentor review");
}

export async function submitAssignment(fd: FormData) {
  const u = await requireStudent();
  const a = await db.assignment.findUnique({ where: { id: String(fd.get("assignmentId")) } });
  if (!a) return go("/dashboard/assignments", "Assignment not found", "error");
  const enrolled = await db.enrollment.findFirst({ where: { studentId: u.id, cohortId: a.cohortId, status: { in: ["ACTIVE", "COMPLETED"] } } });
  if (!enrolled) go("/dashboard/assignments", "You are not enrolled in this cohort", "error");
  const content = String(fd.get("content") || "").trim();
  const linkUrl = String(fd.get("linkUrl") || "").trim();
  if (content.length < 20) go("/dashboard/assignments", "Submission must be at least 20 characters", "error");
  if (linkUrl && !/^https?:\/\//.test(linkUrl)) go("/dashboard/assignments", "Link must start with http(s)://", "error");
  const last = await db.submission.findFirst({ where: { assignmentId: a.id, userId: u.id }, orderBy: { version: "desc" } });
  if (last?.status === "REVIEWED") go("/dashboard/assignments", "Already reviewed — contact your mentor for resubmission", "error");
  await db.submission.create({ data: { assignmentId: a.id, userId: u.id, version: (last?.version ?? 0) + 1, content, linkUrl: linkUrl || null, status: a.dueAt < new Date() ? "LATE" : "SUBMITTED" } });
  await audit({ actorId: u.id, actorRole: u.role, action: "ASSIGNMENT_SUBMIT", targetType: "Assignment", targetId: a.id, studentId: u.id });
  go("/dashboard/assignments", "Submission received");
}

export async function startExam(fd: FormData) {
  const u = await requireStudent();
  const exam = await db.exam.findUnique({ where: { id: String(fd.get("examId")) }, include: { questions: true } });
  if (!exam || !exam.published) return go("/dashboard/exams", "Exam not available", "error");
  const enrolled = await db.enrollment.findFirst({ where: { studentId: u.id, status: { in: ["ACTIVE", "COMPLETED"] }, cohort: { programmeId: exam.programmeId } } });
  if (!enrolled) go("/dashboard/exams", "Exam requires an active enrollment", "error");
  const now = new Date();
  if ((exam.opensAt && exam.opensAt > now) || (exam.closesAt && exam.closesAt < now)) go("/dashboard/exams", "Exam window is closed", "error");
  const open = await db.examAttempt.findFirst({ where: { examId: exam.id, userId: u.id, status: "IN_PROGRESS" } });
  if (open) redirect(`/dashboard/exams/${open.id}`);
  const count = await db.examAttempt.count({ where: { examId: exam.id, userId: u.id } });
  if (count >= exam.maxAttempts) go("/dashboard/exams", "No attempts remaining", "error");
  if (await db.examAttempt.findFirst({ where: { examId: exam.id, userId: u.id, passed: true } })) go("/dashboard/exams", "You have already passed this exam", "error");
  const attempt = await db.examAttempt.create({ data: { examId: exam.id, userId: u.id, attemptNo: count + 1, seed: randomToken(12), deadlineAt: new Date(now.getTime() + exam.durationMin * 60_000) } });
  await audit({ actorId: u.id, actorRole: u.role, action: "EXAM_START", targetType: "ExamAttempt", targetId: attempt.id, studentId: u.id });
  redirect(`/dashboard/exams/${attempt.id}`);
}

/** Final submission — idempotent; grading entirely server-side; deadline enforced with 30s grace. */
export async function finalizeAttempt(attemptId: string, userId: string, rawAnswers?: unknown) {
  const attempt = await db.examAttempt.findFirst({ where: { id: attemptId, userId }, include: { exam: { include: { questions: true } } } });
  if (!attempt) throw new Error("Attempt not found");
  if (attempt.status !== "IN_PROGRESS") return attempt;
  const late = Date.now() > attempt.deadlineAt.getTime() + 30_000;
  const answers = late || rawAnswers === undefined ? JSON.parse(attempt.answers || "{}") : sanitizeAnswers(attempt.exam.questions, rawAnswers);
  const passPct = attempt.exam.passPercent ?? (await getNumber("rules.examPassPercent"));
  const g = grade(attempt.exam.questions, answers, passPct);
  const res = await db.examAttempt.updateMany({ where: { id: attempt.id, status: "IN_PROGRESS" }, data: { status: late ? "AUTO_SUBMITTED" : "SUBMITTED", submittedAt: new Date(), answers: JSON.stringify(answers), score: g.score, maxScore: g.maxScore, percent: g.percent, passed: g.passed } });
  if (res.count) {
    await audit({ actorId: userId, action: "EXAM_SUBMIT", targetType: "ExamAttempt", targetId: attempt.id, studentId: userId, newValue: { ...g, late } });
    await notify(userId, "Exam submitted", `${attempt.exam.title}: ${g.percent}% — ${g.passed ? "Passed" : "Not passed"}`, "/dashboard/exams");
  }
  return db.examAttempt.findUniqueOrThrow({ where: { id: attempt.id } });
}

export async function submitExam(fd: FormData) {
  const u = await requireStudent();
  const attemptId = String(fd.get("attemptId"));
  const answers: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (k.startsWith("q_")) answers[k.slice(2)] = String(v);
  await finalizeAttempt(attemptId, u.id, answers);
  redirect(`/dashboard/exams/${attemptId}`);
}

export async function getPaper(attemptId: string, userId: string) {
  const a = await db.examAttempt.findFirst({ where: { id: attemptId, userId }, include: { exam: { include: { questions: true } } } });
  if (!a) return null;
  return { attempt: a, paper: buildPaper(a.exam.questions, a.seed) };
}

export async function createTicket(fd: FormData) {
  const u = await requireUser();
  if (!(await rateLimit(`ticket:${u.id}`, 10, 3600))) go("/dashboard/support", "Too many tickets — please wait", "error");
  const category = String(fd.get("category"));
  const subject = String(fd.get("subject") || "").trim().slice(0, 200);
  const body = String(fd.get("body") || "").trim().slice(0, 5000);
  if (!TICKET_CATEGORIES.includes(category as never) || subject.length < 4 || body.length < 10) go("/dashboard/support", "Please fill subject and details", "error");
  const t = await db.supportTicket.create({ data: { userId: u.id, name: u.name, email: u.email, category, subject, priority: category === "GRIEVANCE" || category === "PAYMENT" ? "HIGH" : "NORMAL", messages: { create: { authorId: u.id, authorName: u.name, body } } } });
  await audit({ actorId: u.id, actorRole: u.role, action: "TICKET_CREATE", targetType: "SupportTicket", targetId: t.id, studentId: u.id });
  go(`/dashboard/support/${t.id}`, "Ticket created");
}

export async function replyTicket(fd: FormData) {
  const u = await requireUser();
  const t = await db.supportTicket.findFirst({ where: { id: String(fd.get("ticketId")), userId: u.id } });
  if (!t) return go("/dashboard/support", "Ticket not found", "error");
  const body = String(fd.get("body") || "").trim().slice(0, 5000);
  if (body.length < 2) go(`/dashboard/support/${t.id}`, "Message is empty", "error");
  await db.ticketMessage.create({ data: { ticketId: t.id, authorId: u.id, authorName: u.name, body } });
  await db.supportTicket.update({ where: { id: t.id }, data: { status: t.status === "RESOLVED" ? "OPEN" : t.status } });
  go(`/dashboard/support/${t.id}`, "Reply sent");
}

export async function updateProfile(fd: FormData) {
  const u = await requireStudent();
  const s = (k: string, max = 200) => (String(fd.get(k) || "").trim().slice(0, max) || null);
  const phone = s("phone", 10);
  if (phone && !/^[6-9]\d{9}$/.test(phone)) go("/dashboard/profile", "Invalid mobile number", "error");
  const portfolioUrl = s("portfolioUrl");
  if (portfolioUrl && !/^https?:\/\//.test(portfolioUrl)) go("/dashboard/profile", "Portfolio URL must start with http(s)://", "error");
  const before = await db.studentProfile.findUnique({ where: { userId: u.id } });
  const data = { university: s("university"), college: s("college"), department: s("department"), degree: s("degree"), semester: s("semester", 20), session: s("session", 20), rollNo: s("rollNo", 50), district: s("district"), skills: s("skills", 500), interests: s("interests", 500), bio: s("bio", 1000), portfolioUrl, accessibilityNeeds: s("accessibilityNeeds", 500) };
  await db.studentProfile.upsert({ where: { userId: u.id }, create: { userId: u.id, ...data }, update: data });
  await db.user.update({ where: { id: u.id }, data: { name: s("name", 100) ?? u.name, phone, preferredLang: fd.get("preferredLang") === "hi" ? "hi" : "en" } });
  await audit({ actorId: u.id, actorRole: u.role, action: "PROFILE_UPDATE", targetType: "StudentProfile", targetId: u.id, studentId: u.id, oldValue: before, newValue: data });
  go("/dashboard/profile", "Profile saved");
}

export async function setConsent(fd: FormData) {
  const u = await requireStudent();
  const type = String(fd.get("type"));
  if (!["MARKETING", "WHATSAPP", "PORTFOLIO_PUBLIC"].includes(type)) go("/dashboard/profile", "Unknown consent", "error");
  if (fd.get("grant") === "1") await db.consent.create({ data: { userId: u.id, type, version: "1.0" } });
  else await db.consent.updateMany({ where: { userId: u.id, type, withdrawnAt: null }, data: { withdrawnAt: new Date() } });
  await audit({ actorId: u.id, actorRole: u.role, action: fd.get("grant") === "1" ? "CONSENT_GRANT" : "CONSENT_WITHDRAW", targetType: "Consent", targetId: type, studentId: u.id });
  go("/dashboard/profile", "Consent preference updated");
}

/** Data-subject requests (access/correction/deletion) are tracked as PRIVACY tickets + exception requests. */
export async function privacyRequest(fd: FormData) {
  const u = await requireStudent();
  const kind = String(fd.get("kind"));
  if (!["ACCESS", "CORRECTION", "DELETION"].includes(kind)) go("/dashboard/profile", "Unknown request", "error");
  const t = await db.supportTicket.create({ data: { userId: u.id, name: u.name, email: u.email, category: "PRIVACY", subject: `Data ${kind.toLowerCase()} request`, priority: "HIGH", messages: { create: { authorId: u.id, authorName: u.name, body: String(fd.get("details") || `Data ${kind} request`).slice(0, 3000) } } } });
  await audit({ actorId: u.id, actorRole: u.role, action: `PRIVACY_${kind}_REQUEST`, targetType: "SupportTicket", targetId: t.id, studentId: u.id });
  go("/dashboard/profile", "Request recorded. We will respond within the timeline in our privacy policy.");
}

export async function requestCorrection(fd: FormData) {
  const u = await requireStudent();
  const type = String(fd.get("type"));
  const reason = String(fd.get("reason") || "").trim();
  if (!EXCEPTION_TYPES.includes(type as never) || reason.length < 10) go("/dashboard/attendance", "Choose a type and give a reason (10+ chars)", "error");
  const ex = await db.exceptionRequest.create({ data: { type, studentId: u.id, targetType: String(fd.get("targetType") || "General"), targetId: String(fd.get("targetId") || "") || null, reason, evidenceRef: String(fd.get("evidenceRef") || "") || null, requestedById: u.id } });
  await audit({ actorId: u.id, actorRole: u.role, action: "EXCEPTION_REQUEST", targetType: "ExceptionRequest", targetId: ex.id, studentId: u.id, reason });
  go("/dashboard/attendance", "Correction request submitted for review");
}

export async function applyJob(fd: FormData) {
  const u = await requireStudent();
  const job = await db.job.findFirst({ where: { id: String(fd.get("jobId")), status: "OPEN" } });
  if (!job) return go("/jobs", "Job is not open", "error");
  try {
    await db.jobApplication.create({ data: { jobId: job.id, userId: u.id, coverNote: String(fd.get("coverNote") || "").slice(0, 2000) } });
  } catch {
    go("/dashboard/jobs", "You already applied to this job", "error");
  }
  await audit({ actorId: u.id, actorRole: u.role, action: "JOB_APPLY", targetType: "Job", targetId: job.id, studentId: u.id });
  go("/dashboard/jobs", "Application sent");
}

export async function askLiveQuestion(fd: FormData) {
  const u = await requireStudent();
  const sessionId = String(fd.get("sessionId"));
  const text = String(fd.get("text") || "").trim().slice(0, 500);
  const s = await db.liveSession.findUnique({ where: { id: sessionId } });
  if (!s) return go("/dashboard/live", "Session not found", "error");
  const enrolled = await db.enrollment.findFirst({ where: { studentId: u.id, cohortId: s.cohortId, status: "ACTIVE" } });
  if (!enrolled || text.length < 3) go(`/dashboard/live/${sessionId}`, "Cannot post question", "error");
  if (!(await rateLimit(`liveq:${u.id}`, 10, 600))) go(`/dashboard/live/${sessionId}`, "Slow down — too many questions", "error");
  await db.liveQuestion.create({ data: { sessionId, userId: u.id, text } });
  revalidatePath(`/dashboard/live/${sessionId}`);
  go(`/dashboard/live/${sessionId}`, "Question posted");
}

export async function markNotificationsRead() {
  const u = await requireUser();
  await db.notification.updateMany({ where: { userId: u.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/dashboard/notifications");
}
