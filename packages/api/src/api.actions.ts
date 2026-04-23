"use server";

import { API_ROUTES, type ApiRoute } from "./constants";
import { fetcher } from "./fetch";

const baseUrl = () => process.env.API_URL || "http://localhost:9000";

const apiAbs = (path: ApiRoute) => `${baseUrl()}${path}`;

const authHeader = (kc: string) => ({
  Authorization: `Bearer ${encodeURIComponent(kc)}`,
});

// Query

export async function k8sDescribe(
  kc: string,
  params: {
    kind: string;
    name?: string;
    namespace?: string;
    "label-selector"?: string;
    "field-selector"?: string;
    "all-namespaces"?: string;
  }
) {
  return await fetcher<unknown>({
    base: baseUrl(),
    path: apiAbs(API_ROUTES.k8s.describe),
    query: params,
    header: authHeader(kc),
    method: "GET",
  });
}

export async function k8sLogs(
  kc: string,
  params: {
    pod: string;
    namespace?: string;
    container?: string;
    tail?: string;
    since?: string;
    timestamps?: string;
    previous?: string;
  }
) {
  return await fetcher<string>({
    base: baseUrl(),
    path: apiAbs(API_ROUTES.k8s.logs),
    query: params,
    header: authHeader(kc),
    method: "GET",
  });
}

export async function k8sTop(
  kc: string,
  params?: {
    kind?: string;
    name?: string;
    namespace?: string;
    "all-namespaces"?: string;
    containers?: string;
  }
) {
  return await fetcher<unknown>({
    base: baseUrl(),
    path: apiAbs(API_ROUTES.k8s.top),
    query: params ?? {},
    header: authHeader(kc),
    method: "GET",
  });
}

// Mutation
export async function k8sApply(kc: string, body: string | Blob): Promise<void> {
  const yaml = typeof body === "string" ? body : await (body as Blob).text();
  await fetcher({
    base: baseUrl(),
    path: apiAbs(API_ROUTES.k8s.apply),
    method: "POST",
    header: {
      ...authHeader(kc),
      "Content-Type": "application/json",
    },
    body: { yaml },
  });
}

export async function k8sDelete(
  kc: string,
  params: {
    kind: string;
    name?: string;
    namespace?: string;
    "label-selector"?: string;
    "field-selector"?: string;
    all?: string;
  }
) {
  return await fetcher<unknown>({
    base: baseUrl(),
    path: apiAbs(API_ROUTES.k8s.delete),
    query: params,
    header: authHeader(kc),
    method: "DELETE",
  });
}

export async function k8sPatch(
  kc: string,
  params: {
    /** K8s API resource plural (e.g. aps, dbs, instances). */
    kind: string;
    name: string;
    namespace?: string;
    type?: string;
  },
  body: object
) {
  return await fetcher<unknown>({
    base: baseUrl(),
    path: apiAbs(API_ROUTES.k8s.patch),
    query: {
      kind: params.kind,
      name: params.name,
      ...(params.namespace != null && params.namespace !== ""
        ? { namespace: params.namespace }
        : {}),
      ...(params.type ? { type: params.type } : {}),
    },
    method: "PATCH",
    header: {
      ...authHeader(kc),
      "Content-Type": "application/json",
    },
    body,
  });
}

export async function k8sScale(
  kc: string,
  params: {
    kind: string;
    name: string;
    namespace?: string;
    replicas: number;
    "current-replicas"?: number;
  }
) {
  const p: Record<string, string> = {
    kind: params.kind,
    name: params.name,
    replicas: String(params.replicas),
  };
  if (params.namespace) {
    p.namespace = params.namespace;
  }
  if (params["current-replicas"] != null) {
    p["current-replicas"] = String(params["current-replicas"]);
  }
  return await fetcher<unknown>({
    base: baseUrl(),
    path: apiAbs(API_ROUTES.k8s.scale),
    query: p,
    header: authHeader(kc),
    method: "PUT",
  });
}

