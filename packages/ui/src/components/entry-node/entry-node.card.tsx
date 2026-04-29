"use client";

import "./entry-node.css";

import { cn } from "@workspace/ui/lib/utils";
import type { ReactNode } from "react";

import { EntryNodeBody } from "./entry-node.body";
import { EntryNodeDomainList } from "./entry-node.domain-list";
import { EntryNodeHeader } from "./entry-node.header";

export function EntryNodeCard({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "entry-node-card entry-node-hover-surface flex min-w-0 flex-col overflow-hidden rounded-lg border-[0.5px] border-white/10 text-zinc-50 backdrop-blur-sm",
        className
      )}
      data-slot="entry-node-card"
    >
      {children}
    </article>
  );
}

export function EntryNodeDefaultCard({ className }: { className?: string }) {
  return (
    <EntryNodeCard className={className}>
      <EntryNodeHeader />
      <EntryNodeBody>
        <EntryNodeDomainList />
      </EntryNodeBody>
    </EntryNodeCard>
  );
}
