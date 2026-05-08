"use client";

import { CanvasNode } from "@workspace/ui/components/canvas-node/canvas-node";
import { cn } from "@workspace/ui/lib/utils";
import { Router } from "lucide-react";

import { useEntryNode } from "./entry-node.context";
import { EntryNodeDomainList } from "./entry-node.domain";
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

function useEntryNodeAccessDomain() {
  const {
    state: { domains, states },
  } = useEntryNode();

  return getAccessDomain(states.name, domains?.access);
}

function useEntryNodeResolvedStatus() {
  const {
    state: { states },
  } = useEntryNode();
  const accessDomain = useEntryNodeAccessDomain();

  return accessDomain.status ?? states.status ?? null;
}

export function EntryNodeContent() {
  return (
    <CanvasNode.Frame>
      <CanvasNode.ConnectionLayer />
      <CanvasNode.DragStateFrame>
        <CanvasNode.Surface>
          <CanvasNode.Header>
            <EntryNodeHeaderContent />
          </CanvasNode.Header>
          <CanvasNode.Body>
            <EntryNodeDomainList />
          </CanvasNode.Body>
        </CanvasNode.Surface>
      </CanvasNode.DragStateFrame>
      <CanvasNode.ExpandButton />
    </CanvasNode.Frame>
  );
}

export function EntryNodeHeaderContent({ className }: { className?: string }) {
  return (
    <div className={cn("canvas-node-header-content min-w-0 flex-1", className)}>
      <div className="flex min-w-0 items-center justify-between gap-2">
        <EntryNodeAccess />
        <EntryNodeStatus />
      </div>
    </div>
  );
}

export function EntryNodeAccess({ className }: { className?: string }) {
  const accessDomain = useEntryNodeAccessDomain();
  const Icon = Router;

  return (
    <span className={cn("flex min-w-0 flex-1 flex-col", className)}>
      <span className="flex min-w-0 items-center gap-2">
        <Icon aria-hidden className="size-4 shrink-0 text-zinc-50" />
        <span
          className="min-w-0 truncate font-normal text-sm text-zinc-50 leading-5"
          title={accessDomain.value}
        >
          {accessDomain.value}
        </span>
      </span>
      <span className="canvas-node-header-secondary mt-1 min-w-0 truncate font-normal text-muted-foreground text-xs leading-4">
        {accessDomain.label}
      </span>
    </span>
  );
}

export function EntryNodeStatus({ className }: { className?: string }) {
  const status = useEntryNodeResolvedStatus();

  if (!status) {
    return null;
  }

  return <CanvasNode.Status className={className} status={status} />;
}
