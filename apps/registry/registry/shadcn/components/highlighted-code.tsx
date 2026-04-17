"use client";

import { cn } from "@/lib/utils";

export interface HighlightedCodeProps {
  code: string;
  language?: string;
  inline?: boolean;
  showLanguage?: boolean;
  showCopy?: boolean;
  className?: string;
}

/** Lightweight code display (no Shiki) for registry `Response` markdown. */
export function HighlightedCode({
  code,
  inline = false,
  className,
}: HighlightedCodeProps) {
  if (inline) {
    return (
      <code
        className={cn(
          "rounded bg-muted px-1 py-0.5 font-mono text-xs",
          className
        )}
      >
        {code}
      </code>
    );
  }

  return (
    <pre
      className={cn(
        "max-w-full overflow-x-auto rounded-md border bg-muted/50 p-3 font-mono text-xs",
        className
      )}
    >
      <code className="block whitespace-pre-wrap break-all">{code}</code>
    </pre>
  );
}
