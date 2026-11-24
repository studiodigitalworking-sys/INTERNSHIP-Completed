"use client";
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container-x py-24 text-center">
      <h1 className="h1">Something went wrong</h1>
      <p className="muted mt-2">{error.message.startsWith("Forbidden") ? "You do not have permission for this action." : "Please try again. If the problem continues, contact support."}</p>
      {error.digest && <p className="mt-1 text-xs text-slate-400">Ref: {error.digest}</p>}
      <button onClick={reset} className="btn-primary mt-6">Try again</button>
    </div>
  );
}
