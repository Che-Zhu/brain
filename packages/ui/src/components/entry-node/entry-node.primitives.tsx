"use client";

import "./entry-node.css";

import { cn } from "@workspace/ui/lib/utils";
import { Brain } from "lucide-react";

import { useEntryNode } from "./entry-node.context";
import type { EntryNodeStatusTone } from "./entry-node.types";

interface StatusVisual {
  breathing: boolean;
  haloClassName?: string;
  innerClassName: string;
}

const GREEN: StatusVisual = {
  breathing: true,
  haloClassName: "bg-green-500/30",
  innerClassName: "bg-green-500",
};
const BLUE: StatusVisual = {
  breathing: true,
  haloClassName: "bg-blue-500/30",
  innerClassName: "bg-blue-500",
};
const YELLOW: StatusVisual = {
  breathing: true,
  haloClassName: "bg-yellow-500/30",
  innerClassName: "bg-yellow-500",
};
const GRAY_BREATHING: StatusVisual = {
  breathing: true,
  haloClassName: "bg-neutral-500/30",
  innerClassName: "bg-neutral-500",
};
const GRAY_STATIC: StatusVisual = {
  breathing: false,
  innerClassName: "bg-neutral-500",
};
const RED: StatusVisual = {
  breathing: true,
  haloClassName: "bg-red-500/30",
  innerClassName: "bg-red-500",
};

function normalizeStatus(input: string | undefined): EntryNodeStatusTone {
  const normalized = input
    ?.trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");

  switch (normalized) {
    case "accessible":
    case "available":
    case "bound":
    case "complete":
    case "ready":
    case "running":
    case "succeeded":
      return normalized;
    case "binding":
    case "creating":
    case "pending":
    case "progressing":
      return normalized;
    case "deleting":
      return normalized;
    case "stopping":
      return normalized;
    case "shutdown":
    case "stopped":
      return normalized;
    case "degraded":
    case "error":
    case "failed":
    case "inaccessible":
    case "unhealthy":
      return normalized;
    default:
      return "unknown";
  }
}

function getStatusVisual(tone: EntryNodeStatusTone): StatusVisual {
  switch (tone) {
    case "accessible":
    case "available":
    case "bound":
    case "complete":
    case "ready":
    case "running":
    case "succeeded":
      return GREEN;
    case "binding":
    case "creating":
    case "pending":
    case "progressing":
      return BLUE;
    case "deleting":
      return YELLOW;
    case "stopping":
      return GRAY_BREATHING;
    case "degraded":
    case "error":
    case "failed":
    case "inaccessible":
    case "unhealthy":
      return RED;
    case "shutdown":
    case "stopped":
    case "unknown":
      return GRAY_STATIC;
    default:
      return GRAY_STATIC;
  }
}

function EntryNodeStatusDot({
  label,
  tone,
}: {
  label?: string;
  tone?: EntryNodeStatusTone;
}) {
  const resolvedTone = tone ?? normalizeStatus(label);
  const visual = getStatusVisual(resolvedTone);

  return (
    <span
      aria-hidden
      className="relative flex size-3.5 shrink-0 items-center justify-center rounded-full"
    >
      {visual.breathing && visual.haloClassName ? (
        <span
          className={cn(
            "absolute size-2 animate-ping rounded-full",
            visual.haloClassName
          )}
        />
      ) : null}
      <span
        className={cn("relative size-2 rounded-full", visual.innerClassName)}
      />
    </span>
  );
}

function EntryNodeCollapsedBadgeInner({ className }: { className?: string }) {
  const {
    states: { name, status },
  } = useEntryNode();
  const statusLabel = status?.label?.trim() || "Unknown";

  return (
    <div
      aria-label={`${name} status: ${statusLabel}`}
      className={cn(
        "entry-node-hover-surface flex h-10 w-40 min-w-0 items-center gap-2 overflow-hidden rounded-lg border-[0.5px] border-white/10 bg-white/5 p-2.5 text-zinc-50 backdrop-blur-sm transition-[background,box-shadow]",
        className
      )}
      data-slot="entry-node-collapsed-badge"
      role="status"
      title={name}
    >
      <Brain aria-hidden className="size-4 shrink-0 text-zinc-50" />
      <span className="min-w-0 flex-1 truncate font-normal text-sm leading-5">
        {name}
      </span>
      <EntryNodeStatusDot label={statusLabel} tone={status?.tone} />
    </div>
  );
}

export function EntryNodeCollapsedBadge({
  className,
  dragging = false,
}: {
  className?: string;
  dragging?: boolean;
}) {
  if (dragging) {
    return (
      <div
        className="relative inline-flex rounded-md p-1 before:pointer-events-none before:absolute before:inset-0 before:rounded-md before:border before:border-white before:content-['']"
        data-slot="entry-node-drag-frame"
      >
        <EntryNodeCollapsedBadgeInner className={className} />
      </div>
    );
  }

  return <EntryNodeCollapsedBadgeInner className={className} />;
}
