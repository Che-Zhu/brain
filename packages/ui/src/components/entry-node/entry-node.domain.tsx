"use client";

import { Button } from "@workspace/ui/components/button";
import { CanvasNode } from "@workspace/ui/components/canvas-node/canvas-node";
import { cn } from "@workspace/ui/lib/utils";
import { Check, Copy } from "lucide-react";

import { useEntryNode } from "./entry-node.context";
import type { EntryNodeDomain, EntryNodeDomainKey } from "./entry-node.types";

const BODY_DOMAIN_KEYS = [
  "public",
  "private",
] as const satisfies readonly EntryNodeDomainKey[];

function getBodyDomains(domains: {
  private?: EntryNodeDomain;
  public?: EntryNodeDomain;
}) {
  return BODY_DOMAIN_KEYS.flatMap((domainKey) => {
    const domain = domains[domainKey];
    return domain ? [{ domain, domainKey }] : [];
  });
}

export function EntryNodeDomainList({ className }: { className?: string }) {
  const {
    state: { domains },
  } = useEntryNode();
  const bodyDomains = getBodyDomains({
    private: domains?.private,
    public: domains?.public,
  });

  return (
    <div
      className={cn("flex min-w-0 flex-col gap-2.5 pt-2.5", className)}
      data-slot="entry-node-domain-list"
    >
      {bodyDomains.map(({ domain, domainKey }) => (
        <EntryNodeDomainSection
          domain={domain}
          domainKey={domainKey}
          key={domainKey}
        />
      ))}
    </div>
  );
}

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
      className={cn("flex min-w-0 flex-col gap-2 rounded-lg pb-1.5", className)}
      data-slot="entry-node-domain-section"
    >
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className="min-w-0 truncate font-normal text-muted-foreground text-xs leading-4">
          {domain.label}
        </span>
        <CanvasNode.StatusDot size="small" status={domain.status} />
      </div>
      <Button
        className="group flex h-7 w-full min-w-0 items-center justify-between gap-2 rounded-md border-0 bg-transparent px-2.5 py-1.5 text-left font-normal text-xs text-zinc-50 leading-4 shadow-none transition-[background,box-shadow] hover:bg-white/5 hover:text-zinc-50 focus-visible:bg-white/5 data-[copied=true]:bg-white/5"
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
