import type { Role } from "./constants";

/**
 * Permission matrix derived from INTERNVERSE_ADMIN_CONTROL_MATRIX.xlsx.
 * Default deny: anything not listed is refused. UI hiding is never authorization —
 * every server action calls requirePermission().
 */
export type Permission =
  | "platform.health" | "settings.root" | "settings.manage" | "users.manage" | "roles.assign"
  | "programmes.manage" | "applications.review" | "eligibility.exception"
  | "attendance.correct" | "marks.change" | "payments.manage" | "payments.view"
  | "credentials.issue" | "credentials.revoke" | "credentials.approve_exception"
  | "audit.view" | "support.manage" | "live.manage" | "exams.manage" | "lms.manage"
  | "mentor.review" | "jobs.manage" | "cms.manage" | "outbox.manage" | "exports.run"
  | "ai.control" | "student360.view" | "backup.run";

const ALL: Permission[] = [
  "platform.health", "settings.root", "settings.manage", "users.manage", "roles.assign", "programmes.manage",
  "applications.review", "eligibility.exception", "attendance.correct", "marks.change", "payments.manage",
  "payments.view", "credentials.issue", "credentials.revoke", "credentials.approve_exception", "audit.view",
  "support.manage", "live.manage", "exams.manage", "lms.manage", "mentor.review", "jobs.manage", "cms.manage",
  "outbox.manage", "exports.run", "ai.control", "student360.view", "backup.run",
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ROOT_OWNER: ALL,
  PLATFORM_ADMIN: ALL.filter((p) => p !== "settings.root" && p !== "ai.control"),
  ACADEMIC_ADMIN: [
    "platform.health", "programmes.manage", "applications.review", "eligibility.exception", "attendance.correct",
    "marks.change", "credentials.issue", "audit.view", "live.manage", "exams.manage", "lms.manage",
    "mentor.review", "student360.view", "exports.run",
  ],
  FINANCE_ADMIN: ["platform.health", "payments.manage", "payments.view", "audit.view", "exports.run", "student360.view"],
  CERTIFICATE_OFFICER: ["platform.health", "credentials.issue", "credentials.revoke", "audit.view", "student360.view"],
  COLLEGE_ADMIN: ["platform.health", "applications.review", "student360.view", "exports.run", "audit.view"],
  FACULTY_COORDINATOR: ["mentor.review", "student360.view"],
  MENTOR: ["mentor.review"],
  HOST_SUPERVISOR: ["mentor.review"],
  STUDENT: [],
  EMPLOYER: ["jobs.manage"],
  AUDITOR: ["platform.health", "audit.view", "payments.view"],
  SUPPORT_AGENT: ["support.manage"],
};

export function can(role: string | undefined | null, perm: Permission): boolean {
  if (!role) return false;
  return (ROLE_PERMISSIONS[role as Role] ?? []).includes(perm);
}

export function isStaff(role: string): boolean {
  return role !== "STUDENT" && role !== "EMPLOYER";
}

/** Only ROOT_OWNER may create another ROOT_OWNER or PLATFORM_ADMIN. */
export function canAssignRole(actorRole: string, targetRole: string): boolean {
  if (actorRole === "ROOT_OWNER") return true;
  if (actorRole === "PLATFORM_ADMIN") return !["ROOT_OWNER", "PLATFORM_ADMIN"].includes(targetRole);
  return false;
}
