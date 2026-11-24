import Link from "next/link";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { Badge, PageHeader } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";

export default async function Audit({ searchParams }: { searchParams: { action?: string; page?: string } }) {
  await requirePermission("audit.view");
  const page = Math.max(1, Number(searchParams.page) || 1);
  const where = searchParams.action ? { action: { contains: searchParams.action } } : {};
  const [list, total] = await Promise.all([db.auditEvent.findMany({ where, orderBy: { createdAt: "desc" }, take: 100, skip: (page - 1) * 100 }), db.auditEvent.count({ where })]);
  return (
    <>
      <PageHeader title="Audit log" sub={`${total} append-only events`} actions={<a href="/api/export/audit" className="btn-outline">Export CSV</a>} />
      <form className="mb-4 flex max-w-md gap-2"><input name="action" defaultValue={searchParams.action} className="input" placeholder="Filter by action (e.g. REFUND)" aria-label="Filter" /><button className="btn-primary">Filter</button></form>
      <div className="card overflow-x-auto p-0"><table className="table"><thead><tr><th>Time</th><th>Action</th><th>Actor</th><th>Target</th><th>Change</th><th>Reason / evidence</th><th>Result</th></tr></thead><tbody>
        {list.map((a) => <tr key={a.id}><td className="text-xs">{fmtDateTime(a.createdAt)}</td><td>{a.action}</td><td className="text-xs">{a.actorRole ?? "system"}<br />{a.actorId?.slice(0, 8)}</td><td className="text-xs">{a.targetType} {a.targetId?.slice(0, 8)}{a.studentId && <><br /><Link className="link" href={`/admin/students/${a.studentId}`}>student</Link></>}</td><td className="max-w-xs break-all text-xs">{a.oldValue && <>from {a.oldValue} </>}{a.newValue && <>to {a.newValue}</>}</td><td className="text-xs">{a.reason}{a.evidenceRef && ` [${a.evidenceRef}]`}</td><td><Badge>{a.result}</Badge></td></tr>)}
      </tbody></table></div>
      <div className="mt-4 flex gap-2">{page > 1 && <Link className="btn-outline btn-sm" href={`?action=${searchParams.action ?? ""}&page=${page - 1}`}>Newer</Link>}{page * 100 < total && <Link className="btn-outline btn-sm" href={`?action=${searchParams.action ?? ""}&page=${page + 1}`}>Older</Link>}</div>
    </>
  );
}
