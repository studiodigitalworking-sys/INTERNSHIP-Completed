import { describe, expect, it } from "vitest";
import { can, canAssignRole, isStaff } from "@/lib/rbac";
import { applyHeartbeat, coveragePercent, type WatchState } from "@/lib/watch";
import { attendanceStatus, creditLiveGap, hasOverlap } from "@/lib/attendance";
import { buildPaper, grade, sanitizeAnswers, type QuestionRow } from "@/lib/exam";
import { verifyWebhookSignature, verifyCheckoutSignature } from "@/lib/payments";
import { credentialCode, hmac, safeEqualHex } from "@/lib/crypto";
import { toCsv } from "@/lib/format";

describe("RBAC (default deny)", () => {
  it("students and unknown roles have no staff permissions", () => {
    expect(can("STUDENT", "student360.view")).toBe(false);
    expect(can("STUDENT", "credentials.issue")).toBe(false);
    expect(can("NOPE", "audit.view")).toBe(false);
    expect(can(undefined, "audit.view")).toBe(false);
    expect(isStaff("STUDENT")).toBe(false);
  });
  it("mentors review but cannot issue or change marks", () => {
    expect(can("MENTOR", "mentor.review")).toBe(true);
    expect(can("MENTOR", "credentials.issue")).toBe(false);
    expect(can("MENTOR", "marks.change")).toBe(false);
  });
  it("only root owner may create platform admins", () => {
    expect(canAssignRole("ROOT_OWNER", "PLATFORM_ADMIN")).toBe(true);
    expect(canAssignRole("PLATFORM_ADMIN", "PLATFORM_ADMIN")).toBe(false);
    expect(canAssignRole("PLATFORM_ADMIN", "ROOT_OWNER")).toBe(false);
    expect(canAssignRole("PLATFORM_ADMIN", "MENTOR")).toBe(true);
    expect(canAssignRole("FINANCE_ADMIN", "MENTOR")).toBe(false);
  });
});

describe("watch progress (server authoritative)", () => {
  const t0 = new Date("2026-01-01T00:00:00Z");
  const at = (s: number) => new Date(t0.getTime() + s * 1000);
  const empty: WatchState = { buckets: "", uniqueSeconds: 0, lastPosition: 0, lastHeartbeatAt: null };
  const play = (state: WatchState, pairs: [number, number][], dur = 100) => pairs.reduce((s, [wall, pos]) => applyHeartbeat(s, { position: pos, durationSec: dur, now: at(wall) }), state);

  it("credits normal playback", () => {
    const s = play(empty, [[0, 0], [10, 10], [20, 20], [30, 30]]);
    expect(s.uniqueSeconds).toBe(30);
  });
  it("does not credit forward seeks", () => {
    const s = applyHeartbeat(play(empty, [[0, 0], [10, 10]]), { position: 90, durationSec: 100, now: at(20) });
    expect(s.accepted).toBe(false);
    expect(s.uniqueSeconds).toBe(10);
  });
  it("does not credit playback faster than wall clock", () => {
    const s = applyHeartbeat(play(empty, [[0, 0]]), { position: 30, durationSec: 100, now: at(10) });
    expect(s.accepted).toBe(false);
  });
  it("does not re-credit replayed segments", () => {
    let s = play(empty, [[0, 0], [10, 10], [20, 20]]);
    s = applyHeartbeat(s, { position: 0, durationSec: 100, now: at(30) });
    s = play(s, [[40, 10], [50, 20]]);
    expect(s.uniqueSeconds).toBe(20);
  });
  it("rejects too-frequent heartbeats (multi-tab)", () => {
    const s = applyHeartbeat(play(empty, [[0, 0], [10, 10]]), { position: 12, durationSec: 100, now: at(11) });
    expect(s.accepted).toBe(false);
    expect(s.reason).toBe("too-frequent");
  });
  it("caps coverage at 100%", () => expect(coveragePercent(500, 100)).toBe(100));
});

