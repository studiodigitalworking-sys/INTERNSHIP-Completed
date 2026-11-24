import Link from "next/link";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { Badge, Flash, Notice, PageHeader, Progress, Stat } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import { getSettings } from "@/lib/settings";

export default async function StudentHome({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  const u = await requireStudent();
  const s = await getSettings();
  const [enrollments, apps, logs, certs, unread, live, profile] = await Promise.all([
    db.enrollment.findMany({ where: { studentId: u.id }, include: { cohort: { include: { programme: true } } } }),
    db.application.count({ where: { studentId: u.id, status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
    db.workLog.findMany({ where: { userId: u.id } }),
    db.credential.count({ where: { userId: u.id, status: { in: ["ISSUED", "CORRECTED"] } } }),
    db.notification.count({ where: { userId: u.id, readAt: null } }),
    db.liveSession.findMany({ where: { cohort: { enrollments: { some: { studentId: u.id, status: "ACTIVE" } } }, endsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" }, take: 3, include: { cohort: true } }),
    db.studentProfile.findUnique({ where: { userId: u.id } }),
  ]);
  const approved = logs.filter((l) => l.status === "APPROVED").reduce((a, l) => a + l.minutes, 0) / 60;
  const pending = logs.filter((l) => l.status === "SUBMITTED").reduce((a, l) => a + l.minutes, 0) / 60;
  const total = Number(s["rules.totalHours"]);
  const pendingPay = enrollments.filter((e) => e.status === "PENDING_PAYMENT");
  return (
    <>
      <PageHeader title={`Namaste, ${u.name.split(" ")[0]}`} sub="Your internship at a glance." />
      <Flash searchParams={searchParams} />
      {(!profile?.college || !profile?.degree) && <div className="mb-4"><Notice>Complete your <Link href="/dashboard/profile" className="link">profile</Link> (college, degree, semester) — it is required for eligibility and documents.</Notice></div>}
      {pendingPay.map((e) => <div key={e.id} className="mb-4"><Notice tone="blue">Your application for <strong>{e.cohort.programme.title}</strong> is approved. <Link href="/dashboard/payments" className="link">Complete payment</Link> to activate your enrolment.</Notice></div>)}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Approved hours" value={`${approved.toFixed(1)} / ${total}`} hint={`${pending.toFixed(1)} h awaiting mentor review`} href="/dashboard/logbook" />
        <Stat label="Active enrolments" value={enrollments.filter((e) => e.status === "ACTIVE").length} href="/dashboard/learning" />
        <Stat label="Pending applications" value={apps} href="/dashboard/applications" />
        <Stat label="Documents issued" value={certs} hint={`${unread} unread notifications`} href="/dashboard/certificates" />
      </div>
      <div className="card mt-6"><div className="h2">Progress toward {total} hours</div><div className="mt-3"><Progress value={(approved / total) * 100} label={`${((approved / total) * 100).toFixed(0)}% of required hours approved`} /></div></div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="h2">Upcoming & live classes</div>
          <ul className="mt-3 space-y-3">{live.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-2">
              <div><div className="font-medium">{l.title}</div><div className="text-xs text-slate-500">{l.cohort.code} · {fmtDateTime(l.startsAt)}</div></div>
              {l.startsAt <= new Date() ? <Link className="btn-danger btn-sm" href={`/dashboard/live/${l.id}`}>Join live</Link> : <Badge>SCHEDULED</Badge>}
            </li>))}
            {!live.length && <li className="muted">No upcoming classes.</li>}
          </ul>
        </div>
        <div className="card">
          <div className="h2">My enrolments</div>
          <ul className="mt-3 space-y-2">{enrollments.map((e) => <li key={e.id} className="flex justify-between gap-2"><span>{e.cohort.programme.title}<br /><span className="text-xs text-slate-500">{e.cohort.code}</span></span><Badge>{e.status}</Badge></li>)}
            {!enrollments.length && <li className="muted">No enrolments yet. <Link className="link" href="/programmes">Browse programmes</Link></li>}</ul>
        </div>
      </div>
    </>
  );
}
