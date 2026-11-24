import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { Flash } from "@/components/ui";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Contact" };
export const dynamic = "force-dynamic";

async function submit(fd: FormData) {
  "use server";
  const ip = headers().get("x-forwarded-for")?.split(",")[0] || "local";
  if (String(fd.get("website") || "")) redirect("/contact?ok=Thanks!"); // honeypot
  if (!(await rateLimit(`contact:${ip}`, 5, 3600))) redirect("/contact?error=Too+many+messages.+Try+again+later.");
  const name = String(fd.get("name") || "").trim().slice(0, 100), email = String(fd.get("email") || "").trim().slice(0, 200);
  const subject = String(fd.get("subject") || "").trim().slice(0, 200), body = String(fd.get("body") || "").trim().slice(0, 5000);
  const topic = String(fd.get("topic") || "general");
  if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || subject.length < 3 || body.length < 10) redirect("/contact?error=Please+complete+all+fields");
  const t = await db.supportTicket.create({ data: { name, email, category: topic === "grievance" ? "GRIEVANCE" : "CONTACT", subject: `[${topic}] ${subject}`, messages: { create: { authorName: name, body } } } });
  await audit({ action: "CONTACT_SUBMIT", targetType: "SupportTicket", targetId: t.id });
  redirect(`/contact?ok=${encodeURIComponent(`Thanks ${name}! Reference ${t.id.slice(0, 8).toUpperCase()}. We'll reply by email.`)}`);
}

export default async function Contact({ searchParams }: { searchParams: { ok?: string; error?: string; topic?: string } }) {
  const s = await getSettings();
  return (
    <div className="container-x grid max-w-5xl gap-8 py-12 md:grid-cols-3">
      <div className="md:col-span-2 card">
        <h1 className="h1">Contact us</h1>
        <div className="mt-4"><Flash searchParams={searchParams} /></div>
        <form action={submit} className="grid gap-4 sm:grid-cols-2">
          <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden />
          <div><label className="label" htmlFor="name">Name</label><input id="name" name="name" required className="input" /></div>
          <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required className="input" /></div>
          <div><label className="label" htmlFor="topic">Topic</label>
            <select id="topic" name="topic" defaultValue={searchParams.topic ?? "general"} className="input">
              <option value="general">General enquiry</option><option value="student">Student admission</option><option value="college">College partnership</option><option value="host">Host organisation</option><option value="mentor">Mentor application</option><option value="employer">Employer / hiring</option><option value="grievance">Grievance</option>
            </select></div>
          <div><label className="label" htmlFor="subject">Subject</label><input id="subject" name="subject" required className="input" /></div>
          <div className="sm:col-span-2"><label className="label" htmlFor="body">Message</label><textarea id="body" name="body" rows={5} required className="input" /></div>
          <button className="btn-primary sm:col-span-2">Send message</button>
        </form>
      </div>
      <aside className="card text-sm">
        <h2 className="h2">Reach us</h2>
        <p className="mt-2">{s["org.legalName"] || s["org.name"]}</p>
        <p className="mt-1 text-slate-600">{s["org.address"] || "Address to be configured by the owner."}</p>
        <p className="mt-1">{s["org.email"] || "Email: to be configured"}</p>
        <p className="mt-1">{s["org.phone"] || "Phone: to be configured"}</p>
        <p className="mt-4 text-slate-500">Students with an account get faster help through Dashboard → Support.</p>
      </aside>
    </div>
  );
}
