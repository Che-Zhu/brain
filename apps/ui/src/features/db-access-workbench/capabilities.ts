import type { DbAccessCapabilities } from "./types";

export const defaultDbAccessCapabilities = {
  assistantLinkage: false,
  bi: false,
  browse: true,
  chart: false,
  dashboard: false,
  ddl: false,
  export: true,
  query: false,
  rows: true,
  write: false,
} as const satisfies DbAccessCapabilities;
