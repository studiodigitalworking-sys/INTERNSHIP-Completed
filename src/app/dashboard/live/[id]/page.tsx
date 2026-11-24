import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { Flash, Notice, PageHeader, Badge } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import { LiveRoom } from "@/components/LiveRoom";
import { askLiveQuestion } from "@/app/actions/student";

export default async function LivePage({ params, searchParams }: { params: { id: string }; searchParams: { ok?: string; error?: string } }) {
  const u = await requireStudent();
  const s = await db.liveSession.findUnique({ where: { id: params.id }, include: { cohort: true, questions: { orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } } } } });
  if (!s) notFound();
  const enrolled = await db.enrollment.findFirst({ where: { studentId: u.id, cohortId: s.cohortId, status: { in: ["ACTIVE", "COMPLETED"] } } });
  if (!enrolled) return <Notice tone="red">You are not enrolled in this cohort.</Notice>;
  const now = new Date();
  const live = s.startsAt <= now && s.endsAt >= now && s.status !== "CANCELLED";
  return (
    <>
      <PageHeader title={s.title} sub={`${s.cohort.code} · ${fmtDateTime(s.startsAt)} – ${fmtDateTime(s.endsAt)}`} />
      <Flash searchParams={searchParams} />
      <LiveRoom sessionId={s.id} youtubeId={s.youtubeId} live={live} />
      <div className="card mt-4">
        <div className="h2">Questions & answers</div>
        {live && <form action={askLiveQuestion} className="mt-3 flex gap-2"><input type="hidden" name="sessionId" value={s.id} /><input name="text" required minLength={3} maxLength={500} className="input" placeholder="Ask the mentor a question" aria-label="Question" /><button className="btn-primary">Ask</button></form>}
        <ul className="mt-3 space-y-2 text-sm">{s.questions.map((q) => <li key={q.id} className="rounded border p-2"><div><strong>{q.user.name}:</strong> {q.text} <Badge>{q.status}</Badge></div>{q.answer && <div className="mt-1 text-emerald-800">↳ {q.answer}</div>}</li>)}{!s.questions.length && <li className="muted">No questions yet.</li>}</ul>
      </div>
    </>
  );
}
