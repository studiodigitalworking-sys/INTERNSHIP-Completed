import { requestReset } from "@/app/actions/auth";
import { Flash } from "@/components/ui";

export const metadata = { title: "Forgot password" };

export default function Forgot({ searchParams }: { searchParams: { error?: string; ok?: string } }) {
  return (
    <div className="container-x max-w-md py-14">
      <div className="card">
        <h1 className="h1">Reset password</h1>
        <div className="mt-4"><Flash searchParams={searchParams} /></div>
        <form action={requestReset} className="space-y-4">
          <div><label className="label" htmlFor="email">Account email</label><input id="email" name="email" type="email" required className="input" /></div>
          <button className="btn-primary w-full">Send reset link</button>
        </form>
      </div>
    </div>
  );
}
