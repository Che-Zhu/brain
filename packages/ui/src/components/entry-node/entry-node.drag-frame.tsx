"use client";

import { cn } from "@workspace/ui/lib/utils";
import { type CSSProperties, type ReactNode, useEffect, useState } from "react";
import { useEntryNode } from "./entry-node.context";
import type { EntryNodeDragAngle } from "./entry-node.types";

interface EntryNodeDragFrameStyle extends CSSProperties {
  "--entry-node-drag-gradient-angle"?: string;
}

function getGradientAngle(dragAngle: EntryNodeDragAngle) {
  return dragAngle - 90;
}

function getNearestPeriodicGradientAngle(
  gradientAngle: number,
  previousGradientAngle: number | undefined
) {
  if (previousGradientAngle === undefined) {
    return gradientAngle;
  }

  let nextGradientAngle = gradientAngle;

  while (nextGradientAngle - previousGradientAngle > 90) {
    nextGradientAngle -= 180;
  }

  while (nextGradientAngle - previousGradientAngle < -90) {
    nextGradientAngle += 180;
  }

  return nextGradientAngle;
}

function useDragGradientAngle(dragAngle: EntryNodeDragAngle | undefined) {
  const [gradientAngle, setGradientAngle] = useState<number | undefined>(() => {
    if (dragAngle === undefined || !Number.isFinite(dragAngle)) {
      return undefined;
    }

    return getGradientAngle(dragAngle);
  });

  useEffect(() => {
    if (dragAngle === undefined || !Number.isFinite(dragAngle)) {
      setGradientAngle(undefined);
      return;
    }

    setGradientAngle((previousGradientAngle) =>
      getNearestPeriodicGradientAngle(
        getGradientAngle(dragAngle),
        previousGradientAngle
      )
    );
  }, [dragAngle]);

  return gradientAngle;
}

function getDragFrameStyle(
  gradientAngle: number | undefined
): EntryNodeDragFrameStyle | undefined {
  if (gradientAngle === undefined) {
    return undefined;
  }

  return { "--entry-node-drag-gradient-angle": `${gradientAngle}deg` };
}

export function EntryNodeDragFrame({
  children,
  className,
  dragAngle,
  dragging = false,
}: {
  children?: ReactNode;
  className?: string;
  dragAngle?: EntryNodeDragAngle;
  dragging?: boolean;
}) {
  const gradientAngle = useDragGradientAngle(dragAngle);

  if (!(dragging || dragAngle !== undefined)) {
    return <>{children}</>;
  }

  return (
    <div
      className={cn("entry-node-drag-frame inline-flex rounded-lg", className)}
      data-dragging={dragging ? "true" : undefined}
      data-slot="entry-node-drag-frame"
      style={getDragFrameStyle(gradientAngle)}
    >
      {children}
    </div>
  );
}

export function EntryNodeDragStateFrame({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  const {
    state: { interaction },
  } = useEntryNode();

  return (
    <EntryNodeDragFrame
      className={className}
      dragAngle={interaction?.dragAngle}
      dragging={interaction?.dragging}
    >
      {children}
    </EntryNodeDragFrame>
  );
}
