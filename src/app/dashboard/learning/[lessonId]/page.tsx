import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { Notice, PageHeader } from "@/components/ui";
import { LessonPlayer } from "@/components/LessonPlayer";
import { coveragePercent } from "@/lib/watch";

export default async function LessonPage({ params }: { params: { lessonId: string } }) {
  const u = await requireStudent();
  const lesson = await db.lesson.findUnique({ where: { id: params.lessonId }, include: { module: { include: { course: { include: { modules: { orderBy: { order: "asc" }, include: { lessons: { orderBy: { order: "asc" } } } } } } } } } });
  if (!lesson) notFound();
  const enrolled = await db.enrollment.findFirst({ where: { studentId: u.id, status: { in: ["ACTIVE", "COMPLETED"] }, cohort: { programmeId: lesson.module.course.programmeId } } });
  if (!enrolled) return <Notice tone="red">You are not enrolled in this programme.</Notice>;
  const ordered = lesson.module.course.modules.flatMap((m) => m.lessons);
  const idx = ordered.findIndex((l) => l.id === lesson.id);
  const prev = idx > 0 ? ordered[idx - 1] : null;
  const next = ordered[idx + 1];
  if (prev) {
    const pp = await db.watchProgress.findUnique({ where: { userId_lessonId: { userId: u.id, lessonId: prev.id } } });
    if (!pp?.completed) return <Notice>Complete &quot;{prev.title}&quot; first. <Link className="link" href={`/dashboard/learning/${prev.id}`}>Go to previous lesson</Link></Notice>;
  }
  const wp = await db.watchProgress.findUnique({ where: { userId_lessonId: { userId: u.id, lessonId: lesson.id } } });
  return (
    <>
      <PageHeader title={lesson.title} sub={`${lesson.module.course.title} · ${lesson.module.title}`} actions={<Link href="/dashboard/learning" className="btn-outline">All lessons</Link>} />
      <LessonPlayer lessonId={lesson.id} videoId={lesson.videoId} durationSec={lesson.durationSec} startAt={wp?.lastPosition ?? 0} initialPercent={wp ? coveragePercent(wp.uniqueSeconds, lesson.durationSec) : 0} initialCompleted={!!wp?.completed} />
      {lesson.body && <div className="card mt-4 text-sm text-slate-700">{lesson.body}</div>}
      {lesson.resourceUrl && <a className="link mt-2 inline-block" href={lesson.resourceUrl} target="_blank" rel="noreferrer">Download resources</a>}
      {next && <div className="mt-4 text-right"><Link href={`/dashboard/learning/${next.id}`} className="btn-primary">Next: {next.title} →</Link></div>}
    </>
  );
}
