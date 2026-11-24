import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { Badge, Empty, Flash, PageHeader } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { decideApplication } from "@/app/actions/admin";
import Link from "next/link";

export default async function Apps({ searchParams }: { searchParams: { status?: string; ok?: string; error?: string } }) {
  await requirePermission("applications.review");
  const status = searchParams.status ?? "PENDING";
  const apps = await db.application.findMany({ where: status === "PENDING" ? { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } : status === "ALL" ? {} : { status }, include: { student: { include: { profile: true } }, programme: true, cohort: true }, orderBy: { createdAt: "asc" }, take: 200 });
  return (
    <>
      <PageHeader title="Applications" actions={<a href="/api/export/applications" className="btn-outline">Export CSV</a>} />
      <Flash searchParams={searchParams} />
      <div className="mb-4 flex gap-2">{["PENDING", "APPROVED", "REJECTED", "WITHDRAWN", "ALL"].map((s) => <Link key={s} href={`?status=${s}`} className={s === status ? "btn-primary btn-sm" : "btn-outline btn-sm"}>{s}</Link>)}</div>
      {!apps.length && <Empty title="No applications" />}
      <div className="space-y-3">{apps.map((a) => (
        <div key={a.id} className="card">
          <div className="flex flex-wrap justify-between gap-2"><div><Link className="link font-semibold" href={`/admin/students/${a.studentId}`}>{a.student.name}</Link> → {a.programme.title} <span className="text-xs text-slate-500">({a.cohort?.code ?? "no cohort"})</span></div><div className="flex items-center gap-2 text-xs"><Badge>{a.status}</Badge>{fmtDate(a.createdAt)}</div></div>
          <div className="mt-1 text-xs text-slate-500">{a.student.profile?.college ?? "—"} · {a.student.profile?.degree ?? "—"} sem {a.student.profile?.semester ?? "—"} · Eligibility: {a.eligibilitySnapshot ?? "—"}</div>
          <p className="mt-2 text-sm">{a.statement}</p>
          {["SUBMITTED", "UNDER_REVIEW"].includes(a.status) && <form action={decideApplication} className="mt-2 flex flex-wrap gap-2"><input type="hidden" name="id" value={a.id} /><input name="note" className="input max-w-sm" placeholder="Note (required to reject)" aria-label="Decision note" /><button name="decision" value="approve" className="btn-primary btn-sm">Approve</button><button name="decision" value="review" className="btn-outline btn-sm">Mark under review</button><button name="decision" value="reject" className="btn-danger btn-sm">Reject</button></form>}
        </div>
      ))}</div>
    </>
  );
}
