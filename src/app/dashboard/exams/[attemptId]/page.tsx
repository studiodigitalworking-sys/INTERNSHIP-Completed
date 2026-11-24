import { notFound } from "next/navigation";
import { requireStudent } from "@/lib/auth";
import { getPaper, finalizeAttempt } from "@/app/actions/student";
import { Badge, PageHeader, Notice } from "@/components/ui";
import { ExamRunner } from "@/components/ExamRunner";
import Link from "next/link";

export default async function Attempt({ params }: { params: { attemptId: string } }) {
  const u = await requireStudent();
  let data = await getPaper(params.attemptId, u.id);
  if (!data) notFound();
  if (data.attempt.status === "IN_PROGRESS" && Date.now() > data.attempt.deadlineAt.getTime() + 30_000) {
    await finalizeAttempt(data.attempt.id, u.id);
    data = (await getPaper(params.attemptId, u.id))!;
  }
  const a = data.attempt;
  if (a.status !== "IN_PROGRESS") {
    return (
      <>
        <PageHeader title={a.exam.title} sub={`Attempt ${a.attemptNo}`} actions={<Link href="/dashboard/exams" className="btn-outline">Back</Link>} />
        <div className="card max-w-md"><div className="text-sm text-slate-500">Result</div><div className="text-3xl font-bold">{a.score}/{a.maxScore} · {a.percent}%</div><div className="mt-2">{a.passed ? <Badge tone="green">Passed</Badge> : <Badge tone="red">Not passed</Badge>} <Badge>{a.status}</Badge></div>
          <p className="mt-3 text-xs text-slate-500">Correct answers are not displayed to protect the question bank. Request re-evaluation from Attendance → Request a correction if you believe there is an error.</p></div>
      </>
    );
  }
  return (
    <>
      <PageHeader title={a.exam.title} sub={`Attempt ${a.attemptNo} · ${data.paper.length} questions`} />
      <Notice>Do not refresh repeatedly or open in multiple tabs. Tab switches are recorded as risk signals for human review only.</Notice>
      <ExamRunner attemptId={a.id} paper={data.paper} saved={JSON.parse(a.answers || "{}")} deadline={a.deadlineAt.toISOString()} />
    </>
  );
}
