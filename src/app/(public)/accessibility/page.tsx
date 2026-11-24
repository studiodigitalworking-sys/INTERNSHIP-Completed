import { Article } from "@/components/Article";

export const metadata = { title: "Accessibility" };

export default function A11y() {
  return (
    <Article title="Accessibility statement">
      <p>We aim to meet WCAG 2.1 AA: keyboard navigation with visible focus, a skip link, semantic headings and labels, sufficient colour contrast, reduced-motion support, and responsive layouts for low-cost phones and low bandwidth.</p>
      <p>You can record accessibility needs in your profile so mentors can provide accommodations (e.g. extra exam time). Report barriers through the contact page.</p>
    </Article>
  );
}
