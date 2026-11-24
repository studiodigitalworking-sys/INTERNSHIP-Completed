"use client";
import { useEffect, useRef, useState } from "react";
import { submitExam } from "@/app/actions/student";
import type { PublicQuestion } from "@/lib/exam";

export function ExamRunner({ attemptId, paper, saved, deadline }: { attemptId: string; paper: PublicQuestion[]; saved: Record<string, string>; deadline: string }) {
  const [answers, setAnswers] = useState<Record<string, string>>(saved);
  const [left, setLeft] = useState(() => new Date(deadline).getTime() - Date.now());
  const [saveState, setSaveState] = useState("All answers saved");
  const tel = useRef({ blur: 0, copy: 0 });
  const formRef = useRef<HTMLFormElement>(null);
  const dirty = useRef(false);

  const save = async () => {
    if (!dirty.current) return;
    try {
      const r = await fetch("/api/exam/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ attemptId, answers, telemetry: tel.current }) });
      const j = await r.json();
      if (j.status !== "SAVED") { window.location.reload(); return; }
      dirty.current = false; setSaveState("All answers saved");
    } catch { setSaveState("Offline — will retry"); }
  };
  useEffect(() => { const iv = setInterval(save, 8000); return () => clearInterval(iv); });
  useEffect(() => {
    const iv = setInterval(() => {
      const l = new Date(deadline).getTime() - Date.now();
      setLeft(l);
      if (l <= 0) { clearInterval(iv); formRef.current?.requestSubmit(); }
    }, 1000);
    const blur = () => { tel.current.blur++; dirty.current = true; };
    const copy = () => { tel.current.copy++; dirty.current = true; };
    window.addEventListener("blur", blur); document.addEventListener("copy", copy);
    return () => { clearInterval(iv); window.removeEventListener("blur", blur); document.removeEventListener("copy", copy); };
  }, [deadline]);
  const mm = Math.max(0, Math.floor(left / 60000)), ss = Math.max(0, Math.floor((left % 60000) / 1000));
  return (
    <form ref={formRef} action={submitExam} className="mt-4 space-y-4" onSubmit={() => { dirty.current = false; }}>
      <input type="hidden" name="attemptId" value={attemptId} />
      <div className="sticky top-16 z-10 flex items-center justify-between rounded-lg border bg-white p-3 shadow-sm">
        <span className={`font-mono text-lg font-bold ${left < 60000 ? "text-red-600" : ""}`} role="timer" aria-live="off">⏱ {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}</span>
        <span className="text-xs text-slate-500" role="status">{Object.keys(answers).length}/{paper.length} answered · {saveState}</span>
      </div>
      {paper.map((q, i) => (
        <fieldset key={q.id} className="card">
          <legend className="sr-only">Question {i + 1}</legend>
          <div className="font-medium">{i + 1}. {q.text} <span className="text-xs text-slate-400">({q.marks} mark{q.marks > 1 ? "s" : ""})</span></div>
          <div className="mt-2 space-y-1">{q.options.map((o) => (
            <label key={o.id} className="flex cursor-pointer items-start gap-2 rounded p-2 text-sm hover:bg-slate-50">
              <input type="radio" name={`q_${q.id}`} value={o.id} checked={answers[q.id] === o.id} onChange={() => { setAnswers({ ...answers, [q.id]: o.id }); dirty.current = true; setSaveState("Saving…"); }} /> {o.text}
            </label>
          ))}</div>
        </fieldset>
      ))}
      <button className="btn-primary" onClick={(e) => { if (!confirm("Submit your exam? You cannot change answers afterwards.")) e.preventDefault(); }}>Submit exam</button>
    </form>
  );
}
