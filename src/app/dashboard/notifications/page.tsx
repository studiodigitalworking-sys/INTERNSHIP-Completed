import Link from "next/link";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { Empty, PageHeader } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import { markNotificationsRead } from "@/app/actions/student";

export default async function Notifications() {
  const u = await requireStudent();
  const list = await db.notification.findMany({ where: { userId: u.id }, orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <>
      <PageHeader title="Notifications" actions={<form action={markNotificationsRead}><button className="btn-outline btn-sm">Mark all read</button></form>} />
      {list.length ? <ul className="space-y-2">{list.map((n) => <li key={n.id} className={`card ${n.readAt ? "" : "border-blue-300"}`}><div className="flex justify-between gap-2"><strong>{n.title}</strong><span className="text-xs text-slate-500">{fmtDateTime(n.createdAt)}</span></div><p className="text-sm">{n.body}</p>{n.link && <Link className="link text-sm" href={n.link}>Open</Link>}</li>)}</ul> : <Empty title="No notifications" />}
    </>
  );
}