export async function k8sAutoscale(
  kc: string,
  params: {
    kind: string;
    name: string;
    namespace?: string;
    min?: number;
    max: number;
    "cpu-percent"?: number;
  }
) {
  const p: Record<string, string> = {
    kind: params.kind,
    name: params.name,
    max: String(params.max),
  };
  if (params.namespace) {
    p.namespace = params.namespace;
  }
  if (params.min != null) {
    p.min = String(params.min);
  }
  if (params["cpu-percent"] != null) {
    p["cpu-percent"] = String(params["cpu-percent"]);
  }
  return await fetcher<unknown>({
    base: baseUrl(),
    path: apiAbs(API_ROUTES.k8s.autoscale),
    query: p,
    header: authHeader(kc),
    method: "PUT",
  });
}

export async function k8sRollout(
  kc: string,
  params: {
    kind: string;
    name: string;
    namespace?: string;
    action?: "restart" | "status";
  }
) {
  return await fetcher<unknown>({
    base: baseUrl(),
    path: apiAbs(API_ROUTES.k8s.rollout),
    query: params as Record<string, string>,
    header: authHeader(kc),
    method: "POST",
  });
}

export async function k8sNsconfig(
  kc: string,
  params: {
    namespace: string;
    permission?: "full" | "edit";
  }
) {
  return await fetcher<string>({
    base: baseUrl(),
    path: apiAbs(API_ROUTES.k8s.nsconfig),
    query: params as Record<string, string>,
    header: authHeader(kc),
    method: "GET",
  });
}

export async function k8sHealth() {
  return await fetcher<unknown>({
    base: baseUrl(),
    path: apiAbs(API_ROUTES.k8s.health),
    method: "GET",
  });
}

/** Fetch telemetry metrics for a resource (db or ap). Returns flattened time series. */
export async function telemetryMetrics(
  kc: string,
  params: {
    namespace: string;
    name: string;
    kind: "db" | "ap";
  }
): Promise<Record<string, number | string>[]> {
  return await fetcher<Record<string, number | string>[]>({
    base: baseUrl(),
    path: apiAbs(API_ROUTES.telemetry.metrics),
    query: params as Record<string, string>,
    header: authHeader(kc),
    method: "GET",
  });
}

export interface TelemetryLogEntry {
  _msg: string;
  _time: string;
  container: string;
  node: string;
  pod: string;
  stream: string;
}

/** Fetch telemetry logs for a resource (db or ap). Returns keyed log entries. */
export async function telemetryLogs(
  kc: string,
  params: {
    namespace: string;
    name: string;
    kind: "db" | "ap";
    container?: string;
    start?: string;
    end?: string;
    limit?: string;
    search?: string;
  }
): Promise<Record<string, TelemetryLogEntry[]>> {
  const p: Record<string, string> = {
    namespace: params.namespace,
    name: params.name,
    kind: params.kind,
  };
  if (params.container) {
    p.container = params.container;
  }
  if (params.start) {
    p.start = params.start;
  }
  if (params.end) {
    p.end = params.end;
  }
  if (params.limit) {
    p.limit = params.limit;
  }
  if (params.search) {
    p.search = params.search;
  }
  try {
    return await fetcher<Record<string, TelemetryLogEntry[]>>({
      base: baseUrl(),
      path: apiAbs(API_ROUTES.telemetry.logs),
      query: p,
      header: authHeader(kc),
      method: "GET",
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("API 404")) {
      return {};
    }
    throw err;
  }
}

/** Resolve a secret key ref to its actual value. Returns null if not found. */
export async function resolveSecretValue(
  kc: string,
  params: {
    secretName: string;
    secretKey: string;
    namespace?: string;
  }
): Promise<string | null> {
  const raw = await fetcher<unknown>({
    base: baseUrl(),
    path: apiAbs(API_ROUTES.k8s.get),
    query: {
      kind: "secrets",
      name: params.secretName,
      ...(params.namespace != null && params.namespace !== ""
        ? { namespace: params.namespace }
        : {}),
    },
    header: authHeader(kc),
    method: "GET",
  });
  const secret = raw as { data?: Record<string, string> };
  const b64 = secret?.data?.[params.secretKey];
  if (!b64) {
    return null;
  }
  try {
    return atob(b64);
  } catch {
    return null;
  }
}
