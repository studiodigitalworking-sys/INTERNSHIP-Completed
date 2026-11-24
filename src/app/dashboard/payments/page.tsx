import Link from "next/link";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { Badge, Empty, Flash, PageHeader } from "@/components/ui";
import { fmtDateTime, rupees } from "@/lib/format";
import { startPayment } from "@/app/actions/student";
import { activeProvider } from "@/lib/payments";

export default async function Payments({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  const u = await requireStudent();
  const [due, orders] = await Promise.all([
    db.enrollment.findMany({ where: { studentId: u.id, status: "PENDING_PAYMENT" }, include: { cohort: { include: { programme: true } } } }),
    db.order.findMany({ where: { studentId: u.id }, include: { payments: { include: { refunds: true } }, enrollment: { include: { cohort: { include: { programme: true } } } } }, orderBy: { createdAt: "desc" } }),
  ]);
  return (
    <>
      <PageHeader title="Payments & receipts" sub={activeProvider() === "SANDBOX" ? "Payment gateway is in SANDBOX/test mode — no real money is charged." : "Payments are processed securely by Razorpay."} />
      <Flash searchParams={searchParams} />
      {due.map((e) => (
        <div key={e.id} className="card mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div><div className="font-semibold">{e.cohort.programme.title}</div><div className="text-sm text-slate-500">{e.cohort.code} · Fee {rupees(e.cohort.programme.feePaise)} (incl. applicable taxes)</div></div>
          <form action={startPayment}><input type="hidden" name="enrollmentId" value={e.id} /><button className="btn-accent">Pay {rupees(e.cohort.programme.feePaise)}</button></form>
        </div>
      ))}
      <h2 className="h2 mb-2 mt-6">History</h2>
      {orders.length ? (
        <div className="card overflow-x-auto p-0"><table className="table"><thead><tr><th>Programme</th><th>Amount</th><th>Status</th><th>Receipt</th><th>Date</th></tr></thead><tbody>
          {orders.map((o) => <tr key={o.id}><td>{o.enrollment.cohort.programme.title}<div className="text-xs text-slate-400">{o.providerOrderId}</div></td><td>{rupees(o.amountPaise)}</td><td><Badge>{o.status}</Badge>{o.payments.some((p) => p.refunds.length) && <Badge tone="purple">Refund</Badge>}</td>
            <td>{o.receiptNo ? <Link className="link" href={`/receipt/${o.id}`} target="_blank">{o.receiptNo}</Link> : o.status === "CREATED" ? <Link className="link" href={`/dashboard/payments/checkout/${o.id}`}>Resume</Link> : "—"}</td><td>{fmtDateTime(o.paidAt ?? o.createdAt)}</td></tr>)}
        </tbody></table></div>
      ) : <Empty title="No payments yet" />}
    </>
  );
}
