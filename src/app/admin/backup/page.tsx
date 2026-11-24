import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { Flash, Notice, PageHeader } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import { recordBackup } from "@/app/actions/admin";

export default async function Backup({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  await requirePermission("backup.run");
  const list = await db.backupEvent.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  return (
    <>
      <PageHeader title="Backup & recovery" />
      <Flash searchParams={searchParams} />
      <Notice>Production backups must use managed PostgreSQL point-in-time recovery plus daily encrypted dumps (see docs/OPERATIONS.md). This page records verification checkpoints with row counts so restore drills can be compared.</Notice>
      <form action={recordBackup} className="card mt-4 flex gap-2"><select name="kind" className="input max-w-xs" aria-label="Checkpoint type"><option>SNAPSHOT_CHECK</option><option>RESTORE_DRILL</option><option>PRE_RELEASE</option></select><button className="btn-primary">Record checkpoint</button></form>
      <div className="card mt-4 overflow-x-auto p-0"><table className="table"><thead><tr><th>Time</th><th>Kind</th><th>Counts</th></tr></thead><tbody>{list.map((b) => <tr key={b.id}><td>{fmtDateTime(b.createdAt)}</td><td>{b.kind}</td><td className="text-xs">{b.detail}</td></tr>)}</tbody></table></div>
    </>
  );
}
