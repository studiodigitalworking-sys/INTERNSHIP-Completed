import Link from "next/link";
import { getUser } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { isStaff } from "@/lib/rbac";

export async function SiteHeader() {
  const user = await getUser();
  const lang = getLang();
  const nav = [
    ["/programmes", t("programmes", lang)], ["/how-it-works", t("howItWorks", lang)], ["/colleges", t("colleges", lang)],
    ["/organisations", t("organisations", lang)], ["/jobs", t("jobs", lang)], ["/verify", t("verify", lang)],
  ] as const;
  const portal = user ? (user.role === "STUDENT" ? "/dashboard" : user.role === "MENTOR" || user.role === "HOST_SUPERVISOR" || user.role === "FACULTY_COORDINATOR" ? "/mentor" : user.role === "EMPLOYER" ? "/employer" : isStaff(user.role) ? "/admin" : "/dashboard") : null;
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-[#12305c]">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#12305c] text-sm text-white">IV</span>
          <span className="text-lg">InternVerse</span>
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-5 text-sm font-medium text-slate-700 lg:flex">
          {nav.map(([href, label]) => <Link key={href} href={href} className="hover:text-[#12305c]">{label}</Link>)}
        </nav>
        <div className="flex items-center gap-2">
          <a href={`/api/lang?l=${lang === "en" ? "hi" : "en"}`} className="btn-outline btn-sm" aria-label="Switch language">{lang === "en" ? "हिंदी" : "English"}</a>
          {user && portal ? (
            <Link href={portal} className="btn-primary btn-sm">{t("dashboard", lang)}</Link>
          ) : (
            <>
              <Link href="/login" className="btn-outline btn-sm hidden sm:inline-flex">{t("login", lang)}</Link>
              <Link href="/register" className="btn-primary btn-sm">{t("register", lang)}</Link>
            </>
          )}
        </div>
      </div>
      <nav aria-label="Main mobile" className="container-x flex gap-4 overflow-x-auto pb-2 text-sm text-slate-700 lg:hidden">
        {nav.map(([href, label]) => <Link key={href} href={href} className="whitespace-nowrap">{label}</Link>)}
      </nav>
    </header>
  );
}
