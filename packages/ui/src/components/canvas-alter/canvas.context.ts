import { createContext } from "react";
import type { CanvasContextValue } from "./canvas.types";

export const CanvasContext = createContext<CanvasContextValue | null>(null);
