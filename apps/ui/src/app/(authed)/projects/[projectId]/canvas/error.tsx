"use client";

import { Button } from "@workspace/ui/components/button";

// §5.A Error boundaries — route-level: catches crashes above the feature.
export default function CanvasError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex h-[100dvh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="font-medium text-lg">Canvas failed to load</h1>
      <p className="max-w-md text-muted-foreground text-sm">{error.message}</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
