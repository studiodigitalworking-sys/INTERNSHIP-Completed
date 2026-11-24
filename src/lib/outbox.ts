import { db } from "./db";
import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient | typeof db;

export async function enqueue(
  msg: { channel?: "EMAIL" | "SMS" | "WHATSAPP"; to: string; subject?: string; body: string; priority?: 0 | 1 | 2; key: string },
  tx: Tx = db,
) {
  const existing = await tx.outboxMessage.findUnique({ where: { idempotencyKey: msg.key } });
  if (existing) return existing;
  return tx.outboxMessage.create({
    data: { channel: msg.channel ?? "EMAIL", to: msg.to, subject: msg.subject, body: msg.body, priority: msg.priority ?? 1, idempotencyKey: msg.key },
  });
}

export async function notify(userId: string, title: string, body: string, link?: string, tx: Tx = db) {
  return tx.notification.create({ data: { userId, title, body, link } });
}

/**
 * Transport adapter. Without SMTP/SMS credentials configured, messages are delivered to the
 * "log" transport (stored as SENT with a note) so no real message is ever sent without owner setup.
 */
async function deliver(m: { channel: string; to: string; subject: string | null; body: string }) {
  if (m.channel === "EMAIL" && process.env.SMTP_URL) {
    throw new Error("SMTP transport not yet connected: configure provider adapter (see docs/OWNER_CONFIGURATION_GUIDE.md)");
  }
  console.info(`[outbox:${m.channel}] -> ${m.to}: ${m.subject ?? ""}`);
  return "log-transport";
}

const BACKOFF_MIN = [1, 5, 15, 60, 240];

/** Processes due messages by priority with exponential backoff and a dead-letter state. */
export async function processOutbox(limit = 25) {
  const due = await db.outboxMessage.findMany({
    where: { status: { in: ["PENDING", "FAILED"] }, nextAttemptAt: { lte: new Date() } },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    take: limit,
  });
  let sent = 0, failed = 0;
  for (const m of due) {
    // atomic claim: only proceed if still in the state we read
    const claimed = await db.outboxMessage.updateMany({ where: { id: m.id, attempts: m.attempts, status: m.status }, data: { attempts: { increment: 1 } } });
    if (!claimed.count) continue;
    try {
      await deliver(m);
      await db.outboxMessage.update({ where: { id: m.id }, data: { status: "SENT", sentAt: new Date(), lastError: null } });
      sent++;
    } catch (e) {
      const attempts = m.attempts + 1;
      const dead = attempts >= BACKOFF_MIN.length;
      await db.outboxMessage.update({
        where: { id: m.id },
        data: {
          status: dead ? "DEAD" : "FAILED",
          lastError: (e as Error).message.slice(0, 500),
          nextAttemptAt: new Date(Date.now() + BACKOFF_MIN[Math.min(attempts, BACKOFF_MIN.length - 1)] * 60_000),
        },
      });
      failed++;
    }
  }
  return { processed: due.length, sent, failed };
}
