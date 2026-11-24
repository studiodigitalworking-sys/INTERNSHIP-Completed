import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { Badge, Flash, PageHeader } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import { changeMarks } from "@/app/actions/admin";

export default async function Results({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  await requirePermission("marks.change");
  const attempts = await db.examAttempt.findMany({ where: { status: { not: "IN_PROGRESS" } }, include: { exam: true, user: true }, orderBy: { submittedAt: "desc" }, take: 200 });
  return (
    <>
      <PageHeader title="Results & marks" sub="Changes require a reason and are audited; students are notified." actions={<a href="/api/export/results" className="btn-outline">Export CSV</a>} />
      <Flash searchParams={searchParams} />
      <div className="card overflow-x-auto p-0"><table className="table"><thead><tr><th>Student</th><th>Exam</th><th>Submitted</th><th>Score</th><th>Signals</th><th>Adjust (audited)</th></tr></thead><tbody>
        {attempts.map((a) => <tr key={a.id}><td>{a.user.name}</td><td>{a.exam.title} #{a.attemptNo}</td><td className="text-xs">{fmtDateTime(a.submittedAt)}</td><td>{a.score}/{a.maxScore} ({a.percent}%) {a.passed ? <Badge tone="green">PASS</Badge> : <Badge tone="red">FAIL</Badge>}</td><td className="text-xs">{a.telemetry}</td>
          <td><form action={changeMarks} className="flex gap-1"><input type="hidden" name="id" value={a.id} /><input name="score" type="number" min={0} max={a.maxScore ?? 0} className="input w-20" aria-label="New score" /><input name="reason" className="input w-40" placeholder="Reason" aria-label="Reason" /><button className="btn-outline btn-sm">Save</button></form></td></tr>)}
      </tbody></table></div>
    </>
  );
}
