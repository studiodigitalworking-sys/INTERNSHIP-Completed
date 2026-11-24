import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { Flash, PageHeader } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { updateProfile, setConsent, privacyRequest } from "@/app/actions/student";
import { changePassword } from "@/app/actions/auth";

export default async function Profile({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  const u = await requireStudent();
  const [p, consents] = await Promise.all([db.studentProfile.findUnique({ where: { userId: u.id } }), db.consent.findMany({ where: { userId: u.id }, orderBy: { grantedAt: "desc" } })]);
  const F = ({ n, l, v, type = "text" }: { n: string; l: string; v?: string | null; type?: string }) => <div><label className="label" htmlFor={n}>{l}</label><input id={n} name={n} type={type} defaultValue={v ?? ""} className="input" /></div>;
  const active = (t: string) => consents.some((c) => c.type === t && !c.withdrawnAt);
  return (
    <>
      <PageHeader title="Profile & privacy" />
      <Flash searchParams={searchParams} />
      <form action={updateProfile} className="card grid gap-3 md:grid-cols-3">
        <F n="name" l="Full name" v={u.name} /><F n="phone" l="Mobile" v={u.phone} /><div><label className="label" htmlFor="preferredLang">Language</label><select id="preferredLang" name="preferredLang" defaultValue={u.preferredLang} className="input"><option value="en">English</option><option value="hi">हिंदी</option></select></div>
        <F n="university" l="University" v={p?.university} /><F n="college" l="College" v={p?.college} /><F n="department" l="Department" v={p?.department} />
        <F n="degree" l="Degree" v={p?.degree} /><F n="semester" l="Semester" v={p?.semester} /><F n="session" l="Session" v={p?.session} />
        <F n="rollNo" l="Roll / registration no." v={p?.rollNo} /><F n="district" l="District" v={p?.district} /><F n="portfolioUrl" l="Portfolio URL" v={p?.portfolioUrl} type="url" />
        <div className="md:col-span-3"><F n="skills" l="Skills (comma separated)" v={p?.skills} /></div>
        <div className="md:col-span-3"><F n="interests" l="Interests" v={p?.interests} /></div>
        <div className="md:col-span-3"><label className="label" htmlFor="bio">Bio</label><textarea id="bio" name="bio" defaultValue={p?.bio ?? ""} rows={3} className="input" /></div>
        <div className="md:col-span-3"><F n="accessibilityNeeds" l="Accessibility needs (optional, shared with mentors)" v={p?.accessibilityNeeds} /></div>
        <button className="btn-primary md:col-span-3">Save profile</button>
      </form>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="h2">Consents</div>
          <ul className="mt-2 text-sm">{consents.map((c) => <li key={c.id}>{c.type} v{c.version} — granted {fmtDate(c.grantedAt)}{c.withdrawnAt ? `, withdrawn ${fmtDate(c.withdrawnAt)}` : ""}</li>)}</ul>
          <div className="mt-3 flex flex-wrap gap-2">{["MARKETING", "WHATSAPP", "PORTFOLIO_PUBLIC"].map((t) => <form key={t} action={setConsent}><input type="hidden" name="type" value={t} /><input type="hidden" name="grant" value={active(t) ? "0" : "1"} /><button className="btn-outline btn-sm">{active(t) ? `Withdraw ${t}` : `Allow ${t}`}</button></form>)}</div>
        </div>
        <form action={privacyRequest} className="card space-y-2">
          <div className="h2">Your data rights</div>
          <select name="kind" className="input" aria-label="Request type"><option value="ACCESS">Get a copy of my data</option><option value="CORRECTION">Correct my data</option><option value="DELETION">Delete my account/data</option></select>
          <textarea name="details" rows={2} className="input" placeholder="Details (optional)" aria-label="Details" />
          <button className="btn-outline btn-sm">Submit request</button>
        </form>
        <form action={changePassword} className="card space-y-2">
          <div className="h2">Change password</div>
          <input name="current" type="password" required placeholder="Current password" className="input" aria-label="Current password" autoComplete="current-password" />
          <input name="password" type="password" required minLength={8} placeholder="New password" className="input" aria-label="New password" autoComplete="new-password" />
          <button className="btn-outline btn-sm">Update password</button>
        </form>
      </div>
    </>
  );
}
