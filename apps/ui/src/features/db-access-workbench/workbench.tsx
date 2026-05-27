"use client";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import {
  ChevronDown,
  ChevronRight,
  Database,
  Download,
  Eye,
  FileSearch,
  Filter,
  Folder,
  Loader2,
  RefreshCw,
  Search,
  Table,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useReducer, useState } from "react";

import { normalizeDbAccessAdapterError } from "./adapter";
import { defaultDbAccessCapabilities } from "./capabilities";
import {
  createInitialDbAccessWorkbenchState,
  type DbAccessWorkbenchTab,
  dbAccessWorkbenchReducer,
} from "./store";
import type {
  DbAccessAdapter,
  DbAccessCapabilities,
  DbAccessHealth,
  DbAccessObject,
  DbAccessObjectKind,
  DbAccessRowsResult,
} from "./types";

const ROOT_NODE_ID = "db-access-root";

export interface DbAccessWorkbenchProps {
  adapter: DbAccessAdapter;
  capabilities?: DbAccessCapabilities;
  database: {
    displayEngine: string;
    formattedVersion?: string;
    name: string;
  };
}

interface LoadState {
  error: string | null;
  health: DbAccessHealth | null;
  loading: boolean;
}

type RowsByTab = Record<string, DbAccessRowsResult | undefined>;

function objectRefKey(object: DbAccessObject): string {
  return `${object.ref.kind}:${object.ref.path.join("/")}`;
}

function objectNodeId(object: DbAccessObject): string {
  return `object:${objectRefKey(object)}`;
}

function objectIsTabbable(kind: DbAccessObjectKind): boolean {
  return (
    kind === "collection" ||
    kind === "item" ||
    kind === "key" ||
    kind === "table" ||
    kind === "view"
  );
}

function objectIcon(kind: DbAccessObjectKind) {
  switch (kind) {
    case "database":
      return Database;
    case "schema":
      return Folder;
    case "view":
      return Eye;
    default:
      return Table;
  }
}

function objectIconColor(kind: DbAccessObjectKind): string {
  switch (kind) {
    case "database":
      return "text-chart-3";
    case "schema":
      return "text-chart-4";
    default:
      return "text-chart-2";
  }
}

function objectExpandIcon({
  hasChildren,
  isExpanded,
}: {
  hasChildren: boolean;
  isExpanded: boolean;
}) {
  if (!hasChildren) {
    return <ChevronRight className="size-4 opacity-0" />;
  }
  if (isExpanded) {
    return <ChevronDown className="size-4 opacity-70" />;
  }
  return <ChevronRight className="size-4 opacity-70" />;
}

