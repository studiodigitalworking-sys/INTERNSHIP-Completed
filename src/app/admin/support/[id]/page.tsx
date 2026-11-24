import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { Badge, Flash, PageHeader } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import { staffReplyTicket } from "@/app/actions/admin";

export default async function Ticket({ params, searchParams }: { params: { id: string }; searchParams: { ok?: string; error?: string } }) {
  await requirePermission("support.manage");
  const t = await db.supportTicket.findUnique({ where: { id: params.id }, include: { messages: { orderBy: { createdAt: "asc" } } } });
  if (!t) notFound();
  return (
    <>
      <PageHeader title={t.subject} sub={<>{t.name} · {t.email} · {t.category} · <Badge>{t.status}</Badge>{t.userId && <> · <Link className="link" href={`/admin/students/${t.userId}`}>Student 360</Link></>}</>} />
      <Flash searchParams={searchParams} />
      <div className="space-y-3">{t.messages.map((m) => <div key={m.id} className={`card ${m.internal ? "border-amber-300 bg-amber-50" : ""}`}><div className="text-xs text-slate-500">{m.authorName} · {fmtDateTime(m.createdAt)}{m.internal && " · INTERNAL NOTE"}</div><p className="mt-1 whitespace-pre-wrap text-sm">{m.body}</p></div>)}</div>
      <form action={staffReplyTicket} className="card mt-4 space-y-2"><input type="hidden" name="id" value={t.id} /><textarea name="body" rows={3} className="input" placeholder="Reply" aria-label="Reply" /><div className="flex flex-wrap items-center gap-3"><label className="text-sm"><input type="checkbox" name="internal" /> Internal note</label><select name="status" defaultValue={t.status} className="input w-40" aria-label="Status"><option>OPEN</option><option>IN_PROGRESS</option><option>RESOLVED</option><option>CLOSED</option></select><button className="btn-primary btn-sm">Save</button></div></form>
    </>
  );
}
