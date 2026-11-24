import { resetPassword } from "@/app/actions/auth";
import { Flash } from "@/components/ui";

export const metadata = { title: "Choose a new password" };

export default function Reset({ searchParams }: { searchParams: { token?: string; error?: string } }) {
  return (
    <div className="container-x max-w-md py-14">
      <div className="card">
        <h1 className="h1">Choose a new password</h1>
        <div className="mt-4"><Flash searchParams={searchParams} /></div>
        <form action={resetPassword} className="space-y-4">
          <input type="hidden" name="token" value={searchParams.token ?? ""} />
          <div><label className="label" htmlFor="password">New password</label><input id="password" name="password" type="password" required minLength={8} className="input" autoComplete="new-password" /></div>
          <button className="btn-primary w-full">Update password</button>
        </form>
      </div>
    </div>
  );
}
