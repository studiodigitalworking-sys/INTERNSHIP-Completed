import Link from "next/link";
import { Article } from "@/components/Article";

export const metadata = { title: "For host organisations" };

export default function Orgs() {
  return (
    <Article title="For host organisations (IPOs)" lead="Host motivated interns from Mithila and Bihar. You supervise real work; we handle onboarding, logbooks, attendance, documents and verification.">
      <ul>
        <li>Supervisor portal to approve or return daily logbook entries.</li>
        <li>Structured mentor/IPO evaluation form and Annexure III completion certificate generated only from approved hours.</li>
        <li>Host Organisation Internship MoU / Agreement template.</li>
        <li>Post verified job and internship openings to students (employers are verified before listings show a verified badge).</li>
      </ul>
      <h2>Requirements</h2>
      <p>Internships must involve actual work engagement under a named supervisor. Certificates are never issued without recorded evidence.</p>
      <p><Link className="btn-primary not-prose" href="/contact?topic=host">Become a host</Link></p>
    </Article>
  );
}
