import Link from "next/link";
import { Article } from "@/components/Article";

export const metadata = { title: "Become a mentor" };

export default function Mentors() {
  return (
    <Article title="Become a mentor" lead="Teach live classes, review logbooks and assignments, and guide students through real projects.">
      <ul><li>Mentor portal with your assigned cohorts only.</li><li>Live class scheduling on YouTube Live with attendance and Q&amp;A.</li><li>Review queues for logbooks and submissions with rubric feedback.</li><li>Offline batch attendance register for centre-based classes.</li></ul>
      <p><Link className="btn-primary not-prose" href="/contact?topic=mentor">Apply as a mentor</Link></p>
    </Article>
  );
}
