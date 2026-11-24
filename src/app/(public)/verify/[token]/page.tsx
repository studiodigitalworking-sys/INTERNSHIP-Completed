import Link from "next/link";
import { db } from "@/lib/db";
import { publicStatus } from "@/lib/credential";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Credential verification", robots: { index: false } };

export default async function VerifyToken({ params }: { params: { token: string } }) {
  const c = /^[a-f0-9]{32}$/.test(params.token) ? await db.credential.findUnique({ where: { token: params.token } }) : null;
  await db.verificationEvent.create({ data: { lookup: `token:${params.token.slice(0, 8)}`, result: c ? c.status : "NOT_FOUND" } });
  if (!c || c.status === "DRAFT" || c.status === "APPROVAL_PENDING") {
    return (
      <div className="container-x max-w-2xl py-14">
        <div className="card border-red-300 bg-red-50"><h1 className="h1 text-red-800">Not found</h1><p className="mt-2 text-red-900">This verification link does not match any issued credential. The document may be forged or the link mistyped.</p></div>
        <Link href="/verify" className="link mt-4 inline-block">Verify by ID</Link>
      </div>
    );
  }
  const st = publicStatus(c.status);
  const newer = c.status === "SUPERSEDED" ? await db.credential.findFirst({ where: { supersedesId: c.id } }) : null;
  const color = st.tone === "green" ? "border-emerald-400 bg-emerald-50 text-emerald-900" : st.tone === "red" ? "border-red-400 bg-red-50 text-red-900" : "border-amber-400 bg-amber-50 text-amber-900";
  return (
    <div className="container-x max-w-2xl py-14">
      <div className={`rounded-xl border-2 p-6 ${color}`}>
        <div className="text-sm font-semibold uppercase tracking-wide">Status</div>
        <div className="text-3xl font-bold">{st.label}</div>
        {c.status === "REVOKED" && <p className="mt-2 text-sm">This credential has been revoked and must not be relied upon.</p>}
        {newer && <p className="mt-2 text-sm">A corrected version exists: <Link className="underline" href={`/verify/${newer.token}`}>{newer.code}</Link></p>}
      </div>
      <dl className="card mt-6 grid gap-4 sm:grid-cols-2">
        {[["Credential ID", c.code], ["Document", c.title], ["Issued to", c.recipientName], ["Programme", c.programmeTitle ?? "—"], ["Cohort", c.cohortCode ?? "—"], ["Period", c.startDate ? `${fmtDate(c.startDate)} – ${fmtDate(c.endDate)}` : "—"], ["Verified hours", c.verifiedHours != null ? `${c.verifiedHours} h` : "—"], ["Issued on", fmtDate(c.issuedAt)], ["Issuer", c.issuerName], ["Version", String(c.version)]].map(([k, v]) => (
          <div key={k}><dt className="text-xs font-semibold uppercase text-slate-500">{k}</dt><dd className="mt-0.5 font-medium">{v}</dd></div>
        ))}
      </dl>
      <p className="mt-4 text-xs text-slate-500">Integrity fingerprint: <code className="break-all">{c.payloadHash.slice(0, 32)}…</code>. Verification checked live against the InternVerse registry. Academic credit, if any, is granted only by the student&apos;s university.</p>
    </div>
  );
}
