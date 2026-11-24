import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { sanitizeAnswers } from "@/lib/exam";
import { finalizeAttempt } from "@/app/actions/student";

/** Autosave. Server timer is authoritative: past the deadline the attempt is auto-submitted with last saved answers. */
export async function POST(req: NextRequest) {
  const u = await getUser();
  if (!u) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const a = typeof body?.attemptId === "string" ? await db.examAttempt.findFirst({ where: { id: body.attemptId, userId: u.id }, include: { exam: { include: { questions: true } } } }) : null;
  if (!a) return NextResponse.json({ error: "not-found" }, { status: 404 });
  if (a.status !== "IN_PROGRESS") return NextResponse.json({ status: a.status });
  if (Date.now() > a.deadlineAt.getTime() + 30_000) {
    const f = await finalizeAttempt(a.id, u.id);
    return NextResponse.json({ status: f.status });
  }
  const answers = sanitizeAnswers(a.exam.questions, body.answers);
  const telemetry = typeof body.telemetry === "object" && body.telemetry ? JSON.stringify(body.telemetry).slice(0, 2000) : a.telemetry;
  await db.examAttempt.update({ where: { id: a.id }, data: { answers: JSON.stringify(answers), saveCount: { increment: 1 }, telemetry } });
  return NextResponse.json({ status: "SAVED", remainingMs: a.deadlineAt.getTime() - Date.now() });
}
