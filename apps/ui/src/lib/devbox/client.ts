import "server-only";

import { getDevboxExecRequestTimeoutMs } from "./client-core";
import {
  getDevboxApiPrefix,
  getDevboxAuthToken,
  getDevboxBaseUrl,
} from "./config";
import type {
  CreateDevboxInput,
  CreateDevboxResult,
  DeleteDevboxResult,
  DevboxEnvelope,
  DevboxExecInput,
  DevboxExecResult,
  DevboxHealthData,
  DevboxInfo,
  DevboxListItem,
  PauseDevboxResult,
  RefreshPauseInput,
  RefreshPauseResult,
} from "./types";

const DEVBOX_REQUEST_TIMEOUT_MS = 60_000;

export class DevboxApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "DevboxApiError";
    this.status = status;
  }
}

function buildUrl(
  pathname: string,
  searchParams?: URLSearchParams,
  includeApiPrefix = true
): string {
  const basePath = includeApiPrefix
    ? `${getDevboxApiPrefix()}${pathname}`
    : pathname;
  const url = new URL(basePath, getDevboxBaseUrl());
  if (searchParams != null) {
    url.search = searchParams.toString();
  }
  return url.toString();
}

async function parseJsonResponse<T>(
  response: Response
): Promise<DevboxEnvelope<T>> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new DevboxApiError(
      response.status,
      "Devbox API returned an invalid JSON response"
    );
  }

  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload != null &&
      "message" in payload &&
      typeof payload.message === "string"
        ? payload.message
        : "Devbox API request failed";

    throw new DevboxApiError(response.status, message);
  }

  return payload as DevboxEnvelope<T>;
}

async function devboxRequest<T>(
  pathname: string,
  init?: Omit<RequestInit, "headers"> & {
    authNamespace?: string;
    headers?: HeadersInit;
    skipAuth?: boolean;
    searchParams?: URLSearchParams;
    includeApiPrefix?: boolean;
    timeoutMs?: number;
  }
): Promise<DevboxEnvelope<T>> {
  const {
    authNamespace,
    headers: initHeaders,
    includeApiPrefix,
    searchParams,
    skipAuth,
    timeoutMs,
    ...requestInit
  } = init ?? {};
  const headers = new Headers(initHeaders);

  if (!skipAuth) {
    if (authNamespace == null || authNamespace.trim() === "") {
      throw new Error("Devbox auth namespace is required.");
    }
    const token = await getDevboxAuthToken(authNamespace);
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (requestInit.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const signal =
    requestInit.signal ??
    AbortSignal.timeout(timeoutMs ?? DEVBOX_REQUEST_TIMEOUT_MS);

  const response = await fetch(
    buildUrl(pathname, searchParams, includeApiPrefix),
    {
      ...requestInit,
      cache: "no-store",
      headers,
      signal,
    }
  );

  return await parseJsonResponse<T>(response);
}

export async function getDevboxHealth() {
  return await devboxRequest<DevboxHealthData>("/healthz", {
    includeApiPrefix: false,
    method: "GET",
    skipAuth: true,
  });
}

export async function createDevbox(
  authNamespace: string,
  input: CreateDevboxInput
) {
  return await devboxRequest<CreateDevboxResult>("", {
    authNamespace,
    body: JSON.stringify(input),
    method: "POST",
  });
}

export async function listDevboxes(authNamespace: string, upstreamID?: string) {
  const searchParams = new URLSearchParams();
  if (upstreamID != null && upstreamID !== "") {
    searchParams.set("upstreamID", upstreamID);
  }

  return await devboxRequest<{ items: DevboxListItem[] }>("", {
    authNamespace,
    method: "GET",
    searchParams,
  });
}

export async function getDevbox(authNamespace: string, name: string) {
  return await devboxRequest<DevboxInfo>(`/${encodeURIComponent(name)}`, {
    authNamespace,
    method: "GET",
  });
}

export async function pauseDevbox(authNamespace: string, name: string) {
  return await devboxRequest<PauseDevboxResult>(
    `/${encodeURIComponent(name)}/pause`,
    { authNamespace, method: "POST" }
  );
}

export async function refreshDevboxPause(
  authNamespace: string,
  name: string,
  input: RefreshPauseInput
) {
  return await devboxRequest<RefreshPauseResult>(
    `/${encodeURIComponent(name)}/pause/refresh`,
    {
      authNamespace,
      body: JSON.stringify(input),
      method: "POST",
    }
  );
}

export async function resumeDevbox(authNamespace: string, name: string) {
  return await devboxRequest<PauseDevboxResult>(
    `/${encodeURIComponent(name)}/resume`,
    { authNamespace, method: "POST" }
  );
}

export async function deleteDevbox(authNamespace: string, name: string) {
  return await devboxRequest<DeleteDevboxResult>(
    `/${encodeURIComponent(name)}`,
    { authNamespace, method: "DELETE" }
  );
}

export async function execDevbox(
  authNamespace: string,
  name: string,
  input: DevboxExecInput
) {
  const timeoutMs = getDevboxExecRequestTimeoutMs(input.timeoutSeconds);

  return await devboxRequest<DevboxExecResult>(
    `/${encodeURIComponent(name)}/exec`,
    {
      authNamespace,
      body: JSON.stringify(input),
      method: "POST",
      timeoutMs,
    }
  );
}
