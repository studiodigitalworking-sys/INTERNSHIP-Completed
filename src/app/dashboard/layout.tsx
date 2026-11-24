import { PortalShell } from "@/components/PortalShell";
import { requireStudent } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const u = await requireStudent();
  const l = getLang();
  const nav = [
    ["/dashboard", t("dashboard", l)], ["/dashboard/applications", t("myApplications", l)], ["/dashboard/payments", t("payments", l)],
    ["/dashboard/learning", t("myLearning", l)], ["/dashboard/live", t("liveClasses", l)], ["/dashboard/attendance", t("attendance", l)],
    ["/dashboard/logbook", t("logbook", l)], ["/dashboard/assignments", t("assignments", l)], ["/dashboard/exams", t("exams", l)],
    ["/dashboard/certificates", t("certificates", l)], ["/dashboard/jobs", t("jobs", l)], ["/dashboard/support", t("support", l)],
    ["/dashboard/notifications", t("notifications", l)], ["/dashboard/profile", t("profile", l)],
  ].map(([href, label]) => ({ href, label }));
  return <PortalShell nav={nav} title="Student portal" user={u}>{children}</PortalShell>;
}
