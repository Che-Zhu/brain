"use client";

import { cn } from "@workspace/ui/lib/utils";
import type { ReactNode } from "react";

export function EntryNodeBody({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("entry-node-card-body", className)}
      data-slot="entry-node-body"
    >
      <div className="entry-node-card-body-clip">{children}</div>
    </div>
  );
}
