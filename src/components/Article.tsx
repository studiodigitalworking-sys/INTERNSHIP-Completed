import type { ReactNode } from "react";

export function Article({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  return (
    <div className="container-x max-w-4xl py-12">
      <h1 className="h1">{title}</h1>
      {lead && <p className="mt-2 text-lg text-slate-600">{lead}</p>}
      <div className="prose-iv mt-6">{children}</div>
    </div>
  );
}
