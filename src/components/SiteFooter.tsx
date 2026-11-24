import Link from "next/link";

const cols = [
  ["Platform", [["/programmes", "Programme catalogue"], ["/how-it-works", "How it works"], ["/jobs", "Jobs & opportunities"], ["/verify", "Verify a certificate"], ["/faq", "FAQ"]]],
  ["Partners", [["/colleges", "For colleges & universities"], ["/organisations", "For host organisations"], ["/mentors", "Become a mentor"], ["/lnmu", "LNMU internship guide"]]],
  ["Legal", [["/legal/privacy", "Privacy policy"], ["/legal/terms", "Terms of use"], ["/legal/refund", "Refund & cancellation"], ["/legal/certificate-policy", "Certificate policy"], ["/legal/grievance", "Grievance redressal"]]],
  ["Help", [["/contact", "Contact us"], ["/support", "Support"], ["/about", "About"], ["/accessibility", "Accessibility"]]],
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-[#0c2244] text-slate-300">
      <div className="container-x grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <div className="text-lg font-bold text-white">InternVerse</div>
          <p className="mt-2 text-sm">Learn · Build · Work · Get certified · Get hired.</p>
          <p className="mt-3 text-xs text-slate-400">Institutional affiliations, recognitions and MoUs are displayed only after documentary verification. Academic credit is granted by the student&apos;s own university/college, not by this platform.</p>
        </div>
        {cols.map(([h, links]) => (
          <div key={h}>
            <div className="text-sm font-semibold text-white">{h}</div>
            <ul className="mt-3 space-y-2 text-sm">
              {links.map(([href, label]) => <li key={href}><Link className="hover:text-white" href={href}>{label}</Link></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-slate-400">© {new Date().getFullYear()} InternVerse. All times shown in IST (Asia/Kolkata).</div>
    </footer>
  );
}
