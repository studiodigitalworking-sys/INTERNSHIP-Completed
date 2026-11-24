import Link from "next/link";
export default function NotFound() {
  return <div className="container-x py-24 text-center"><h1 className="h1">Page not found</h1><p className="muted mt-2">The page you are looking for does not exist.</p><Link href="/" className="btn-primary mt-6">Go home</Link></div>;
}
