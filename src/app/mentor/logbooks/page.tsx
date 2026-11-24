import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { cohortScope, reviewWorkLog } from "@/app/actions/mentor";
import { Empty, Flash, PageHeader } from "@/components/ui";
import { fmtDate } from "@/lib/format";

export default async function Reviews({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  const u = await requirePermission("mentor.review");
  const logs = await db.workLog.findMany({ where: { status: "SUBMITTED", enrollment: { cohort: await cohortScope(u) } }, include: { user: true, enrollment: { include: { cohort: true } } }, orderBy: { date: "asc" } });
  return (
    <>
      <PageHeader title="Logbook reviews" sub="Approve only work you can verify. Returned entries need a note." />
      <Flash searchParams={searchParams} />
      {!logs.length && <Empty title="Nothing to review" />}
      <div className="space-y-3">{logs.map((l) => (
        <div key={l.id} className="card">
          <div className="flex flex-wrap justify-between gap-2"><strong>{l.user.name}</strong><span className="text-sm text-slate-500">{l.enrollment.cohort.code} · {fmtDate(l.date)} · {(l.minutes / 60).toFixed(2)} h · {l.category}</span></div>
          <p className="mt-1 text-sm">{l.tasks}</p>{l.learning && <p className="text-xs text-slate-500">Learning: {l.learning}</p>}{l.evidenceUrl && <a href={l.evidenceUrl} className="link text-xs" target="_blank" rel="noreferrer">Evidence</a>}
          <form action={reviewWorkLog} className="mt-2 flex flex-wrap gap-2"><input type="hidden" name="id" value={l.id} /><input name="note" className="input max-w-sm" placeholder="Note (required to return)" aria-label="Review note" /><button name="decision" value="approve" className="btn-primary btn-sm">Approve</button><button name="decision" value="reject" className="btn-outline btn-sm">Return</button></form>
        </div>
      ))}</div>
    </>
  );
}
