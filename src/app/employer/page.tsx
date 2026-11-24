import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PortalShell } from "@/components/PortalShell";
import { Badge, Empty, Flash, PageHeader, Notice } from "@/components/ui";
import { manageJob } from "@/app/actions/admin";

export const dynamic = "force-dynamic";

async function employerAction(fd: FormData) {
  "use server";
  const u = await requireUser("/employer");
  if (u.role !== "EMPLOYER") redirect("/");
  const emp = await db.employer.findFirst({ where: { contact: u.email } });
  if (!emp) redirect("/employer?error=Employer+profile+not+linked");
  if (fd.get("appId")) {
    const app = await db.jobApplication.findFirst({ where: { id: String(fd.get("appId")), job: { employerId: emp.id } } });
    if (!app) redirect("/employer?error=Not+found");
    const status = String(fd.get("status"));
    if (!["APPLIED", "SHORTLISTED", "INTERVIEW", "OFFERED", "REJECTED"].includes(status)) redirect("/employer?error=Invalid");
    await db.jobApplication.update({ where: { id: app.id }, data: { status } });
    redirect("/employer?ok=Updated");
  }
  await db.job.create({ data: { employerId: emp.id, title: String(fd.get("title")).slice(0, 150), location: String(fd.get("location")).slice(0, 100), mode: String(fd.get("mode") || "On-site").slice(0, 50), stipend: String(fd.get("stipend") || "").slice(0, 100) || null, description: String(fd.get("description")).slice(0, 3000), skills: String(fd.get("skills") || "").slice(0, 300) || null, status: emp.verified ? "OPEN" : "PENDING_REVIEW" } });
  redirect(`/employer?ok=${emp.verified ? "Job+posted" : "Job+submitted+for+admin+review"}`);
}

export default async function Employer({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  const u = await requireUser("/employer");
  if (u.role !== "EMPLOYER") redirect("/");
  void manageJob;
  const emp = await db.employer.findFirst({ where: { contact: u.email }, include: { jobs: { include: { applications: { include: { user: { include: { profile: true } } } } } } } });
  return (
    <PortalShell nav={[{ href: "/employer", label: "Jobs & applicants" }]} title="Employer portal" user={u}>
      <PageHeader title={emp?.name ?? "Employer"} actions={emp?.verified ? <Badge tone="green">Verified</Badge> : <Badge tone="amber">Verification pending</Badge>} />
      <Flash searchParams={searchParams} />
      {!emp ? <Empty title="Employer profile not linked">Contact support to link your organisation.</Empty> : (
        <>
          {!emp.verified && <Notice>New jobs go to admin review until your organisation documents are verified.</Notice>}
          <form action={employerAction} className="card mt-4 grid gap-2 md:grid-cols-3"><input name="title" required className="input" placeholder="Job title" aria-label="Job title" /><input name="location" required className="input" placeholder="Location" aria-label="Location" /><input name="mode" className="input" placeholder="Mode" aria-label="Mode" /><input name="stipend" className="input" placeholder="Stipend / CTC" aria-label="Stipend" /><input name="skills" className="input md:col-span-2" placeholder="Skills" aria-label="Skills" /><textarea name="description" required className="input md:col-span-2" placeholder="Description" aria-label="Description" /><button className="btn-primary">Post job</button></form>
          <div className="mt-6 space-y-3">{emp.jobs.map((j) => <div key={j.id} className="card"><div className="flex justify-between"><strong>{j.title}</strong><Badge>{j.status}</Badge></div>
            <table className="table mt-2"><tbody>{j.applications.map((a) => <tr key={a.id}><td>{a.user.name}</td><td className="text-xs">{a.user.profile?.degree} · {a.user.profile?.skills}</td><td className="text-xs">{a.coverNote}</td><td><form action={employerAction} className="flex gap-1"><input type="hidden" name="appId" value={a.id} /><select name="status" defaultValue={a.status} className="input w-36" aria-label="Status"><option>APPLIED</option><option>SHORTLISTED</option><option>INTERVIEW</option><option>OFFERED</option><option>REJECTED</option></select><button className="btn-outline btn-sm">Save</button></form></td></tr>)}</tbody></table>{!j.applications.length && <p className="muted text-sm">No applicants yet.</p>}</div>)}</div>
        </>
      )}
    </PortalShell>
  );
}
