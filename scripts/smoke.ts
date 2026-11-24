/* Authenticated smoke test: creates short-lived sessions for demo users and GETs every portal route. Dev only. */
import { randomBytes, createHash } from "crypto";
import { db } from "../src/lib/db";

const BASE = process.env.SMOKE_URL || "http://localhost:3000";
async function session(email: string) {
  const u = await db.user.findUniqueOrThrow({ where: { email } });
  const token = randomBytes(32).toString("hex");
  await db.session.create({ data: { userId: u.id, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 600_000) } });
  return { token, u };
}
async function get(path: string, token: string) {
  const r = await fetch(BASE + path, { headers: { cookie: `iv_session=${token}` }, redirect: "manual" });
  const body = r.status === 200 ? await r.text() : "";
  const bad = r.status >= 500 || body.includes("Something went wrong") || body.includes("Application error");
  return { path, status: r.status, bad };
}

async function main() {
  const out: { path: string; status: number; bad: boolean; who: string }[] = [];
  const run = async (email: string, paths: string[]) => { const { token } = await session(email); for (const p of paths) out.push({ ...(await get(p, token)), who: email.split("@")[0] }); };
  const st = await db.user.findUniqueOrThrow({ where: { email: "student@internverse.local" } });
  const lesson = await db.lesson.findFirst({ where: { module: { course: { programme: { cohorts: { some: { enrollments: { some: { studentId: st.id } } } } } } } }, orderBy: { order: "asc" } });
  const live = await db.liveSession.findFirst({ where: { cohort: { enrollments: { some: { studentId: st.id } } } } });
  const cred = await db.credential.findFirst({ where: { userId: st.id } });
  const order = await db.order.findFirst({ where: { studentId: st.id, receiptNo: { not: null } } });
  const ticket = await db.supportTicket.findFirst({ where: { userId: st.id } });
  const prog = await db.programme.findFirst({ where: { publicationStatus: "PUBLISHED" } });
  await run("student@internverse.local", ["/dashboard", "/dashboard/applications", "/dashboard/payments", "/dashboard/learning", `/dashboard/learning/${lesson?.id}`, "/dashboard/live", `/dashboard/live/${live?.id}`, "/dashboard/attendance", "/dashboard/logbook", "/dashboard/logbook/print", "/dashboard/assignments", "/dashboard/exams", "/dashboard/certificates", `/dashboard/certificates/${cred?.id}`, "/dashboard/jobs", "/dashboard/support", `/dashboard/support/${ticket?.id}`, "/dashboard/notifications", "/dashboard/profile", `/receipt/${order?.id}`, `/programmes/${prog?.code}`, "/jobs", "/admin", "/mentor", "/api/export/audit"]);
  await run("mentor@internverse.local", ["/mentor", "/mentor/students", "/mentor/logbooks", "/mentor/submissions", "/mentor/live", `/mentor/live/${live?.id}`, "/admin/payments"]);
  await run("owner@internverse.local", ["/admin", "/admin/students", `/admin/students/${st.id}`, "/admin/applications", "/admin/exceptions", "/admin/results", "/admin/programmes", `/admin/programmes/${prog?.id}`, "/admin/payments", "/admin/credentials", `/admin/credentials/${cred?.id}`, "/admin/support", `/admin/support/${ticket?.id}`, "/admin/users", "/admin/jobs", "/admin/announcements", "/admin/outbox", "/admin/reports", "/admin/audit", "/admin/ai", "/admin/backup", "/admin/settings", "/admin/launch", "/api/export/students", "/api/export/payments", "/mentor"]);
  await run("finance@internverse.local", ["/admin/payments", "/admin/credentials", "/admin/users"]);
  await run("college@internverse.local", ["/admin/students"]);
  await run("employer@internverse.local", ["/employer", "/admin"]);
  for (const r of out) console.log(`${r.bad ? "FAIL" : "ok  "} ${r.status} ${r.who.padEnd(9)} ${r.path}`);
  await db.session.deleteMany({ where: { userAgent: null, expiresAt: { lt: new Date(Date.now() + 601_000) }, createdAt: { gt: new Date(Date.now() - 120_000) } } });
  process.exit(out.some((r) => r.bad) ? 1 : 0);
}
main();
