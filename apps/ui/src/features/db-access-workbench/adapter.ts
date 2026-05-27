import { API_ROUTES } from "@workspace/api/constants";

import type {
  DbAccessAdapter,
  DbAccessColumnsResult,
  DbAccessExportResult,
  DbAccessHealth,
  DbAccessObject,
  DbAccessObjectsResult,
  DbAccessRowsResult,
} from "./types";

export interface CreateDbAccessHttpAdapterOptions {
  baseUrl: string;
  dbName: string;
  fetchImpl?: typeof fetch;
  kubeconfig: string;
  namespace: string;
  projectUid: string;
}

export class DbAccessAdapterError extends Error {
  readonly recoverable: boolean;
  readonly status: number;

  constructor({
    message,
    recoverable,
    status,
  }: {
    message: string;
    recoverable: boolean;
    status: number;
  }) {
    super(message);
    this.name = "DbAccessAdapterError";
    this.recoverable = recoverable;
    this.status = status;
  }
}

export interface NormalizedDbAccessAdapterError {
  message: string;
  recoverable: boolean;
  status?: number;
}

function accessPath(dbName: string, operation: string): string {
  return `${API_ROUTES.db.base}/${encodeURIComponent(dbName)}/access/${operation}`;
}

function recoverableStatus(status: number): boolean {
  return status === 409 || status === 422 || status === 503 || status === 504;
}

function messageFromErrorBody(body: unknown, fallback: string): string {
  if (typeof body === "string" && body.trim() !== "") {
    return body;
  }
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    for (const key of ["detail", "message", "title", "error"]) {
      if (typeof record[key] === "string" && record[key].trim() !== "") {
        return record[key];
      }
    }
  }
  return fallback;
}

async function adapterErrorFromResponse(
  response: Response,
  operation: string
): Promise<DbAccessAdapterError> {
  const fallback = `DB Access ${operation} failed with ${response.status}`;
  const text = await response.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    // Keep the response text as-is when the upstream did not return JSON.
  }
  return new DbAccessAdapterError({
    message: messageFromErrorBody(body, fallback),
    recoverable: recoverableStatus(response.status),
    status: response.status,
  });
}

export function normalizeDbAccessAdapterError(
  error: unknown
): NormalizedDbAccessAdapterError {
  if (error instanceof DbAccessAdapterError) {
    return {
      message: error.message,
      recoverable: error.recoverable,
      status: error.status,
    };
  }
  if (error instanceof Error) {
    return { message: error.message, recoverable: true };
  }
  return { message: "DB Access request failed.", recoverable: true };
}

export function createDbAccessHttpAdapter({
  baseUrl,
  dbName,
  fetchImpl = fetch,
  kubeconfig,
  namespace,
  projectUid,
}: CreateDbAccessHttpAdapterOptions): DbAccessAdapter {
  const request = (
    operation: string,
    body: Record<string, unknown> = {}
  ): Promise<Response> =>
    fetchImpl(new URL(accessPath(dbName, operation), baseUrl), {
      body: JSON.stringify({ namespace, projectUid, ...body }),
      headers: {
        Authorization: `Bearer ${encodeURIComponent(kubeconfig)}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });

  const requestJson = async <T>(
    operation: string,
    body: Record<string, unknown> = {}
  ): Promise<T> => {
    const response = await request(operation, body);
    if (!response.ok) {
      throw await adapterErrorFromResponse(response, operation);
    }
    return (await response.json()) as T;
  };

  const requestBlob = async (
    operation: string,
    body: Record<string, unknown>
  ): Promise<DbAccessExportResult> => {
    const response = await request(operation, body);
    if (!response.ok) {
      throw await adapterErrorFromResponse(response, operation);
    }
    const contentType =
      response.headers.get("Content-Type") ?? "application/octet-stream";
    return {
      blob: await response.blob(),
      contentDisposition: response.headers.get("Content-Disposition"),
      contentType,
    };
  };

  return {
    checkHealth: () => requestJson<DbAccessHealth>("health"),
    exportObject: (input) =>
      requestBlob("export", { format: input.format, ref: input.ref }),
    getObjectMetadata: (input) =>
      requestJson<{ object: DbAccessObject }>("object", { ref: input.ref }),
    listColumns: (input) =>
      requestJson<DbAccessColumnsResult>("columns", { ref: input.ref }),
    listObjects: (input) =>
      requestJson<DbAccessObjectsResult>("objects", {
        ...(input?.parent === undefined ? {} : { parent: input.parent }),
        ...(input?.kinds === undefined ? {} : { kinds: input.kinds }),
      }),
    readRows: (input) =>
      requestJson<DbAccessRowsResult>("rows", {
        pageOffset: input.pageOffset,
        pageSize: input.pageSize,
        ref: input.ref,
        sort: input.sort,
      }),
  };
}
