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
import type { ComponentProps } from "react";

import type { ContainerNodeStatusTone } from "./container-node.types";

export function ContainerNodeTitle({
  className,
  children,
  name,
  ...props
}: ComponentProps<"div"> & { name?: string }) {
  const content = children ?? name;
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
  kind,
  ...props
}: ComponentProps<"div"> & { kind?: string }) {
  const content = children ?? kind ?? DEFAULT_KIND;
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
  label = "unknown",
  tone,
}: {
  className?: string;
  label?: string;
  tone?: ContainerNodeStatusTone;
}) {
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
            "absolute inset-0 inline-flex animate-ping rounded-full opacity-75",
            getStatusIndicatorClass(tone)
          )}
        />
        <span
          className={cn(
            "relative inline-flex size-2 shrink-0 rounded-full",
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
export function ContainerNodeReplicas({
  className,
  replicas,
}: {
  className?: string;
  replicas?: number;
}) {
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

export function ContainerNodeImage({
  className,
  image,
  label = "Image",
  labelClassName,
}: {
  className?: string;
  image: string;
  label?: string;
  labelClassName?: string;
}) {
  const display = image.trim() === "" ? "—" : image;
  return (
    <div
      className={cn("flex min-h-0 min-w-0 flex-1 flex-col gap-0.5", className)}
    >
      <span
        className={cn(
          "shrink-0 font-medium text-[10px] text-muted-foreground uppercase tracking-wide",
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
