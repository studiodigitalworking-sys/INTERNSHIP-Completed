import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { answerQuestion, cohortScope, markAttendance } from "@/app/actions/mentor";
import { Badge, Flash, PageHeader } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";

export default async function ManageLive({ params, searchParams }: { params: { id: string }; searchParams: { ok?: string; error?: string } }) {
  const u = await requirePermission("mentor.review");
  const s = await db.liveSession.findFirst({ where: { id: params.id, cohort: await cohortScope(u) }, include: { cohort: { include: { enrollments: { where: { status: { in: ["ACTIVE", "COMPLETED"] } }, include: { student: true } } } }, attendance: true, questions: { include: { user: true }, orderBy: { createdAt: "asc" } } } });
  if (!s) notFound();
  return (
    <>
      <PageHeader title={s.title} sub={`${s.cohort.code} · ${fmtDateTime(s.startsAt)} – ${fmtDateTime(s.endsAt)}`} actions={<a className="btn-outline" href="/api/export/attendance">Export attendance CSV</a>} />
      <Flash searchParams={searchParams} />
      <div className="card overflow-x-auto p-0"><table className="table"><thead><tr><th>Student</th><th>Credited</th><th>Status</th><th>Mark / correct (audited)</th></tr></thead><tbody>
        {s.cohort.enrollments.map((e) => { const a = s.attendance.find((x) => x.userId === e.studentId); return (
          <tr key={e.id}><td>{e.student.name}</td><td>{a ? `${Math.round(a.creditedSeconds / 60)} min` : "—"}{a?.adjustedSeconds ? ` (adj ${Math.round(a.adjustedSeconds / 60)})` : ""}</td><td>{a ? <Badge>{a.status}</Badge> : "—"}</td>
            <td><form action={markAttendance} className="flex flex-wrap gap-1"><input type="hidden" name="sessionId" value={s.id} /><input type="hidden" name="userId" value={e.studentId} /><select name="status" className="input w-28" aria-label="Status"><option>PRESENT</option><option>PARTIAL</option><option>ABSENT</option></select><input name="reason" className="input w-48" placeholder={s.youtubeId === "OFFLINE" ? "Offline register" : "Reason (required)"} aria-label="Reason" /><button className="btn-outline btn-sm">Save</button></form></td></tr>); })}
      </tbody></table></div>
      <div className="card mt-6"><div className="h2">Questions</div>
        <ul className="mt-2 space-y-2">{s.questions.map((q) => <li key={q.id} className="rounded border p-2 text-sm"><strong>{q.user.name}:</strong> {q.text} <Badge>{q.status}</Badge>{q.answer ? <div className="text-emerald-800">↳ {q.answer}</div> : <form action={answerQuestion} className="mt-1 flex gap-2"><input type="hidden" name="id" value={q.id} /><input name="answer" required className="input" aria-label="Answer" /><button className="btn-primary btn-sm">Answer</button></form>}</li>)}</ul>
      </div>
    </>
  );
}
