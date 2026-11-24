import type { Metadata } from "next";
import { Inter, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import { getLang } from "@/lib/i18n";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const deva = Noto_Sans_Devanagari({ subsets: ["devanagari"], weight: ["400", "600", "700"], variable: "--font-deva", display: "swap" });

export const metadata: Metadata = {
  title: { default: "InternVerse — Learn · Build · Work · Get certified", template: "%s · InternVerse" },
  description: "Supervised, evidence-based internships with real attendance, work logs and QR-verifiable certificates.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = getLang();
  return (
    <html lang={lang}>
      <body className={`${sans.variable} ${deva.variable}`}>
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
