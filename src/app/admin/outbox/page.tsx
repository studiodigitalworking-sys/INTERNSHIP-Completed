import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { Badge, Flash, Notice, PageHeader } from "@/components/ui";
import { fmtDateTime, maskEmail } from "@/lib/format";
import { runOutbox } from "@/app/actions/admin";

export default async function Outbox({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  await requirePermission("outbox.manage");
  const list = await db.outboxMessage.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  return (
    <>
      <PageHeader title="Notification outbox" actions={<form action={runOutbox}><button className="btn-primary">Process queue now</button></form>} />
      <Flash searchParams={searchParams} />
      <Notice>{process.env.EMAIL_PROVIDER ? `Provider: ${process.env.EMAIL_PROVIDER}` : "No live provider configured. Messages are processed by the log transport only — nothing is delivered to real recipients."} Schedule <code>/api/cron/outbox</code> with CRON_SECRET in production.</Notice>
      <div className="card mt-4 overflow-x-auto p-0"><table className="table"><thead><tr><th>Created</th><th>Channel</th><th>To</th><th>Subject</th><th>Priority</th><th>Status</th><th>Attempts</th><th>Error</th></tr></thead><tbody>
        {list.map((m) => <tr key={m.id}><td className="text-xs">{fmtDateTime(m.createdAt)}</td><td>{m.channel}</td><td className="text-xs">{m.to.includes("@") ? maskEmail(m.to) : m.to}</td><td>{m.subject}</td><td>{m.priority}</td><td><Badge>{m.status}</Badge></td><td>{m.attempts}</td><td className="text-xs">{m.lastError ?? ""}</td></tr>)}
      </tbody></table></div>
    </>
  );
}
