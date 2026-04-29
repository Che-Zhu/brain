"use client";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { Check, Copy } from "lucide-react";

import { useEntryNode } from "./entry-node.context";
import { EntryNodeStatusDot } from "./entry-node.status";
import type { EntryNodeDomain, EntryNodeDomainKey } from "./entry-node.types";

export function EntryNodeDomainSection({
  className,
  domain,
  domainKey,
}: {
  className?: string;
  domain: EntryNodeDomain;
  domainKey: EntryNodeDomainKey;
}) {
  const {
    actions,
    state: { copiedDomainKey },
  } = useEntryNode();
  const copied = copiedDomainKey === domainKey;

  return (
    <section
      className={cn(
        "entry-node-domain-section flex min-w-0 flex-col gap-2 rounded-lg pb-1.5",
        className
      )}
      data-slot="entry-node-domain-section"
    >
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className="min-w-0 truncate font-normal text-muted-foreground text-xs leading-4">
          {domain.label}
        </span>
        <EntryNodeStatusDot size="small" status={domain.status} />
      </div>
      <Button
        className={cn(
          "entry-node-domain-copy group flex h-7 w-full min-w-0 items-center justify-between gap-2 rounded-md border-0 bg-transparent px-2.5 py-1.5 text-left font-normal text-xs text-zinc-50 leading-4 shadow-none transition-[background,box-shadow] hover:text-zinc-50",
          copied && "entry-node-domain-copy-copied"
        )}
        data-copied={copied ? "true" : undefined}
        data-slot="entry-node-domain-copy"
        onClick={() => {
          Promise.resolve(actions.copyDomain(domainKey, domain.value)).catch(
            () => undefined
          );
        }}
        onDoubleClick={(event) => {
          event.stopPropagation();
        }}
        size={null}
        title={domain.value}
        type="button"
        variant={null}
      >
        <span className="min-w-0 truncate">{domain.value}</span>
        {copied ? (
          <Check aria-hidden className="size-4 shrink-0" />
        ) : (
          <Copy
            aria-hidden
            className="size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          />
        )}
      </Button>
    </section>
  );
}
