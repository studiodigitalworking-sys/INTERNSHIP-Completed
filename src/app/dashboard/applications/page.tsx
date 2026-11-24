import Link from "next/link";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { Badge, Empty, Flash, PageHeader } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { withdrawApplication } from "@/app/actions/student";

export default async function Applications({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  const u = await requireStudent();
  const apps = await db.application.findMany({ where: { studentId: u.id }, include: { programme: true, cohort: true }, orderBy: { createdAt: "desc" } });
  return (
    <>
      <PageHeader title="My applications" actions={<Link href="/programmes" className="btn-primary">Find programmes</Link>} />
      <Flash searchParams={searchParams} />
      {apps.length ? (
        <div className="card overflow-x-auto p-0"><table className="table"><thead><tr><th>Programme</th><th>Cohort</th><th>Applied</th><th>Status</th><th>Review note</th><th /></tr></thead><tbody>
          {apps.map((a) => (
            <tr key={a.id}><td><Link className="link" href={`/programmes/${a.programme.code}`}>{a.programme.title}</Link></td><td>{a.cohort?.code ?? "—"}</td><td>{fmtDate(a.createdAt)}</td><td><Badge>{a.status}</Badge></td><td className="text-xs">{a.reviewNote ?? "—"}</td>
              <td>{["SUBMITTED", "UNDER_REVIEW"].includes(a.status) && <form action={withdrawApplication}><input type="hidden" name="id" value={a.id} /><button className="btn-outline btn-sm">Withdraw</button></form>}</td></tr>
          ))}
        </tbody></table></div>
      ) : <Empty title="No applications yet">Browse the catalogue and apply to an open programme.</Empty>}
    </>
  );
}
