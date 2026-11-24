import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { PageHeader, Badge, Stat } from "@/components/ui";
import { fmtDate, fmtDateTime, rupees } from "@/lib/format";
import { completionEligibility } from "@/lib/credential";
import { raiseException } from "@/app/actions/admin";
import { EXCEPTION_TYPES } from "@/lib/constants";

export default async function Student360({ params }: { params: { id: string } }) {
  const u = await requirePermission("student360.view");
  const s = await db.user.findFirst({ where: { id: params.id, role: "STUDENT", ...(u.role === "COLLEGE_ADMIN" || u.role === "FACULTY_COORDINATOR" ? { institutionId: u.institutionId ?? "__none__" } : {}) }, include: { profile: true, consents: true, applications: { include: { programme: true } }, enrollments: { include: { cohort: { include: { programme: true } } } }, orders: { include: { payments: true } }, workLogs: true, attempts: { include: { exam: true } }, credentials: true, attendance: { include: { session: true } }, tickets: true } });
  if (!s) notFound();
  await audit({ actorId: u.id, actorRole: u.role, action: "STUDENT360_VIEW", targetType: "User", targetId: s.id, studentId: s.id });
  const elig = await Promise.all(s.enrollments.map((e) => completionEligibility(s.id, e.id)));
  const [events, exceptions] = await Promise.all([db.auditEvent.findMany({ where: { studentId: s.id }, orderBy: { createdAt: "desc" }, take: 30 }), db.exceptionRequest.findMany({ where: { studentId: s.id }, orderBy: { createdAt: "desc" } })]);
  const hrs = (st: string) => (s.workLogs.filter((l) => l.status === st).reduce((a, l) => a + l.minutes, 0) / 60).toFixed(1);
  return (
    <>
      <PageHeader title={s.name} sub={`${s.email} · ${s.phone ?? "—"} · ${s.profile?.college ?? "—"} · ${s.profile?.degree ?? ""} ${s.profile?.semester ?? ""}`} actions={<Badge>{s.status}</Badge>} />
      <div className="grid gap-4 sm:grid-cols-4"><Stat label="Approved hours" value={hrs("APPROVED")} /><Stat label="Pending hours" value={hrs("SUBMITTED")} /><Stat label="Credentials" value={s.credentials.length} /><Stat label="Open tickets" value={s.tickets.filter((t) => t.status !== "CLOSED").length} /></div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card"><div className="h2">Enrolments & eligibility</div>{s.enrollments.map((e, i) => <div key={e.id} className="mt-3 border-t pt-2 text-sm"><div className="flex justify-between"><strong>{e.cohort.programme.title}</strong><Badge>{e.status}</Badge></div><div className="text-xs text-slate-500">{e.cohort.code} · enrolment {e.id.slice(0, 8)}</div><ul className="mt-1 text-xs">{elig[i].checks.map((c) => <li key={c.rule}>{c.passed ? "✅" : "⬜"} {c.rule}: {c.detail}</li>)}</ul></div>)}</div>
        <div className="card"><div className="h2">Applications & payments</div><ul className="mt-2 text-sm">{s.applications.map((a) => <li key={a.id}>{a.programme.title} — <Badge>{a.status}</Badge></li>)}</ul><ul className="mt-2 text-sm">{s.orders.map((o) => <li key={o.id}>{rupees(o.amountPaise)} — <Badge>{o.status}</Badge> {o.receiptNo && <Link className="link" href={`/receipt/${o.id}`}>{o.receiptNo}</Link>}</li>)}</ul></div>
        <div className="card"><div className="h2">Exams</div><ul className="mt-2 text-sm">{s.attempts.map((a) => <li key={a.id}>{a.exam.title} #{a.attemptNo}: {a.percent ?? "—"}% <Badge>{a.status}</Badge> {a.telemetry && <span className="text-xs text-slate-500">signals {a.telemetry}</span>}</li>)}</ul></div>
        <div className="card"><div className="h2">Attendance</div><ul className="mt-2 text-sm">{s.attendance.map((a) => <li key={a.id}>{a.session.title} ({fmtDate(a.session.startsAt)}): <Badge>{a.status}</Badge> {Math.round(a.creditedSeconds / 60)} min{a.adjustmentReason ? ` · adj: ${a.adjustmentReason}` : ""}</li>)}</ul></div>
        <div className="card"><div className="h2">Credentials</div><ul className="mt-2 text-sm">{s.credentials.map((c) => <li key={c.id}><Link className="link" href={`/admin/credentials/${c.id}`}>{c.code}</Link> {c.title} <Badge>{c.status}</Badge></li>)}</ul></div>
        <div className="card"><div className="h2">Consents</div><ul className="mt-2 text-sm">{s.consents.map((c) => <li key={c.id}>{c.type} v{c.version} {c.withdrawnAt ? "(withdrawn)" : ""}</li>)}</ul>{s.profile?.isMinor && <p className="text-xs text-amber-700">Minor — guardian: {s.profile.guardianName}</p>}</div>
      </div>
      <form action={raiseException} className="card mt-6 grid gap-3 md:grid-cols-4">
        <div className="h2 md:col-span-4">Raise exception / correction (needs approval by another officer)</div>
        <input type="hidden" name="studentId" value={s.id} />
        <select name="type" className="input" aria-label="Exception type">{EXCEPTION_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
        <input name="targetId" className="input" placeholder="Target record ID" aria-label="Target record ID" />
        <input name="evidenceRef" className="input" placeholder="Evidence reference" aria-label="Evidence reference" />
        <input name="reason" required className="input" placeholder="Reason" aria-label="Reason" />
        <button className="btn-primary md:col-span-4">Raise</button>
      </form>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card"><div className="h2">Exceptions</div><ul className="mt-2 text-sm">{exceptions.map((e) => <li key={e.id}>{e.type} — <Badge>{e.status}</Badge> <span className="text-xs">{e.reason}</span></li>)}</ul></div>
        <div className="card"><div className="h2">Audit timeline</div><ul className="mt-2 text-xs">{events.map((e) => <li key={e.id}>{fmtDateTime(e.createdAt)} · {e.action} · {e.actorRole ?? "system"}{e.reason ? ` · ${e.reason}` : ""}</li>)}</ul></div>
      </div>
    </>
  );
}
