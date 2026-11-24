import Link from "next/link";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { cohortScope, scheduleLive } from "@/app/actions/mentor";
import { Badge, Flash, PageHeader } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";

export default async function MentorLive({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  const u = await requirePermission("mentor.review");
  const scope = await cohortScope(u);
  const [cohorts, sessions] = await Promise.all([db.cohort.findMany({ where: scope }), db.liveSession.findMany({ where: { cohort: scope }, include: { cohort: true, _count: { select: { attendance: true, questions: true } } }, orderBy: { startsAt: "desc" } })]);
  return (
    <>
      <PageHeader title="Live & offline classes" />
      <Flash searchParams={searchParams} />
      <form action={scheduleLive} className="card grid gap-3 md:grid-cols-6">
        <div className="md:col-span-2"><label className="label" htmlFor="cohortId">Cohort</label><select id="cohortId" name="cohortId" className="input">{cohorts.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}</select></div>
        <div className="md:col-span-2"><label className="label" htmlFor="title">Title</label><input id="title" name="title" required className="input" /></div>
        <div><label className="label" htmlFor="startsAt">Starts (IST)</label><input id="startsAt" name="startsAt" type="datetime-local" required className="input" /></div>
        <div><label className="label" htmlFor="minutes">Minutes</label><input id="minutes" name="minutes" type="number" defaultValue={60} min={15} max={480} className="input" /></div>
        <div className="md:col-span-3"><label className="label" htmlFor="youtubeId">YouTube Live URL or video ID</label><input id="youtubeId" name="youtubeId" className="input" /></div>
        <label className="flex items-end gap-2 text-sm md:col-span-2"><input type="checkbox" name="offline" /> Offline class at centre (use attendance register)</label>
        <button className="btn-primary">Schedule</button>
      </form>
      <div className="card mt-6 overflow-x-auto p-0"><table className="table"><thead><tr><th>Session</th><th>Cohort</th><th>When</th><th>Attendees</th><th>Questions</th><th /></tr></thead><tbody>
        {sessions.map((s) => <tr key={s.id}><td>{s.title} {s.youtubeId === "OFFLINE" && <Badge tone="purple">Offline</Badge>}</td><td>{s.cohort.code}</td><td>{fmtDateTime(s.startsAt)}</td><td>{s._count.attendance}</td><td>{s._count.questions}</td><td><Link href={`/mentor/live/${s.id}`} className="btn-outline btn-sm">Manage</Link></td></tr>)}
      </tbody></table></div>
    </>
  );
}
