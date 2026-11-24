import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { toCsv } from "@/lib/format";
import { audit } from "@/lib/audit";

const EXPORTS: Record<string, () => Promise<Record<string, unknown>[]>> = {
  students: async () => (await db.user.findMany({ where: { role: "STUDENT" }, include: { profile: true } })).map((u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, college: u.profile?.college, degree: u.profile?.degree, semester: u.profile?.semester, district: u.profile?.district, status: u.status, createdAt: u.createdAt })),
  applications: async () => (await db.application.findMany({ include: { student: true, programme: true, cohort: true } })).map((a) => ({ id: a.id, student: a.student.name, email: a.student.email, programme: a.programme.code, title: a.programme.title, cohort: a.cohort?.code, status: a.status, createdAt: a.createdAt, decidedAt: a.decidedAt })),
  payments: async () => (await db.order.findMany({ include: { student: true, payments: true } })).map((o) => ({ orderId: o.id, receiptNo: o.receiptNo, student: o.student.name, amountINR: o.amountPaise / 100, status: o.status, provider: o.provider, providerOrderId: o.providerOrderId, paymentIds: o.payments.map((p) => p.providerPaymentId).join(" "), paidAt: o.paidAt, createdAt: o.createdAt })),
  attendance: async () => (await db.liveAttendance.findMany({ include: { session: { include: { cohort: true } }, user: true } })).map((a) => ({ session: a.session.title, cohort: a.session.cohort.code, startsAt: a.session.startsAt, student: a.user.name, email: a.user.email, creditedMin: Math.round(a.creditedSeconds / 60), adjustedMin: Math.round((a.adjustedSeconds ?? 0) / 60), reconnects: a.reconnects, status: a.status, adjustmentReason: a.adjustmentReason })),
  worklogs: async () => (await db.workLog.findMany({ include: { user: true } })).map((w) => ({ student: w.user.name, date: w.date, hours: (w.minutes / 60).toFixed(2), category: w.category, tasks: w.tasks, status: w.status, reviewNote: w.reviewNote })),
  results: async () => (await db.examAttempt.findMany({ include: { exam: true, user: true } })).map((a) => ({ student: a.user.name, exam: a.exam.title, attempt: a.attemptNo, status: a.status, score: a.score, max: a.maxScore, percent: a.percent, passed: a.passed, submittedAt: a.submittedAt })),
  credentials: async () => (await db.credential.findMany()).map((c) => ({ code: c.code, recipient: c.recipientName, docType: c.docType, title: c.title, programme: c.programmeTitle, status: c.status, version: c.version, isException: c.isException, issuedAt: c.issuedAt })),
  audit: async () => (await db.auditEvent.findMany({ orderBy: { createdAt: "desc" }, take: 5000 })).map((a) => ({ at: a.createdAt, actorId: a.actorId, role: a.actorRole, action: a.action, targetType: a.targetType, targetId: a.targetId, studentId: a.studentId, reason: a.reason, result: a.result })),
};

export async function GET(req: NextRequest, { params }: { params: { kind: string } }) {
  const u = await getUser();
  const perm = params.kind === "audit" ? "audit.view" : params.kind === "payments" ? "payments.view" : "exports.run";
  if (!u || !can(u.role, perm)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const fn = EXPORTS[params.kind];
  if (!fn) return NextResponse.json({ error: "unknown export" }, { status: 404 });
  const rows = await fn();
  await audit({ actorId: u.id, actorRole: u.role, action: "EXPORT", targetType: "Export", targetId: params.kind, newValue: { rows: rows.length } });
  return new NextResponse(toCsv(rows), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="internverse-${params.kind}-${new Date().toISOString().slice(0, 10)}.csv"` } });
}
