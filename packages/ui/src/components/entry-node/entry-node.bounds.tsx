"use client";

import { cn } from "@workspace/ui/lib/utils";
import type { ReactNode } from "react";

import { useEntryNode } from "./entry-node.context";

export function EntryNodeBounds({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  const {
    meta: { expanded = false },
  } = useEntryNode();

  return (
    <div
      className={cn(
        "entry-node-bounds relative grid place-items-center",
        className
      )}
      data-slot="entry-node-bounds"
      data-state={expanded ? "expanded" : "collapsed"}
    >
      {children}
    </div>
  );
}
