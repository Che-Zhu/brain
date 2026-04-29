"use client";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { Brain, Router } from "lucide-react";

import { useEntryNode } from "./entry-node.context";
import { EntryNodeStatusDot, EntryNodeStatusPill } from "./entry-node.status";
import type { EntryNodeDomain } from "./entry-node.types";

function getAccessDomain(
  fallbackName: string,
  domain: EntryNodeDomain | undefined
) {
  return (
    domain ?? {
      label: "Access domain",
      value: fallbackName,
    }
  );
}

export function EntryNodeHeader({ className }: { className?: string }) {
  const {
    meta,
    state: { domains, states },
  } = useEntryNode();
  const expanded = meta.expanded ?? false;
  const accessDomain = getAccessDomain(states.name, domains?.access);
  const status = accessDomain.status ?? states.status;
  const statusLabel = status?.label?.trim() || "Unknown";
  const Icon = expanded ? Router : Brain;

  return (
    <Button
      aria-expanded={expanded}
      aria-label={`${expanded ? "Collapse" : "Expand"} ${accessDomain.value}`}
      className={cn(
        "entry-node-card-header group flex h-auto w-full min-w-0 items-center justify-start rounded-none border-0 bg-transparent text-left font-normal text-zinc-50 shadow-none transition-[min-height,padding] hover:bg-transparent hover:text-zinc-50",
        className
      )}
      data-slot="entry-node-header"
      size={null}
      title={accessDomain.value}
      type="button"
      variant={null}
    >
      <div className="entry-node-card-header-content min-w-0 flex-1">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2">
            <Icon aria-hidden className="size-4 shrink-0 text-zinc-50" />
            <span
              className={cn(
                "entry-node-card-title min-w-0 truncate font-normal",
                expanded
                  ? "text-muted-foreground text-xs leading-4"
                  : "text-sm text-zinc-50 leading-5"
              )}
            >
              {expanded ? accessDomain.label : accessDomain.value}
            </span>
          </span>
          <span className="entry-node-card-status min-w-0 shrink-0">
            <EntryNodeStatusPill
              className="entry-node-card-status-pill max-w-28"
              status={{ label: statusLabel, tone: status?.tone }}
            />
            <EntryNodeStatusDot
              className="entry-node-card-status-dot"
              size="collapsed"
              status={{ label: statusLabel, tone: status?.tone }}
            />
          </span>
        </div>
        <span className="entry-node-card-access-value mt-1 min-w-0 truncate font-normal text-sm text-zinc-50 leading-5">
          {accessDomain.value}
        </span>
      </div>
    </Button>
  );
}
