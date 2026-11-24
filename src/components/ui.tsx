import Link from "next/link";
import type { ReactNode } from "react";

const TONES: Record<string, string> = {
  green: "bg-emerald-100 text-emerald-800", red: "bg-red-100 text-red-800", amber: "bg-amber-100 text-amber-800",
  blue: "bg-blue-100 text-blue-800", slate: "bg-slate-100 text-slate-700", purple: "bg-purple-100 text-purple-800",
};
const STATUS_TONE: Record<string, string> = {
  ACTIVE: "green", APPROVED: "green", PAID: "green", CAPTURED: "green", ISSUED: "green", CORRECTED: "green", PRESENT: "green", PASSED: "green", REVIEWED: "green", SENT: "green", RESOLVED: "green", PUBLISHED: "green", OPEN: "green", LIVE: "red", COMPLETED: "blue", SUBMITTED: "blue", IN_PROGRESS: "blue", SCHEDULED: "blue",
  PENDING: "amber", CREATED: "amber", APPROVAL_PENDING: "amber", PARTIAL: "amber", SUPERSEDED: "amber", PENDING_PAYMENT: "amber", UNDER_REVIEW: "amber", FAILED: "red", DEAD: "red", REJECTED: "red", REVOKED: "red", ABSENT: "red", CANCELLED: "slate", CATALOGUE: "slate", CLOSED: "slate", ENDED: "slate", DRAFT: "slate", WITHDRAWN: "slate", REFUNDED: "purple",
};

export function Badge({ children, tone }: { children: ReactNode; tone?: string }) {
  const t = tone ?? (typeof children === "string" ? STATUS_TONE[children] : undefined) ?? "slate";
  return <span className={`badge ${TONES[t] ?? TONES.slate}`}>{typeof children === "string" ? children.replace(/_/g, " ") : children}</span>;
}

export function PageHeader({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="h1">{title}</h1>
        {sub && <p className="mt-1 muted">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, href }: { label: string; value: ReactNode; hint?: string; href?: string }) {
  const body = (
    <div className="card h-full">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  );
  return href ? <Link href={href} className="block hover:opacity-90">{body}</Link> : body;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <div className="font-semibold text-slate-700">{title}</div>
      {children && <div className="mt-1 text-sm text-slate-500">{children}</div>}
    </div>
  );
}

export function Progress({ value, label }: { value: number; label?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? "progress"}>
        <div className="h-full rounded-full bg-[#12305c]" style={{ width: `${v}%` }} />
      </div>
      {label && <div className="mt-1 text-xs text-slate-500">{label}</div>}
    </div>
  );
}

export function Notice({ tone = "amber", children }: { tone?: "amber" | "blue" | "red" | "green"; children: ReactNode }) {
  const c = { amber: "border-amber-300 bg-amber-50 text-amber-900", blue: "border-blue-300 bg-blue-50 text-blue-900", red: "border-red-300 bg-red-50 text-red-900", green: "border-emerald-300 bg-emerald-50 text-emerald-900" }[tone];
  return <div role="note" className={`rounded-lg border px-4 py-3 text-sm ${c}`}>{children}</div>;
}

export function Flash({ searchParams }: { searchParams?: { ok?: string; error?: string } }) {
  if (!searchParams) return null;
  if (searchParams.error) return <div className="mb-4"><Notice tone="red">{searchParams.error}</Notice></div>;
  if (searchParams.ok) return <div className="mb-4"><Notice tone="green">{searchParams.ok}</Notice></div>;
  return null;
}
