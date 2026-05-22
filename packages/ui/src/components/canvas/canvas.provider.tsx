"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { CanvasContext } from "./canvas.context";
import type {
  CanvasContextValue,
  CanvasMeta,
  CanvasState,
} from "./canvas.types";

export function CanvasProvider({
  children,
  meta,
  state,
}: {
  children: ReactNode;
  meta?: CanvasMeta;
  state: CanvasState;
}) {
  const value = useMemo<CanvasContextValue>(
    () => ({
      meta: meta ?? {},
      state,
    }),
    [meta, state]
  );

  return <CanvasContext value={value}>{children}</CanvasContext>;
}
