import Link from "next/link";
import { Article } from "@/components/Article";
import ref from "../../../../data/lnmu-reference.json";

export const metadata = { title: "How it works" };

export default function HowItWorks() {
  const bp = (ref as Record<string, Record<string, string>[]>)["Programme Delivery Blueprint"];
  return (
    <Article title="How InternVerse works" lead="Every certificate on InternVerse is backed by recorded evidence — learning, attendance, work and assessment.">
      <ol>
        {bp.map((s) => <li key={s["Stage"]}><strong>{s["Stage"]}:</strong> {Object.entries(s).filter(([k]) => k !== "Stage").map(([, v]) => v).join(" ")}</li>)}
      </ol>
      <h2>What is tracked — and how</h2>
      <ul>
        <li><strong>Recorded lessons:</strong> only real playback time counts. Skipping ahead, replaying the same part or playing in many tabs does not add progress. A lesson completes at 90% unique watch coverage.</li>
        <li><strong>Live classes:</strong> attendance is measured from your time connected during the class. Reconnect gaps are not credited; corrections need evidence and are audited.</li>
        <li><strong>Logbook:</strong> each day you record hours, tasks and learning; your mentor approves or returns each entry. Only approved hours count toward the 120-hour requirement.</li>
        <li><strong>Assessment:</strong> assignments reviewed by mentors, a timed final exam graded on the server, and the internship report + viva as required by your university.</li>
        <li><strong>Certificates:</strong> issued only when eligibility rules pass, each with a unique ID and QR code that anyone can <Link href="/verify">verify</Link>.</li>
      </ul>
      <h2>Payments</h2>
      <p>Payments are processed through a regulated payment gateway. Your enrolment activates only after the payment is verified on our server — never from the browser alone. A GST invoice/receipt is issued for every payment. See the <Link href="/legal/refund">refund policy</Link>.</p>
    </Article>
  );
}
