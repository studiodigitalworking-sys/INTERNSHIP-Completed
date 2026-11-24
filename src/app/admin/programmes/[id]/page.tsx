import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { Badge, Flash, Notice, PageHeader } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { createCohort, updateProgramme } from "@/app/actions/admin";

export default async function Prog({ params, searchParams }: { params: { id: string }; searchParams: { ok?: string; error?: string } }) {
  await requirePermission("programmes.manage");
  const p = await db.programme.findUnique({ where: { id: params.id }, include: { family: true, cohorts: { include: { mentor: true, _count: { select: { enrollments: true } } } }, courses: { include: { modules: { include: { lessons: true } } } }, exams: true } });
  if (!p) notFound();
  const mentors = await db.user.findMany({ where: { role: { in: ["MENTOR", "FACULTY_COORDINATOR", "HOST_SUPERVISOR"] }, status: "ACTIVE" } });
  const lessons = p.courses.flatMap((c) => c.modules.flatMap((m) => m.lessons)).length;
  return (
    <>
      <PageHeader title={p.title} sub={`${p.code} · ${p.family.name}`} actions={<Badge>{p.publicationStatus}</Badge>} />
      <Flash searchParams={searchParams} />
      <Notice>Source: {p.sourceStatus}. Launch note: {p.launchNote}. Readiness: {lessons} lessons, {p.exams.length} exam(s), {p.cohorts.length} cohort(s).</Notice>
      <form action={updateProgramme} className="card mt-4 grid gap-3 md:grid-cols-4">
        <input type="hidden" name="id" value={p.id} />
        <div><label className="label" htmlFor="publicationStatus">Status</label><select id="publicationStatus" name="publicationStatus" defaultValue={p.publicationStatus} className="input"><option>CATALOGUE</option><option>PUBLISHED</option><option>ARCHIVED</option></select></div>
        <div><label className="label" htmlFor="feeRupees">Fee (₹, incl. tax)</label><input id="feeRupees" name="feeRupees" type="number" min={0} step="1" defaultValue={p.feePaise / 100} className="input" /></div>
        <div><label className="label" htmlFor="durationHours">Hours</label><input id="durationHours" name="durationHours" type="number" defaultValue={p.durationHours} className="input" /></div>
        <div><label className="label" htmlFor="titleHi">Hindi title</label><input id="titleHi" name="titleHi" defaultValue={p.titleHi ?? ""} className="input" /></div>
        <div className="md:col-span-2"><label className="label" htmlFor="description">Description</label><textarea id="description" name="description" rows={3} defaultValue={p.description ?? ""} className="input" /></div>
        <div className="md:col-span-2"><label className="label" htmlFor="outcomes">Outcomes</label><textarea id="outcomes" name="outcomes" rows={3} defaultValue={p.outcomes ?? ""} className="input" /></div>
        <button className="btn-primary md:col-span-4">Save programme</button>
      </form>
      <div className="card mt-6"><div className="h2">Cohorts</div>
        <table className="table mt-2"><thead><tr><th>Code</th><th>Dates</th><th>Mode</th><th>Seats</th><th>Enrolled</th><th>Mentor</th><th>Host</th><th>Status</th></tr></thead><tbody>{p.cohorts.map((c) => <tr key={c.id}><td>{c.code}</td><td>{fmtDate(c.startDate)} – {fmtDate(c.endDate)}</td><td>{c.mode}</td><td>{c.seats}</td><td>{c._count.enrollments}</td><td>{c.mentor?.name ?? "—"}</td><td>{c.hostName ?? "—"}</td><td><Badge>{c.status}</Badge></td></tr>)}</tbody></table>
        <form action={createCohort} className="mt-4 grid gap-2 md:grid-cols-7"><input type="hidden" name="programmeId" value={p.id} />
          <input name="startDate" type="date" required className="input" aria-label="Start date" /><input name="endDate" type="date" required className="input" aria-label="End date" />
          <select name="mode" className="input" aria-label="Mode"><option>ONLINE</option><option>OFFLINE</option><option>HYBRID</option></select><input name="seats" type="number" defaultValue={40} className="input" aria-label="Seats" />
          <select name="mentorId" className="input" aria-label="Mentor"><option value="">No mentor</option>{mentors.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select><input name="hostName" className="input" placeholder="Host organisation" aria-label="Host organisation" /><button className="btn-primary">Add cohort</button></form>
      </div>
    </>
  );
}
