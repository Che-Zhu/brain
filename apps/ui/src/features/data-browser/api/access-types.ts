import type { DataBrowserEngine } from "./engine";

export interface AccessObjectRef {
  kind: string;
  path: string[];
}

export interface AccessObject {
  childKinds?: string[];
  displayName?: string;
  hasChildren: boolean;
  kind: string;
  metadata?: Record<string, string>;
  name: string;
  ref: AccessObjectRef;
}

export interface AccessObjectsResult {
  objects: AccessObject[];
  truncated: boolean;
}

export interface DataBrowserDatabaseMetadata {
  displayEngine: string;
  engineKey?: string;
  formattedVersion?: string;
  name: string;
}

export interface DataBrowserHostContext {
  database: DataBrowserDatabaseMetadata;
  databaseWorkloadName: string;
  databaseWorkloadNamespace: string;
  engine: DataBrowserEngine;
  kubeconfig: string;
  namespace: string;
  projectUid: string;
}
