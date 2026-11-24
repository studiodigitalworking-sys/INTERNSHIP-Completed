import Link from "next/link";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { Badge, Empty, PageHeader } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";

export default async function Live() {
  const u = await requireStudent();
  const sessions = await db.liveSession.findMany({ where: { cohort: { enrollments: { some: { studentId: u.id, status: { in: ["ACTIVE", "COMPLETED"] } } } }, status: { not: "CANCELLED" } }, include: { cohort: true, attendance: { where: { userId: u.id } } }, orderBy: { startsAt: "desc" } });
  const now = new Date();
  return (
    <>
      <PageHeader title="Live classes" sub="Join through this page so your attendance is recorded. Times are in IST." />
      {sessions.length ? (
        <div className="card overflow-x-auto p-0"><table className="table"><thead><tr><th>Class</th><th>When</th><th>Status</th><th>My attendance</th><th /></tr></thead><tbody>
          {sessions.map((s) => {
            const live = s.startsAt <= now && s.endsAt >= now;
            const a = s.attendance[0];
            return <tr key={s.id}><td>{s.title}<div className="text-xs text-slate-400">{s.cohort.code}</div></td><td>{fmtDateTime(s.startsAt)}</td><td><Badge>{live ? "LIVE" : s.endsAt < now ? "ENDED" : "SCHEDULED"}</Badge></td><td>{a ? <><Badge>{a.status}</Badge> <span className="text-xs">{Math.round((a.creditedSeconds + (a.adjustedSeconds ?? 0)) / 60)} min</span></> : "—"}</td>
              <td>{live ? <Link href={`/dashboard/live/${s.id}`} className="btn-danger btn-sm">Join</Link> : s.endsAt < now ? <Link href={`/dashboard/live/${s.id}`} className="btn-outline btn-sm">Recording</Link> : null}</td></tr>;
          })}
        </tbody></table></div>
      ) : <Empty title="No live classes yet" />}
    </>
  );
}
