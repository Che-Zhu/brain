"use client";

import "./entry-node.css";

import { cn } from "@workspace/ui/lib/utils";
import type { MouseEventHandler, ReactNode } from "react";

import { EntryNodeBody } from "./entry-node.body";
import { useEntryNode } from "./entry-node.context";
import { EntryNodeDomainList } from "./entry-node.domain-list";
import { EntryNodeHeader } from "./entry-node.header";

export function EntryNodeCard({
  children,
  className,
  onDoubleClick,
}: {
  children?: ReactNode;
  className?: string;
  onDoubleClick?: MouseEventHandler<HTMLElement>;
}) {
  return (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: dblclick to expand is a pointer-only affordance; keyboard equivalent will be added later.
    <article
      className={cn(
        "entry-node-card entry-node-hover-surface flex min-w-0 flex-col overflow-hidden rounded-lg border-[0.5px] border-white/10 text-zinc-50",
        className
      )}
      data-slot="entry-node-card"
      onDoubleClick={onDoubleClick}
    >
      {children}
    </article>
  );
}

export function EntryNodeDefaultCard({ className }: { className?: string }) {
  const { actions, meta } = useEntryNode();
  const expanded = meta.expanded ?? false;

  return (
    <EntryNodeCard
      className={className}
      onDoubleClick={() => {
        if (expanded) {
          actions.collapse?.();
          return;
        }

        actions.expand?.();
      }}
    >
      <EntryNodeHeader />
      <EntryNodeBody>
        <EntryNodeDomainList />
      </EntryNodeBody>
    </EntryNodeCard>
  );
}
