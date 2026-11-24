import Link from "next/link";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { Badge, Empty, PageHeader } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { completionEligibility } from "@/lib/credential";

export default async function Certs() {
  const u = await requireStudent();
  const [creds, enr] = await Promise.all([
    db.credential.findMany({ where: { userId: u.id }, orderBy: { createdAt: "desc" } }),
    db.enrollment.findMany({ where: { studentId: u.id, status: { in: ["ACTIVE", "COMPLETED"] } }, include: { cohort: { include: { programme: true } } } }),
  ]);
  const elig = await Promise.all(enr.map((e) => completionEligibility(u.id, e.id)));
  return (
    <>
      <PageHeader title="Certificates & documents" sub="Documents are issued from verified records. Each has a QR code for public verification." />
      {enr.map((e, i) => (
        <div key={e.id} className="card mb-4">
          <div className="flex items-center justify-between"><div className="h2">Completion eligibility · {e.cohort.programme.title}</div>{elig[i].eligible ? <Badge tone="green">Eligible — awaiting issuance</Badge> : <Badge tone="amber">Not yet eligible</Badge>}</div>
          <ul className="mt-3 grid gap-1 text-sm sm:grid-cols-2">{elig[i].checks.map((c) => <li key={c.rule}>{c.passed ? "✅" : "⬜"} {c.rule} <span className="text-slate-500">— {c.detail}</span></li>)}</ul>
        </div>
      ))}
      {creds.length ? (
        <div className="grid gap-4 md:grid-cols-2">{creds.map((c) => (
          <Link key={c.id} href={`/dashboard/certificates/${c.id}`} className="card hover:shadow-md">
            <div className="flex justify-between gap-2"><div className="font-semibold">{c.title}</div><Badge>{c.status}</Badge></div>
            <div className="text-sm text-slate-500">{c.programmeTitle ?? "—"}</div>
            <div className="mt-2 text-xs text-slate-500">{c.code} · issued {fmtDate(c.issuedAt)}</div>
          </Link>
        ))}</div>
      ) : <Empty title="No documents yet" />}
    </>
  );
}
