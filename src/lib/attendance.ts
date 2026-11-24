/** Live-class attendance from server-observed heartbeats (V14 §9). */
export const LIVE_HEARTBEAT_MAX = 45; // seconds credited at most per heartbeat gap

export function creditLiveGap(lastSeenAt: Date, now: Date, sessionStart: Date, sessionEnd: Date) {
  const from = Math.max(lastSeenAt.getTime(), sessionStart.getTime());
  const to = Math.min(now.getTime(), sessionEnd.getTime());
  const gap = (to - from) / 1000;
  if (gap <= 0) return { credited: 0, reconnect: false };
  if (gap > LIVE_HEARTBEAT_MAX) return { credited: 0, reconnect: true }; // disconnected period not credited
  return { credited: Math.round(gap), reconnect: false };
}

export function attendanceStatus(creditedSeconds: number, sessionSeconds: number, presentPct = 75, partialPct = 25) {
  const pct = sessionSeconds > 0 ? (creditedSeconds / sessionSeconds) * 100 : 0;
  return { pct: Math.min(100, Math.round(pct)), status: pct >= presentPct ? "PRESENT" : pct >= partialPct ? "PARTIAL" : "ABSENT" };
}

/** Detects overlapping [start,end) intervals — used to block impossible work-log/attendance claims. */
export function hasOverlap(intervals: { start: Date; end: Date }[]) {
  const s = [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime());
  for (let i = 1; i < s.length; i++) if (s[i].start < s[i - 1].end) return true;
  return false;
}
