"use server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/outbox";
import { can } from "@/lib/rbac";

const go = (path: string, msg: string, kind: "ok" | "error" = "ok"): never => redirect(`${path}?${kind}=${encodeURIComponent(msg)}`);

/** Mentors may act only on cohorts assigned to them; academic staff (lms.manage) may act on any. */
export async function cohortScope(user: { id: string; role: string }) {
  return can(user.role, "lms.manage") ? {} : { mentorId: user.id };
}
async function assertCohort(user: { id: string; role: string }, cohortId: string) {
  const c = await db.cohort.findFirst({ where: { id: cohortId, ...(await cohortScope(user)) } });
  if (!c) throw new Error("Forbidden: cohort not assigned to you");
  return c;
}

export async function reviewWorkLog(fd: FormData) {
  const u = await requirePermission("mentor.review");
  const log = await db.workLog.findUnique({ where: { id: String(fd.get("id")) }, include: { enrollment: true } });
  if (!log) return go("/mentor/logbooks", "Not found", "error");
  await assertCohort(u, log.enrollment.cohortId);
  const decision = fd.get("decision") === "approve" ? "APPROVED" : "REJECTED";
  const note = String(fd.get("note") || "").slice(0, 500) || null;
  if (decision === "REJECTED" && !note) go("/mentor/logbooks", "A note is required when returning an entry", "error");
  await db.workLog.update({ where: { id: log.id }, data: { status: decision, reviewerId: u.id, reviewNote: note } });
  await audit({ actorId: u.id, actorRole: u.role, action: `WORKLOG_${decision}`, targetType: "WorkLog", targetId: log.id, studentId: log.userId, oldValue: log.status, newValue: decision, reason: note });
  await notify(log.userId, `Logbook entry ${decision.toLowerCase()}`, note ?? "Your entry was reviewed.", "/dashboard/logbook");
  go("/mentor/logbooks", `Entry ${decision.toLowerCase()}`);
}

export async function reviewSubmission(fd: FormData) {
  const u = await requirePermission("mentor.review");
  const s = await db.submission.findUnique({ where: { id: String(fd.get("id")) }, include: { assignment: true } });
  if (!s) return go("/mentor/submissions", "Not found", "error");
  await assertCohort(u, s.assignment.cohortId);
  const marks = Number(fd.get("marks"));
  const feedback = String(fd.get("feedback") || "").trim().slice(0, 2000);
  const final = fd.get("decision") !== "revise";
  if (final && (!Number.isFinite(marks) || marks < 0 || marks > s.assignment.maxMarks)) go("/mentor/submissions", `Marks must be 0–${s.assignment.maxMarks}`, "error");
  if (!feedback) go("/mentor/submissions", "Feedback is required", "error");
  await db.submission.update({ where: { id: s.id }, data: { status: final ? "REVIEWED" : "REVISION_REQUESTED", marks: final ? marks : null, feedback, reviewedById: u.id, reviewedAt: new Date() } });
  await audit({ actorId: u.id, actorRole: u.role, action: final ? "SUBMISSION_GRADE" : "SUBMISSION_REVISE", targetType: "Submission", targetId: s.id, studentId: s.userId, newValue: { marks, feedback } });
  await notify(s.userId, final ? "Assignment reviewed" : "Revision requested", `${s.assignment.title}: ${feedback}`, "/dashboard/assignments");
  go("/mentor/submissions", final ? "Graded" : "Revision requested");
}

export async function answerQuestion(fd: FormData) {
  const u = await requirePermission("mentor.review");
  const q = await db.liveQuestion.findUnique({ where: { id: String(fd.get("id")) }, include: { session: true } });
  if (!q) return go("/mentor/live", "Not found", "error");
  await assertCohort(u, q.session.cohortId);
  await db.liveQuestion.update({ where: { id: q.id }, data: { answer: String(fd.get("answer") || "").slice(0, 1000), status: "ANSWERED" } });
  go(`/mentor/live/${q.sessionId}`, "Answered");
}

export async function scheduleLive(fd: FormData) {
  const u = await requirePermission("mentor.review");
  const cohortId = String(fd.get("cohortId"));
  await assertCohort(u, cohortId);
  const startsAt = new Date(String(fd.get("startsAt")));
  const minutes = Number(fd.get("minutes") || 60);
  const yt = String(fd.get("youtubeId") || "").trim().replace(/^.*(?:v=|youtu\.be\/|live\/)([\w-]{11}).*$/, "$1");
  if (isNaN(startsAt.getTime()) || minutes < 15 || minutes > 480) go("/mentor/live", "Invalid time or duration", "error");
  if (!/^[\w-]{11}$/.test(yt) && fd.get("offline") !== "on") go("/mentor/live", "Enter a YouTube video/live ID or URL, or tick offline", "error");
  const s = await db.liveSession.create({ data: { cohortId, title: String(fd.get("title") || "Live session").slice(0, 200), youtubeId: fd.get("offline") === "on" ? "OFFLINE" : yt, startsAt, endsAt: new Date(startsAt.getTime() + minutes * 60_000), mentorId: u.id, status: "SCHEDULED" } });
  const studs = await db.enrollment.findMany({ where: { cohortId, status: "ACTIVE" } });
  for (const e of studs) await notify(e.studentId, "New live class scheduled", `${s.title} on ${startsAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`, "/dashboard/live");
  await audit({ actorId: u.id, actorRole: u.role, action: "LIVE_SCHEDULE", targetType: "LiveSession", targetId: s.id });
  go("/mentor/live", "Session scheduled and students notified");
}

/** Offline register / manual adjustment — always audited with reason. */
export async function markAttendance(fd: FormData) {
  const u = await requirePermission("mentor.review");
  const s = await db.liveSession.findUnique({ where: { id: String(fd.get("sessionId")) } });
  if (!s) return go("/mentor/live", "Not found", "error");
  await assertCohort(u, s.cohortId);
  const userId = String(fd.get("userId"));
  const status = String(fd.get("status"));
  const reason = String(fd.get("reason") || "").trim() || (s.youtubeId === "OFFLINE" ? "Offline attendance register" : "");
  if (!["PRESENT", "PARTIAL", "ABSENT"].includes(status) || !reason) go(`/mentor/live/${s.id}`, "Status and reason required", "error");
  const total = Math.round((s.endsAt.getTime() - s.startsAt.getTime()) / 1000);
  const before = await db.liveAttendance.findUnique({ where: { sessionId_userId: { sessionId: s.id, userId } } });
  const adjusted = status === "PRESENT" ? total - (before?.creditedSeconds ?? 0) : status === "PARTIAL" ? Math.round(total / 2) - (before?.creditedSeconds ?? 0) : -(before?.creditedSeconds ?? 0);
  await db.liveAttendance.upsert({ where: { sessionId_userId: { sessionId: s.id, userId } }, create: { sessionId: s.id, userId, status, adjustedSeconds: adjusted, adjustmentReason: reason, adjustedById: u.id }, update: { status, adjustedSeconds: adjusted, adjustmentReason: reason, adjustedById: u.id } });
  await audit({ actorId: u.id, actorRole: u.role, action: "ATTENDANCE_CORRECT", targetType: "LiveAttendance", targetId: s.id, studentId: userId, oldValue: before?.status, newValue: status, reason });
  go(`/mentor/live/${s.id}`, "Attendance updated");
}
