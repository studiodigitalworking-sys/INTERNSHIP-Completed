import Link from "next/link";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { Empty, PageHeader, Progress, Badge } from "@/components/ui";
import { coveragePercent } from "@/lib/watch";

export default async function Learning() {
  const u = await requireStudent();
  const enr = await db.enrollment.findMany({ where: { studentId: u.id, status: { in: ["ACTIVE", "COMPLETED"] } }, include: { cohort: { include: { programme: { include: { courses: { include: { modules: { orderBy: { order: "asc" }, include: { lessons: { orderBy: { order: "asc" }, include: { progress: { where: { userId: u.id } } } } } } } } } } } } } });
  if (!enr.length) return (<><PageHeader title="My learning" /><Empty title="No active enrolment">Learning unlocks after your enrolment is activated by a verified payment.</Empty></>);
  return (
    <>
      <PageHeader title="My learning" sub="Lessons unlock in order. Each completes at 90% unique watch coverage." />
      {enr.map((e) => e.cohort.programme.courses.map((c) => {
        const lessons = c.modules.flatMap((m) => m.lessons);
        const done = lessons.filter((l) => l.progress[0]?.completed).length;
        let prevDone = true;
        return (
          <div key={c.id} className="card mb-6">
            <div className="flex flex-wrap items-center justify-between gap-2"><div><div className="h2">{c.title}</div><div className="text-sm text-slate-500">{e.cohort.programme.title}</div></div><Badge tone="blue">{`${done}/${lessons.length} lessons`}</Badge></div>
            <div className="mt-3"><Progress value={lessons.length ? (done / lessons.length) * 100 : 0} /></div>
            {c.modules.map((m) => (
              <div key={m.id} className="mt-4"><div className="text-sm font-semibold text-slate-600">{m.title}</div>
                <ul className="mt-2 divide-y rounded-lg border">{m.lessons.map((l) => {
                  const p = l.progress[0];
                  const unlocked = prevDone;
                  prevDone = !!p?.completed;
                  const pct = p ? coveragePercent(p.uniqueSeconds, l.durationSec) : 0;
                  return (
                    <li key={l.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <span>{p?.completed ? "✅" : unlocked ? "▶️" : "🔒"} {l.title} <span className="text-xs text-slate-400">({Math.round(l.durationSec / 60)} min · {pct}%)</span></span>
                      {unlocked ? <Link href={`/dashboard/learning/${l.id}`} className="btn-outline btn-sm">{p?.completed ? "Review" : "Watch"}</Link> : <span className="text-xs text-slate-400">Complete previous lesson</span>}
                    </li>
                  );
                })}</ul>
              </div>
            ))}
          </div>
        );
      }))}
    </>
  );
}
