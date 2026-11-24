import Link from "next/link";
import type { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";

export function PortalShell({ nav, title, user, children }: { nav: { href: string; label: string }[]; title: string; user: { name: string; role: string }; children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <div className="container-x flex flex-col gap-6 py-6 lg:flex-row">
        <aside className="lg:w-60 lg:shrink-0">
          <div className="card p-3 lg:sticky lg:top-20">
            <div className="px-2 pb-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</div>
              <div className="truncate text-sm font-semibold">{user.name}</div>
              <div className="text-xs text-slate-500">{user.role.replace(/_/g, " ")}</div>
            </div>
            <nav aria-label={title} className="flex gap-1 overflow-x-auto lg:flex-col">
              {nav.map((n) => (
                <Link key={n.href} href={n.href} className="whitespace-nowrap rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100">{n.label}</Link>
              ))}
              <form action="/api/auth/logout" method="post" className="mt-1">
                <button className="w-full whitespace-nowrap rounded-lg px-2 py-1.5 text-left text-sm text-red-700 hover:bg-red-50">Log out</button>
              </form>
            </nav>
          </div>
        </aside>
        <main id="main" className="min-w-0 flex-1">{children}</main>
      </div>
    </>
  );
}
