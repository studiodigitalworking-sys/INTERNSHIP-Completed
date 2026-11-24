import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { Badge, Empty, Flash, PageHeader } from "@/components/ui";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { requestCorrection } from "@/app/actions/student";

export default async function Attendance({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  const u = await requireStudent();
  const [att, reqs] = await Promise.all([
    db.liveAttendance.findMany({ where: { userId: u.id }, include: { session: { include: { cohort: true } } }, orderBy: { firstJoinAt: "desc" } }),
    db.exceptionRequest.findMany({ where: { studentId: u.id }, orderBy: { createdAt: "desc" } }),
  ]);
  return (
    <>
      <PageHeader title="Attendance" sub="Server-recorded live class attendance. Disputes are resolved through audited correction requests." />
      <Flash searchParams={searchParams} />
      {att.length ? (
        <div className="card overflow-x-auto p-0"><table className="table"><thead><tr><th>Class</th><th>Date</th><th>Credited</th><th>Adjusted</th><th>Reconnects</th><th>Status</th></tr></thead><tbody>
          {att.map((a) => <tr key={a.id}><td>{a.session.title}<div className="text-xs text-slate-400">{a.session.cohort.code}</div></td><td>{fmtDateTime(a.session.startsAt)}</td><td>{Math.round(a.creditedSeconds / 60)} min</td><td>{a.adjustedSeconds ? `${Math.round(a.adjustedSeconds / 60)} min — ${a.adjustmentReason}` : "—"}</td><td>{a.reconnects}</td><td><Badge>{a.status}</Badge></td></tr>)}
        </tbody></table></div>
      ) : <Empty title="No attendance records yet">Join a live class from the Live classes page.</Empty>}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <form action={requestCorrection} className="card space-y-3">
          <div className="h2">Request a correction</div>
          <div><label className="label" htmlFor="type">Type</label><select id="type" name="type" className="input">
            <option value="ATTENDANCE_EVIDENCE_CORRECTION">Attendance correction</option><option value="SERVER_OR_SYNC_FAILURE">Platform / sync failure</option><option value="DATA_ENTRY_CORRECTION">Name / profile data correction</option><option value="ASSESSMENT_REEVALUATION">Assessment re-evaluation</option><option value="PAYMENT_RECONCILIATION">Payment reconciliation</option><option value="CERTIFICATE_REISSUE">Certificate correction / reissue</option></select></div>
          <div><label className="label" htmlFor="targetId">Related record (class/exam/certificate ID, optional)</label><input id="targetId" name="targetId" className="input" /></div>
          <div><label className="label" htmlFor="reason">Reason</label><textarea id="reason" name="reason" required minLength={10} rows={3} className="input" /></div>
          <div><label className="label" htmlFor="evidenceRef">Evidence link (screenshot/document URL)</label><input id="evidenceRef" name="evidenceRef" className="input" /></div>
          <button className="btn-primary">Submit request</button>
        </form>
        <div className="card"><div className="h2">My requests</div>
          <ul className="mt-3 space-y-2 text-sm">{reqs.map((r) => <li key={r.id} className="rounded border p-2"><div className="flex justify-between gap-2"><span>{r.type.replace(/_/g, " ")}</span><Badge>{r.status}</Badge></div><div className="text-xs text-slate-500">{fmtDate(r.createdAt)} · {r.reason}</div>{r.decisionNote && <div className="text-xs">Decision: {r.decisionNote}</div>}</li>)}{!reqs.length && <li className="muted">None.</li>}</ul>
        </div>
      </div>
    </>
  );
}
