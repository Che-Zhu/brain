export type DbAccessObjectKind =
  | "collection"
  | "database"
  | "index"
  | "item"
  | "key"
  | "schema"
  | "table"
  | "view";

export interface DbAccessObjectRef {
  kind: DbAccessObjectKind;
  path: string[];
}

export interface DbAccessObject {
  hasChildren: boolean;
  kind: DbAccessObjectKind;
  metadata?: Record<string, string>;
  name: string;
  path: string[];
  ref: DbAccessObjectRef;
}

export interface DbAccessHealth {
  engine: string;
  name: string;
  namespace: string;
  status: string;
  whoDB?: {
    database?: string;
    server?: string;
  };
}

export interface DbAccessObjectsResult {
  objects: DbAccessObject[];
}

export interface DbAccessColumn {
  isForeignKey?: boolean;
  isPrimary?: boolean;
  length?: number;
  name: string;
  referencedColumn?: string;
  referencedTable?: string;
  type: string;
}

export interface DbAccessColumnsResult {
  columns: DbAccessColumn[];
  ref: DbAccessObjectRef;
}

export interface DbAccessRowsSort {
  column: string;
  direction: "ASC" | "DESC";
}

export interface DbAccessRowsResult {
  columns: DbAccessColumn[];
  pageOffset: number;
  pageSize: number;
  ref: DbAccessObjectRef;
  rows: string[][];
  totalCount: number;
}

export interface DbAccessExportResult {
  blob: Blob;
  contentDisposition: string | null;
  contentType: string;
}

export interface DbAccessAdapter {
  checkHealth(): Promise<DbAccessHealth>;
  exportObject(input: {
    format?: "csv" | "ndjson";
    ref: DbAccessObjectRef;
  }): Promise<DbAccessExportResult>;
  getObjectMetadata(input: {
    ref: DbAccessObjectRef;
  }): Promise<{ object: DbAccessObject }>;
  listColumns(input: {
    ref: DbAccessObjectRef;
  }): Promise<DbAccessColumnsResult>;
  listObjects(input?: {
    kinds?: DbAccessObjectKind[];
    parent?: DbAccessObjectRef | null;
  }): Promise<DbAccessObjectsResult>;
  readRows(input: {
    pageOffset?: number;
    pageSize?: number;
    ref: DbAccessObjectRef;
    sort?: DbAccessRowsSort[];
  }): Promise<DbAccessRowsResult>;
}

export interface DbAccessCapabilities {
  assistantLinkage: boolean;
  bi: boolean;
  browse: boolean;
  chart: boolean;
  dashboard: boolean;
  ddl: boolean;
  export: boolean;
  query: boolean;
  rows: boolean;
  write: boolean;
}
