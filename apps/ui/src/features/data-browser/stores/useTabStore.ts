import type { AccessObjectRef } from "@data-browser/api/access-types";
import { DATA_BROWSER_CAPABILITIES } from "@data-browser/capabilities";
import { create } from "zustand";

export type TabType = "query" | "table" | "collection" | "redis_key_detail";

export interface Tab {
  collectionName?: string;
  connectionId: string;
  databaseName?: string;
  id: string;
  isDirty?: boolean;
  objectRef?: AccessObjectRef;
  schemaName?: string;
  sqlContent?: string;
  tableName?: string;
  title: string;
  type: TabType;
}

interface TabState {
  activeTabId: string | null;
  closeAllTabs: () => void;
  closeOtherTabs: (tabId: string) => void;
  closeTab: (tabId: string) => void;
  findExistingTab: (
    type: TabType,
    connectionId: string,
    identifier: string,
    databaseName?: string,
    objectRef?: AccessObjectRef
  ) => Tab | undefined;
  openTab: (tab: Omit<Tab, "id"> & { id?: string }) => string;
  setActiveTab: (tabId: string) => void;
  tabs: Tab[];
  updateTab: (tabId: string, updates: Partial<Tab>) => void;
}

export function objectTabId(ref: AccessObjectRef): string {
  return `object:${ref.kind}:${JSON.stringify(ref.path)}`;
}

function generateTabId(): string {
  return `tab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export const useTabStore = create<TabState>((set, get) => ({
  activeTabId: null,
  tabs: [],

  findExistingTab: (
    type,
    connectionId,
    identifier,
    databaseName,
    objectRef
  ) => {
    if (objectRef) {
      const canonicalId = objectTabId(objectRef);
      return get().tabs.find((tab) => tab.id === canonicalId);
    }

    return get().tabs.find((tab) => {
      if (tab.type !== type || tab.connectionId !== connectionId) {
        return false;
      }
      if (databaseName && tab.databaseName !== databaseName) {
        return false;
      }
      if (type === "table") {
        return tab.tableName === identifier;
      }
      if (type === "collection") {
        return tab.collectionName === identifier;
      }
      if (type === "redis_key_detail") {
        return tab.tableName === identifier;
      }
      return false;
    });
  },

  openTab: (tabData) => {
    if (tabData.type === "query" && !DATA_BROWSER_CAPABILITIES.actions.query) {
      return get().activeTabId ?? "";
    }

    const { findExistingTab } = get();
    const existingTab =
      tabData.type === "query"
        ? undefined
        : findExistingTab(
            tabData.type,
            tabData.connectionId,
            tabData.tableName || tabData.collectionName || "",
            tabData.databaseName,
            tabData.objectRef
          );

    if (existingTab) {
      set({ activeTabId: existingTab.id });
      return existingTab.id;
    }

    const newTab: Tab = {
      ...tabData,
      id:
        tabData.id ||
        (tabData.objectRef ? objectTabId(tabData.objectRef) : generateTabId()),
    };
    set((state) => ({
      activeTabId: newTab.id,
      tabs: [...state.tabs, newTab],
    }));
    return newTab.id;
  },

  closeTab: (tabId) => {
    set((state) => {
      const index = state.tabs.findIndex((tab) => tab.id === tabId);
      const newTabs = state.tabs.filter((tab) => tab.id !== tabId);
      let newActiveTabId = state.activeTabId;

      if (state.activeTabId === tabId) {
        if (newTabs.length > 0) {
          const newActiveIndex = Math.min(index, newTabs.length - 1);
          newActiveTabId = newTabs[newActiveIndex]?.id ?? null;
        } else {
          newActiveTabId = null;
        }
      }

      return { activeTabId: newActiveTabId, tabs: newTabs };
    });
  },

  setActiveTab: (tabId) => set({ activeTabId: tabId }),

  updateTab: (tabId, updates) => {
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === tabId ? { ...tab, ...updates } : tab
      ),
    }));
  },

  closeOtherTabs: (tabId) => {
    set((state) => {
      const tabToKeep = state.tabs.find((tab) => tab.id === tabId);
      if (!tabToKeep) {
        return state;
      }
      return { activeTabId: tabId, tabs: [tabToKeep] };
    });
  },

  closeAllTabs: () => set({ activeTabId: null, tabs: [] }),
}));
