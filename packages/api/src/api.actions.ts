"use server";

const baseUrl = () =>
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000";
const k8sBase = () => `${baseUrl()}/api/k8s/v1alpha1`;
const telemetryBase = () => `${baseUrl()}/api/telemetry/v1alpha1`;

async function fetchK8s<T>(
  path: string,
  init: RequestInit & { kc: string; params?: Record<string, string> }
): Promise<T> {
  const { kc, params, ...opts } = init;
  const url = new URL(path);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== "") {
        url.searchParams.set(k, v);
      }
    }
  }
  const res = await fetch(url.toString(), {
    ...opts,
    headers: {
      Authorization: `Bearer ${encodeURIComponent(kc)}`,
      ...opts.headers,
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API ${res.status}: ${err}`);
  }
  const ct = res.headers.get("content-type");
  if (ct?.includes("application/json")) {
    return res.json() as Promise<T>;
  }
  return res.text() as Promise<T>;
}

// Query
export async function k8sGet(
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
  return await fetchK8s<unknown>(`${k8sBase()}/get`, {
    kc,
    params,
    method: "GET",
  });
}

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
  return await fetchK8s<unknown>(`${k8sBase()}/describe`, {
    kc,
    params,
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
  return await fetchK8s<string>(`${k8sBase()}/logs`, {
    kc,
    params,
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
  return await fetchK8s<unknown>(`${k8sBase()}/top`, {
    kc,
    params: params ?? {},
    method: "GET",
  });
}

// Mutation
export async function k8sApply(kc: string, body: string | Blob): Promise<void> {
  const yaml = typeof body === "string" ? body : await (body as Blob).text();
  const res = await fetch(`${k8sBase()}/apply`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${encodeURIComponent(kc)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ yaml }),
  });
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }
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
  return await fetchK8s<unknown>(`${k8sBase()}/delete`, {
    kc,
    params,
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
  return await fetchK8s<unknown>(`${k8sBase()}/patch`, {
    kc,
    params: {
      kind: params.kind,
      name: params.name,
      ...(params.namespace != null && params.namespace !== ""
        ? { namespace: params.namespace }
        : {}),
      ...(params.type ? { type: params.type } : {}),
    },
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
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
  return await fetchK8s<unknown>(`${k8sBase()}/scale`, {
    kc,
    params: p,
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
  return await fetchK8s<unknown>(`${k8sBase()}/autoscale`, {
    kc,
    params: p,
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
  return await fetchK8s<unknown>(`${k8sBase()}/rollout`, {
    kc,
    params: params as Record<string, string>,
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
  return await fetchK8s<string>(`${k8sBase()}/nsconfig`, {
    kc,
    params: params as Record<string, string>,
    method: "GET",
  });
}

export async function k8sHealth() {
  const res = await fetch(`${k8sBase()}/health`, { method: "GET" });
  if (!res.ok) {
    throw new Error(`Health check failed: ${res.status}`);
  }
  return res.json();
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
  return await fetchK8s<Record<string, number | string>[]>(
    `${telemetryBase()}/metrics`,
    {
      kc,
      params: params as Record<string, string>,
      method: "GET",
    }
  );
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
    return await fetchK8s<Record<string, TelemetryLogEntry[]>>(
      `${telemetryBase()}/logs`,
      {
        kc,
        params: p,
        method: "GET",
      }
    );
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
  const raw = await k8sGet(kc, {
    kind: "secrets",
    name: params.secretName,
    namespace: params.namespace,
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