describe("live attendance", () => {
  const st = new Date("2026-01-01T10:00:00Z"), en = new Date("2026-01-01T11:00:00Z");
  it("credits short gaps and not disconnections", () => {
    expect(creditLiveGap(new Date(st.getTime() + 60e3), new Date(st.getTime() + 90e3), st, en)).toEqual({ credited: 30, reconnect: false });
    expect(creditLiveGap(new Date(st.getTime() + 60e3), new Date(st.getTime() + 600e3), st, en)).toEqual({ credited: 0, reconnect: true });
  });
  it("does not credit outside the session window", () => {
    expect(creditLiveGap(new Date(en.getTime() + 1e3), new Date(en.getTime() + 20e3), st, en).credited).toBe(0);
  });
  it("classifies status by thresholds", () => {
    expect(attendanceStatus(2700, 3600).status).toBe("PRESENT");
    expect(attendanceStatus(1000, 3600).status).toBe("PARTIAL");
    expect(attendanceStatus(100, 3600).status).toBe("ABSENT");
  });
  it("detects overlapping intervals", () => {
    const d = (h: number) => new Date(Date.UTC(2026, 0, 1, h));
    expect(hasOverlap([{ start: d(9), end: d(11) }, { start: d(10), end: d(12) }])).toBe(true);
    expect(hasOverlap([{ start: d(9), end: d(10) }, { start: d(10), end: d(12) }])).toBe(false);
  });
});

describe("exams", () => {
  const qs: QuestionRow[] = Array.from({ length: 6 }, (_, i) => ({ id: `q${i}`, text: `Q${i}`, marks: 1, correctOptionId: `q${i}a`, options: JSON.stringify(["a", "b", "c", "d"].map((o) => ({ id: `q${i}${o}`, text: o }))) }));
  it("never sends correct answers to the client", () => {
    const paper = buildPaper(qs, "attempt-1");
    const json = JSON.stringify(paper);
    expect(json).not.toContain("correctOptionId");
    paper.forEach((q) => expect(Object.keys(q).sort()).toEqual(["id", "marks", "options", "text"]));
  });
  it("is deterministic per attempt seed (refresh-safe) and varies across attempts", () => {
    expect(buildPaper(qs, "s1")).toEqual(buildPaper(qs, "s1"));
    expect(JSON.stringify(buildPaper(qs, "s1"))).not.toEqual(JSON.stringify(buildPaper(qs, "s2")));
  });
  it("grades on the server and sanitises unknown answers", () => {
    const answers = sanitizeAnswers(qs, { q0: "q0a", q1: "q1b", q2: "bogus", evil: "x" });
    expect(answers).toEqual({ q0: "q0a", q1: "q1b" });
    expect(grade(qs, answers, 40)).toEqual({ score: 1, maxScore: 6, percent: 17, passed: false });
  });
});

describe("payment signatures", () => {
  it("accepts valid webhook signature and rejects tampering", () => {
    const body = JSON.stringify({ event: "payment.captured", amount: 49900 });
    const sig = hmac("whsec_test", body);
    expect(verifyWebhookSignature(body, sig)).toBe(true);
    expect(verifyWebhookSignature(body.replace("49900", "100"), sig)).toBe(false);
    expect(verifyWebhookSignature(body, null)).toBe(false);
    expect(verifyWebhookSignature(body, "zz")).toBe(false);
  });
  it("verifies checkout signatures", () => {
    const sig = hmac(process.env.RAZORPAY_KEY_SECRET || "whsec_test", "order_1|pay_1");
    expect(verifyCheckoutSignature("order_1", "pay_1", sig)).toBe(true);
    expect(verifyCheckoutSignature("order_1", "pay_2", sig)).toBe(false);
  });
  it("constant-time compare handles length mismatch", () => expect(safeEqualHex("ab", "abcd")).toBe(false));
});

describe("misc", () => {
  it("credential codes are unique and well-formed", () => {
    const set = new Set(Array.from({ length: 2000 }, () => credentialCode(2026)));
    expect(set.size).toBe(2000);
    [...set].forEach((c) => expect(c).toMatch(/^IV-2026-[0-9A-HJKMNP-TV-Z]{10}$/));
  });
  it("CSV export neutralises formula injection", () => {
    expect(toCsv([{ a: "=HYPERLINK(1)", b: "x,y" }])).toBe("a,b\n'=HYPERLINK(1),\"x,y\"");
  });
});
