import { redirect } from "next/navigation";
import { PortalShell } from "@/components/PortalShell";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function MentorLayout({ children }: { children: React.ReactNode }) {
  const u = await requireUser("/mentor");
  if (!can(u.role, "mentor.review")) redirect("/");
  const nav = [["/mentor", "Overview"], ["/mentor/students", "My students"], ["/mentor/logbooks", "Logbook reviews"], ["/mentor/submissions", "Submissions"], ["/mentor/live", "Live classes"]].map(([href, label]) => ({ href, label }));
  return <PortalShell nav={nav} title="Mentor portal" user={u}>{children}</PortalShell>;
}
