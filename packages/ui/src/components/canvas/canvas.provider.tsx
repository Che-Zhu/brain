"use client";

import { useReactFlow } from "@xyflow/react";
import { type ReactNode, useCallback, useMemo } from "react";
import { CanvasContext } from "./canvas.context";
import type { CanvasContextValue } from "./canvas.types";

export function CanvasProvider({
  children,
  projectId,
}: {
  children: ReactNode;
  projectId: string;
}) {
  const { fitView } = useReactFlow();

  const fitViewAction = useCallback(() => {
    fitView();
  }, [fitView]);

  const value = useMemo<CanvasContextValue>(
    () => ({
      state: { projectId },
      actions: { fitView: fitViewAction },
      meta: {},
    }),
    [projectId, fitViewAction]
  );

  return <CanvasContext value={value}>{children}</CanvasContext>;
}
