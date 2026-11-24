import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { confirmOrderPaid, markOrderFailed, verifyWebhookSignature } from "@/lib/payments";
import { sha256 } from "@/lib/crypto";

/** Razorpay-compatible webhook: raw-body HMAC verification, event-id dedupe, idempotent confirmation. */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sig = req.headers.get("x-razorpay-signature");
  const valid = verifyWebhookSignature(raw, sig);
  let evt: { event?: string; payload?: { payment?: { entity?: { id: string; order_id: string; amount: number; method?: string } } } } = {};
  try { evt = JSON.parse(raw); } catch { /* invalid json */ }
  const eventId = req.headers.get("x-razorpay-event-id") || sha256(raw);
  const existing = await db.webhookEvent.findUnique({ where: { eventId } });
  if (existing) return NextResponse.json({ ok: true, duplicate: true });
  const rec = await db.webhookEvent.create({ data: { provider: "RAZORPAY", eventId, type: evt.event ?? "unknown", payload: raw.slice(0, 10000), signatureValid: valid } });
  if (!valid) {
    await db.webhookEvent.update({ where: { id: rec.id }, data: { result: "REJECTED_SIGNATURE" } });
    return NextResponse.json({ error: "invalid-signature" }, { status: 400 });
  }
  const p = evt.payload?.payment?.entity;
  let result = "IGNORED";
  if (p && (evt.event === "payment.captured" || evt.event === "order.paid")) {
    const r = await confirmOrderPaid({ providerOrderId: p.order_id, providerPaymentId: p.id, amountPaise: p.amount, method: p.method, source: "WEBHOOK" });
    result = r.ok ? (r.duplicate ? "DUPLICATE" : "CONFIRMED") : `REJECTED_${r.reason}`;
  } else if (p && evt.event === "payment.failed") {
    await markOrderFailed(p.order_id, "Provider reported failure");
    result = "FAILED";
  }
  await db.webhookEvent.update({ where: { id: rec.id }, data: { result } });
  return NextResponse.json({ ok: true, result });
}