export function DbAccessWorkbench({
  adapter,
  capabilities = defaultDbAccessCapabilities,
  database,
}: DbAccessWorkbenchProps) {
  const [state, dispatch] = useReducer(
    dbAccessWorkbenchReducer,
    undefined,
    createInitialDbAccessWorkbenchState
  );
  const [loadState, setLoadState] = useState<LoadState>({
    error: null,
    health: null,
    loading: true,
  });
  const [rowsByTab, setRowsByTab] = useState<RowsByTab>({});
  const [rowErrorsByTab, setRowErrorsByTab] = useState<Record<string, string>>(
    {}
  );
  const [loadingRowsByTab, setLoadingRowsByTab] = useState<
    Record<string, boolean>
  >({});

  const loadRoot = useCallback(async () => {
    if (!capabilities.browse) {
      return;
    }
    setLoadState({ error: null, health: null, loading: true });
    try {
      const health = await adapter.checkHealth();
      const objects = await adapter.listObjects();
      dispatch({
        children: objects.objects,
        nodeId: ROOT_NODE_ID,
        type: "setTreeChildren",
      });
      setLoadState({ error: null, health, loading: false });
    } catch (error) {
      const normalized = normalizeDbAccessAdapterError(error);
      setLoadState({
        error: normalized.message,
        health: null,
        loading: false,
      });
    }
  }, [adapter, capabilities.browse]);

  useEffect(() => {
    loadRoot().catch(() => undefined);
  }, [loadRoot]);

  const activeTab = useMemo(
    () => state.tabs.find((tab) => tab.id === state.activeTabId) ?? null,
    [state.activeTabId, state.tabs]
  );

  useEffect(() => {
    if (!(activeTab && capabilities.rows)) {
      return;
    }
    const pagination = state.paginationByTab[activeTab.id] ?? {
      pageOffset: 0,
      pageSize: 100,
    };
    setLoadingRowsByTab((current) => ({ ...current, [activeTab.id]: true }));
    setRowErrorsByTab((current) => {
      const next = { ...current };
      delete next[activeTab.id];
      return next;
    });

    adapter
      .readRows({
        pageOffset: pagination.pageOffset,
        pageSize: pagination.pageSize,
        ref: activeTab.ref,
        sort: state.sortByTab[activeTab.id],
      })
      .then((rows) => {
        setRowsByTab((current) => ({ ...current, [activeTab.id]: rows }));
      })
      .catch((error) => {
        setRowErrorsByTab((current) => ({
          ...current,
          [activeTab.id]: normalizeDbAccessAdapterError(error).message,
        }));
      })
      .finally(() => {
        setLoadingRowsByTab((current) => ({
          ...current,
          [activeTab.id]: false,
        }));
      });
  }, [
    activeTab,
    adapter,
    capabilities.rows,
    state.paginationByTab,
    state.sortByTab,
  ]);

  const openObject = useCallback(
    async (object: DbAccessObject) => {
      const nodeId = objectNodeId(object);
      if (object.hasChildren) {
        dispatch({ nodeId, type: "toggleExpanded" });
        if (state.treeData[nodeId] === undefined) {
          dispatch({ loading: true, nodeId, type: "setObjectLoading" });
          try {
            const result = await adapter.listObjects({ parent: object.ref });
            dispatch({
              children: result.objects,
              nodeId,
              type: "setTreeChildren",
            });
          } finally {
            dispatch({ loading: false, nodeId, type: "setObjectLoading" });
          }
        }
      }
      if (objectIsTabbable(object.kind)) {
        dispatch({ object, type: "openObjectTab" });
      }
    },
    [adapter, state.treeData]
  );

  const activeRows = activeTab ? rowsByTab[activeTab.id] : undefined;
  const activeRowsLoading = activeTab
    ? loadingRowsByTab[activeTab.id] === true
    : false;
  const activeRowsError = activeTab ? rowErrorsByTab[activeTab.id] : undefined;

  return (
    <div
      className="flex h-full w-full min-w-0 overflow-hidden bg-sidebar text-sidebar-foreground"
      data-slot="db-access-workbench"
    >
      <WorkbenchSidebar
        databaseName={database.name}
        expandedObjectIds={state.expandedObjectIds}
        loading={loadState.loading}
        loadingObjectIds={state.loadingObjectIds}
        objects={state.treeData[ROOT_NODE_ID] ?? []}
        onObjectClick={openObject}
        treeData={state.treeData}
      />
      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-sidebar">
        <WorkbenchTabBar
          activeTabId={state.activeTabId}
          onCloseTab={(tabId) => dispatch({ tabId, type: "closeTab" })}
          onSelectTab={(tabId) => dispatch({ tabId, type: "setTab" })}
          tabs={state.tabs}
        />
        <WorkbenchTabContent
          activeTab={activeTab}
          capabilities={capabilities}
          error={loadState.error ?? activeRowsError ?? null}
          filterText={activeTab ? (state.filtersByTab[activeTab.id] ?? "") : ""}
          health={loadState.health}
          loading={loadState.loading || activeRowsLoading}
          onExport={(tab) => {
            dispatch({
              exportState: { format: "csv", ref: tab.ref, status: "ready" },
              type: "setExportState",
            });
          }}
          onFilterChange={(value) => {
            if (!activeTab) {
              return;
            }
            dispatch({ tabId: activeTab.id, type: "setFilterText", value });
          }}
          onRetry={loadRoot}
          rows={activeRows}
        />
      </main>
    </div>
  );
}

