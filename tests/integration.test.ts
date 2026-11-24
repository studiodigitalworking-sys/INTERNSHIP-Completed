import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { confirmOrderPaid } from "@/lib/payments";
import { completionEligibility, issueCredential, revokeCredential, publicStatus } from "@/lib/credential";
import { enqueue, processOutbox } from "@/lib/outbox";

let studentId = "", otherId = "", enrollmentId = "", orderId = "", adminId = "";

beforeAll(async () => {
  const fam = await db.subjectFamily.create({ data: { name: "Test Family" } });
  const prog = await db.programme.create({ data: { code: "T-001", title: "Test Programme", familyId: fam.id, sourceStatus: "test", streams: "BA", evidence: "report", mode: "Online", launchNote: "test", publicationStatus: "PUBLISHED", feePaise: 49900 } });
  const cohort = await db.cohort.create({ data: { code: "T-001-C1", programmeId: prog.id, startDate: new Date(), endDate: new Date(Date.now() + 864e5 * 30) } });
  const s = await db.user.create({ data: { email: "s@test.local", name: "Test Student", passwordHash: "x" } });
  const o = await db.user.create({ data: { email: "o@test.local", name: "Other Student", passwordHash: "x" } });
  const a = await db.user.create({ data: { email: "a@test.local", name: "Cert Officer", passwordHash: "x", role: "CERTIFICATE_OFFICER" } });
  studentId = s.id; otherId = o.id; adminId = a.id;
  const e = await db.enrollment.create({ data: { studentId, cohortId: cohort.id, status: "PENDING_PAYMENT" } });
  enrollmentId = e.id;
  const ord = await db.order.create({ data: { enrollmentId, studentId, amountPaise: 49900, provider: "SANDBOX", providerOrderId: "order_test_1", idempotencyKey: "idem-1" } });
  orderId = ord.id;
});

describe("payment confirmation", () => {
  it("rejects amount tampering without activating enrolment", async () => {
    const r = await confirmOrderPaid({ providerOrderId: "order_test_1", providerPaymentId: "pay_bad", amountPaise: 100, source: "WEBHOOK" });
    expect(r).toMatchObject({ ok: false, reason: "amount-mismatch" });
    expect((await db.enrollment.findUnique({ where: { id: enrollmentId } }))!.status).toBe("PENDING_PAYMENT");
  });
  it("activates once and is idempotent across webhook + callback replays", async () => {
    const r1 = await confirmOrderPaid({ providerOrderId: "order_test_1", providerPaymentId: "pay_1", amountPaise: 49900, source: "WEBHOOK" });
    const r2 = await confirmOrderPaid({ providerOrderId: "order_test_1", providerPaymentId: "pay_1", amountPaise: 49900, source: "CALLBACK" });
    const r3 = await confirmOrderPaid({ providerOrderId: "order_test_1", providerPaymentId: "pay_2", amountPaise: 49900, source: "WEBHOOK" });
    expect(r1).toMatchObject({ ok: true, duplicate: false });
    expect(r2).toMatchObject({ ok: true, duplicate: true });
    expect(r3).toMatchObject({ ok: true, duplicate: true });
    expect(await db.payment.count({ where: { orderId } })).toBe(1);
    const o = await db.order.findUnique({ where: { id: orderId } });
    expect(o!.status).toBe("PAID");
    expect(o!.receiptNo).toMatch(/^IVR-\d{4}-\d{6}$/);
    expect((await db.enrollment.findUnique({ where: { id: enrollmentId } }))!.status).toBe("ACTIVE");
    expect(await db.outboxMessage.count({ where: { idempotencyKey: `receipt:${orderId}` } })).toBe(1);
  });
  it("unknown orders are rejected", async () => {
    expect(await confirmOrderPaid({ providerOrderId: "nope", providerPaymentId: "pay_x", amountPaise: 1, source: "WEBHOOK" })).toMatchObject({ ok: false });
  });
});

describe("credential lifecycle", () => {
  it("new enrolment is not eligible for completion", async () => {
    const el = await completionEligibility(studentId, enrollmentId);
    expect(el.eligible).toBe(false);
  });
  it("eligibility is scoped to the enrolment owner", async () => {
    const el = await completionEligibility(otherId, enrollmentId);
    expect(el.eligible).toBe(false);
  });
  it("refuses exception completion without approval", async () => {
    await expect(issueCredential({ actor: { id: adminId, role: "CERTIFICATE_OFFICER" }, userId: studentId, recipientName: "Test Student", docType: "01", theme: "02", isException: true, exceptionReason: "x" })).rejects.toThrow();
  });
  it("issues, supersedes on correction and revokes", async () => {
    const actor = { id: adminId, role: "CERTIFICATE_OFFICER" };
    const c1 = await issueCredential({ actor, userId: studentId, recipientName: "Test Studnt", docType: "02", theme: "02", programmeTitle: "Test Programme" });
    expect(c1.code).toMatch(/^IV-\d{4}-/);
    expect(c1.status).toBe("ISSUED");
    const c2 = await issueCredential({ actor, userId: studentId, recipientName: "Test Student", docType: "02", theme: "02", programmeTitle: "Test Programme", supersedesId: c1.id, exceptionReason: "name typo" });
    expect(c2.version).toBe(2);
    expect((await db.credential.findUnique({ where: { id: c1.id } }))!.status).toBe("SUPERSEDED");
    expect(c2.token).not.toBe(c1.token);
    await revokeCredential(c2.id, actor, "issued in error");
    const r = await db.credential.findUnique({ where: { id: c2.id } });
    expect(r!.status).toBe("REVOKED");
    expect(publicStatus("REVOKED")).toBeDefined();
    expect(await db.credentialEvent.count({ where: { credentialId: c2.id } })).toBeGreaterThanOrEqual(2);
  });
  it("idempotency key prevents duplicate issuance", async () => {
    const actor = { id: adminId, role: "CERTIFICATE_OFFICER" };
    const a = await issueCredential({ actor, userId: studentId, recipientName: "Test Student", docType: "03", theme: "01", idempotencyKey: "same-key" });
    const b = await issueCredential({ actor, userId: studentId, recipientName: "Test Student", docType: "03", theme: "01", idempotencyKey: "same-key" });
    expect(b.id).toBe(a.id);
  });
});

describe("outbox", () => {
  it("dedupes by key and delivers each message once", async () => {
    await enqueue({ to: "x@test.local", body: "hi", key: "k-1" });
    await enqueue({ to: "x@test.local", body: "hi", key: "k-1" });
    expect(await db.outboxMessage.count({ where: { idempotencyKey: "k-1" } })).toBe(1);
    const [r1, r2] = await Promise.all([processOutbox(50), processOutbox(50)]);
    expect(r1.sent + r2.sent).toBe(await db.outboxMessage.count({ where: { status: "SENT" } }));
    const again = await processOutbox(50);
    expect(again.sent).toBe(0);
  });
});
