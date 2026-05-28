import type { AccessObjectRef } from "@data-browser/api/access-types";
import { DATA_BROWSER_CAPABILITIES } from "@data-browser/capabilities";
import type { Alert } from "@data-browser/components/ui/types";
import { useConnectionStore } from "@data-browser/stores/useConnectionStore";
import { useTabStore } from "@data-browser/stores/useTabStore";
import { type MouseEvent, useCallback, useReducer, useState } from "react";
import { ContextMenu } from "../ui/ContextMenu";
import {
  getCollectionMenuItems,
  getConnectionMenuItems,
  getDatabaseMenuItems,
  getRedisKeyMenuItems,
  getRedisKeysFolderMenuItems,
  getSchemaMenuItems,
  getTableFolderMenuItems,
  getTableMenuItems,
  getViewFolderMenuItems,
  getViewMenuItems,
} from "./contextMenuItems";
import { SidebarModals } from "./SidebarModals";
import {
  SidebarTreeProvider,
  TreeNode,
  TreeNodeProvider,
  useSidebarTree,
} from "./SidebarTree";
import type { TreeNodeData } from "./SidebarTree/types";
import { connectionToNode, EXPANDABLE_TYPES } from "./SidebarTree/types";

export type ModalState =
  | {
      type: "export_data";
      params: {
        connectionId: string;
        databaseName: string;
        schema: string | null;
        tableName: string;
        objectRef: AccessObjectRef;
      };
    }
  | {
      type: "export_collection";
      params: {
        connectionId: string;
        databaseName: string;
        collectionName: string;
        objectRef: AccessObjectRef;
      };
    }
  | {
      type: "export_redis_key";
      params: {
        connectionId: string;
        databaseName: string;
        keyName: string;
        objectRef: AccessObjectRef;
      };
    };

type Action = { action: "open"; modal: ModalState } | { action: "close" };

function modalReducer(
  _state: ModalState | null,
  action: Action
): ModalState | null {
  if (action.action === "close") {
    return null;
  }
  return action.modal;
}

