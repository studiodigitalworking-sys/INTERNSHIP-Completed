import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { Badge, Empty, Flash } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { applyJob } from "@/app/actions/student";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Jobs & opportunities" };

export default async function Jobs({ searchParams }: { searchParams: { q?: string; error?: string; ok?: string } }) {
  const u = await getUser();
  const jobs = await db.job.findMany({ where: { status: "OPEN", ...(searchParams.q ? { OR: [{ title: { contains: searchParams.q } }, { skills: { contains: searchParams.q } }, { location: { contains: searchParams.q } }] } : {}) }, include: { employer: true }, orderBy: { createdAt: "desc" } });
  return (
    <div className="container-x py-10">
      <h1 className="h1">Jobs & opportunities</h1>
      <p className="muted mt-1">Listings from employers. A <Badge tone="green">Verified employer</Badge> badge appears only after document verification. Demo listings are labelled.</p>
      <div className="mt-4"><Flash searchParams={searchParams} /></div>
      <form className="mt-4 flex max-w-lg gap-2"><input name="q" defaultValue={searchParams.q} className="input" placeholder="Skill, title or location" aria-label="Search jobs" /><button className="btn-primary">Search</button></form>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {jobs.map((j) => (
          <div key={j.id} className="card">
            <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{j.title}</span>{j.employer.verified ? <Badge tone="green">Verified employer</Badge> : <Badge tone="amber">Unverified employer</Badge>}</div>
            <div className="text-sm text-slate-600">{j.employer.name} · {j.location} · {j.mode}</div>
            <p className="mt-2 text-sm">{j.description}</p>
            <div className="mt-2 text-xs text-slate-500">Skills: {j.skills ?? "—"} · Stipend/CTC: {j.stipend ?? "—"} · Closes {fmtDate(j.closesAt)}</div>
            {u?.role === "STUDENT" ? (
              <form action={applyJob} className="mt-3 flex gap-2"><input type="hidden" name="jobId" value={j.id} /><input name="coverNote" className="input" placeholder="Short note (optional)" aria-label="Cover note" /><button className="btn-primary btn-sm">Apply</button></form>
            ) : !u ? <Link href="/login?next=/jobs" className="btn-outline btn-sm mt-3">Log in to apply</Link> : null}
          </div>
        ))}
      </div>
      {!jobs.length && <Empty title="No open listings right now" />}
    </div>
  );
}
