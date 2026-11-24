"use client";
import { useEffect, useState } from "react";

export function LiveRoom({ sessionId, youtubeId, live }: { sessionId: string; youtubeId: string; live: boolean }) {
  const [info, setInfo] = useState<{ credited?: number; percent?: number; status?: string; err?: boolean }>({});
  useEffect(() => {
    if (!live) return;
    const beat = async () => {
      if (document.hidden) return;
      try {
        const r = await fetch("/api/live/heartbeat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId }) });
        const j = await r.json();
        setInfo({ credited: j.credited, percent: j.percent, status: j.status });
      } catch { setInfo((i) => ({ ...i, err: true })); }
    };
    beat();
    const iv = setInterval(beat, 30_000);
    return () => clearInterval(iv);
  }, [sessionId, live]);
  return (
    <div className="card overflow-hidden p-0">
      <div className="aspect-video bg-black"><iframe className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0`} title="Live class" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /></div>
      <div className="p-4 text-sm" role="status" aria-live="polite">
        {live ? <>Attendance is being recorded while this tab is visible. Credited: <strong>{Math.round((info.credited ?? 0) / 60)} min</strong>{info.status && <> · {info.status} ({info.percent}%)</>}{info.err && <span className="text-amber-700"> · connection issue, retrying</span>}</> : "This class is not live. Recording playback does not count toward live attendance."}
      </div>
    </div>
  );
}
