import Link from "next/link";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { Badge, Flash, PageHeader, Stat } from "@/components/ui";
import { fmtDateTime, rupees } from "@/lib/format";
import { reconcileOrder, refundPayment } from "@/app/actions/admin";

export default async function Pay({ searchParams }: { searchParams: { status?: string; ok?: string; error?: string } }) {
  const u = await requirePermission("payments.view");
  const manage = can(u.role, "payments.manage");
  const where = searchParams.status ? { status: searchParams.status } : {};
  const [orders, paid, refunds, hooks] = await Promise.all([
    db.order.findMany({ where, include: { student: true, payments: { include: { refunds: true } }, enrollment: { include: { cohort: true } } }, orderBy: { createdAt: "desc" }, take: 200 }),
    db.order.aggregate({ where: { status: { in: ["PAID", "REFUNDED"] } }, _sum: { amountPaise: true }, _count: true }),
    db.refund.aggregate({ _sum: { amountPaise: true } }),
    db.webhookEvent.count(),
  ]);
  return (
    <>
      <PageHeader title="Payments, reconciliation & refunds" actions={<a href="/api/export/payments" className="btn-outline">Export CSV</a>} />
      <Flash searchParams={searchParams} />
      <div className="grid gap-4 sm:grid-cols-4"><Stat label="Captured" value={rupees(paid._sum.amountPaise ?? 0)} hint={`${paid._count} orders`} /><Stat label="Refunded" value={rupees(refunds._sum.amountPaise ?? 0)} /><Stat label="Net" value={rupees((paid._sum.amountPaise ?? 0) - (refunds._sum.amountPaise ?? 0))} /><Stat label="Webhook events" value={hooks} /></div>
      <div className="my-4 flex gap-2">{["", "CREATED", "PAID", "FAILED", "REFUNDED"].map((s) => <Link key={s} href={`?status=${s}`} className={(searchParams.status ?? "") === s ? "btn-primary btn-sm" : "btn-outline btn-sm"}>{s || "ALL"}</Link>)}</div>
      <div className="card overflow-x-auto p-0"><table className="table"><thead><tr><th>Student</th><th>Order</th><th>Amount</th><th>Status</th><th>Created</th><th>Action</th></tr></thead><tbody>
        {orders.map((o) => <tr key={o.id}><td>{o.student.name}<div className="text-xs text-slate-400">{o.enrollment.cohort.code}</div></td><td className="text-xs">{o.providerOrderId}<br />{o.provider}{o.receiptNo && <> · <Link className="link" href={`/receipt/${o.id}`}>{o.receiptNo}</Link></>}</td><td>{rupees(o.amountPaise)}</td><td><Badge>{o.status}</Badge></td><td className="text-xs">{fmtDateTime(o.createdAt)}</td>
          <td>{manage && o.status === "CREATED" && <form action={reconcileOrder} className="flex gap-1"><input type="hidden" name="id" value={o.id} /><input name="providerPaymentId" className="input w-32" placeholder="pay_…" aria-label="Gateway payment ID" /><input name="reason" className="input w-32" placeholder="Reason" aria-label="Reason" /><button className="btn-outline btn-sm">Reconcile</button></form>}
            {manage && o.payments.map((p) => o.status === "PAID" && <form key={p.id} action={refundPayment} className="flex gap-1"><input type="hidden" name="paymentId" value={p.id} /><input name="amountRupees" type="number" step="0.01" className="input w-24" placeholder="₹" aria-label="Refund amount" /><input name="reason" className="input w-32" placeholder="Reason" aria-label="Refund reason" /><button className="btn-danger btn-sm">Refund</button></form>)}
            {o.payments.flatMap((p) => p.refunds).map((r) => <div key={r.id} className="text-xs">Refund {rupees(r.amountPaise)} — {r.reason}</div>)}</td></tr>)}
      </tbody></table></div>
    </>
  );
}
