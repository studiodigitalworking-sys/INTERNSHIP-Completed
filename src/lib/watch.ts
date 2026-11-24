/**
 * Server-side watch-progress accounting (V14 §8).
 * Client heartbeats are untrusted hints: we credit only 10-second buckets that fall inside
 * a bounded window since the last accepted heartbeat, never re-credit a bucket, and reject
 * jumps larger than MAX_DELTA (seek/replay farming, clock skew, multi-tab replay).
 */
export const BUCKET = 10;
export const MAX_DELTA = 35;
export const MIN_INTERVAL = 5;

export interface WatchState {
  buckets: string;
  uniqueSeconds: number;
  lastPosition: number;
  lastHeartbeatAt: Date | null;
}

export interface HeartbeatResult extends WatchState {
  accepted: boolean;
  credited: number;
  reason?: string;
}

export function applyHeartbeat(
  state: WatchState,
  input: { position: number; durationSec: number; now: Date },
): HeartbeatResult {
  const totalBuckets = Math.ceil(input.durationSec / BUCKET);
  let buckets = state.buckets.padEnd(totalBuckets, "0").slice(0, totalBuckets);
  const pos = Math.max(0, Math.min(Math.floor(input.position), input.durationSec));
  const base = { ...state, buckets };

  if (!state.lastHeartbeatAt) {
    return { ...base, lastPosition: pos, lastHeartbeatAt: input.now, accepted: true, credited: 0, reason: "first-heartbeat" };
  }
  const wall = (input.now.getTime() - state.lastHeartbeatAt.getTime()) / 1000;
  if (wall < MIN_INTERVAL) return { ...base, accepted: false, credited: 0, reason: "too-frequent" };

  const advance = pos - state.lastPosition;
  // Seek backwards / forward jump or playback faster than wall clock (+10% tolerance) is not credited.
  if (advance <= 0 || advance > MAX_DELTA || advance > wall * 1.1 + 2) {
    return { ...base, lastPosition: pos, lastHeartbeatAt: input.now, accepted: false, credited: 0, reason: "out-of-window" };
  }
  let credited = 0;
  const startB = Math.floor(state.lastPosition / BUCKET);
  const endB = Math.floor((pos - 1) / BUCKET);
  const arr = buckets.split("");
  for (let b = startB; b <= endB && b < totalBuckets; b++) {
    if (arr[b] !== "1") {
      arr[b] = "1";
      credited += Math.min(BUCKET, input.durationSec - b * BUCKET);
    }
  }
  buckets = arr.join("");
  return {
    buckets,
    uniqueSeconds: Math.min(input.durationSec, state.uniqueSeconds + credited),
    lastPosition: pos,
    lastHeartbeatAt: input.now,
    accepted: true,
    credited,
  };
}

export function coveragePercent(uniqueSeconds: number, durationSec: number) {
  return durationSec ? Math.min(100, Math.floor((uniqueSeconds / durationSec) * 100)) : 0;
}
