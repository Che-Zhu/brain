"use client";

import { use } from "react";
import { CanvasContext } from "./canvas-context";

export function useCanvas() {
  const ctx = use(CanvasContext);
  if (!ctx) {
    throw new Error("useCanvas must be used inside <Canvas>");
  }
  return ctx;
}
