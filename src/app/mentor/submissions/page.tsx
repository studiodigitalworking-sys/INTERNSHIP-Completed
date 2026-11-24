import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { cohortScope, reviewSubmission } from "@/app/actions/mentor";
import { Badge, Empty, Flash, PageHeader } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";

export default async function Subs({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  const u = await requirePermission("mentor.review");
  const subs = await db.submission.findMany({ where: { status: { in: ["SUBMITTED", "LATE"] }, assignment: { cohort: await cohortScope(u) } }, include: { user: true, assignment: { include: { cohort: true } } }, orderBy: { createdAt: "asc" } });
  return (
    <>
      <PageHeader title="Submissions to grade" />
      <Flash searchParams={searchParams} />
      {!subs.length && <Empty title="No pending submissions" />}
      <div className="space-y-3">{subs.map((s) => (
        <div key={s.id} className="card">
          <div className="flex flex-wrap justify-between gap-2"><strong>{s.user.name} — {s.assignment.title} (v{s.version})</strong><span className="text-xs text-slate-500">{s.assignment.cohort.code} · {fmtDateTime(s.createdAt)} <Badge>{s.status}</Badge></span></div>
          <p className="mt-1 whitespace-pre-wrap text-sm">{s.content}</p>{s.linkUrl && <a className="link text-xs" href={s.linkUrl} target="_blank" rel="noreferrer">{s.linkUrl}</a>}
          <form action={reviewSubmission} className="mt-2 grid gap-2 sm:grid-cols-6"><input type="hidden" name="id" value={s.id} /><input name="marks" type="number" min={0} max={s.assignment.maxMarks} className="input" placeholder={`/${s.assignment.maxMarks}`} aria-label="Marks" /><input name="feedback" required className="input sm:col-span-3" placeholder="Feedback" aria-label="Feedback" /><button name="decision" value="grade" className="btn-primary btn-sm">Grade</button><button name="decision" value="revise" className="btn-outline btn-sm">Request revision</button></form>
        </div>
      ))}</div>
    </>
  );
}