function WorkbenchSidebar({
  databaseName,
  expandedObjectIds,
  loading,
  loadingObjectIds,
  objects,
  onObjectClick,
  treeData,
}: {
  databaseName: string;
  expandedObjectIds: Set<string>;
  loading: boolean;
  loadingObjectIds: Set<string>;
  objects: DbAccessObject[];
  onObjectClick: (object: DbAccessObject) => Promise<void>;
  treeData: Record<string, DbAccessObject[]>;
}) {
  return (
    <aside
      className="flex h-full w-64 shrink-0 flex-col border-sidebar-border border-r bg-sidebar"
      data-slot="db-access-sidebar"
    >
      <div className="flex shrink-0 items-center px-4 pt-5 pb-2">
        <span className="font-medium text-sidebar-foreground text-xl">
          Connections
        </span>
      </div>
      <div
        className="flex-1 overflow-y-auto p-2"
        data-slot="db-access-object-tree"
      >
        <div className="group flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-2 text-muted-foreground text-sm transition-colors hover:bg-input hover:text-foreground">
          <Database className="size-4 text-primary" />
          <span className="min-w-0 flex-1 truncate">{databaseName}</span>
          {loading ? (
            <Loader2 className="size-3 animate-spin text-muted-foreground" />
          ) : null}
        </div>
        <div className="mt-1 space-y-0.5 border-border/50 border-l pl-3">
          {objects.map((object) => (
            <WorkbenchTreeNode
              expandedObjectIds={expandedObjectIds}
              key={objectRefKey(object)}
              loadingObjectIds={loadingObjectIds}
              object={object}
              onObjectClick={onObjectClick}
              treeData={treeData}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}

function WorkbenchTreeNode({
  expandedObjectIds,
  loadingObjectIds,
  object,
  onObjectClick,
  treeData,
}: {
  expandedObjectIds: Set<string>;
  loadingObjectIds: Set<string>;
  object: DbAccessObject;
  onObjectClick: (object: DbAccessObject) => Promise<void>;
  treeData: Record<string, DbAccessObject[]>;
}) {
  const nodeId = objectNodeId(object);
  const isExpanded = expandedObjectIds.has(nodeId);
  const children = treeData[nodeId] ?? [];
  const Icon = objectIcon(object.kind);

  return (
    <div>
      <button
        className="group flex w-full cursor-pointer select-none items-center gap-2 rounded-md px-2 py-2 text-left text-muted-foreground text-sm transition-colors hover:bg-input hover:text-foreground"
        onClick={() => {
          onObjectClick(object).catch(() => undefined);
        }}
        type="button"
      >
        {objectExpandIcon({ hasChildren: object.hasChildren, isExpanded })}
        <Icon className={cn("size-4", objectIconColor(object.kind))} />
        <span className="min-w-0 flex-1 truncate">{object.name}</span>
        {loadingObjectIds.has(nodeId) ? (
          <Loader2 className="size-3 animate-spin text-muted-foreground" />
        ) : null}
      </button>
      {isExpanded && children.length > 0 ? (
        <div className="mt-1 space-y-0.5 border-border/50 border-l pl-3">
          {children.map((child) => (
            <WorkbenchTreeNode
              expandedObjectIds={expandedObjectIds}
              key={objectRefKey(child)}
              loadingObjectIds={loadingObjectIds}
              object={child}
              onObjectClick={onObjectClick}
              treeData={treeData}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function WorkbenchTabBar({
  activeTabId,
  onCloseTab,
  onSelectTab,
  tabs,
}: {
  activeTabId: string | null;
  onCloseTab: (tabId: string) => void;
  onSelectTab: (tabId: string) => void;
  tabs: DbAccessWorkbenchTab[];
}) {
  return (
    <div
      className="mb-2 border-sidebar-border border-b"
      data-slot="db-access-tab-bar"
    >
      <div className="flex h-9 items-center pr-2">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              className={cn(
                "group flex h-9 cursor-pointer select-none items-center gap-1 border-sidebar-border border-r p-2 pl-3 transition-colors",
                isActive
                  ? "bg-input text-foreground"
                  : "text-foreground hover:bg-muted"
              )}
              key={tab.id}
            >
              <button
                className="flex min-w-0 flex-1 items-center gap-1 text-left"
                onClick={() => onSelectTab(tab.id)}
                type="button"
              >
                <Table className="mr-1 size-4 shrink-0" />
                <span className="truncate whitespace-nowrap font-normal text-sm">
                  {tab.title}
                </span>
              </button>
              <button
                aria-label={`Close ${tab.title}`}
                className="flex size-5 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-input"
                onClick={() => onCloseTab(tab.id)}
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WorkbenchTabContent({
  activeTab,
  capabilities,
  error,
  filterText,
  health,
  loading,
  onExport,
  onFilterChange,
  onRetry,
  rows,
}: {
  activeTab: DbAccessWorkbenchTab | null;
  capabilities: DbAccessCapabilities;
  error: string | null;
  filterText: string;
  health: DbAccessHealth | null;
  loading: boolean;
  onExport: (tab: DbAccessWorkbenchTab) => void;
  onFilterChange: (value: string) => void;
  onRetry: () => void;
  rows: DbAccessRowsResult | undefined;
}) {
  return (
    <div
      className="relative flex flex-1 flex-col overflow-hidden p-2 pt-0"
      data-slot="db-access-tab-content"
    >
      <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-border bg-background">
        <div
          className="flex h-10 shrink-0 items-center justify-between gap-2 border-b px-3"
          data-slot="db-access-data-toolbar"
        >
          <div className="flex min-w-0 items-center gap-2">
            {loading ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : (
              <FileSearch className="size-4 text-muted-foreground" />
            )}
            <span className="truncate font-medium text-sm">
              {activeTab?.title ?? health?.status ?? "Checking DB access"}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                aria-label="Find in rows"
                className="h-7 w-40 rounded-md border border-input bg-background pr-2 pl-7 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                disabled={!activeTab}
                onChange={(event) => onFilterChange(event.currentTarget.value)}
                value={filterText}
              />
            </div>
            <Button
              aria-label="Filter rows"
              className="size-7"
              disabled={!(activeTab && capabilities.rows)}
              size="icon"
              type="button"
              variant="ghost"
            >
              <Filter aria-hidden className="size-4" />
            </Button>
            <Button
              aria-label="Export data"
              className="size-7"
              disabled={!(activeTab && capabilities.export)}
              onClick={() => {
                if (activeTab) {
                  onExport(activeTab);
                }
              }}
              size="icon"
              type="button"
              variant="ghost"
            >
              <Download aria-hidden className="size-4" />
            </Button>
          </div>
        </div>
        <WorkbenchDataView
          activeTab={activeTab}
          error={error}
          loading={loading}
          onRetry={onRetry}
          rows={rows}
        />
      </div>
    </div>
  );
}

function WorkbenchDataView({
  activeTab,
  error,
  loading,
  onRetry,
  rows,
}: {
  activeTab: DbAccessWorkbenchTab | null;
  error: string | null;
  loading: boolean;
  onRetry: () => void;
  rows: DbAccessRowsResult | undefined;
}) {
  const columns = rows?.columns ?? [];
  const pageOffset = rows?.pageOffset ?? 0;
  const pageSize = rows?.pageSize ?? 100;

  if (error) {
    return (
      <div
        className="flex flex-1 flex-col items-center justify-center gap-3 bg-muted/10 text-muted-foreground"
        data-slot="db-access-data-view"
      >
        <FileSearch className="size-10 opacity-30" />
        <p className="max-w-md text-center text-sm">{error}</p>
        <Button onClick={onRetry} type="button" variant="outline">
          <RefreshCw aria-hidden className="size-3.5" />
          Retry
        </Button>
      </div>
    );
  }

  if (!activeTab) {
    return (
      <div
        className="flex flex-1 flex-col items-center justify-center bg-muted/10 text-muted-foreground"
        data-slot="db-access-data-view"
      >
        <Database className="mb-4 size-16 opacity-20" />
        <p className="font-medium text-lg">No tabs open</p>
        <p className="text-sm">
          Choose a database object from the sidebar to open a tab.
        </p>
      </div>
    );
  }

  if (loading && rows === undefined) {
    return (
      <div
        className="flex flex-1 items-center justify-center bg-muted/10 text-muted-foreground"
        data-slot="db-access-data-view"
      >
        <Loader2 className="mr-2 size-4 animate-spin" />
        Loading rows
      </div>
    );
  }

  return (
    <>
      <div
        className="min-h-0 flex-1 overflow-auto"
        data-slot="db-access-data-view"
      >
        <table className="min-w-full border-collapse text-sm">
          <thead className="border-border border-b bg-background">
            <tr>
              <th
                className="sticky top-0 left-0 z-50 border-border/50 border-r border-b bg-background px-2 py-2 text-center font-semibold text-muted-foreground text-xs"
                style={{ maxWidth: 64, minWidth: 64, width: 64 }}
              >
                {" "}
              </th>
              {columns.map((column) => (
                <th
                  className="sticky top-0 z-40 border-border/50 border-r border-b bg-background px-4 py-2 text-left font-semibold text-muted-foreground text-xs"
                  key={column.name}
                  style={{ minWidth: 120 }}
                >
                  {column.name}
                </th>
              ))}
              <th className="sticky top-0 z-40 w-full border-border/50 border-b bg-background" />
            </tr>
          </thead>
          <tbody className="bg-background">
            {(rows?.rows ?? []).map((row, index) => {
              const rowNumber = pageOffset + index + 1;
              const rowKey = `${activeTab.id}:${rowNumber}:${row.join("\u001f")}`;
              return (
                <tr
                  className="group transition-colors hover:bg-muted/50"
                  key={rowKey}
                >
                  <td
                    className="sticky left-0 z-30 border-border/50 border-r border-b bg-background px-2 py-2 text-center font-normal text-sm"
                    style={{ maxWidth: 64, minWidth: 64, width: 64 }}
                  >
                    {rowNumber}
                  </td>
                  {columns.map((column, cellIndex) => {
                    const value = row[cellIndex];
                    return (
                      <td
                        className="relative overflow-hidden border-border/50 border-r border-b px-6 py-2 text-foreground/80 text-sm"
                        key={column.name}
                        style={{ minWidth: 120 }}
                      >
                        <span
                          className="block truncate"
                          title={value ?? "NULL"}
                        >
                          {value == null ? (
                            <span className="text-muted-foreground italic">
                              NULL
                            </span>
                          ) : (
                            String(value)
                          )}
                        </span>
                      </td>
                    );
                  })}
                  <td className="w-full border-border/50 border-b bg-background" />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div
        className="flex h-10 shrink-0 items-center justify-between border-t px-3 text-muted-foreground text-xs"
        data-slot="db-access-pagination"
      >
        <span>Page {Math.floor(pageOffset / pageSize) + 1}</span>
        <span>{rows?.totalCount ?? 0} rows</span>
      </div>
    </>
  );
}
