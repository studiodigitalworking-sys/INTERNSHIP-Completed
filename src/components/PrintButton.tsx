"use client";
export function PrintButton({ label = "Print / Save PDF" }: { label?: string }) {
  return <button onClick={() => window.print()} className="btn-primary print:hidden">{label}</button>;
}
