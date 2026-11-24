import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { Badge, Empty, Flash, PageHeader } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import { submitAssignment } from "@/app/actions/student";

export default async function Assignments({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  const u = await requireStudent();
  const list = await db.assignment.findMany({ where: { cohort: { enrollments: { some: { studentId: u.id, status: { in: ["ACTIVE", "COMPLETED"] } } } } }, include: { cohort: true, submissions: { where: { userId: u.id }, orderBy: { version: "desc" } } }, orderBy: { dueAt: "asc" } });
  return (
    <>
      <PageHeader title="Assignments & projects" />
      <Flash searchParams={searchParams} />
      {!list.length && <Empty title="No assignments yet" />}
      <div className="space-y-4">{list.map((a) => {
        const last = a.submissions[0];
        return (
          <div key={a.id} className="card">
            <div className="flex flex-wrap items-center justify-between gap-2"><div className="h2">{a.title}</div><div className="flex gap-2">{last ? <Badge>{last.status}</Badge> : <Badge tone="amber">Not submitted</Badge>}<span className="text-xs text-slate-500">Due {fmtDateTime(a.dueAt)} · {a.maxMarks} marks</span></div></div>
            <p className="mt-1 text-sm text-slate-700">{a.description}</p>
            {last?.status === "REVIEWED" && <div className="mt-2 rounded bg-emerald-50 p-2 text-sm">Marks: <strong>{last.marks}/{a.maxMarks}</strong> · Feedback: {last.feedback}</div>}
            {last && last.status !== "REVIEWED" && <div className="mt-2 text-xs text-slate-500">Version {last.version} submitted {fmtDateTime(last.createdAt)}{last.feedback ? ` · Mentor: ${last.feedback}` : ""}</div>}
            {last?.status !== "REVIEWED" && (
              <form action={submitAssignment} className="mt-3 space-y-2">
                <input type="hidden" name="assignmentId" value={a.id} />
                <label className="label" htmlFor={`c-${a.id}`}>{last ? "Resubmit (new version)" : "Your submission"}</label>
                <textarea id={`c-${a.id}`} name="content" rows={4} required minLength={20} className="input" />
                <input name="linkUrl" type="url" placeholder="Link to file / GitHub / Drive (optional)" className="input" aria-label="Submission link" />
                <button className="btn-primary btn-sm">Submit</button>
              </form>
            )}
          </div>
        );
      })}</div>
    </>
  );
}
