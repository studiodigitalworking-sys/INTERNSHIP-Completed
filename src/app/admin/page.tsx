import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { PageHeader, Stat, Badge, Notice } from "@/components/ui";
import { rupees, fmtDateTime } from "@/lib/format";
import { getSettings } from "@/lib/settings";

export default async function AdminHome() {
  const u = await requireStaff();
  const s = await getSettings();
  const [students, apps, active, revenue, pendingEx, openTickets, creds, outbox, logs, audits] = await Promise.all([
    db.user.count({ where: { role: "STUDENT" } }), db.application.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
    db.enrollment.count({ where: { status: "ACTIVE" } }), db.order.aggregate({ _sum: { amountPaise: true }, where: { status: "PAID" } }),
    db.exceptionRequest.count({ where: { status: { in: ["REQUESTED", "UNDER_REVIEW"] } } }), db.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    db.credential.count({ where: { status: { in: ["ISSUED", "CORRECTED"] } } }), db.outboxMessage.count({ where: { status: { in: ["PENDING", "FAILED"] } } }),
    db.workLog.count({ where: { status: "SUBMITTED" } }), db.auditEvent.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
  ]);
  const warnings = [
    !s["org.legalName"] && "Legal entity name not configured — documents show the brand name only.",
    s["issuer.verified"] !== "true" && "Issuer authority not verified — keep documents labelled as platform-issued.",
    s["payments.mode"] !== "LIVE" && "Payments are in TEST/sandbox mode.",
    !process.env.EMAIL_PROVIDER && "No email/SMS provider configured — outbox uses the log transport only.",
  ].filter(Boolean) as string[];
  return (
    <>
      <PageHeader title="Command centre" sub={`Signed in as ${u.role.replace(/_/g, " ")}`} />
      {warnings.length > 0 && <div className="mb-4"><Notice><ul className="list-disc pl-4">{warnings.map((w) => <li key={w}>{w}</li>)}</ul><Link href="/admin/launch" className="link">Open launch checklist</Link></Notice></div>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Students" value={students} href="/admin/students" /><Stat label="Pending applications" value={apps} href="/admin/applications" /><Stat label="Active enrolments" value={active} />
        <Stat label="Collected (incl. test)" value={rupees(revenue._sum.amountPaise ?? 0)} href="/admin/payments" /><Stat label="Credentials valid" value={creds} href="/admin/credentials" />
        <Stat label="Exceptions pending" value={pendingEx} href="/admin/exceptions" /><Stat label="Open tickets" value={openTickets} href="/admin/support" /><Stat label="Logbook entries pending" value={logs} /><Stat label="Outbox queued" value={outbox} href="/admin/outbox" />
      </div>
      <div className="card mt-6"><div className="h2">Recent audit events</div><table className="table mt-2"><tbody>{audits.map((a) => <tr key={a.id}><td className="text-xs">{fmtDateTime(a.createdAt)}</td><td>{a.action}</td><td className="text-xs">{a.actorRole ?? "system"}</td><td>{a.targetType}</td><td><Badge>{a.result}</Badge></td></tr>)}</tbody></table></div>
    </>
  );
}
