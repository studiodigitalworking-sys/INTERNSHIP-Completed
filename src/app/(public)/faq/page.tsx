import { Article } from "@/components/Article";

export const metadata = { title: "FAQ" };
const FAQ: [string, string][] = [
  ["Will I get university credits?", "Credits are awarded only by your own university/college under its rules (e.g. LNMU UG: 4 credits for a 120-hour internship). InternVerse provides the evidence and documents your college needs."],
  ["How many hours do I need?", "The standard structure is 120 hours, normally including 90 hours with the host organisation. Only mentor-approved logbook hours count."],
  ["Why didn't my video progress increase?", "Only real playback is counted. Skipping, replaying watched parts, or very fast playback is not credited. Keep the tab open and watch normally; progress saves every ~10 seconds and retries on weak networks."],
  ["I paid but my enrolment is not active.", "Activation happens after the payment gateway confirms the payment to our server, usually within seconds. If it takes longer than 30 minutes, raise a Payment support ticket with your order ID — do not pay twice."],
  ["How do I correct my name or attendance?", "Submit a correction request from your dashboard with evidence. Every correction is reviewed and recorded in an audit trail."],
  ["How can an employer verify my certificate?", "Each document has a unique ID and QR code. Anyone can check its live status at /verify."],
  ["Can I get a refund?", "See the refund & cancellation policy. Refunds are processed to the original payment method."],
  ["Is my data safe?", "We collect only what is needed, use encrypted connections, restrict staff access by role, and log access to sensitive records. You can request access, correction or deletion from your profile."],
];

export default function Faq() {
  return (
    <Article title="Frequently asked questions">
      <div className="not-prose space-y-3">{FAQ.map(([q, a]) => <details key={q} className="card"><summary className="cursor-pointer font-semibold">{q}</summary><p className="mt-2 text-sm text-slate-700">{a}</p></details>)}</div>
    </Article>
  );
}
