import Link from "next/link";
import { register } from "@/app/actions/auth";
import { Flash } from "@/components/ui";

export const metadata = { title: "Register" };

export default function Register({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <div className="container-x max-w-2xl py-14">
      <div className="card">
        <h1 className="h1">Create your student account</h1>
        <p className="muted mt-1">Already registered? <Link href="/login" className="link">Log in</Link></p>
        <div className="mt-4"><Flash searchParams={searchParams} /></div>
        <form action={register} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className="label" htmlFor="name">Full name (as on college records)</label><input id="name" name="name" required minLength={2} className="input" autoComplete="name" /></div>
          <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required className="input" autoComplete="email" /></div>
          <div><label className="label" htmlFor="phone">Mobile number</label><input id="phone" name="phone" required pattern="[6-9][0-9]{9}" inputMode="numeric" className="input" autoComplete="tel" /></div>
          <div className="sm:col-span-2"><label className="label" htmlFor="password">Password (8+ characters, letters and numbers)</label><input id="password" name="password" type="password" required minLength={8} className="input" autoComplete="new-password" /></div>
          <div><label className="label" htmlFor="college">College</label><input id="college" name="college" className="input" /></div>
          <div><label className="label" htmlFor="degree">Degree / programme</label><input id="degree" name="degree" placeholder="e.g. BA Political Science" className="input" /></div>
          <div><label className="label" htmlFor="semester">Semester</label><input id="semester" name="semester" className="input" /></div>
          <div><label className="label" htmlFor="district">District</label><input id="district" name="district" className="input" /></div>
          <fieldset className="space-y-2 rounded-lg border border-slate-200 p-3 sm:col-span-2">
            <legend className="px-1 text-sm font-medium">Students under 18</legend>
            <label className="flex gap-2 text-sm"><input type="checkbox" name="isMinor" /> I am under 18 years of age</label>
            <div><label className="label" htmlFor="guardianName">Parent/guardian name</label><input id="guardianName" name="guardianName" className="input" /></div>
            <label className="flex gap-2 text-sm"><input type="checkbox" name="guardianConsent" /> My parent/guardian consents to my registration and participation (Annexure: Parent/Guardian Consent).</label>
          </fieldset>
          <div className="space-y-2 text-sm sm:col-span-2">
            <label className="flex gap-2"><input type="checkbox" name="terms" required /> I accept the <Link href="/legal/terms" className="link">terms of use</Link> and <Link href="/legal/refund" className="link">refund policy</Link>.</label>
            <label className="flex gap-2"><input type="checkbox" name="privacy" required /> I have read the <Link href="/legal/privacy" className="link">privacy policy</Link> and consent to processing of my data for internship administration.</label>
            <label className="flex gap-2"><input type="checkbox" name="marketing" /> (Optional) Send me updates about new programmes.</label>
          </div>
          <button className="btn-primary sm:col-span-2">Create account</button>
        </form>
      </div>
    </div>
  );
}
