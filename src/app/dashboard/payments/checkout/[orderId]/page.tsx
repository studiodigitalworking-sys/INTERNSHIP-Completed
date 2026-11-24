import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { Notice, PageHeader } from "@/components/ui";
import { rupees } from "@/lib/format";
import { activeProvider } from "@/lib/payments";
import { sandboxPay } from "@/app/actions/student";
import { RazorpayCheckout } from "@/components/RazorpayCheckout";

export default async function Checkout({ params }: { params: { orderId: string } }) {
  const u = await requireStudent();
  const o = await db.order.findFirst({ where: { id: params.orderId, studentId: u.id }, include: { enrollment: { include: { cohort: { include: { programme: true } } } } } });
  if (!o) notFound();
  if (o.status !== "CREATED") return <Notice tone="blue">This order is {o.status}.</Notice>;
  return (
    <>
      <PageHeader title="Checkout" sub={`${o.enrollment.cohort.programme.title} · ${o.enrollment.cohort.code}`} />
      <div className="card max-w-lg">
        <div className="flex justify-between"><span>Amount payable</span><strong>{rupees(o.amountPaise)}</strong></div>
        <div className="mt-1 text-xs text-slate-500">Order {o.providerOrderId}. The amount is fixed on our server and cannot be changed in the browser.</div>
        {activeProvider() === "SANDBOX" ? (
          <div className="mt-4 space-y-3">
            <Notice>Sandbox mode: choose an outcome to simulate the gateway. Confirmation still runs through the signed-webhook verification path.</Notice>
            <form action={sandboxPay} className="space-y-3">
              <input type="hidden" name="orderId" value={o.id} />
              <fieldset><legend className="label">Method</legend>{["upi", "card", "netbanking"].map((m) => <label key={m} className="mr-4 text-sm"><input type="radio" name="method" value={m} defaultChecked={m === "upi"} /> {m.toUpperCase()}</label>)}</fieldset>
              <div className="flex gap-2"><button name="outcome" value="success" className="btn-primary">Simulate successful payment</button><button name="outcome" value="fail" className="btn-outline">Simulate failure</button></div>
            </form>
          </div>
        ) : (
          <RazorpayCheckout keyId={process.env.RAZORPAY_KEY_ID!} orderId={o.providerOrderId} amount={o.amountPaise} name={u.name} email={u.email} phone={u.phone ?? ""} />
        )}
      </div>
    </>
  );
}
