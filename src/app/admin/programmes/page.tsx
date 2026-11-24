import Link from "next/link";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { Badge, PageHeader } from "@/components/ui";
import { rupees } from "@/lib/format";

export default async function Progs({ searchParams }: { searchParams: { q?: string; status?: string; page?: string } }) {
  await requirePermission("programmes.manage");
  const page = Math.max(1, Number(searchParams.page) || 1);
  const where = { ...(searchParams.status ? { publicationStatus: searchParams.status } : {}), ...(searchParams.q ? { OR: [{ title: { contains: searchParams.q } }, { code: { contains: searchParams.q } }] } : {}) };
  const [list, total] = await Promise.all([db.programme.findMany({ where, include: { family: true, _count: { select: { cohorts: true, applications: true } } }, orderBy: [{ publicationStatus: "desc" }, { code: "asc" }], take: 50, skip: (page - 1) * 50 }), db.programme.count({ where })]);
  return (
    <>
      <PageHeader title="Programmes & cohorts" sub={`${total} programmes. Publishing requires syllabus, mentor plan, assessment and evidence (see launch note).`} />
      <form className="mb-4 flex flex-wrap gap-2"><input name="q" defaultValue={searchParams.q} className="input max-w-xs" placeholder="Title or code" aria-label="Search" /><select name="status" defaultValue={searchParams.status ?? ""} className="input max-w-xs" aria-label="Status"><option value="">All</option><option>PUBLISHED</option><option>CATALOGUE</option><option>ARCHIVED</option></select><button className="btn-primary">Filter</button></form>
      <div className="card overflow-x-auto p-0"><table className="table"><thead><tr><th>Code</th><th>Title</th><th>Family</th><th>Fee</th><th>Cohorts</th><th>Apps</th><th>Status</th></tr></thead><tbody>
        {list.map((p) => <tr key={p.id}><td className="text-xs">{p.code}</td><td><Link className="link" href={`/admin/programmes/${p.id}`}>{p.title}</Link></td><td className="text-xs">{p.family.name}</td><td>{rupees(p.feePaise)}</td><td>{p._count.cohorts}</td><td>{p._count.applications}</td><td><Badge>{p.publicationStatus}</Badge></td></tr>)}
      </tbody></table></div>
      <div className="mt-4 flex gap-2">{page > 1 && <Link className="btn-outline btn-sm" href={`?q=${searchParams.q ?? ""}&status=${searchParams.status ?? ""}&page=${page - 1}`}>Previous</Link>}{page * 50 < total && <Link className="btn-outline btn-sm" href={`?q=${searchParams.q ?? ""}&status=${searchParams.status ?? ""}&page=${page + 1}`}>Next</Link>}</div>
    </>
  );
}
