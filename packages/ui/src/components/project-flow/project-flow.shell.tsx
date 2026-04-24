"use client";

import { cn } from "@workspace/ui/lib/utils";
import type { ComponentProps } from "react";

export function ProjectFlowShell({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex min-h-0 min-w-0 flex-col overflow-hidden", className)}
      data-slot="project-flow"
      {...props}
    />
  );
}
