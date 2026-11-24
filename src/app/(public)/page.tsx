import Link from "next/link";
import { db } from "@/lib/db";
import { getLang, t } from "@/lib/i18n";
import { Badge } from "@/components/ui";
import ref from "../../../data/lnmu-reference.json";

export const dynamic = "force-dynamic";

export default async function Home() {
  const lang = getLang();
  const [total, families, featured, announcements] = await Promise.all([
    db.programme.count(),
    db.subjectFamily.count(),
    db.programme.findMany({ where: { publicationStatus: "PUBLISHED" }, include: { family: true }, take: 6, orderBy: { code: "asc" } }),
    db.announcement.findMany({ where: { published: true }, orderBy: { createdAt: "desc" }, take: 2 }),
  ]);
  const regions = (ref as Record<string, Record<string, string>[]>)["Regional Priority Map"];
  const steps = [
    ["Discover", "Search 1,221 programme titles by subject family, degree, mode and district."],
    ["Apply", "Submit an application with consent; eligibility is reviewed by the academic team."],
    ["Enrol & pay", "Pay securely; your enrolment activates only after the payment is verified server-side."],
    ["Learn", "Recorded lessons with real watch-time tracking, live mentor classes with attendance."],
    ["Work", "Daily logbook of actual host-organisation work, reviewed and approved by mentors."],
    ["Assess", "Assignments, final exam, internship report and viva as per your university rules."],
    ["Get certified", "Evidence-based certificates with a unique ID and public QR verification."],
    ["Get hired", "Portfolio and applications to verified employers."],
  ];
  return (
    <>
      <section className="bg-gradient-to-br from-[#0c2244] via-[#12305c] to-[#1d4a87] text-white">
        <div className="container-x grid gap-10 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-amber-300">InternVerse</p>
            <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-5xl">{t("heroTitle", lang)}</h1>
            <p className="mt-5 max-w-xl text-lg text-blue-100">{t("heroSub", lang)}</p>
            <form action="/programmes" className="mt-8 flex max-w-xl gap-2" role="search">
              <label htmlFor="hq" className="sr-only">Search programmes</label>
              <input id="hq" name="q" placeholder="e.g. Data analytics, Madhubani art, Tally…" className="input flex-1 text-slate-900" />
              <button className="btn-accent">{t("search", lang)}</button>
            </form>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/programmes" className="btn bg-white text-[#12305c] hover:bg-blue-50">{t("browse", lang)}</Link>
              <Link href="/register" className="btn border border-white/40 text-white hover:bg-white/10">{t("register", lang)}</Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 self-center">
            {[[total.toLocaleString("en-IN"), "programme titles in catalogue"], [families, "subject families"], ["120 h", "standard internship structure (LNMU UG)"], ["QR", "public certificate verification"]].map(([v, l]) => (
              <div key={String(l)} className="rounded-xl bg-white/10 p-5 ring-1 ring-white/20">
                <div className="text-3xl font-bold">{v}</div>
                <div className="mt-1 text-sm text-blue-100">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {announcements.length > 0 && (
        <div className="border-b border-amber-200 bg-amber-50">
          <div className="container-x py-2 text-sm text-amber-900">
            {announcements.map((a) => <div key={a.id}><strong>{lang === "hi" && a.titleHi ? a.titleHi : a.title}:</strong> {a.body}</div>)}
          </div>
        </div>
      )}

      <section className="container-x py-14">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="h1">Open for applications</h2>
            <p className="muted mt-1">Programmes with a published syllabus, mentor plan, assessment and evidence rules.</p>
          </div>
          <Link href="/programmes?status=PUBLISHED" className="link text-sm">View all →</Link>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((p) => (
            <Link key={p.id} href={`/programmes/${p.code}`} className="card transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between"><span className="text-xs text-slate-500">{p.code}</span><Badge tone="green">Open</Badge></div>
              <div className="mt-2 font-semibold">{p.title}</div>
              <div className="mt-1 text-sm text-slate-500">{p.family.name}</div>
              <div className="mt-3 text-xs text-slate-500">{p.durationHours} hours · {p.mode}</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="container-x">
          <h2 className="h1">How it works</h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(([h, d], i) => (
              <li key={h} className="card">
                <div className="text-xs font-bold text-amber-600">STEP {i + 1}</div>
                <div className="mt-1 font-semibold">{h}</div>
                <p className="mt-1 text-sm text-slate-600">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="container-x py-14">
        <h2 className="h1">Rooted in Mithila & North Bihar</h2>
        <p className="muted mt-1">Regional sector clusters used to prioritise local, practical internships.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {regions.map((r) => (
            <div key={r["Area"]} className="card">
              <div className="font-semibold">{r["Area"]}</div>
              <p className="mt-1 text-sm text-slate-600">{r["Relevant Local Sector Clusters"]}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-x">
        <div className="grid gap-4 md:grid-cols-3">
          {[["/colleges", "For colleges", "Track your students' internships, attendance and evaluation in one dashboard."], ["/organisations", "For host organisations", "Host interns, approve logbooks and evaluate work — with structured MoU templates."], ["/verify", "For employers & verifiers", "Verify any InternVerse credential instantly using its ID or QR code."]].map(([h, title, d]) => (
            <Link key={h} href={h} className="card bg-gradient-to-br from-white to-amber-50 hover:shadow-md">
              <div className="font-semibold text-[#12305c]">{title} →</div>
              <p className="mt-1 text-sm text-slate-600">{d}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
