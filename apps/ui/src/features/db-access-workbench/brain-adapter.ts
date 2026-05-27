import { API_ROUTES } from "@workspace/api/constants";
import { fetcher } from "@workspace/api/fetch";
import { ApiUrl } from "@workspace/api/utils";

import type {
  DbAccessAdapter,
  DbAccessColumnsResult,
  DbAccessExportInput,
  DbAccessHealthResult,
  DbAccessListObjectsInput,
  DbAccessObjectInput,
  DbAccessObjectResult,
  DbAccessObjectsResult,
  DbAccessRowsInput,
  DbAccessRowsResult,
} from "./adapter";

export interface DbAccessRequestOptions {
  body?: unknown;
  header?: Record<string, string>;
  method: "POST";
  path: string;
}

export type DbAccessRequest = (
  options: DbAccessRequestOptions
) => Promise<unknown>;

export interface BrainDbAccessAdapterOptions {
  dbName: string;
  kubeconfig: string;
  namespace: string;
  projectUid: string;
  request: DbAccessRequest;
}

export function createBrowserDbAccessRequest(): DbAccessRequest {
  return (options) =>
    fetcher({
      base: ApiUrl(),
      body: options.body,
      header: options.header,
      method: options.method,
      path: options.path,
    });
}

function dbAccessPath(dbName: string, operation: string): string {
  return `${API_ROUTES.db.base}/${encodeURIComponent(dbName)}/access/${operation}`;
}

function authHeader(kubeconfig: string): Record<string, string> {
  return {
    Authorization: `Bearer ${encodeURIComponent(kubeconfig)}`,
  };
}

function baseBody(options: BrainDbAccessAdapterOptions) {
  return {
    namespace: options.namespace,
    projectUid: options.projectUid,
  };
}

export function createBrainDbAccessAdapter(
  options: BrainDbAccessAdapterOptions
): DbAccessAdapter {
  const post = (operation: string, body: Record<string, unknown>) =>
    options.request({
      body,
      header: authHeader(options.kubeconfig),
      method: "POST",
      path: dbAccessPath(options.dbName, operation),
    });

  return {
    async checkHealth(): Promise<DbAccessHealthResult> {
      return (await post("health", baseBody(options))) as DbAccessHealthResult;
    },

    exportObject(input: DbAccessExportInput): Promise<unknown> {
      return post("export", {
        ...baseBody(options),
        ...(input.format === undefined ? {} : { format: input.format }),
        ref: input.ref,
      });
    },

    async getColumns(
      input: DbAccessObjectInput
    ): Promise<DbAccessColumnsResult> {
      return (await post("columns", {
        ...baseBody(options),
        ref: input.ref,
      })) as DbAccessColumnsResult;
    },

    async getObject(input: DbAccessObjectInput): Promise<DbAccessObjectResult> {
      return (await post("object", {
        ...baseBody(options),
        ref: input.ref,
      })) as DbAccessObjectResult;
    },

    async listObjects(
      input: DbAccessListObjectsInput = {}
    ): Promise<DbAccessObjectsResult> {
      return (await post("objects", {
        ...baseBody(options),
        ...(input.parent === undefined ? {} : { parent: input.parent }),
        ...(input.kinds === undefined ? {} : { kinds: input.kinds }),
      })) as DbAccessObjectsResult;
    },

    async readRows(input: DbAccessRowsInput): Promise<DbAccessRowsResult> {
      return (await post("rows", {
        ...baseBody(options),
        ...(input.pageOffset === undefined
          ? {}
          : { pageOffset: input.pageOffset }),
        ...(input.pageSize === undefined ? {} : { pageSize: input.pageSize }),
        ref: input.ref,
        ...(input.sort === undefined ? {} : { sort: input.sort }),
      })) as DbAccessRowsResult;
    },
  };
}
