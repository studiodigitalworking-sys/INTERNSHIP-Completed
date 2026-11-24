import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { PageHeader, Stat } from "@/components/ui";

const EXPORTS: [string, string, Parameters<typeof can>[1]][] = [["students", "Students", "student360.view"], ["applications", "Applications", "applications.review"], ["payments", "Payments", "payments.view"], ["attendance", "Live attendance", "attendance.correct"], ["worklogs", "Logbooks / hours", "student360.view"], ["results", "Exam results", "marks.change"], ["credentials", "Credential registry", "credentials.issue"], ["audit", "Audit log", "audit.view"]];

export default async function Reports() {
  const u = await requirePermission("exports.run");
  const fams = await db.programme.groupBy({ by: ["publicationStatus"], _count: true });
  const enrByStatus = await db.enrollment.groupBy({ by: ["status"], _count: true });
  const district = await db.studentProfile.groupBy({ by: ["district"], _count: true, orderBy: { _count: { district: "desc" } }, take: 10 });
  return (
    <>
      <PageHeader title="Reports & exports" sub="Every export is audited. CSV cells are escaped against formula injection." />
      <div className="grid gap-4 sm:grid-cols-3">{fams.map((f) => <Stat key={f.publicationStatus} label={`Programmes ${f.publicationStatus}`} value={f._count} />)}{enrByStatus.map((e) => <Stat key={e.status} label={`Enrolments ${e.status}`} value={e._count} />)}</div>
      <div className="card mt-6"><div className="h2">Students by district</div><ul className="mt-2 text-sm">{district.map((d) => <li key={d.district ?? "-"}>{d.district ?? "Not given"}: {d._count}</li>)}</ul></div>
      <div className="card mt-6"><div className="h2">CSV exports</div><div className="mt-3 flex flex-wrap gap-2">{EXPORTS.filter(([, , p]) => can(u.role, p)).map(([k, l]) => <a key={k} href={`/api/export/${k}`} className="btn-outline btn-sm">{l}</a>)}</div></div>
    </>
  );
}
