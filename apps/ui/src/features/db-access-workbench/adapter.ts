export type DbAccessObjectKind =
  | "collection"
  | "database"
  | "function"
  | "index"
  | "item"
  | "key"
  | "procedure"
  | "schema"
  | "sequence"
  | "table"
  | "trigger"
  | "view"
  | (string & {});

export interface DbAccessObjectRef {
  kind: DbAccessObjectKind;
  path: string[];
}

export interface DbAccessObject {
  childKinds?: DbAccessObjectKind[];
  displayName?: string;
  hasChildren: boolean;
  kind: DbAccessObjectKind;
  metadata?: Record<string, string>;
  name: string;
  ref: DbAccessObjectRef;
}

export interface DbAccessObjectsResult {
  objects: DbAccessObject[];
  truncated: boolean;
}

export interface DbAccessHealthResult {
  engine: string;
  name: string;
  namespace: string;
  status: string;
  whodb?: {
    database: string;
    server: string;
  };
}

export interface DbAccessObjectResult {
  object: DbAccessObject;
}

export interface DbAccessColumn {
  isForeignKey: boolean;
  isPrimary: boolean;
  length?: number;
  name: string;
  precision?: number;
  referencedColumn?: string;
  referencedTable?: string;
  scale?: number;
  type: string;
}

export interface DbAccessColumnsResult {
  columns: DbAccessColumn[];
  ref: DbAccessObjectRef;
}

export interface DbAccessRowsSort {
  column: string;
  direction: "ASC" | "DESC" | (string & {});
}

export interface DbAccessRowsResult {
  columns: DbAccessColumn[];
  pageOffset: number;
  pageSize: number;
  ref: DbAccessObjectRef;
  rows: string[][];
  totalCount: number;
}

export type DbAccessExportFormat = "csv" | "ndjson" | (string & {});

export interface DbAccessListObjectsInput {
  kinds?: DbAccessObjectKind[];
  parent?: DbAccessObjectRef;
}

export interface DbAccessObjectInput {
  ref: DbAccessObjectRef;
}

export interface DbAccessRowsInput {
  pageOffset?: number;
  pageSize?: number;
  ref: DbAccessObjectRef;
  sort?: DbAccessRowsSort[];
}

export interface DbAccessExportInput {
  format?: DbAccessExportFormat;
  ref: DbAccessObjectRef;
}

export interface DbAccessAdapter {
  checkHealth(): Promise<DbAccessHealthResult>;
  exportObject(input: DbAccessExportInput): Promise<unknown>;
  getColumns(input: DbAccessObjectInput): Promise<DbAccessColumnsResult>;
  getObject(input: DbAccessObjectInput): Promise<DbAccessObjectResult>;
  listObjects(input?: DbAccessListObjectsInput): Promise<DbAccessObjectsResult>;
  readRows(input: DbAccessRowsInput): Promise<DbAccessRowsResult>;
}
