import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/auth";
import { headers } from "next/headers";
import { Notice } from "@/components/ui";

export const metadata = { title: "Verify a certificate" };

async function lookup(fd: FormData) {
  "use server";
  const code = String(fd.get("code") || "").trim().toUpperCase();
  const ip = headers().get("x-forwarded-for")?.split(",")[0] || "local";
  if (!(await rateLimit(`verify:${ip}`, 30, 600))) redirect("/verify?error=Too+many+lookups.+Please+wait+10+minutes.");
  const c = code ? await db.credential.findUnique({ where: { code } }) : null;
  await db.verificationEvent.create({ data: { lookup: code.slice(0, 40), result: c ? c.status : "NOT_FOUND" } });
  if (!c) redirect("/verify?error=No+credential+found+with+that+ID.+Check+the+ID+printed+on+the+document.");
  redirect(`/verify/${c!.token}`);
}

export default function Verify({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <div className="container-x max-w-2xl py-14">
      <h1 className="h1">Verify a credential</h1>
      <p className="muted mt-2">Enter the credential ID printed on the certificate/letter (format <code>IV-YYYY-XXXXXXXXXX</code>), or scan its QR code. Verification shows the live status from our registry — including revocations and corrections.</p>
      {searchParams.error && <div className="mt-4"><Notice tone="red">{searchParams.error}</Notice></div>}
      <form action={lookup} className="card mt-6 flex flex-col gap-3 sm:flex-row">
        <label htmlFor="code" className="sr-only">Credential ID</label>
        <input id="code" name="code" required placeholder="IV-2026-XXXXXXXXXX" className="input flex-1 uppercase" autoComplete="off" />
        <button className="btn-primary">Verify</button>
      </form>
      <p className="mt-6 text-xs text-slate-500">Public verification shows only the minimum information necessary (name, document, programme, dates and status). Contact details and marks are never disclosed.</p>
    </div>
  );
}
