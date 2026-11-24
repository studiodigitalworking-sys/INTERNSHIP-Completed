import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { Badge, Flash, Notice, PageHeader } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import { decideAi } from "@/app/actions/admin";

export default async function Ai({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  await requirePermission("ai.control");
  const list = await db.aiRecommendation.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <>
      <PageHeader title="AI recommendations — human approval" />
      <Flash searchParams={searchParams} />
      <Notice>AI suggestions never change marks, attendance, admissions, payments or certificates automatically. A human must accept, and the resulting action is taken through the normal audited workflow.</Notice>
      <div className="mt-4 space-y-3">{list.map((r) => <div key={r.id} className="card"><div className="flex justify-between gap-2"><strong>{r.kind}</strong><span className="text-xs"><Badge>{r.status}</Badge> {fmtDateTime(r.createdAt)}</span></div><p className="text-sm">{r.summary}</p><div className="text-xs text-slate-500">Target: {r.targetType} {r.targetId}</div>{r.status === "PENDING" && <form action={decideAi} className="mt-2 flex gap-2"><input type="hidden" name="id" value={r.id} /><button name="decision" value="accept" className="btn-primary btn-sm">Accept</button><button name="decision" value="dismiss" className="btn-outline btn-sm">Dismiss</button></form>}</div>)}</div>
    </>
  );
}
