import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center gap-4 py-20 text-center">
      <p className="eyebrow">404</p>
      <h1 className="font-display text-5xl font-black">This route fainted.</h1>
      <p className="max-w-md text-muted">The page you were looking for doesn&apos;t exist.</p>
      <Link href="/" className="btn-primary">
        Back to the arena
      </Link>
    </div>
  );
}
