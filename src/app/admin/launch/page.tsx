import { requirePermission } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { db } from "@/lib/db";
import { PageHeader, Notice } from "@/components/ui";

export default async function Launch() {
  await requirePermission("settings.manage");
  const s = await getSettings();
  const [sig, pub, mentors] = await Promise.all([db.signatory.count({ where: { active: true } }), db.programme.count({ where: { publicationStatus: "PUBLISHED" } }), db.user.count({ where: { role: "MENTOR", status: "ACTIVE" } })]);
  const auto: [string, boolean][] = [
    ["Legal entity name configured", !!s["org.legalName"]], ["Registered address, email & phone configured", !!(s["org.address"] && s["org.email"] && s["org.phone"])],
    ["GSTIN configured (if registered)", !!s["org.gstin"]], ["Company/MSME registration number configured", !!s["org.registration"]],
    ["Issuer authority verified by owner", s["issuer.verified"] === "true"], ["Active signatory with authority evidence", sig > 0],
    ["Razorpay live keys + webhook secret set", !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_WEBHOOK_SECRET)], ["Payments switched to LIVE", s["payments.mode"] === "LIVE"],
    ["Email/SMS provider configured", !!process.env.EMAIL_PROVIDER], ["At least one published programme", pub > 0], ["At least one active mentor", mentors > 0],
    ["Production APP_SECRET set (not dev default)", !!process.env.APP_SECRET && !process.env.APP_SECRET.startsWith("dev-only")], ["Database is PostgreSQL (not SQLite)", (process.env.DATABASE_URL ?? "").startsWith("postgres")],
  ];
  const manual = ["Private Limited company incorporated via MCA SPICe+ (name approval, DIN, DSC, MoA/AoA)", "PAN/TAN and current bank account in company name", "GST registration (mandatory above threshold / for online services as advised by CA)", "Udyam (MSME) registration", "Startup India / DPIIT recognition (optional)", "Trademark application for the brand (class 41)", "Shop & Establishment registration for the physical centre", "Privacy policy, terms, refund policy reviewed by a lawyer", "Grievance officer appointed and contact published", "College MoUs signed before showing any partner names", "Host-organisation agreements for actual work engagement", "No claim of Government/UGC/AICTE/university approval anywhere", "Annual ROC filings and GST returns calendar set up", "Restore drill completed from production backup"];
  return (
    <>
      <PageHeader title="Launch checklist" sub="Derived from the Legal & Operations guide in the source bundle. Automatic checks read live configuration; manual items need documentary evidence." />
      <Notice>InternVerse will not mark itself production-ready. The owner confirms each manual item with evidence.</Notice>
      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <div className="card"><div className="h2">Automatic checks</div><ul className="mt-2 space-y-1 text-sm">{auto.map(([l, ok]) => <li key={l}>{ok ? "✅" : "⬜"} {l}</li>)}</ul></div>
        <div className="card"><div className="h2">Manual (owner/CA/lawyer)</div><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{manual.map((m) => <li key={m}>{m}</li>)}</ul></div>
      </div>
    </>
  );
}
