import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { attendanceStatus, creditLiveGap } from "@/lib/attendance";
import { getNumber } from "@/lib/settings";

export async function POST(req: NextRequest) {
  const u = await getUser();
  if (!u || u.role !== "STUDENT") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const s = typeof body?.sessionId === "string" ? await db.liveSession.findUnique({ where: { id: body.sessionId } }) : null;
  if (!s) return NextResponse.json({ error: "not-found" }, { status: 404 });
  const enrolled = await db.enrollment.findFirst({ where: { studentId: u.id, cohortId: s.cohortId, status: "ACTIVE" } });
  if (!enrolled) return NextResponse.json({ error: "not-enrolled" }, { status: 403 });
  const now = new Date();
  if (now < s.startsAt || now > s.endsAt || s.status === "CANCELLED") return NextResponse.json({ live: false });
  const a = await db.liveAttendance.findUnique({ where: { sessionId_userId: { sessionId: s.id, userId: u.id } } });
  const total = (s.endsAt.getTime() - s.startsAt.getTime()) / 1000;
  const [presentPct, partialPct] = await Promise.all([getNumber("rules.attendancePresentPercent"), getNumber("rules.attendancePartialPercent")]);
  if (!a) {
    await db.liveAttendance.create({ data: { sessionId: s.id, userId: u.id, firstJoinAt: now, lastSeenAt: now, status: "ABSENT" } });
    return NextResponse.json({ live: true, credited: 0 });
  }
  const gap = creditLiveGap(a.lastSeenAt ?? now, now, s.startsAt, s.endsAt);
  const credited = Math.min(total, a.creditedSeconds + gap.credited);
  const st = attendanceStatus(credited + (a.adjustedSeconds ?? 0), total, presentPct, partialPct);
  await db.liveAttendance.updateMany({
    where: { id: a.id, lastSeenAt: a.lastSeenAt },
    data: { lastSeenAt: now, creditedSeconds: credited, reconnects: gap.reconnect ? { increment: 1 } : undefined, status: st.status },
  });
  return NextResponse.json({ live: true, credited, percent: st.pct, status: st.status });
}
