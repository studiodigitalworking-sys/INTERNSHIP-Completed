import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { CredentialDocument } from "@/components/CredentialDocument";
import { PrintButton } from "@/components/PrintButton";
import { Badge } from "@/components/ui";

export default async function CertView({ params }: { params: { id: string } }) {
  const u = await requireStudent();
  const c = await db.credential.findFirst({ where: { id: params.id, userId: u.id } });
  if (!c) notFound();
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden"><Link href="/dashboard/certificates" className="link">← All documents</Link><div className="flex items-center gap-2"><Badge>{c.status}</Badge><Link href={`/verify/${c.token}`} className="btn-outline btn-sm" target="_blank">Public verification page</Link><PrintButton /></div></div>
      <CredentialDocument c={c} appUrl={process.env.APP_URL || "http://localhost:3000"} />
    </>
  );
}
