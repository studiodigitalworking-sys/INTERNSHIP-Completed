import Link from "next/link";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { Badge, PageHeader } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";

export default async function Inbox({ searchParams }: { searchParams: { status?: string } }) {
  await requirePermission("support.manage");
  const status = searchParams.status ?? "OPEN";
  const list = await db.supportTicket.findMany({ where: status === "ALL" ? {} : { status }, orderBy: [{ priority: "asc" }, { updatedAt: "desc" }], take: 200 });
  return (
    <>
      <PageHeader title="Support inbox" />
      <div className="mb-4 flex gap-2">{["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED", "ALL"].map((s) => <Link key={s} href={`?status=${s}`} className={s === status ? "btn-primary btn-sm" : "btn-outline btn-sm"}>{s}</Link>)}</div>
      <div className="card overflow-x-auto p-0"><table className="table"><thead><tr><th>Subject</th><th>From</th><th>Category</th><th>Status</th><th>Updated</th></tr></thead><tbody>
        {list.map((t) => <tr key={t.id}><td><Link className="link" href={`/admin/support/${t.id}`}>{t.subject}</Link></td><td className="text-xs">{t.name}<br />{t.email}</td><td>{t.category === "GRIEVANCE" ? <Badge tone="red">GRIEVANCE</Badge> : t.category}</td><td><Badge>{t.status}</Badge></td><td className="text-xs">{fmtDateTime(t.updatedAt)}</td></tr>)}
      </tbody></table></div>
    </>
  );
}
