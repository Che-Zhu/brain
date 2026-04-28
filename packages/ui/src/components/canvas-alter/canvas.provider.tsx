"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { CanvasContext } from "./canvas.context";
import type {
  CanvasActions,
  CanvasContextValue,
  CanvasMeta,
  CanvasState,
} from "./canvas.types";

export function CanvasProvider({
  actions,
  children,
  meta,
  state,
}: {
  actions?: Partial<CanvasActions>;
  children: ReactNode;
  meta?: CanvasMeta;
  state: CanvasState;
}) {
  const value = useMemo<CanvasContextValue>(
    () => ({
      actions: {
        fitView: actions?.fitView ?? (() => undefined),
      },
      meta: meta ?? {},
      state,
    }),
    [actions?.fitView, meta, state]
  );

  return <CanvasContext value={value}>{children}</CanvasContext>;
}
