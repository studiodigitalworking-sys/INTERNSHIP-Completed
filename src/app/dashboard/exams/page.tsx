import Link from "next/link";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { Badge, Empty, Flash, PageHeader } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import { startExam } from "@/app/actions/student";

export default async function Exams({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  const u = await requireStudent();
  const exams = await db.exam.findMany({ where: { published: true, programme: { cohorts: { some: { enrollments: { some: { studentId: u.id, status: { in: ["ACTIVE", "COMPLETED"] } } } } } } }, include: { attempts: { where: { userId: u.id }, orderBy: { attemptNo: "desc" } }, _count: { select: { questions: true } } } });
  return (
    <>
      <PageHeader title="Exams" sub="Timed exams graded on the server. Your answers autosave; the timer continues even if you close the page." />
      <Flash searchParams={searchParams} />
      {!exams.length && <Empty title="No exams available" />}
      <div className="space-y-4">{exams.map((e) => {
        const open = e.attempts.find((a) => a.status === "IN_PROGRESS");
        const passed = e.attempts.some((a) => a.passed);
        const left = e.maxAttempts - e.attempts.length;
        return (
          <div key={e.id} className="card">
            <div className="flex flex-wrap items-center justify-between gap-2"><div><div className="h2">{e.title}</div><div className="text-sm text-slate-500">{e._count.questions} questions · {e.durationMin} min · pass {e.passPercent}% · {left} attempt(s) left</div></div>
              {open ? <Link href={`/dashboard/exams/${open.id}`} className="btn-accent">Resume</Link> : passed ? <Badge tone="green">Passed</Badge> : left > 0 ? <form action={startExam}><input type="hidden" name="examId" value={e.id} /><button className="btn-primary">Start attempt</button></form> : <Badge tone="red">No attempts left</Badge>}</div>
            {e.attempts.length > 0 && <table className="table mt-3"><thead><tr><th>#</th><th>Started</th><th>Status</th><th>Score</th></tr></thead><tbody>{e.attempts.map((a) => <tr key={a.id}><td>{a.attemptNo}</td><td>{fmtDateTime(a.startedAt)}</td><td><Badge>{a.status}</Badge></td><td>{a.percent != null ? <Link className="link" href={`/dashboard/exams/${a.id}`}>{a.score}/{a.maxScore} ({a.percent}%) {a.passed ? "✓" : "✗"}</Link> : "—"}</td></tr>)}</tbody></table>}
          </div>
        );
      })}</div>
    </>
  );
}
