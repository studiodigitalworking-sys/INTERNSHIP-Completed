import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { Badge, Flash, PageHeader } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import { replyTicket } from "@/app/actions/student";

export default async function Ticket({ params, searchParams }: { params: { id: string }; searchParams: { ok?: string; error?: string } }) {
  const u = await requireStudent();
  const t = await db.supportTicket.findFirst({ where: { id: params.id, userId: u.id }, include: { messages: { where: { internal: false }, orderBy: { createdAt: "asc" } } } });
  if (!t) notFound();
  return (
    <>
      <PageHeader title={t.subject} sub={<>{t.category} · <Badge>{t.status}</Badge></>} />
      <Flash searchParams={searchParams} />
      <div className="space-y-3">{t.messages.map((m) => <div key={m.id} className={`card ${m.authorId === u.id ? "" : "border-blue-200 bg-blue-50"}`}><div className="text-xs text-slate-500">{m.authorName} · {fmtDateTime(m.createdAt)}</div><p className="mt-1 whitespace-pre-wrap text-sm">{m.body}</p></div>)}</div>
      <form action={replyTicket} className="card mt-4 space-y-2"><input type="hidden" name="ticketId" value={t.id} /><label className="label" htmlFor="body">Reply</label><textarea id="body" name="body" required rows={3} className="input" /><button className="btn-primary btn-sm">Send</button></form>
    </>
  );
}