function SidebarInner() {
  const {
    connections,
    selectedItem,
    selectItem,
    triggerCollectionRefresh,
    triggerTableRefresh,
  } = useConnectionStore();
  const { openTab } = useTabStore();

  const {
    expandedItems,
    isLoading,
    toggleItem,
    fetchNodeChildren,
    refreshNode,
  } = useSidebarTree();

  const [activeModal, dispatch] = useReducer(modalReducer, null);
  const [alert, setAlert] = useState<Alert | null>(null);

  const openModal = useCallback(
    (modal: ModalState) => dispatch({ action: "open", modal }),
    []
  );
  const closeModal = useCallback(() => dispatch({ action: "close" }), []);

  const showAlert = useCallback(
    (title: string, message: string, type: Alert["type"]) =>
      setAlert({ title, message, type }),
    []
  );
  const closeAlert = useCallback(() => setAlert(null), []);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    node: TreeNodeData;
  } | null>(null);

  const handleItemClick = useCallback(
    async (node: TreeNodeData) => {
      selectItem(node);

      if (EXPANDABLE_TYPES.has(node.type)) {
        try {
          await toggleItem(node);
        } catch (error) {
          if (node.type === "connection") {
            showAlert(
              "Connection failed",
              error instanceof Error
                ? error.message
                : "Failed to load connection.",
              "error"
            );
          }
        }
      }

      if (
        (node.type === "table" || node.type === "view") &&
        node.metadata.objectRef
      ) {
        const tableTitle = node.metadata.database
          ? `${node.metadata.database} / ${node.name}`
          : node.name;
        openTab({
          connectionId: node.connectionId,
          databaseName: node.metadata.database,
          objectRef: node.metadata.objectRef,
          schemaName: node.metadata.schema,
          tableName: node.name,
          title: tableTitle,
          type: "table",
        });
      } else if (node.type === "collection" && node.metadata.objectRef) {
        const collectionTitle = node.metadata.database
          ? `${node.metadata.database} / ${node.name}`
          : node.name;
        openTab({
          collectionName: node.name,
          connectionId: node.connectionId,
          databaseName: node.metadata.database,
          objectRef: node.metadata.objectRef,
          title: collectionTitle,
          type: "collection",
        });
        triggerCollectionRefresh();
      } else if (node.type === "redis_key" && node.metadata.objectRef) {
        const redisDatabase = node.metadata.database ?? "";
        openTab({
          connectionId: node.connectionId,
          databaseName: redisDatabase,
          objectRef: node.metadata.objectRef,
          tableName: node.name,
          title: `${redisDatabase} / ${node.name}`,
          type: "redis_key_detail",
        });
      }
    },
    [openTab, selectItem, showAlert, toggleItem, triggerCollectionRefresh]
  );

  const handleContextMenu = useCallback(
    (event: MouseEvent, node: TreeNodeData) => {
      event.preventDefault();
      event.stopPropagation();
      setContextMenu({ node, x: event.clientX, y: event.clientY });
    },
    []
  );

  const handleContextMenuAction = useCallback(
    (action: string) => {
      if (!contextMenu) {
        return;
      }
      const { node } = contextMenu;

      switch (action) {
        case "export_data":
          if (
            DATA_BROWSER_CAPABILITIES.actions.singleObjectExport &&
            node.metadata.objectRef
          ) {
            openModal({
              params: {
                connectionId: node.connectionId,
                databaseName: node.metadata.database ?? "",
                objectRef: node.metadata.objectRef,
                schema: node.metadata.schema ?? null,
                tableName: node.name,
              },
              type: "export_data",
            });
          }
          break;
        case "export_collection":
          if (
            DATA_BROWSER_CAPABILITIES.actions.singleObjectExport &&
            node.metadata.objectRef
          ) {
            openModal({
              params: {
                collectionName: node.name,
                connectionId: node.connectionId,
                databaseName: node.metadata.database ?? "",
                objectRef: node.metadata.objectRef,
              },
              type: "export_collection",
            });
          }
          break;
        case "export_redis_key":
          if (
            DATA_BROWSER_CAPABILITIES.actions.singleObjectExport &&
            node.metadata.objectRef
          ) {
            openModal({
              params: {
                connectionId: node.connectionId,
                databaseName: node.metadata.database ?? "",
                keyName: node.name,
                objectRef: node.metadata.objectRef,
              },
              type: "export_redis_key",
            });
          }
          break;
        case "refresh":
          if (expandedItems.has(node.id)) {
            fetchNodeChildren(node);
          } else if (EXPANDABLE_TYPES.has(node.type)) {
            toggleItem(node);
          } else if (node.type === "collection") {
            triggerCollectionRefresh();
          } else if (
            node.type === "table" ||
            node.type === "view" ||
            node.type === "redis_key"
          ) {
            triggerTableRefresh();
          }
          break;
      }

      setContextMenu(null);
    },
    [
      contextMenu,
      expandedItems,
      fetchNodeChildren,
      openModal,
      toggleItem,
      triggerCollectionRefresh,
      triggerTableRefresh,
    ]
  );

  const contextMenuItems = (() => {
    if (!contextMenu) {
      return [];
    }

    const { node } = contextMenu;
    const callbacks = {
      onAction: handleContextMenuAction,
    };
    const connectionType =
      connections.find((connection) => connection.id === node.connectionId)
        ?.type ?? "POSTGRES";

    switch (node.type) {
      case "connection":
        return getConnectionMenuItems(connectionType, callbacks);
      case "database":
        return getDatabaseMenuItems(connectionType, callbacks);
      case "schema":
        return getSchemaMenuItems(callbacks);
      case "table_folder":
        return getTableFolderMenuItems(callbacks);
      case "view_folder":
        return getViewFolderMenuItems(callbacks);
      case "table":
        return getTableMenuItems(connectionType, callbacks);
      case "view":
        return getViewMenuItems(callbacks);
      case "collection":
        return getCollectionMenuItems(callbacks);
      case "redis_keys_folder":
        return getRedisKeysFolderMenuItems(callbacks);
      case "redis_key":
        return getRedisKeyMenuItems(callbacks);
      default:
        return [];
    }
  })();

  return (
    <div
      className="flex h-full w-full flex-col border-sidebar-border border-r"
      data-qa-module="database"
      data-qa-object="sidebar"
      data-qa-state={
        Object.values(isLoading).some(Boolean) ? "loading" : "ready"
      }
      data-testid="database.sidebar"
    >
      <div
        className="flex shrink-0 items-center px-4 pt-5 pb-2"
        data-qa-module="database"
        data-qa-object="sidebar-header"
        data-testid="database.sidebar.header"
      >
        <span className="font-medium text-sidebar-foreground text-xl">
          {"Database"}
        </span>
      </div>

      <div
        className="flex-1 overflow-y-auto p-2"
        data-qa-module="database"
        data-qa-object="connection-tree"
        data-qa-state={connections.length > 0 ? "ready" : "empty"}
        data-testid="database.sidebar.tree"
      >
        {connections.map((connection) => (
          <TreeNodeProvider
            key={connection.id}
            value={{
              connectionDbType: connection.type,
              onContextMenu: handleContextMenu,
              onItemClick: handleItemClick,
              onToggle: toggleItem,
              selectedItemId: selectedItem?.id ?? null,
            }}
          >
            <TreeNode depth={0} node={connectionToNode(connection)} />
          </TreeNodeProvider>
        ))}
      </div>

      {contextMenu && (
        <ContextMenu
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
          x={contextMenu.x}
          y={contextMenu.y}
        />
      )}

      <SidebarModals
        activeModal={activeModal}
        alert={alert}
        closeAlert={closeAlert}
        closeModal={closeModal}
        refreshNode={refreshNode}
      />
    </div>
  );
}

export function Sidebar() {
  return (
    <SidebarTreeProvider>
      <SidebarInner />
    </SidebarTreeProvider>
  );
}
