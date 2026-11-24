import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { cohortScope } from "@/app/actions/mentor";
import { PageHeader, Stat, Badge } from "@/components/ui";
import { fmtDate } from "@/lib/format";

export default async function MentorHome() {
  const u = await requirePermission("mentor.review");
  const scope = await cohortScope(u);
  const cohorts = await db.cohort.findMany({ where: scope, include: { programme: true, _count: { select: { enrollments: true } } } });
  const ids = cohorts.map((c) => c.id);
  const [logs, subs, qs] = await Promise.all([
    db.workLog.count({ where: { status: "SUBMITTED", enrollment: { cohortId: { in: ids } } } }),
    db.submission.count({ where: { status: { in: ["SUBMITTED", "LATE"] }, assignment: { cohortId: { in: ids } } } }),
    db.liveQuestion.count({ where: { status: "OPEN", session: { cohortId: { in: ids } } } }),
  ]);
  return (
    <>
      <PageHeader title="Mentor overview" sub="You can see only cohorts assigned to you." />
      <div className="grid gap-4 sm:grid-cols-4"><Stat label="Cohorts" value={cohorts.length} /><Stat label="Logbook entries to review" value={logs} href="/mentor/logbooks" /><Stat label="Submissions to grade" value={subs} href="/mentor/submissions" /><Stat label="Open live questions" value={qs} href="/mentor/live" /></div>
      <div className="card mt-6 overflow-x-auto p-0"><table className="table"><thead><tr><th>Cohort</th><th>Programme</th><th>Dates</th><th>Students</th><th>Status</th></tr></thead><tbody>{cohorts.map((c) => <tr key={c.id}><td>{c.code}</td><td>{c.programme.title}</td><td>{fmtDate(c.startDate)} – {fmtDate(c.endDate)}</td><td>{c._count.enrollments}</td><td><Badge>{c.status}</Badge></td></tr>)}</tbody></table></div>
    </>
  );
}
