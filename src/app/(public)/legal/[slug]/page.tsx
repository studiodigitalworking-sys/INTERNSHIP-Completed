import { notFound } from "next/navigation";
import Link from "next/link";
import { Article } from "@/components/Article";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const PAGES: Record<string, { title: string; body: (org: Record<string, string>) => JSX.Element }> = {
  privacy: {
    title: "Privacy policy",
    body: (o) => (
      <>
        <p>This policy explains how {o.name} processes personal data in line with India&apos;s Digital Personal Data Protection Act, 2023 and the IT Act, 2000. Version 1.0 — owner and legal counsel must review before production use.</p>
        <h2>Data we collect</h2><ul><li>Account: name, email, mobile, password (stored only as a salted hash).</li><li>Academic: college, degree, semester, roll number, district.</li><li>Learning and evidence: watch progress, live attendance, logbook entries, submissions, exam attempts and results.</li><li>Payments: order and payment identifiers from the gateway (we never store card/UPI credentials).</li><li>Technical: session and security logs, verification lookups.</li></ul>
        <h2>Purposes</h2><p>Internship administration, assessment, certificate issuance and verification, payments and invoicing, support, legal compliance and security. Marketing messages only with separate opt-in consent.</p>
        <h2>Sharing</h2><p>With your college/university coordinator (your records only), assigned mentors and host supervisors, the payment gateway, and authorities where legally required. Public verification shows only name, document, programme, dates and status.</p>
        <h2>Your rights</h2><p>Access, correction, erasure (subject to legal retention of financial and certificate records), withdrawal of consent, and grievance redressal. Use the Privacy section of your profile or <Link href="/legal/grievance">contact the grievance officer</Link>.</p>
        <h2>Children</h2><p>Students under 18 need verifiable parent/guardian consent.</p>
        <h2>Retention</h2><p>Credential registry entries are kept to allow verification; financial records as required by tax law; other data deleted or anonymised when no longer needed.</p>
      </>
    ),
  },
  terms: {
    title: "Terms of use",
    body: (o) => (
      <>
        <p>By using {o.name} you agree to these terms. Version 1.0 — subject to owner and legal review.</p>
        <ul><li>Provide true information; impersonation or false evidence leads to cancellation and revocation of credentials.</li><li>Certificates reflect recorded evidence only and do not by themselves confer university credit, government recognition or employment.</li><li>Do not attempt to manipulate attendance, watch progress or exams; such signals are reviewed by humans.</li><li>Course content is for personal learning; redistribution is prohibited.</li><li>Fees, schedules and programme availability may change; confirmed enrolments are honoured as per the refund policy.</li><li>Governing law: India. Courts at the registered office location have jurisdiction.</li></ul>
      </>
    ),
  },
  refund: {
    title: "Refund & cancellation policy",
    body: () => (
      <>
        <ul><li>Full refund if you cancel within 7 days of payment and before the cohort start date, provided you have not accessed more than one lesson.</li><li>50% refund if you withdraw before 25% of the programme duration has elapsed.</li><li>No refund after 25% of the duration or once any certificate has been issued.</li><li>If we cancel or reschedule a cohort and you decline the new dates, you receive a full refund.</li><li>Duplicate or failed-but-debited payments are refunded in full after reconciliation.</li><li>Refunds go to the original payment method within 5–7 working days of approval.</li></ul>
        <p>Raise a refund request through a Payment support ticket. Policy values are owner-configurable and must be reviewed before launch.</p>
      </>
    ),
  },
  "certificate-policy": {
    title: "Certificate & verification policy",
    body: () => (
      <>
        <ul><li>Every credential has a unique ID (<code>IV-YYYY-XXXXXXXXXX</code>), a private QR verification link and an integrity fingerprint.</li><li>Completion certificates require: active paid enrolment, approved hours meeting programme rules (default 120 h total / 90 h host), final exam passed and assignments reviewed.</li><li>Exceptions require a documented reason and approval by an authorised officer; they are labelled in the audit trail.</li><li>Corrections create a new version; the old version is shown as superseded. Revoked credentials display as revoked.</li><li>We never claim government, UGC, AICTE or university approval. Signatures and seals appear only for configured, authorised signatories.</li></ul>
      </>
    ),
  },
  grievance: {
    title: "Grievance redressal",
    body: (o) => (
      <>
        <p>We acknowledge grievances within 48 hours and aim to resolve them within 15 days.</p>
        <ol><li>Raise a ticket with category &quot;Grievance&quot; from your dashboard or the <Link href="/contact">contact page</Link>.</li><li>If unresolved, escalate to the Grievance Officer: {o.email || "contact details to be configured by the owner"}.</li><li>Payment disputes may also be raised with your bank/payment provider; data protection complaints may be escalated to the Data Protection Board of India.</li></ol>
      </>
    ),
  },
};

export function generateMetadata({ params }: { params: { slug: string } }) {
  return { title: PAGES[params.slug]?.title ?? "Legal" };
}

export default async function Legal({ params }: { params: { slug: string } }) {
  const p = PAGES[params.slug];
  if (!p) notFound();
  const s = await getSettings();
  return <Article title={p.title}>{p.body({ name: s["org.legalName"] || s["org.name"], email: s["org.email"] })}</Article>;
}
