import { createContext } from "react";
import type { CanvasContextValue } from "./types";

export const CanvasContext = createContext<CanvasContextValue | null>(null);
