import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { applyHeartbeat, coveragePercent } from "@/lib/watch";
import { getNumber } from "@/lib/settings";

export async function POST(req: NextRequest) {
  const u = await getUser();
  if (!u || u.role !== "STUDENT") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const lessonId = typeof body?.lessonId === "string" ? body.lessonId : null;
  const position = Number(body?.position);
  if (!lessonId || !Number.isFinite(position)) return NextResponse.json({ error: "bad-request" }, { status: 400 });
  const lesson = await db.lesson.findUnique({ where: { id: lessonId }, include: { module: { include: { course: true } } } });
  if (!lesson) return NextResponse.json({ error: "not-found" }, { status: 404 });
  const enrolled = await db.enrollment.findFirst({ where: { studentId: u.id, status: { in: ["ACTIVE", "COMPLETED"] }, cohort: { programmeId: lesson.module.course.programmeId } } });
  if (!enrolled) return NextResponse.json({ error: "not-enrolled" }, { status: 403 });

  const wp = await db.watchProgress.upsert({ where: { userId_lessonId: { userId: u.id, lessonId } }, create: { userId: u.id, lessonId }, update: {} });
  const r = applyHeartbeat(wp, { position, durationSec: lesson.durationSec, now: new Date() });
  const unlockPct = await getNumber("rules.lessonUnlockPercent");
  const pct = coveragePercent(r.uniqueSeconds, lesson.durationSec);
  // optimistic concurrency: only apply if row unchanged since read (multi-tab protection)
  const upd = await db.watchProgress.updateMany({
    where: { id: wp.id, heartbeats: wp.heartbeats },
    data: { buckets: r.buckets, uniqueSeconds: r.uniqueSeconds, lastPosition: r.lastPosition, lastHeartbeatAt: r.lastHeartbeatAt, heartbeats: { increment: 1 }, rejected: r.accepted ? undefined : { increment: 1 }, completed: wp.completed || pct >= unlockPct },
  });
  return NextResponse.json({ accepted: r.accepted && upd.count === 1, reason: upd.count ? r.reason : "concurrent-update", uniqueSeconds: r.uniqueSeconds, percent: pct, completed: wp.completed || pct >= unlockPct });
}
