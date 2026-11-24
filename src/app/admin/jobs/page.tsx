import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { Badge, Flash, PageHeader } from "@/components/ui";
import { manageJob } from "@/app/actions/admin";

export default async function Jobs({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  await requirePermission("jobs.manage");
  const [employers, jobs] = await Promise.all([db.employer.findMany({ orderBy: { createdAt: "desc" } }), db.job.findMany({ include: { employer: true, applications: { include: { user: true } } }, orderBy: { createdAt: "desc" } })]);
  return (
    <>
      <PageHeader title="Jobs & employers" sub="Mark an employer verified only after checking registration documents." />
      <Flash searchParams={searchParams} />
      <form action={manageJob} className="card grid gap-2 md:grid-cols-4">
        <select name="employerId" className="input" aria-label="Employer"><option value="">New employer…</option>{employers.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
        <input name="employerName" className="input" placeholder="New employer name" aria-label="New employer name" /><input name="title" required className="input" placeholder="Job title" aria-label="Job title" /><input name="location" required className="input" placeholder="Location" aria-label="Location" />
        <input name="mode" className="input" placeholder="Mode (Remote/On-site)" aria-label="Mode" /><input name="stipend" className="input" placeholder="Stipend / CTC" aria-label="Stipend" /><input name="skills" className="input" placeholder="Skills" aria-label="Skills" /><input name="closesAt" type="date" className="input" aria-label="Closes on" />
        <textarea name="description" required className="input md:col-span-3" placeholder="Description" aria-label="Description" /><button className="btn-primary">Post job</button>
      </form>
      <div className="card mt-6"><div className="h2">Employers</div><ul className="mt-2 space-y-1 text-sm">{employers.map((e) => <li key={e.id} className="flex flex-wrap items-center gap-2">{e.name} {e.verified ? <Badge tone="green">Verified</Badge> : <form action={manageJob} className="flex gap-1"><input type="hidden" name="verifyEmployer" value={e.id} /><input name="evidenceRef" required className="input w-48" placeholder="Evidence (GST/CIN doc ref)" aria-label="Evidence" /><button className="btn-outline btn-sm">Verify</button></form>}</li>)}</ul></div>
      <div className="mt-6 space-y-3">{jobs.map((j) => (
        <div key={j.id} className="card">
          <div className="flex flex-wrap justify-between gap-2"><strong>{j.title} — {j.employer.name}</strong><form action={manageJob} className="flex gap-1"><input type="hidden" name="jobId" value={j.id} /><select name="status" defaultValue={j.status} className="input w-32" aria-label="Job status"><option>OPEN</option><option>CLOSED</option></select><button className="btn-outline btn-sm">Save</button></form></div>
          <ul className="mt-2 text-sm">{j.applications.map((a) => <li key={a.id} className="flex flex-wrap items-center gap-2">{a.user.name} · {a.coverNote ?? ""} <form action={manageJob} className="flex gap-1"><input type="hidden" name="appId" value={a.id} /><select name="status" defaultValue={a.status} className="input w-36" aria-label="Application status"><option>APPLIED</option><option>SHORTLISTED</option><option>INTERVIEW</option><option>OFFERED</option><option>REJECTED</option></select><button className="btn-outline btn-sm">Update</button></form></li>)}</ul>
        </div>
      ))}</div>
    </>
  );
}
