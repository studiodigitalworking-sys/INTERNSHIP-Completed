import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { Badge, Notice } from "@/components/ui";
import { fmtDate, rupees } from "@/lib/format";
import { applyToProgramme } from "@/app/actions/student";

export const dynamic = "force-dynamic";

export default async function ProgrammeDetail({ params, searchParams }: { params: { code: string }; searchParams: { error?: string } }) {
  const p = await db.programme.findUnique({
    where: { code: decodeURIComponent(params.code) },
    include: { family: true, cohorts: { where: { status: "OPEN" }, include: { mentor: true } }, courses: { include: { modules: { include: { lessons: true }, orderBy: { order: "asc" } } } }, exams: { where: { published: true } } },
  });
  if (!p) notFound();
  const user = await getUser();
  const existing = user ? await db.application.findUnique({ where: { studentId_programmeId: { studentId: user.id, programmeId: p.id } } }) : null;
  const open = p.publicationStatus === "PUBLISHED";
  return (
    <div className="container-x py-10">
      <Link href="/programmes" className="link text-sm">← Catalogue</Link>
      <div className="mt-3 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2"><span className="text-sm text-slate-500">{p.code}</span>{open ? <Badge tone="green">Open for applications</Badge> : <Badge>CATALOGUE</Badge>}{p.isRegional && <Badge tone="amber">Regional focus</Badge>}</div>
          <h1 className="h1 mt-2">{p.title}</h1>
          <p className="mt-1 text-slate-600">{p.family.name}</p>
          {p.description && <p className="mt-4 text-slate-700">{p.description}</p>}
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            {[["Eligible streams", p.streams], ["Evidence required", p.evidence], ["Delivery mode", p.mode], ["Duration", `${p.durationHours} hours (normally 90 h with the host organisation, per LNMU UG guidelines)`], ["Academic credit", "Awarded only by your own university/college as per its rules"], ["Source status", p.sourceStatus]].map(([k, v]) => (
              <div key={k} className="card"><dt className="text-xs font-semibold uppercase text-slate-500">{k}</dt><dd className="mt-1 text-sm">{v}</dd></div>
            ))}
          </dl>
          {p.outcomes && (<><h2 className="h2 mt-8">Learning outcomes</h2><ul className="mt-2 ml-5 list-disc text-sm text-slate-700">{p.outcomes.split("\n").map((o) => <li key={o}>{o}</li>)}</ul></>)}
          {p.courses.map((c) => (
            <div key={c.id} className="mt-8">
              <h2 className="h2">Syllabus · {c.title}</h2>
              <div className="mt-2 space-y-2">{c.modules.map((m) => (
                <div key={m.id} className="card"><div className="font-medium">{m.title}</div><ul className="mt-1 text-sm text-slate-600">{m.lessons.map((l) => <li key={l.id}>▸ {l.title} ({Math.round(l.durationSec / 60)} min)</li>)}</ul></div>
              ))}</div>
            </div>
          ))}
          {!open && <div className="mt-8"><Notice>{p.launchNote}. This title is listed for discovery only; register interest via <Link className="link" href="/contact">contact</Link>.</Notice></div>}
        </div>
        <aside className="space-y-4">
          <div className="card">
            <div className="text-sm text-slate-500">Programme fee</div>
            <div className="text-2xl font-bold">{rupees(p.feePaise)}</div>
            <div className="text-xs text-slate-500">Fee is set by the owner and may change before launch. See the <Link href="/legal/refund" className="link">refund policy</Link>.</div>
            {searchParams.error && <div className="mt-3"><Notice tone="red">{searchParams.error}</Notice></div>}
            {open ? (
              existing ? (
                <div className="mt-4"><Notice tone="blue">You applied on {fmtDate(existing.createdAt)} — status <strong>{existing.status}</strong>.</Notice><Link href="/dashboard/applications" className="btn-primary mt-3 w-full">Go to my applications</Link></div>
              ) : user?.role === "STUDENT" ? (
                <form action={applyToProgramme} className="mt-4 space-y-3">
                  <input type="hidden" name="programmeId" value={p.id} />
                  <div><label className="label" htmlFor="cohortId">Cohort</label>
                    <select id="cohortId" name="cohortId" required className="input">{p.cohorts.map((c) => <option key={c.id} value={c.id}>{c.code} · {fmtDate(c.startDate)} – {fmtDate(c.endDate)} · {c.mode}</option>)}</select></div>
                  <div><label className="label" htmlFor="statement">Why do you want this internship?</label><textarea id="statement" name="statement" required minLength={20} maxLength={2000} rows={4} className="input" /></div>
                  <div><label className="label" htmlFor="preferredHost">Preferred host organisation (optional)</label><input id="preferredHost" name="preferredHost" className="input" maxLength={200} /></div>
                  <label className="flex gap-2 text-sm"><input type="checkbox" name="consent" required /> I consent to processing of my data for this internship as per the <Link href="/legal/privacy" className="link">privacy policy</Link>, and confirm my details are true.</label>
                  <button className="btn-primary w-full">Submit application</button>
                </form>
              ) : user ? (
                <p className="mt-4 text-sm text-slate-600">Only student accounts can apply.</p>
              ) : (
                <Link href={`/login?next=/programmes/${p.code}`} className="btn-primary mt-4 w-full">Log in to apply</Link>
              )
            ) : null}
          </div>
          {p.cohorts.length > 0 && (
            <div className="card"><div className="h2">Cohorts</div>
              <ul className="mt-2 space-y-2 text-sm">{p.cohorts.map((c) => <li key={c.id}><strong>{c.code}</strong><br />{fmtDate(c.startDate)} – {fmtDate(c.endDate)} · {c.seats} seats<br /><span className="text-slate-500">Mentor: {c.mentor?.name ?? "TBA"} · Host: {c.hostName ?? "TBA"}</span></li>)}</ul></div>
          )}
          {p.exams.length > 0 && <div className="card text-sm"><div className="h2">Assessment</div><ul className="mt-2 list-disc ml-5">{p.exams.map((e) => <li key={e.id}>{e.title} — pass {e.passPercent}%</li>)}<li>Assignments & mentor-reviewed logbook</li><li>Internship report + viva (university rules)</li></ul></div>}
        </aside>
      </div>
    </div>
  );
}
