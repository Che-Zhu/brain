export interface DbAccessCapabilities {
  assistant: boolean;
  browse: boolean;
  dashboard: boolean;
  export: boolean;
  query: boolean;
  rows: boolean;
  write: boolean;
}

export const defaultDbAccessCapabilities = {
  assistant: false,
  browse: true,
  dashboard: false,
  export: true,
  query: false,
  rows: true,
  write: false,
} as const satisfies DbAccessCapabilities;
