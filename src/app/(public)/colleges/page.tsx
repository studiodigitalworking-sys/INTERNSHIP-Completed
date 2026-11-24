import Link from "next/link";
import { Article } from "@/components/Article";

export const metadata = { title: "For colleges & universities" };

export default function Colleges() {
  return (
    <Article title="For colleges & universities" lead="Run compliant, supervised internships for your students — with full visibility of attendance, logbooks, marks and documents.">
      <h2>What your college gets</h2>
      <ul>
        <li>College coordinator dashboard: applications, enrolments, attendance, approved hours and results for your students only.</li>
        <li>LNMU Annexure I–V documents generated from verified records, plus department certificate workflow.</li>
        <li>CSV exports for internal records and university submission.</li>
        <li>Public QR verification of every credential.</li>
        <li>Bulk registration pricing for batches (owner-configured; indicative ₹299 per student for batches of 50).</li>
      </ul>
      <h2>Partnership process</h2>
      <ol><li>Contact us with your college details.</li><li>Sign a written MoU (template provided in the document studio).</li><li>We verify the MoU and only then display your college as a partner.</li><li>Nominate a faculty coordinator; we create a college-scoped account.</li></ol>
      <p><Link className="btn-primary not-prose" href="/contact?topic=college">Request a partnership</Link></p>
    </Article>
  );
}
