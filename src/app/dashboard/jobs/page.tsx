import Link from "next/link";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { Badge, Empty, Flash, PageHeader } from "@/components/ui";
import { fmtDate } from "@/lib/format";

export default async function MyJobs({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  const u = await requireStudent();
  const apps = await db.jobApplication.findMany({ where: { userId: u.id }, include: { job: { include: { employer: true } } }, orderBy: { createdAt: "desc" } });
  return (
    <>
      <PageHeader title="My job applications" actions={<Link href="/jobs" className="btn-primary">Browse jobs</Link>} />
      <Flash searchParams={searchParams} />
      {apps.length ? <div className="card overflow-x-auto p-0"><table className="table"><thead><tr><th>Job</th><th>Employer</th><th>Applied</th><th>Status</th></tr></thead><tbody>{apps.map((a) => <tr key={a.id}><td>{a.job.title}</td><td>{a.job.employer.name}</td><td>{fmtDate(a.createdAt)}</td><td><Badge>{a.status}</Badge></td></tr>)}</tbody></table></div> : <Empty title="No applications yet" />}
    </>
  );
}
