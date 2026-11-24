import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { Badge, Flash, PageHeader } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import { CredentialDocument } from "@/components/CredentialDocument";
import { PrintButton } from "@/components/PrintButton";
import { THEMES } from "@/lib/credential";
import { reissueDocument, revokeDocument } from "@/app/actions/admin";

export default async function Cred({ params, searchParams }: { params: { id: string }; searchParams: { ok?: string; error?: string } }) {
  const u = await requirePermission("credentials.issue");
  const c = await db.credential.findUnique({ where: { id: params.id }, include: { events: { orderBy: { createdAt: "asc" } } } });
  if (!c) notFound();
  const live = ["ISSUED", "CORRECTED"].includes(c.status);
  const next = await db.credential.findFirst({ where: { supersedesId: c.id } });
  return (
    <>
      <PageHeader title={`${c.code} — ${c.title}`} sub={`${c.recipientName} · v${c.version}${c.isException ? ` · EXCEPTION: ${c.exceptionReason}` : ""}`} actions={<div className="flex items-center gap-2 print:hidden"><Badge>{c.status}</Badge><Link className="btn-outline btn-sm" href={`/verify/${c.token}`} target="_blank">Verify page</Link><PrintButton /></div>} />
      <Flash searchParams={searchParams} />
      {next && <p className="mb-2 text-sm">Superseded by <Link className="link" href={`/admin/credentials/${next.id}`}>{next.code}</Link></p>}
      {c.supersedesId && <p className="mb-2 text-sm">Replaces <Link className="link" href={`/admin/credentials/${c.supersedesId}`}>previous version</Link></p>}
      <CredentialDocument c={c} appUrl={process.env.APP_URL || "http://localhost:3000"} />
      <div className="mt-6 grid gap-6 print:hidden lg:grid-cols-3">
        {live && <form action={reissueDocument} className="card space-y-2"><div className="h2">Correct / reissue</div><input type="hidden" name="id" value={c.id} /><input name="recipientName" defaultValue={c.recipientName} className="input" aria-label="Recipient name" /><select name="theme" defaultValue={c.theme} className="input" aria-label="Theme">{THEMES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select><input name="reason" required className="input" placeholder="Reason for correction" aria-label="Reason" /><button className="btn-primary btn-sm">Reissue new version</button></form>}
        {live && can(u.role, "credentials.revoke") && <form action={revokeDocument} className="card space-y-2"><div className="h2">Revoke</div><input type="hidden" name="id" value={c.id} /><input name="reason" required minLength={5} className="input" placeholder="Reason (shown internally)" aria-label="Revocation reason" /><button className="btn-danger btn-sm">Revoke credential</button></form>}
        <div className="card"><div className="h2">Lifecycle</div><ul className="mt-2 text-xs">{c.events.map((e) => <li key={e.id}>{fmtDateTime(e.createdAt)} · {e.action}{e.reason ? ` · ${e.reason}` : ""}</li>)}</ul><div className="mt-2 break-all text-xs text-slate-400">Payload hash: {c.payloadHash}</div></div>
      </div>
    </>
  );
}
