import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex h-screen min-h-0 flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="space-y-2">
        <h1 className="font-semibold text-2xl tracking-tight">Welcome</h1>
        <p className="max-w-md text-muted-foreground text-sm">
          Open the project explorer to view and manage your projects.
        </p>
      </div>
      <Link
        className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/90"
        href="/project"
      >
        Go to projects
      </Link>
    </main>
  );
}
