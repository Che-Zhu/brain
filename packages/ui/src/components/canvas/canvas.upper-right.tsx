"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

interface CanvasUpperRightContextValue {
  content: ReactNode;
  setUpperRight: (content: ReactNode) => void;
}

const CanvasUpperRightContext =
  createContext<CanvasUpperRightContextValue | null>(null);

/**
 * Supplies the slot used by {@link CanvasUpperRight} and
 * {@link CanvasUpperRightAnchor} / {@link useCanvasUpperRightContent}.
 * Rendered inside {@link Canvas.Flow} only.
 */
export function CanvasUpperRightProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [upperRight, setUpperRight] = useState<ReactNode>(null);
  const value = useMemo(
    () => ({
      content: upperRight,
      setUpperRight,
    }),
    [upperRight]
  );

  return (
    <CanvasUpperRightContext.Provider value={value}>
      {children}
    </CanvasUpperRightContext.Provider>
  );
}

CanvasUpperRightProvider.displayName = "CanvasUpperRightProvider";

/** Renders registered content at the top-right of the canvas viewport. */
export function CanvasUpperRightAnchor() {
  const ctx = useContext(CanvasUpperRightContext);
  if (ctx?.content == null) {
    return null;
  }
  return (
    <div
      className="pointer-events-auto absolute top-2 right-2 z-10 flex items-center gap-2"
      data-slot="canvas-upper-right"
    >
      {ctx.content}
    </div>
  );
}

CanvasUpperRightAnchor.displayName = "CanvasUpperRightAnchor";

export function useCanvasUpperRightContent(): ReactNode | null {
  return useContext(CanvasUpperRightContext)?.content ?? null;
}

export interface CanvasUpperRightProps {
  children: ReactNode;
}

/**
 * Register UI for the canvas upper-right slot (and the side panel header, when
 * open). Must be a descendant of `Canvas.Flow`. Renders nothing itself.
 */
export function CanvasUpperRight({ children }: CanvasUpperRightProps) {
  const ctx = useContext(CanvasUpperRightContext);
  if (ctx == null) {
    throw new Error("Canvas.UpperRight must be used inside Canvas.Flow");
  }
  const { setUpperRight } = ctx;
  useLayoutEffect(() => {
    setUpperRight(children);
    return () => {
      setUpperRight(null);
    };
  }, [children, setUpperRight]);
  return null;
}

CanvasUpperRight.displayName = "Canvas.UpperRight";
