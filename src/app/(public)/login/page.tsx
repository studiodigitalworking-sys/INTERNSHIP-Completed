import Link from "next/link";
import { login } from "@/app/actions/auth";
import { Flash } from "@/components/ui";

export const metadata = { title: "Log in" };

const DEMO = [["owner", "Root owner"], ["academic", "Academic admin"], ["finance", "Finance admin"], ["certs", "Certificate officer"], ["support", "Support agent"], ["college", "College admin"], ["auditor", "Auditor"], ["mentor", "Mentor"], ["employer", "Employer"], ["student", "Student (enrolled)"], ["student2", "Student (applied)"]];

export default function Login({ searchParams }: { searchParams: { error?: string; ok?: string; next?: string } }) {
  return (
    <div className="container-x grid max-w-5xl gap-8 py-14 md:grid-cols-2">
      <div className="card">
        <h1 className="h1">Log in</h1>
        <div className="mt-4"><Flash searchParams={searchParams} /></div>
        <form action={login} className="space-y-4">
          <input type="hidden" name="next" value={searchParams.next ?? ""} />
          <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="email" className="input" /></div>
          <div><label className="label" htmlFor="password">Password</label><input id="password" name="password" type="password" required autoComplete="current-password" className="input" /></div>
          <button className="btn-primary w-full">Log in</button>
        </form>
        <div className="mt-4 flex justify-between text-sm"><Link href="/forgot-password" className="link">Forgot password?</Link><Link href="/register" className="link">Create account</Link></div>
      </div>
      {process.env.DEMO_MODE !== "false" && (
        <div className="card bg-amber-50">
          <h2 className="h2">Demo accounts</h2>
          <p className="mt-1 text-sm text-slate-600">Synthetic accounts for evaluation. Password for all: <code className="rounded bg-white px-1">Demo@12345</code>. Set <code>DEMO_MODE=false</code> to hide this panel in production.</p>
          <ul className="mt-3 grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">{DEMO.map(([u, r]) => <li key={u}><code>{u}@internverse.local</code><div className="text-xs text-slate-500">{r}</div></li>)}</ul>
        </div>
      )}
    </div>
  );
}
