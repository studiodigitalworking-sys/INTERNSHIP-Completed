import { redirect } from "next/navigation";
import { PortalShell } from "@/components/PortalShell";
import { requireUser } from "@/lib/auth";
import { can, isStaff, type Permission } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const NAV: [string, string, Permission][] = [
  ["/admin", "Command centre", "student360.view"], ["/admin/students", "Student 360", "student360.view"], ["/admin/applications", "Applications", "applications.review"],
  ["/admin/exceptions", "Exceptions & corrections", "student360.view"], ["/admin/results", "Results & marks", "marks.change"], ["/admin/programmes", "Programmes & cohorts", "programmes.manage"],
  ["/admin/payments", "Payments & refunds", "payments.view"], ["/admin/credentials", "Certificate studio", "credentials.issue"], ["/admin/support", "Support inbox", "support.manage"],
  ["/admin/users", "Users & roles", "users.manage"], ["/admin/jobs", "Jobs & employers", "jobs.manage"], ["/admin/announcements", "Announcements", "cms.manage"],
  ["/admin/outbox", "Notification outbox", "outbox.manage"], ["/admin/reports", "Reports & exports", "exports.run"], ["/admin/audit", "Audit log", "audit.view"],
  ["/admin/ai", "AI approvals", "ai.control"], ["/admin/backup", "Backup & recovery", "backup.run"], ["/admin/settings", "Settings", "settings.manage"], ["/admin/launch", "Launch checklist", "settings.manage"],
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const u = await requireUser("/admin");
  if (!isStaff(u.role)) redirect("/dashboard");
  if (u.role === "MENTOR" || u.role === "HOST_SUPERVISOR") redirect("/mentor");
  const nav = NAV.filter(([, , p]) => can(u.role, p)).map(([href, label]) => ({ href, label }));
  return <PortalShell nav={nav} title="Admin command centre" user={u}>{children}</PortalShell>;
}
