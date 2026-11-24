import { db } from "./db";
import { hmac, randomToken, safeEqualHex } from "./crypto";
import { audit } from "./audit";
import { enqueue, notify } from "./outbox";
import { rupees } from "./format";

/**
 * Payment provider adapter. RAZORPAY is used only when RAZORPAY_KEY_ID/SECRET are configured
 * (test mode until the owner approves live). Otherwise the SANDBOX provider simulates checkout;
 * sandbox confirmations still go through the same signed-webhook + atomic confirmation path.
 */
export function activeProvider(): "RAZORPAY" | "SANDBOX" {
  return process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET ? "RAZORPAY" : "SANDBOX";
}
export function webhookSecret() {
  return process.env.RAZORPAY_WEBHOOK_SECRET || `sandbox-webhook-${process.env.APP_SECRET || "dev"}`;
}

export async function createProviderOrder(amountPaise: number, receipt: string) {
  if (activeProvider() === "RAZORPAY") {
    const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt }),
    });
    if (!res.ok) throw new Error(`Razorpay order failed: ${res.status}`);
    const j = (await res.json()) as { id: string };
    return j.id;
  }
  return `sandbox_order_${randomToken(9)}`;
}

/** Razorpay checkout callback signature: HMAC_SHA256(order_id|payment_id, key_secret). */
export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string) {
  const key = process.env.RAZORPAY_KEY_SECRET || webhookSecret();
  return safeEqualHex(hmac(key, `${orderId}|${paymentId}`), signature);
}
export function verifyWebhookSignature(rawBody: string, signature: string | null) {
  if (!signature) return false;
  return safeEqualHex(hmac(webhookSecret(), rawBody), signature);
}

/**
 * Single atomic transition: payment row + order PAID + enrollment ACTIVE + receipt number + outbox.
 * Idempotent on providerPaymentId; rejects amount mismatch.
 */
export async function confirmOrderPaid(input: {
  providerOrderId: string; providerPaymentId: string; amountPaise: number; method?: string; source: "WEBHOOK" | "CALLBACK" | "RECONCILIATION";
}) {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { providerOrderId: input.providerOrderId }, include: { student: true, enrollment: { include: { cohort: { include: { programme: true } } } } } });
    if (!order) return { ok: false as const, reason: "order-not-found" };
    const dup = await tx.payment.findUnique({ where: { providerPaymentId: input.providerPaymentId } });
    if (dup || order.status === "PAID") return { ok: true as const, duplicate: true, orderId: order.id };
    if (input.amountPaise !== order.amountPaise) {
      await audit({ action: "PAYMENT_AMOUNT_MISMATCH", targetType: "Order", targetId: order.id, studentId: order.studentId, newValue: input, result: "REJECTED" }, tx);
      return { ok: false as const, reason: "amount-mismatch" };
    }
    await tx.payment.create({ data: { orderId: order.id, providerPaymentId: input.providerPaymentId, status: "CAPTURED", amountPaise: input.amountPaise, method: input.method, source: input.source } });
    const seqRow = await tx.setting.findUnique({ where: { key: "receipt.seq" } });
    const seq = Number(seqRow?.value ?? 0) + 1;
    await tx.setting.upsert({ where: { key: "receipt.seq" }, create: { key: "receipt.seq", value: String(seq) }, update: { value: String(seq) } });
    const receiptNo = `IVR-${new Date().getFullYear()}-${String(seq).padStart(6, "0")}`;
    await tx.order.update({ where: { id: order.id }, data: { status: "PAID", paidAt: new Date(), receiptNo } });
    await tx.enrollment.update({ where: { id: order.enrollmentId }, data: { status: "ACTIVE", activatedAt: new Date() } });
    await audit({ action: "PAYMENT_CONFIRMED", targetType: "Order", targetId: order.id, studentId: order.studentId, newValue: { receiptNo, source: input.source, providerPaymentId: input.providerPaymentId } }, tx);
    await notify(order.studentId, "Payment received", `Receipt ${receiptNo} for ${rupees(order.amountPaise)}. Your enrolment is now active.`, "/dashboard/payments", tx);
    await enqueue({ to: order.student.email, subject: `Payment receipt ${receiptNo}`, body: `Received ${rupees(order.amountPaise)} for ${order.enrollment.cohort.programme.title}.`, priority: 0, key: `receipt:${order.id}` }, tx);
    return { ok: true as const, duplicate: false, orderId: order.id, receiptNo };
  });
}

export async function markOrderFailed(providerOrderId: string, reason: string) {
  const order = await db.order.findUnique({ where: { providerOrderId } });
  if (!order || order.status !== "CREATED") return;
  await db.order.update({ where: { id: order.id }, data: { status: "FAILED" } });
  await audit({ action: "PAYMENT_FAILED", targetType: "Order", targetId: order.id, studentId: order.studentId, reason });
}
