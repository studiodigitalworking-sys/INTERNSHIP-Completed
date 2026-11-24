import { NextRequest, NextResponse } from "next/server";
import { processOutbox } from "@/lib/outbox";
import { getUser } from "@/lib/auth";
import { can } from "@/lib/rbac";

/** Trigger with header `x-cron-secret: $CRON_SECRET` from a scheduler, or by an admin with outbox.manage. */
export async function POST(req: NextRequest) {
  const okCron = process.env.CRON_SECRET && req.headers.get("x-cron-secret") === process.env.CRON_SECRET;
  const u = okCron ? null : await getUser();
  if (!okCron && !can(u?.role, "outbox.manage")) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json(await processOutbox());
}
