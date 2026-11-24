import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { fmtDateTime, rupees } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { PrintButton } from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export default async function Receipt({ params }: { params: { id: string } }) {
  const u = await requireUser();
  const o = await db.order.findUnique({ where: { id: params.id }, include: { student: true, payments: true, enrollment: { include: { cohort: { include: { programme: true } } } } } });
  if (!o || !o.receiptNo || (o.studentId !== u.id && !can(u.role, "payments.view"))) notFound();
  const s = await getSettings();
  return (
    <div className="mx-auto max-w-2xl bg-white p-8">
      <div className="flex items-start justify-between"><div><h1 className="text-2xl font-bold">Payment receipt</h1><div className="text-sm text-slate-500">{o.receiptNo}</div></div><PrintButton /></div>
      <div className="mt-4 text-sm"><strong>{s["org.legalName"] || s["org.name"]}</strong><br />{s["org.address"]}{s["org.gstin"] && <><br />GSTIN: {s["org.gstin"]}</>}</div>
      <table className="table mt-6"><tbody>
        <tr><th>Received from</th><td>{o.student.name} ({o.student.email})</td></tr>
        <tr><th>For</th><td>{o.enrollment.cohort.programme.title} — {o.enrollment.cohort.code}</td></tr>
        <tr><th>Amount</th><td>{rupees(o.amountPaise)} (inclusive of applicable taxes)</td></tr>
        <tr><th>Paid on</th><td>{fmtDateTime(o.paidAt)}</td></tr>
        <tr><th>Gateway / mode</th><td>{o.provider}{o.provider === "SANDBOX" ? " (TEST — not a real payment)" : ""} · {o.payments[0]?.method ?? "—"}</td></tr>
        <tr><th>Payment ref</th><td>{o.payments.map((p) => p.providerPaymentId).join(", ")}</td></tr>
      </tbody></table>
      <p className="mt-6 text-xs text-slate-500">{s["org.gstin"] ? "This is a computer-generated receipt." : "Tax invoice details will appear once GSTIN is configured by the owner. This is a computer-generated receipt."}</p>
    </div>
  );
}
