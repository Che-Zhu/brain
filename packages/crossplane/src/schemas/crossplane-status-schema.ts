/**
 * Crossplane / Kubernetes-style service phases mapped to shared UI theme text classes
 * (see `packages/ui/src/styles/globals.css` `--color-theme-*`).
 */
export const STATUS_PHASES = {
  // Ready / healthy
  running: "text-theme-green",
  succeeded: "text-theme-green",
  complete: "text-theme-green",
  available: "text-theme-green",
  bound: "text-theme-green",
  ready: "text-theme-green",
  // In progress / waiting
  pending: "text-theme-yellow",
  creating: "text-theme-yellow",
  binding: "text-theme-yellow",
  progressing: "text-theme-yellow",
  restarting: "text-theme-yellow",
  starting: "text-theme-yellow",
  stopping: "text-theme-yellow",
  updating: "text-theme-yellow",
  unknown: "text-theme-yellow",
  // Stopped / paused
  stopped: "text-theme-purple",
  paused: "text-theme-purple",
  shutdown: "text-theme-purple",
  // Error / failed
  failed: "text-theme-red",
  error: "text-theme-red",
  deleting: "text-theme-red",
  unavailable: "text-theme-red",
  degraded: "text-theme-red",
} as const;

export type CrossplaneServiceStatusPhase = keyof typeof STATUS_PHASES;

/** Indicator dot backgrounds aligned with each phase’s theme color. */
export const STATUS_PHASE_INDICATORS = {
  running: "bg-theme-green",
  succeeded: "bg-theme-green",
  complete: "bg-theme-green",
  available: "bg-theme-green",
  bound: "bg-theme-green",
  ready: "bg-theme-green",
  pending: "bg-theme-yellow",
  creating: "bg-theme-yellow",
  binding: "bg-theme-yellow",
  progressing: "bg-theme-yellow",
  restarting: "bg-theme-yellow",
  starting: "bg-theme-yellow",
  stopping: "bg-theme-yellow",
  updating: "bg-theme-yellow",
  unknown: "bg-theme-yellow",
  stopped: "bg-theme-purple",
  paused: "bg-theme-purple",
  shutdown: "bg-theme-purple",
  failed: "bg-theme-red",
  error: "bg-theme-red",
  deleting: "bg-theme-red",
  unavailable: "bg-theme-red",
  degraded: "bg-theme-red",
} as const satisfies Record<CrossplaneServiceStatusPhase, string>;
