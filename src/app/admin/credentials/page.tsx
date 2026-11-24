import Link from "next/link";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { Badge, Flash, PageHeader, Notice } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { DOCS, THEMES } from "@/lib/credential";
import { issueDocument } from "@/app/actions/admin";
import { randomUUID } from "crypto";

export default async function Studio({ searchParams }: { searchParams: { q?: string; ok?: string; error?: string } }) {
  await requirePermission("credentials.issue");
  const [creds, enr, sig] = await Promise.all([
    db.credential.findMany({ where: searchParams.q ? { OR: [{ code: { contains: searchParams.q } }, { recipientName: { contains: searchParams.q } }] } : {}, orderBy: { createdAt: "desc" }, take: 100 }),
    db.enrollment.findMany({ where: { status: { in: ["ACTIVE", "COMPLETED"] } }, include: { student: true, cohort: true } }),
    db.signatory.findFirst({ where: { active: true } }),
  ]);
  return (
    <>
      <PageHeader title="Certificate & document studio" sub={`${DOCS.length} document types · ${THEMES.length} design themes · QR verification on every document`} actions={<a href="/api/export/credentials" className="btn-outline">Export registry</a>} />
      <Flash searchParams={searchParams} />
      {!sig && <Notice>No active signatory configured — documents will show &quot;Signatory not configured&quot;. Add one in Settings with evidence of authority.</Notice>}
      <form action={issueDocument} className="card mt-4 grid gap-3 md:grid-cols-3">
        <div className="h2 md:col-span-3">Issue a document</div>
        <input type="hidden" name="idem" value={randomUUID()} />
        <div><label className="label" htmlFor="docType">Document</label><select id="docType" name="docType" className="input">{DOCS.map((d) => <option key={d.id} value={d.id}>{d.id} · {d.title}</option>)}</select></div>
        <div><label className="label" htmlFor="theme">Theme</label><select id="theme" name="theme" defaultValue="02" className="input">{THEMES.map((t) => <option key={t.id} value={t.id}>{t.id} · {t.name}</option>)}</select></div>
        <div><label className="label" htmlFor="enr">Student enrolment</label><select id="enr" name="enrollmentId" className="input"><option value="">— none (manual recipient) —</option>{enr.map((e) => <option key={e.id} value={e.id}>{e.student.name} · {e.cohort.code}</option>)}</select></div>
        <input type="hidden" name="userId" value="" />
        <div><label className="label" htmlFor="recipientName">Recipient name (if no enrolment)</label><input id="recipientName" name="recipientName" className="input" /></div>
        <div><label className="label" htmlFor="exceptionId">Approved exception ID (only if not eligible)</label><input id="exceptionId" name="exceptionId" className="input" /></div>
        <div><label className="label" htmlFor="evidenceRef">Evidence reference</label><input id="evidenceRef" name="evidenceRef" className="input" /></div>
        <p className="text-xs text-slate-500 md:col-span-3">Completion documents (01, 05, 13) are issued only when the eligibility engine passes, or with an approved &quot;CERTIFICATE_MANUAL_ISSUANCE&quot; exception approved by another officer.</p>
        <button className="btn-primary md:col-span-3">Issue</button>
      </form>
      <details className="card mt-4"><summary className="cursor-pointer font-semibold">Document catalogue & themes</summary>
        <div className="mt-3 grid gap-2 md:grid-cols-2">{DOCS.map((d) => <div key={d.id} className="text-sm"><strong>{d.id} {d.title}</strong> <Badge>{d.kind}</Badge><div className="text-xs text-slate-500">{d.desc}</div></div>)}</div>
        <div className="mt-4 flex flex-wrap gap-2">{THEMES.map((t) => <div key={t.id} className="rounded border p-2 text-xs" style={{ background: t.paper, borderColor: t.primary }}><span style={{ color: t.primary }} className="font-bold">{t.name}</span><div className="flex gap-1"><span className="h-3 w-6" style={{ background: t.primary }} /><span className="h-3 w-6" style={{ background: t.accent }} /></div></div>)}</div>
      </details>
      <form className="mt-6 flex max-w-md gap-2"><input name="q" defaultValue={searchParams.q} className="input" placeholder="Credential ID or name" aria-label="Search credentials" /><button className="btn-primary">Search</button></form>
      <div className="card mt-3 overflow-x-auto p-0"><table className="table"><thead><tr><th>ID</th><th>Recipient</th><th>Document</th><th>Issued</th><th>Status</th></tr></thead><tbody>
        {creds.map((c) => <tr key={c.id}><td><Link className="link" href={`/admin/credentials/${c.id}`}>{c.code}</Link>{c.version > 1 && <span className="text-xs"> v{c.version}</span>}</td><td>{c.recipientName}</td><td>{c.title}{c.isException && <Badge tone="amber">Exception</Badge>}</td><td>{fmtDate(c.issuedAt)}</td><td><Badge>{c.status}</Badge></td></tr>)}
      </tbody></table></div>
    </>
  );
}
