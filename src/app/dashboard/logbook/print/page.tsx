import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { PrintButton } from "@/components/PrintButton";

export default async function PrintLog() {
  const u = await requireStudent();
  const logs = await db.workLog.findMany({ where: { userId: u.id }, orderBy: { date: "asc" }, include: { reviewer: { select: { name: true } } } });
  return (
    <div className="bg-white p-6 print:p-0">
      <div className="flex justify-between"><h1 className="h1">Internship Logbook — {u.name}</h1><PrintButton /></div>
      <table className="table mt-4 border"><thead><tr><th>Date</th><th>Hours</th><th>Category</th><th>Tasks</th><th>Learning</th><th>Status</th><th>Reviewed by</th></tr></thead><tbody>
        {logs.map((l) => <tr key={l.id}><td>{fmtDate(l.date)}</td><td>{(l.minutes / 60).toFixed(2)}</td><td>{l.category}</td><td>{l.tasks}</td><td>{l.learning}</td><td>{l.status}</td><td>{l.reviewer?.name ?? "—"}</td></tr>)}
      </tbody></table>
      <p className="mt-4 text-sm">Total approved: {(logs.filter((l) => l.status === "APPROVED").reduce((a, l) => a + l.minutes, 0) / 60).toFixed(1)} hours</p>
    </div>
  );
}
