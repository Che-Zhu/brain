import Link from "next/link";

/** UI for the experimental Next.js `unauthorized()` interrupt (e.g. failed share link). */
export default function Unauthorized() {
  return (
    <main className="flex h-screen min-h-0 flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="font-semibold text-2xl">401 — Unauthorized</h1>
      <p className="max-w-sm text-muted-foreground text-sm">
        This link is invalid, expired, or the project is not shared. Request a
        new preview link from the project owner.
      </p>
      <p className="text-muted-foreground text-sm">
        <Link className="text-foreground underline" href="/">
          Home
        </Link>
      </p>
    </main>
  );
}
