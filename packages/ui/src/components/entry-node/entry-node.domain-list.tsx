"use client";

import { cn } from "@workspace/ui/lib/utils";

import { useEntryNode } from "./entry-node.context";
import { EntryNodeDomainSection } from "./entry-node.domain-section";
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
