import type { DataBrowserHostContext } from "@data-browser/api/access-types";
import type { DataBrowserEngine } from "@data-browser/api/engine";
import type { RecordInput } from "@data-browser/generated/graphql";
import { create } from "zustand";

export interface Connection {
  createdAt: string;
  database: string;
  host: string;
  id: string;
  name: string;
  password: string;
  port: string;
  runtime?: DataBrowserHostContext;
  type: "MYSQL" | "POSTGRES" | "MONGODB" | "REDIS" | "CLICKHOUSE";
  user: string;
}

export type SelectedItemType =
  | "connection"
  | "database"
  | "schema"
  | "table_folder"
  | "view_folder"
  | "table"
  | "view"
  | "collection"
  | "key"
  | "redis_keys_folder"
  | "redis_key"
  | null;

export interface SelectedItem {
  connectionId?: string;
  id: string;
  metadata?: Record<string, unknown>;
  name: string;
  parentId?: string;
  type: SelectedItemType;
}

export interface DDLResult {
  message?: string;
  success: boolean;
}

interface ConnectionState {
  clearTableData: (
    databaseName: string,
    schema: string | undefined,
    tableName: string,
    mode: "truncate" | "delete"
  ) => Promise<DDLResult>;
  collectionRefreshKey: number;
  connections: Connection[];
  copyTable: (
    databaseName: string,
    schema: string | undefined,
    sourceTable: string,
    targetTable: string,
    copyData: boolean
  ) => Promise<DDLResult>;
  createDatabase: (databaseName: string) => Promise<DDLResult>;
  createTable: (
    databaseName: string,
    schema: string,
    tableName: string,
    fields: RecordInput[]
  ) => Promise<DDLResult>;
  deleteDatabase: (databaseName: string) => Promise<DDLResult>;
  deleteTable: (
    databaseName: string,
    schema: string | undefined,
    tableName: string
  ) => Promise<DDLResult>;
  dropCollection: (
    databaseName: string,
    collectionName: string
  ) => Promise<DDLResult>;
  fetchDatabases: (connectionId: string) => Promise<string[]>;
  fetchSchemas: (connectionId: string, database: string) => Promise<string[]>;
  fetchSystemSchemas: () => Promise<void>;
  fetchTables: (
    connectionId: string,
    database: string,
    schema?: string
  ) => Promise<{ name: string; type: string }[]>;
  initializeRuntimeConnection: (runtime: DataBrowserHostContext) => void;
  renameDatabase: (oldName: string, newName: string) => Promise<DDLResult>;
  renameTable: (
    databaseName: string,
    schema: string | undefined,
    oldName: string,
    newName: string
  ) => Promise<DDLResult>;
  selectedItem: SelectedItem | null;
  selectItem: (item: SelectedItem | null) => void;
  showSystemObjectsFor: Set<string>;
  sidebarRefreshKey: number;
  systemSchemas: string[];
  tableRefreshKey: number;
  toggleSystemObjects: (nodeId: string) => void;
  triggerCollectionRefresh: () => void;
  triggerSidebarRefresh: () => void;
  triggerTableRefresh: () => void;
}

const VIRTUAL_CONNECTION_ID = "data-browser-runtime";

const CONNECTION_TYPE_BY_ENGINE: Record<
  Exclude<DataBrowserEngine, "UNSUPPORTED">,
  Connection["type"]
> = {
  MONGODB: "MONGODB",
  MYSQL: "MYSQL",
  POSTGRES: "POSTGRES",
  REDIS: "REDIS",
};

function disabledMutation(): Promise<DDLResult> {
  return Promise.resolve({
    message: "This database browser is read-only in the current version.",
    success: false,
  });
}

function connectionFromRuntime(runtime: DataBrowserHostContext): Connection {
  return {
    createdAt: new Date().toISOString(),
    database: runtime.database.name,
    host: runtime.databaseWorkloadName,
    id: VIRTUAL_CONNECTION_ID,
    name: runtime.database.name || runtime.databaseWorkloadName,
    password: "",
    port: "",
    runtime,
    type:
      runtime.engine === "UNSUPPORTED"
        ? "POSTGRES"
        : CONNECTION_TYPE_BY_ENGINE[runtime.engine],
    user: "",
  };
}

function runtimeConnectionMatches(
  connection: Connection | undefined,
  runtime: DataBrowserHostContext
) {
  const current = connection?.runtime;
  if (current === undefined) {
    return false;
  }

  return (
    current.projectUid === runtime.projectUid &&
    current.namespace === runtime.namespace &&
    current.kubeconfig === runtime.kubeconfig &&
    current.databaseWorkloadName === runtime.databaseWorkloadName &&
    current.databaseWorkloadNamespace === runtime.databaseWorkloadNamespace &&
    current.engine === runtime.engine &&
    current.database.name === runtime.database.name &&
    current.database.displayEngine === runtime.database.displayEngine &&
    current.database.engineKey === runtime.database.engineKey &&
    current.database.formattedVersion === runtime.database.formattedVersion
  );
}

export function getRuntimeConnection(): Connection | undefined {
  return useConnectionStore
    .getState()
    .connections.find((connection) => connection.id === VIRTUAL_CONNECTION_ID);
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  collectionRefreshKey: 0,
  connections: [],
  selectedItem: null,
  showSystemObjectsFor: new Set<string>(),
  sidebarRefreshKey: 0,
  systemSchemas: [],
  tableRefreshKey: 0,

  initializeRuntimeConnection: (runtime) =>
    set((state) => {
      const existingConnection = state.connections.find(
        (connection) => connection.id === VIRTUAL_CONNECTION_ID
      );
      const connection =
        existingConnection &&
        runtimeConnectionMatches(existingConnection, runtime)
          ? existingConnection
          : connectionFromRuntime(runtime);
      const selectedItem =
        state.selectedItem?.connectionId === VIRTUAL_CONNECTION_ID ||
        state.selectedItem?.id === VIRTUAL_CONNECTION_ID
          ? state.selectedItem
          : null;

      if (
        connection === existingConnection &&
        state.connections.length === 1 &&
        state.connections[0] === existingConnection &&
        state.selectedItem === selectedItem
      ) {
        return state;
      }

      return {
        connections: [connection],
        selectedItem,
      };
    }),

  triggerTableRefresh: () =>
    set((state) => ({ tableRefreshKey: state.tableRefreshKey + 1 })),
  triggerCollectionRefresh: () =>
    set((state) => ({ collectionRefreshKey: state.collectionRefreshKey + 1 })),
  triggerSidebarRefresh: () =>
    set((state) => ({ sidebarRefreshKey: state.sidebarRefreshKey + 1 })),

  toggleSystemObjects: () => undefined,
  fetchSystemSchemas: async () => undefined,

  selectItem: (item) => set({ selectedItem: item }),

  fetchDatabases: async () => {
    const connection = getRuntimeConnection();
    return connection ? [connection.database] : [];
  },

  fetchSchemas: async () => [],

  fetchTables: async () => [],

  createDatabase: disabledMutation,
  renameDatabase: disabledMutation,
  deleteDatabase: disabledMutation,
  createTable: disabledMutation,
  renameTable: disabledMutation,
  deleteTable: disabledMutation,
  clearTableData: disabledMutation,
  copyTable: disabledMutation,
  dropCollection: disabledMutation,
}));
