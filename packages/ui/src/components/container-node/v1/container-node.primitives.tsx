"use client";

import { ThreeDViewIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  getStatusIndicatorClass,
  getStatusTextClass,
} from "@workspace/crossplane/lib/status";
import { FlashNumber } from "@workspace/ui/components/flash-number/flash-number";
import { cn } from "@workspace/ui/lib/utils";
import type { LucideIcon } from "lucide-react";
import { Layers } from "lucide-react";
import { type ComponentProps, useContext } from "react";

import {
  ContainerNodeContext,
  useContainerNode,
} from "./container-node.context";
import type { ContainerNodeStatusTone } from "./container-node.types";

export function ContainerNodeTitle({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  const ctx = useContext(ContainerNodeContext);
  const content = children ?? ctx?.states.name;
  if (content == null) {
    return null;
  }
  return (
    <div
      className={cn(
        "min-w-0 max-w-full truncate font-medium text-xs leading-tight",
        className
      )}
      {...props}
    >
      {content}
    </div>
  );
}

const DEFAULT_KIND = "Container";

export function ContainerNodeKind({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  const ctx = useContext(ContainerNodeContext);
  const content = children ?? (ctx ? (ctx.states.kind ?? DEFAULT_KIND) : null);
  if (content == null) {
    return null;
  }
  return (
    <div
      className={cn(
        "min-w-0 max-w-full truncate text-[10px] text-muted-foreground",
        className
      )}
      {...props}
    >
      {content}
    </div>
  );
}

export function ContainerNodeStatus({
  className,
  label: labelProp,
  tone: toneProp,
}: {
  className?: string;
  label?: string;
  tone?: ContainerNodeStatusTone;
}) {
  const ctx = useContext(ContainerNodeContext);
  const label = labelProp ?? ctx?.states.status?.label ?? "unknown";
  const tone = toneProp ?? ctx?.states.status?.tone;

  if (tone == null) {
    return (
      <div
        className={cn("flex min-w-0 flex-1 items-center gap-1.5", className)}
      >
        <span aria-hidden className="relative flex size-2 shrink-0">
          <span className="relative inline-flex size-2 shrink-0 rounded-[2px] bg-muted" />
        </span>
        <span className="truncate whitespace-nowrap font-medium text-muted-foreground text-xs">
          {label}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex min-w-0 flex-1 items-center gap-1.5", className)}>
      <span aria-hidden className="relative flex size-2 shrink-0">
        <span
          className={cn(
            "absolute inset-0 inline-flex animate-ping rounded-[2px] opacity-75",
            getStatusIndicatorClass(tone)
          )}
        />
        <span
          className={cn(
            "relative inline-flex size-2 shrink-0 rounded-[2px]",
            getStatusIndicatorClass(tone)
          )}
        />
      </span>
      <span
        className={cn(
          "truncate whitespace-nowrap font-medium text-xs",
          getStatusTextClass(tone)
        )}
      >
        {label}
      </span>
    </div>
  );
}

export function ContainerNodeResource({
  className,
  icon: Icon,
  percent,
}: {
  className?: string;
  icon: LucideIcon;
  percent?: number;
}) {
  if (percent == null || !Number.isFinite(percent)) {
    return (
      <div className={cn("flex shrink-0 items-center gap-1", className)}>
        <Icon aria-hidden className="size-3 shrink-0 text-muted-foreground" />
        <span className="whitespace-nowrap tabular-nums">...</span>
      </div>
    );
  }
  return (
    <FlashNumber
      className={cn("text-xs", className)}
      icon={Icon}
      maxDecimals={1}
      value={percent}
    />
  );
}

/** Replica count from `states.replicas`, shown with a layers icon. */
export function ContainerNodeReplicas({ className }: { className?: string }) {
  const {
    states: { replicas },
  } = useContainerNode();
  return (
    <div className={cn("flex shrink-0 items-center gap-1", className)}>
      <Layers aria-hidden className="size-3 shrink-0 text-muted-foreground" />
      <span className="whitespace-nowrap text-xs tabular-nums">
        {replicas == null ? "..." : replicas}
      </span>
    </div>
  );
}

export function ContainerNodeIconPlaceholder({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded bg-muted ring-1 ring-foreground/10",
        className
      )}
      {...props}
    >
      <HugeiconsIcon
        aria-hidden
        className="text-muted-foreground"
        icon={ThreeDViewIcon}
        size={24}
        strokeWidth={2}
      />
    </div>
  );
}

/** Read-only Docker / OCI image reference from context `states.image`. */
export function ContainerNodeImage({
  className,
  label = "Image",
  labelClassName,
}: {
  className?: string;
  label?: string;
  labelClassName?: string;
}) {
  const {
    states: { image },
  } = useContainerNode();
  const display = image.trim() === "" ? "—" : image;
  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-row items-start gap-2",
        className
      )}
    >
      <span
        className={cn(
          "shrink-0 pt-0.5 font-medium text-[10px] text-muted-foreground uppercase tracking-wide",
          labelClassName
        )}
      >
        {label}:
      </span>
      <p
        className="min-w-0 flex-1 truncate font-mono text-[11px] text-foreground leading-snug"
        title={display === "—" ? undefined : display}
      >
        {display}
      </p>
    </div>
  );
}
