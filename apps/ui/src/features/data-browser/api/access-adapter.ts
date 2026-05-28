import type {
  AccessObjectRef,
  AccessObjectsResult,
  DataBrowserHostContext,
} from "./access-types";

interface AccessRequestInput {
  body?: Record<string, unknown>;
  operation: string;
  runtime: DataBrowserHostContext;
}

export interface ListObjectsInput {
  kinds?: string[];
  parent?: AccessObjectRef;
  runtime: DataBrowserHostContext;
}

export type AccessExportFormat = "csv" | "ndjson";

export interface ExportObjectInput {
  format: AccessExportFormat;
  ref: AccessObjectRef;
  runtime: DataBrowserHostContext;
}

export interface ExportObjectResult {
  blob: Blob;
  filename: string;
}

async function accessRequest<T>({
  operation,
  runtime,
  body = {},
}: AccessRequestInput): Promise<T> {
  const response = await fetch(
    `/api/db/v1alpha1/${encodeURIComponent(runtime.databaseWorkloadName)}/access/${operation}`,
    {
      body: JSON.stringify({
        projectUid: runtime.projectUid,
        namespace: runtime.databaseWorkloadNamespace,
        ...body,
      }),
      headers: {
        Authorization: `Bearer ${encodeURIComponent(runtime.kubeconfig.trim())}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      text.trim() ||
        `Data browser access request failed with status ${response.status}`
    );
  }

  return response.json() as Promise<T>;
}

export function listObjects({
  runtime,
  parent,
  kinds,
}: ListObjectsInput): Promise<AccessObjectsResult> {
  return accessRequest<AccessObjectsResult>({
    body: {
      ...(parent === undefined ? {} : { parent }),
      ...(kinds === undefined ? {} : { kinds }),
    },
    operation: "objects",
    runtime,
  });
}

function parseFilename(contentDisposition: string | null): string | null {
  if (!contentDisposition) {
    return null;
  }

  const filenameStar = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (filenameStar?.[1]) {
    return decodeURIComponent(filenameStar[1]);
  }

  const filename = contentDisposition.match(/filename="?([^";]+)"?/i);
  return filename?.[1] ?? null;
}

function fallbackExportFilename(
  ref: AccessObjectRef,
  format: AccessExportFormat
) {
  const basename = ref.path.at(-1) || ref.kind;
  return `${basename}.${format === "ndjson" ? "ndjson" : "csv"}`;
}

export async function exportObject({
  format,
  ref,
  runtime,
}: ExportObjectInput): Promise<ExportObjectResult> {
  const response = await fetch(
    `/api/db/v1alpha1/${encodeURIComponent(runtime.databaseWorkloadName)}/access/export`,
    {
      body: JSON.stringify({
        format,
        namespace: runtime.databaseWorkloadNamespace,
        projectUid: runtime.projectUid,
        ref,
      }),
      headers: {
        Authorization: `Bearer ${encodeURIComponent(runtime.kubeconfig.trim())}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      text.trim() ||
        `Data browser export request failed with status ${response.status}`
    );
  }

  return {
    blob: await response.blob(),
    filename:
      parseFilename(response.headers.get("Content-Disposition")) ??
      fallbackExportFilename(ref, format),
  };
}

export const DATA_BROWSER_EXPORT_FORMATS = ["csv", "ndjson"] as const;
