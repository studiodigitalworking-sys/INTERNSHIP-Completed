import Link from "next/link";
export const metadata = { title: "Access denied" };
export default function Forbidden({ searchParams }: { searchParams: { p?: string } }) {
  return <div className="container-x py-24 text-center"><h1 className="h1">Access denied</h1><p className="muted mt-2">Your role does not include this permission{searchParams.p ? ` (${searchParams.p})` : ""}. Ask the platform owner if you need access.</p><Link href="/" className="btn-primary mt-6">Go home</Link></div>;
}
