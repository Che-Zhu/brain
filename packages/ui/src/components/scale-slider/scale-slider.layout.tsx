"use client";

import { cn } from "@workspace/ui/lib/utils";
import type { ComponentPropsWithoutRef } from "react";

export function ScaleSliderGroup({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn("inline-flex items-center gap-1.5", className)}
      {...props}
    />
  );
}

/** Vertical block: header row + slider (content). */
export function ScaleSliderStack({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div className={cn("flex w-full flex-col gap-1", className)} {...props} />
  );
}

/** Top row; default aligns label + value to the end. Override with `className` (e.g. `justify-between`). */
export function ScaleSliderHeader({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        "flex w-full min-w-0 items-center justify-between gap-2",
        className
      )}
      {...props}
    />
  );
}

export function ScaleSliderLabel({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"span">) {
  return (
    <span
      className={cn(
        "shrink-0 whitespace-nowrap text-muted-foreground text-xs",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
