import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { cohortScope } from "@/app/actions/mentor";
import { PageHeader, Badge, Empty } from "@/components/ui";

export default async function MentorStudents() {
  const u = await requirePermission("mentor.review");
  const enr = await db.enrollment.findMany({ where: { cohort: await cohortScope(u) }, include: { student: { include: { profile: true } }, cohort: true, workLogs: true } });
  return (
    <>
      <PageHeader title="My students" />
      {enr.length ? <div className="card overflow-x-auto p-0"><table className="table"><thead><tr><th>Student</th><th>College / degree</th><th>Cohort</th><th>Approved h</th><th>Pending h</th><th>Status</th><th>Accessibility</th></tr></thead><tbody>
        {enr.map((e) => <tr key={e.id}><td>{e.student.name}</td><td className="text-xs">{e.student.profile?.college ?? "—"} · {e.student.profile?.degree ?? "—"}</td><td>{e.cohort.code}</td><td>{(e.workLogs.filter((l) => l.status === "APPROVED").reduce((a, l) => a + l.minutes, 0) / 60).toFixed(1)}</td><td>{(e.workLogs.filter((l) => l.status === "SUBMITTED").reduce((a, l) => a + l.minutes, 0) / 60).toFixed(1)}</td><td><Badge>{e.status}</Badge></td><td className="text-xs">{e.student.profile?.accessibilityNeeds ?? "—"}</td></tr>)}
      </tbody></table></div> : <Empty title="No students assigned" />}
    </>
  );
}
