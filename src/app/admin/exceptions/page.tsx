import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { Badge, Empty, Flash, PageHeader } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import { decideException } from "@/app/actions/admin";
import Link from "next/link";

export default async function Exceptions({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  const u = await requirePermission("student360.view");
  const list = await db.exceptionRequest.findMany({ orderBy: [{ status: "desc" }, { createdAt: "desc" }], take: 200 });
  const students = await db.user.findMany({ where: { id: { in: list.map((l) => l.studentId).filter(Boolean) as string[] } }, select: { id: true, name: true } });
  const nm = Object.fromEntries(students.map((s) => [s.id, s.name]));
  return (
    <>
      <PageHeader title="Exceptions & corrections" sub="Maker-checker: requester cannot approve. Approved corrections are applied by the responsible officer and remain in the audit log." />
      <Flash searchParams={searchParams} />
      {!list.length && <Empty title="No requests" />}
      <div className="space-y-3">{list.map((e) => (
        <div key={e.id} className="card">
          <div className="flex flex-wrap justify-between gap-2"><strong>{e.type.replace(/_/g, " ")}</strong><span className="text-xs"><Badge>{e.status}</Badge> {fmtDateTime(e.createdAt)}</span></div>
          <div className="text-sm">{e.studentId ? <Link className="link" href={`/admin/students/${e.studentId}`}>{nm[e.studentId] ?? e.studentId}</Link> : "—"} · target {e.targetType} {e.targetId ?? ""}</div>
          <p className="text-sm">{e.reason}</p>{e.evidenceRef && <div className="text-xs">Evidence: {e.evidenceRef}</div>}{e.decisionNote && <div className="text-xs">Decision: {e.decisionNote}</div>}
          <div className="text-xs text-slate-400">ID {e.id}</div>
          {["REQUESTED", "UNDER_REVIEW"].includes(e.status) && can(u.role, "eligibility.exception") && <form action={decideException} className="mt-2 flex flex-wrap gap-2"><input type="hidden" name="id" value={e.id} /><input name="note" required className="input max-w-sm" placeholder="Decision note" aria-label="Decision note" /><button name="decision" value="approve" className="btn-primary btn-sm">Approve</button><button name="decision" value="reject" className="btn-outline btn-sm">Reject</button></form>}
        </div>
      ))}</div>
    </>
  );
}
