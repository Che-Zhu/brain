import Link from "next/link";

interface PageProps {
  params: Promise<{ uid: string }>;
}

export default async function ProjectUidPage({ params }: PageProps) {
  const { uid } = await params;

  return (
    <div className="flex min-h-svh flex-col gap-4 p-6">
      <div className="flex flex-col gap-2 text-sm">
        <Link
          className="text-muted-foreground text-xs underline-offset-4 hover:underline"
          href="/"
        >
          ← Instances
        </Link>
        <h1 className="font-medium">Instance</h1>
        <p className="break-all font-mono text-muted-foreground text-xs">
          {uid}
        </p>
      </div>
    </div>
  );
}
