import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { Badge, Empty, Flash, PageHeader, Stat } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { submitWorkLog } from "@/app/actions/student";
import { WORK_CATEGORIES } from "@/lib/constants";

export default async function Logbook({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  const u = await requireStudent();
  const [enr, logs] = await Promise.all([
    db.enrollment.findMany({ where: { studentId: u.id, status: "ACTIVE" }, include: { cohort: { include: { programme: true } } } }),
    db.workLog.findMany({ where: { userId: u.id }, orderBy: { date: "desc" } }),
  ]);
  const sum = (st: string) => (logs.filter((l) => l.status === st).reduce((a, l) => a + l.minutes, 0) / 60).toFixed(1);
  const host = (logs.filter((l) => l.status === "APPROVED" && ["HOST", "FIELD", "PROJECT"].includes(l.category)).reduce((a, l) => a + l.minutes, 0) / 60).toFixed(1);
  return (
    <>
      <PageHeader title="Daily / weekly logbook" sub="Record actual work each day. Your mentor approves entries; only approved hours count." actions={<a href="/dashboard/logbook/print" className="btn-outline">Print logbook</a>} />
      <Flash searchParams={searchParams} />
      <div className="grid gap-4 sm:grid-cols-4"><Stat label="Approved" value={`${sum("APPROVED")} h`} /><Stat label="Host/field/project approved" value={`${host} h`} /><Stat label="Awaiting review" value={`${sum("SUBMITTED")} h`} /><Stat label="Returned" value={`${sum("REJECTED")} h`} /></div>
      {enr.length ? (
        <form action={submitWorkLog} className="card mt-6 grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2"><label className="label" htmlFor="enrollmentId">Enrolment</label><select id="enrollmentId" name="enrollmentId" className="input">{enr.map((e) => <option key={e.id} value={e.id}>{e.cohort.programme.title} ({e.cohort.code})</option>)}</select></div>
          <div><label className="label" htmlFor="date">Date</label><input id="date" name="date" type="date" required max={new Date().toISOString().slice(0, 10)} className="input" /></div>
          <div><label className="label" htmlFor="minutes">Minutes</label><input id="minutes" name="minutes" type="number" min={15} max={600} step={15} required defaultValue={240} className="input" /></div>
          <div><label className="label" htmlFor="category">Category</label><select id="category" name="category" className="input">{WORK_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div className="md:col-span-3"><label className="label" htmlFor="tasks">Tasks performed</label><input id="tasks" name="tasks" required minLength={10} className="input" /></div>
          <div className="md:col-span-2"><label className="label" htmlFor="learning">What I learned</label><input id="learning" name="learning" className="input" /></div>
          <div className="md:col-span-2"><label className="label" htmlFor="evidenceUrl">Evidence link (optional)</label><input id="evidenceUrl" name="evidenceUrl" type="url" className="input" /></div>
          <button className="btn-primary md:col-span-4">Submit entry</button>
        </form>
      ) : <div className="mt-6"><Empty title="Logbook opens after enrolment is active" /></div>}
      <div className="card mt-6 overflow-x-auto p-0"><table className="table"><thead><tr><th>Date</th><th>Hours</th><th>Category</th><th>Tasks</th><th>Status</th><th>Mentor note</th></tr></thead><tbody>
        {logs.map((l) => <tr key={l.id}><td>{fmtDate(l.date)}</td><td>{(l.minutes / 60).toFixed(2)}</td><td>{l.category}</td><td className="max-w-xs">{l.tasks}</td><td><Badge>{l.status}</Badge></td><td className="text-xs">{l.reviewNote ?? "—"}</td></tr>)}
      </tbody></table></div>
    </>
  );
}
