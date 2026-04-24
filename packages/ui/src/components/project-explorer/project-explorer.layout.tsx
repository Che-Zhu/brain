"use client";

import { cn } from "@workspace/ui/lib/utils";
import type { ComponentProps, ReactNode } from "react";

export function ProjectExplorerShell({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col overflow-hidden text-sm shadow-xs",
        className
      )}
      {...props}
    />
  );
}

export function ProjectExplorerHeader({
  className,
  children,
  ...props
}: ComponentProps<"div"> & { children?: ReactNode }) {
  return (
    <div className={cn("px-4 py-3", className)} {...props}>
      {children ?? (
        <div className="text-start font-mono text-base leading-none">
          Projects
        </div>
      )}
    </div>
  );
}
