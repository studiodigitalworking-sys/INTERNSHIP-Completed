"use client";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window { YT?: { Player: new (el: HTMLElement, o: object) => YTPlayer; PlayerState: { PLAYING: number } }; onYouTubeIframeAPIReady?: () => void }
}
interface YTPlayer { getCurrentTime: () => number; getPlayerState: () => number; destroy: () => void }

function loadYT(): Promise<void> {
  return new Promise((resolve) => {
    if (window.YT?.Player) return resolve();
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(); };
    if (!document.getElementById("yt-api")) {
      const s = document.createElement("script"); s.id = "yt-api"; s.src = "https://www.youtube.com/iframe_api"; document.body.appendChild(s);
    }
  });
}

/** Sends playback position heartbeats every 10s while playing; the server decides what is credited. */
export function LessonPlayer(p: { lessonId: string; videoId: string; durationSec: number; startAt: number; initialPercent: number; initialCompleted: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const [percent, setPercent] = useState(p.initialPercent);
  const [completed, setCompleted] = useState(p.initialCompleted);
  const [status, setStatus] = useState("Press play to start. Progress saves automatically.");
  const pending = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    loadYT().then(() => {
      if (!alive || !host.current || !window.YT) return;
      player.current = new window.YT.Player(host.current, { videoId: p.videoId, playerVars: { start: Math.floor(p.startAt), rel: 0, modestbranding: 1 }, width: "100%", height: "100%" });
    });
    const send = async (position: number) => {
      try {
        const r = await fetch("/api/watch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lessonId: p.lessonId, position }) });
        if (!r.ok) throw new Error(String(r.status));
        const j = await r.json();
        setPercent(j.percent); setCompleted(j.completed);
        setStatus(j.accepted ? "Progress saved." : j.reason === "out-of-window" ? "Skipped section not counted — keep watching normally." : "Saved.");
        pending.current = null;
      } catch {
        pending.current = position;
        setStatus("Network issue — will retry automatically.");
      }
    };
    const iv = setInterval(() => {
      const pl = player.current;
      if (!pl || typeof pl.getPlayerState !== "function") return;
      if (pl.getPlayerState() === window.YT!.PlayerState.PLAYING) send(pl.getCurrentTime());
      else if (pending.current !== null) send(pending.current);
    }, 10_000);
    const vis = () => { if (document.hidden && player.current?.getPlayerState?.() === window.YT?.PlayerState.PLAYING) send(player.current!.getCurrentTime()); };
    document.addEventListener("visibilitychange", vis);
    return () => { alive = false; clearInterval(iv); document.removeEventListener("visibilitychange", vis); player.current?.destroy?.(); };
  }, [p.lessonId, p.videoId, p.startAt]);

  return (
    <div className="card p-0 overflow-hidden">
      <div className="aspect-video w-full bg-black"><div ref={host} className="h-full w-full" /></div>
      <div className="flex flex-wrap items-center justify-between gap-2 p-4">
        <div className="min-w-[200px] flex-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Unique watch coverage"><div className="h-full bg-[#12305c]" style={{ width: `${percent}%` }} /></div>
          <div className="mt-1 text-xs text-slate-500" role="status" aria-live="polite">{percent}% unique coverage · {status}</div>
        </div>
        {completed ? <span className="badge bg-emerald-100 text-emerald-800">Lesson completed</span> : <span className="badge bg-slate-100 text-slate-700">Complete at 90%</span>}
      </div>
    </div>
  );
}
