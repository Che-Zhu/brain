/**
 * HTTP pathnames served by `apps/api` (same origin as `NEXT_PUBLIC_API_URL`, default :9000).
 * Use with your API origin, e.g. `new URL(path, baseUrl)` or SWR keys: `['get', API_ROUTES.k8s.get, queryKey]`.
 */
export const API_ROUTES = {
  /** Main process health (`main.go`). */
  health: "/health",
  docs: "/docs",

  k8s: {
    base: "/api/k8s/v1alpha1",
    health: "/api/k8s/v1alpha1/health",
    get: "/api/k8s/v1alpha1/get",
    /** GET `/` alias for {@link API_ROUTES.k8s.get} (hidden in OpenAPI). */
    getRoot: "/api/k8s/v1alpha1",
    describe: "/api/k8s/v1alpha1/describe",
    logs: "/api/k8s/v1alpha1/logs",
    top: "/api/k8s/v1alpha1/top",
    apply: "/api/k8s/v1alpha1/apply",
    delete: "/api/k8s/v1alpha1/delete",
    patch: "/api/k8s/v1alpha1/patch",
    scale: "/api/k8s/v1alpha1/scale",
    autoscale: "/api/k8s/v1alpha1/autoscale",
    rollout: "/api/k8s/v1alpha1/rollout",
    nsconfig: "/api/k8s/v1alpha1/nsconfig",
  },

  ap: {
    base: "/api/ap/v1alpha1",
    /** GET list/get, PUT create, PATCH update, DELETE — group root path. */
    root: "/api/ap/v1alpha1",
  },

  db: {
    base: "/api/db/v1alpha1",
    root: "/api/db/v1alpha1",
    backup: "/api/db/v1alpha1/backup",
  },

  task: {
    base: "/api/task/v1alpha1",
    s2i: "/api/task/v1alpha1/s2i",
  },

  telemetry: {
    base: "/api/telemetry/v1alpha1",
    logsHealth: "/api/telemetry/v1alpha1/logs/health",
    logs: "/api/telemetry/v1alpha1/logs",
    metricsHealth: "/api/telemetry/v1alpha1/metrics/health",
    metrics: "/api/telemetry/v1alpha1/metrics",
  },
} as const;

type ApiRouteLeaf<T> = T extends string
  ? T
  : T extends object
    ? ApiRouteLeaf<T[keyof T]>
    : never;

/** Every path string in {@link API_ROUTES} (for SWR keys, route guards, etc.). */
export type ApiRoute = ApiRouteLeaf<typeof API_ROUTES>;
