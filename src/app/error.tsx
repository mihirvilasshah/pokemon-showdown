"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center gap-4 py-20 text-center" role="alert">
      <p className="eyebrow">Unexpected error</p>
      <h1 className="font-display text-4xl font-black">Something went wrong.</h1>
      <p className="max-w-md text-sm text-muted">{error.message || "An unexpected error occurred."}</p>
      <button type="button" className="btn-primary" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
