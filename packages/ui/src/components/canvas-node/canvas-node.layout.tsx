"use client";

import { cn } from "@workspace/ui/lib/utils";
import type { ComponentProps } from "react";

export function CanvasNodeHeader({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "canvas-node-header flex h-auto w-full min-w-0 items-center justify-start text-left font-normal text-zinc-50 transition-[min-height,padding]",
        className
      )}
      data-slot="canvas-node-header"
      {...props}
    />
  );
}

export function CanvasNodeBody({
  children,
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn("canvas-node-body", className)}
      data-slot="canvas-node-body"
      {...props}
    >
      <div className="canvas-node-body-clip">{children}</div>
    </div>
  );
}

export function CanvasNodeFooter({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "canvas-node-footer flex w-full min-w-0 items-center justify-between font-normal text-zinc-50",
        className
      )}
      data-slot="canvas-node-footer"
      {...props}
    />
  );
}
