import { db } from "./db";
import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient | typeof db;

export interface AuditInput {
  actorId?: string | null;
  actorRole?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  studentId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string | null;
  evidenceRef?: string | null;
  approvalId?: string | null;
  result?: string;
}

const j = (v: unknown) => (v === undefined || v === null ? null : typeof v === "string" ? v : JSON.stringify(v));

/** Append-only audit log. The application never updates or deletes AuditEvent rows. */
export async function audit(input: AuditInput, tx: Tx = db) {
  return tx.auditEvent.create({
    data: {
      actorId: input.actorId ?? null,
      actorRole: input.actorRole ?? null,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      studentId: input.studentId ?? null,
      oldValue: j(input.oldValue),
      newValue: j(input.newValue),
      reason: input.reason ?? null,
      evidenceRef: input.evidenceRef ?? null,
      approvalId: input.approvalId ?? null,
      result: input.result ?? "SUCCESS",
      requestId: crypto.randomUUID(),
    },
  });
}
