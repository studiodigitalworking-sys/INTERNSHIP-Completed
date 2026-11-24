import Link from "next/link";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PageHeader, Badge } from "@/components/ui";
import { fmtDate } from "@/lib/format";

export default async function Students({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  const u = await requirePermission("student360.view");
  const q = searchParams.q?.trim();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const where = { role: "STUDENT", ...(u.role === "COLLEGE_ADMIN" || u.role === "FACULTY_COORDINATOR" ? { institutionId: u.institutionId ?? "__none__" } : {}), ...(q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }, { phone: { contains: q } }] } : {}) };
  const [list, total] = await Promise.all([db.user.findMany({ where, include: { profile: true, enrollments: true }, orderBy: { createdAt: "desc" }, take: 50, skip: (page - 1) * 50 }), db.user.count({ where })]);
  return (
    <>
      <PageHeader title="Student 360" sub={`${total} students${u.role === "COLLEGE_ADMIN" ? " in your institution" : ""}`} actions={<a href="/api/export/students" className="btn-outline">Export CSV</a>} />
      <form className="mb-4 flex max-w-md gap-2"><input name="q" defaultValue={q} className="input" placeholder="Name, email or mobile" aria-label="Search students" /><button className="btn-primary">Search</button></form>
      <div className="card overflow-x-auto p-0"><table className="table"><thead><tr><th>Name</th><th>Contact</th><th>College</th><th>Enrolments</th><th>Status</th><th>Joined</th></tr></thead><tbody>
        {list.map((s) => <tr key={s.id}><td><Link className="link" href={`/admin/students/${s.id}`}>{s.name}</Link></td><td className="text-xs">{s.email}<br />{s.phone}</td><td className="text-xs">{s.profile?.college ?? "—"}</td><td>{s.enrollments.length}</td><td><Badge>{s.status}</Badge></td><td>{fmtDate(s.createdAt)}</td></tr>)}
      </tbody></table></div>
      <div className="mt-4 flex gap-2">{page > 1 && <Link className="btn-outline btn-sm" href={`?q=${q ?? ""}&page=${page - 1}`}>Previous</Link>}{page * 50 < total && <Link className="btn-outline btn-sm" href={`?q=${q ?? ""}&page=${page + 1}`}>Next</Link>}</div>
    </>
  );
}
