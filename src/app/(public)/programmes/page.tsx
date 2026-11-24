import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { Badge, Empty } from "@/components/ui";
import ref from "../../../../data/lnmu-reference.json";

export const dynamic = "force-dynamic";
export const metadata = { title: "Programme catalogue" };
const PAGE = 24;

type SP = { q?: string; family?: string; status?: string; degree?: string; regional?: string; page?: string };

export default async function Programmes({ searchParams }: { searchParams: SP }) {
  const page = Math.max(1, Number(searchParams.page) || 1);
  const where: Prisma.ProgrammeWhereInput = {};
  const and: Prisma.ProgrammeWhereInput[] = [];
  if (searchParams.q) and.push({ OR: [{ title: { contains: searchParams.q } }, { code: { contains: searchParams.q } }, { family: { name: { contains: searchParams.q } } }] });
  if (searchParams.family) and.push({ familyId: searchParams.family });
  if (searchParams.status) and.push({ publicationStatus: searchParams.status });
  if (searchParams.degree) and.push({ streams: { contains: searchParams.degree } });
  if (searchParams.regional) and.push({ isRegional: true });
  if (and.length) where.AND = and;
  const [items, count, families] = await Promise.all([
    db.programme.findMany({ where, include: { family: true }, orderBy: [{ publicationStatus: "desc" }, { code: "asc" }], skip: (page - 1) * PAGE, take: PAGE }),
    db.programme.count({ where }),
    db.subjectFamily.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { programmes: true } } } }),
  ]);
  const degrees = (ref as Record<string, Record<string, string>[]>)["LNMU Degree Mapping"].map((d) => d["Degree / Subject Group"]);
  const pages = Math.ceil(count / PAGE);
  const qs = (p: number) => {
    const u = new URLSearchParams(Object.entries(searchParams).filter(([k, v]) => v && k !== "page") as [string, string][]);
    u.set("page", String(p));
    return `?${u}`;
  };
  return (
    <div className="container-x py-10">
      <h1 className="h1">Programme catalogue</h1>
      <p className="muted mt-1">
        {count.toLocaleString("en-IN")} of 1,221 titles. Titles marked <Badge>CATALOGUE</Badge> are subject suggestions that are not yet live offerings — each needs a syllabus, mentor plan, assessment and evidence rules before launch.
      </p>
      <form className="card mt-6 grid gap-3 md:grid-cols-6" role="search">
        <div className="md:col-span-2"><label className="label" htmlFor="q">Search</label><input id="q" name="q" defaultValue={searchParams.q} className="input" placeholder="Title, code or subject" /></div>
        <div><label className="label" htmlFor="family">Subject family</label>
          <select id="family" name="family" defaultValue={searchParams.family} className="input"><option value="">All families</option>{families.map((f) => <option key={f.id} value={f.id}>{f.name} ({f._count.programmes})</option>)}</select></div>
        <div><label className="label" htmlFor="degree">Degree / stream</label>
          <select id="degree" name="degree" defaultValue={searchParams.degree} className="input"><option value="">Any</option>{["BA", "BSc", "BCom", "BBA", "BCA", "B.Tech", "Diploma", "PG"].map((d) => <option key={d}>{d}</option>)}</select></div>
        <div><label className="label" htmlFor="status">Availability</label>
          <select id="status" name="status" defaultValue={searchParams.status} className="input"><option value="">All</option><option value="PUBLISHED">Open for applications</option><option value="CATALOGUE">Catalogue only</option></select></div>
        <div className="flex items-end gap-2">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="regional" value="1" defaultChecked={!!searchParams.regional} /> Regional focus</label>
        </div>
        <div className="flex gap-2 md:col-span-6"><button className="btn-primary">Apply filters</button><Link href="/programmes" className="btn-outline">Reset</Link></div>
      </form>
      <details className="mt-4 text-sm"><summary className="cursor-pointer link">LNMU degree → recommended pathway mapping ({degrees.length})</summary>
        <ul className="mt-2 grid gap-2 md:grid-cols-2">{(ref as Record<string, Record<string, string>[]>)["LNMU Degree Mapping"].map((d) => <li key={d["Degree / Subject Group"]} className="rounded border bg-white p-2"><strong>{d["Degree / Subject Group"]}:</strong> {d["Recommended Internship Pathways"]}</li>)}</ul>
      </details>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <Link key={p.id} href={`/programmes/${p.code}`} className="card flex flex-col hover:shadow-md">
            <div className="flex items-center justify-between gap-2"><span className="text-xs text-slate-500">{p.code}</span>{p.publicationStatus === "PUBLISHED" ? <Badge tone="green">Open</Badge> : <Badge>CATALOGUE</Badge>}</div>
            <div className="mt-2 font-semibold">{p.title}</div>
            <div className="text-sm text-slate-500">{p.family.name}</div>
            <div className="mt-auto pt-3 text-xs text-slate-500">{p.mode}{p.isRegional ? " · Regional" : ""}</div>
          </Link>
        ))}
      </div>
      {!items.length && <div className="mt-6"><Empty title="No programmes match">Try a broader search or reset filters.</Empty></div>}
      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-2 text-sm">
          {page > 1 && <Link className="btn-outline btn-sm" href={qs(page - 1)}>← Prev</Link>}
          <span>Page {page} of {pages}</span>
          {page < pages && <Link className="btn-outline btn-sm" href={qs(page + 1)}>Next →</Link>}
        </nav>
      )}
    </div>
  );
}
