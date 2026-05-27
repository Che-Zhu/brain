import type {
  DbAccessObject,
  DbAccessObjectRef,
  DbAccessRowsSort,
} from "./types";

export type DbAccessWorkbenchTabType =
  | "collection"
  | "redis_key_detail"
  | "table";

export interface DbAccessWorkbenchTab {
  id: string;
  object: DbAccessObject;
  ref: DbAccessObjectRef;
  title: string;
  type: DbAccessWorkbenchTabType;
}

export interface DbAccessWorkbenchExportState {
  format: "csv" | "ndjson";
  ref: DbAccessObjectRef;
  status: "failed" | "ready" | "running";
}

export interface DbAccessWorkbenchState {
  activeTabId: string | null;
  expandedObjectIds: Set<string>;
  exportState: DbAccessWorkbenchExportState | null;
  filtersByTab: Record<string, string>;
  loadingObjectIds: Set<string>;
  paginationByTab: Record<string, { pageOffset: number; pageSize: number }>;
  sortByTab: Record<string, DbAccessRowsSort[]>;
  tabs: DbAccessWorkbenchTab[];
  treeData: Record<string, DbAccessObject[]>;
}

export type DbAccessWorkbenchAction =
  | { type: "closeTab"; tabId: string }
  | { type: "openObjectTab"; object: DbAccessObject }
  | {
      type: "setExportState";
      exportState: DbAccessWorkbenchExportState | null;
    }
  | { type: "setFilterText"; tabId: string; value: string }
  | {
      type: "setObjectLoading";
      loading: boolean;
      nodeId: string;
    }
  | {
      type: "setPagination";
      pageOffset: number;
      pageSize: number;
      tabId: string;
    }
  | { type: "setSort"; sort: DbAccessRowsSort[]; tabId: string }
  | { type: "setTreeChildren"; children: DbAccessObject[]; nodeId: string }
  | { type: "setTab"; tabId: string }
  | { type: "toggleExpanded"; nodeId: string };

export function createInitialDbAccessWorkbenchState(): DbAccessWorkbenchState {
  return {
    activeTabId: null,
    expandedObjectIds: new Set(),
    exportState: null,
    filtersByTab: {},
    loadingObjectIds: new Set(),
    paginationByTab: {},
    sortByTab: {},
    tabs: [],
    treeData: {},
  };
}

function objectRefKey(ref: DbAccessObjectRef): string {
  return `${ref.kind}:${ref.path.join("/")}`;
}

function objectTabType(object: DbAccessObject): DbAccessWorkbenchTabType {
  if (object.kind === "collection") {
    return "collection";
  }
  if (object.kind === "key") {
    return "redis_key_detail";
  }
  return "table";
}

function objectTabId(object: DbAccessObject): string {
  return `tab:${objectRefKey(object.ref)}`;
}

export function dbAccessWorkbenchReducer(
  state: DbAccessWorkbenchState,
  action: DbAccessWorkbenchAction
): DbAccessWorkbenchState {
  switch (action.type) {
    case "closeTab": {
      const index = state.tabs.findIndex((tab) => tab.id === action.tabId);
      const tabs = state.tabs.filter((tab) => tab.id !== action.tabId);
      const nextActiveTabId =
        state.activeTabId === action.tabId
          ? (tabs[Math.min(index, tabs.length - 1)]?.id ?? null)
          : state.activeTabId;
      return { ...state, activeTabId: nextActiveTabId, tabs };
    }
    case "openObjectTab": {
      const id = objectTabId(action.object);
      const existing = state.tabs.find((tab) => tab.id === id);
      if (existing) {
        return { ...state, activeTabId: existing.id };
      }
      const tab: DbAccessWorkbenchTab = {
        id,
        object: action.object,
        ref: action.object.ref,
        title: action.object.name,
        type: objectTabType(action.object),
      };
      return {
        ...state,
        activeTabId: tab.id,
        paginationByTab: {
          ...state.paginationByTab,
          [tab.id]: { pageOffset: 0, pageSize: 100 },
        },
        tabs: [...state.tabs, tab],
      };
    }
    case "setExportState":
      return { ...state, exportState: action.exportState };
    case "setFilterText":
      return {
        ...state,
        filtersByTab: { ...state.filtersByTab, [action.tabId]: action.value },
      };
    case "setObjectLoading": {
      const loadingObjectIds = new Set(state.loadingObjectIds);
      if (action.loading) {
        loadingObjectIds.add(action.nodeId);
      } else {
        loadingObjectIds.delete(action.nodeId);
      }
      return { ...state, loadingObjectIds };
    }
    case "setPagination":
      return {
        ...state,
        paginationByTab: {
          ...state.paginationByTab,
          [action.tabId]: {
            pageOffset: action.pageOffset,
            pageSize: action.pageSize,
          },
        },
      };
    case "setSort":
      return {
        ...state,
        sortByTab: { ...state.sortByTab, [action.tabId]: action.sort },
      };
    case "setTab":
      return state.tabs.some((tab) => tab.id === action.tabId)
        ? { ...state, activeTabId: action.tabId }
        : state;
    case "setTreeChildren":
      return {
        ...state,
        treeData: { ...state.treeData, [action.nodeId]: action.children },
      };
    case "toggleExpanded": {
      const expandedObjectIds = new Set(state.expandedObjectIds);
      if (expandedObjectIds.has(action.nodeId)) {
        expandedObjectIds.delete(action.nodeId);
      } else {
        expandedObjectIds.add(action.nodeId);
      }
      return { ...state, expandedObjectIds };
    }
    default:
      return state;
  }
}
