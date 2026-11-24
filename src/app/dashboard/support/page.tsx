import Link from "next/link";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { Badge, Flash, PageHeader } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { createTicket } from "@/app/actions/student";
import { TICKET_CATEGORIES } from "@/lib/constants";

export default async function Support({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  const u = await requireStudent();
  const tickets = await db.supportTicket.findMany({ where: { userId: u.id }, orderBy: { updatedAt: "desc" } });
  return (
    <>
      <PageHeader title="Support & grievances" />
      <Flash searchParams={searchParams} />
      <div className="grid gap-6 lg:grid-cols-2">
        <form action={createTicket} className="card space-y-3">
          <div className="h2">New ticket</div>
          <div><label className="label" htmlFor="category">Category</label><select id="category" name="category" className="input">{TICKET_CATEGORIES.filter((c) => c !== "CONTACT").map((c) => <option key={c}>{c}</option>)}</select></div>
          <div><label className="label" htmlFor="subject">Subject</label><input id="subject" name="subject" required minLength={4} className="input" /></div>
          <div><label className="label" htmlFor="body">Details</label><textarea id="body" name="body" required minLength={10} rows={4} className="input" /></div>
          <button className="btn-primary">Create ticket</button>
        </form>
        <div className="card"><div className="h2">My tickets</div>
          <ul className="mt-3 divide-y">{tickets.map((t) => <li key={t.id} className="py-2"><Link href={`/dashboard/support/${t.id}`} className="flex justify-between gap-2"><span className="link">{t.subject}</span><Badge>{t.status}</Badge></Link><div className="text-xs text-slate-500">{t.category} · {fmtDate(t.updatedAt)}</div></li>)}{!tickets.length && <li className="muted">No tickets.</li>}</ul>
        </div>
      </div>
    </>
  );
}
