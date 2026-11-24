import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { Badge, Flash, PageHeader } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { saveAnnouncement } from "@/app/actions/admin";

export default async function Ann({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  await requirePermission("cms.manage");
  const list = await db.announcement.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <>
      <PageHeader title="Announcements" sub="Published announcements appear on the home page banner." />
      <Flash searchParams={searchParams} />
      <form action={saveAnnouncement} className="card grid gap-2 md:grid-cols-2"><input name="title" required className="input" placeholder="Title (English)" aria-label="Title" /><input name="titleHi" className="input" placeholder="शीर्षक (हिंदी)" aria-label="Hindi title" /><textarea name="body" required className="input md:col-span-2" placeholder="Body" aria-label="Body" /><label className="text-sm"><input type="checkbox" name="published" /> Publish now</label><button className="btn-primary">Save</button></form>
      <ul className="mt-6 space-y-2">{list.map((a) => <li key={a.id} className="card flex justify-between gap-2"><div><strong>{a.title}</strong> <span className="text-xs text-slate-500">{fmtDate(a.createdAt)}</span><p className="text-sm">{a.body}</p></div><form action={saveAnnouncement}><input type="hidden" name="toggle" value={a.id} /><button className="btn-outline btn-sm">{a.published ? "Unpublish" : "Publish"}</button></form>{a.published && <Badge tone="green">LIVE</Badge>}</li>)}</ul>
    </>
  );
}
