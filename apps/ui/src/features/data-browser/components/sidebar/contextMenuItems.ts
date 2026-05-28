import { DATA_BROWSER_CAPABILITIES } from "@data-browser/capabilities";
import type { ContextMenuItem } from "@data-browser/components/ui/ContextMenu";
import { Download, RefreshCw } from "lucide-react";
import React from "react";

type ConnectionType = "MYSQL" | "POSTGRES" | "MONGODB" | "REDIS" | "CLICKHOUSE";

interface MenuCallbacks {
  onAction: (action: string) => void;
}

interface SystemObjectsState {
  showSystemObjects: boolean;
  systemSchemas: string[];
}

function refreshItem(onAction: (action: string) => void): ContextMenuItem {
  return {
    icon: React.createElement(RefreshCw, { className: "h-4 w-4" }),
    label: "Refresh",
    onClick: () => onAction("refresh"),
  };
}

function exportItem(
  action: string,
  onAction: (action: string) => void,
  label: string
): ContextMenuItem[] {
  if (!DATA_BROWSER_CAPABILITIES.actions.singleObjectExport) {
    return [];
  }

  return [
    {
      icon: React.createElement(Download, { className: "h-4 w-4" }),
      label,
      onClick: () => onAction(action),
    },
    { separator: true },
  ];
}

export function getConnectionMenuItems(
  _connectionType: ConnectionType,
  callbacks: MenuCallbacks,
  _systemObjectsState?: SystemObjectsState
): ContextMenuItem[] {
  const { onAction } = callbacks;
  return [refreshItem(onAction)];
}

export function getDatabaseMenuItems(
  _connectionType: ConnectionType,
  callbacks: MenuCallbacks,
  _systemObjectsState?: SystemObjectsState
): ContextMenuItem[] {
  const { onAction } = callbacks;
  return [refreshItem(onAction)];
}

export function getSchemaMenuItems(
  callbacks: MenuCallbacks
): ContextMenuItem[] {
  const { onAction } = callbacks;
  return [refreshItem(onAction)];
}

export function getTableFolderMenuItems(
  callbacks: MenuCallbacks
): ContextMenuItem[] {
  const { onAction } = callbacks;
  return [refreshItem(onAction)];
}

export function getViewFolderMenuItems(
  callbacks: MenuCallbacks
): ContextMenuItem[] {
  const { onAction } = callbacks;
  return [refreshItem(onAction)];
}

export function getTableMenuItems(
  _connectionType: ConnectionType,
  callbacks: MenuCallbacks
): ContextMenuItem[] {
  const { onAction } = callbacks;
  return [
    ...exportItem("export_data", onAction, "Export data"),
    refreshItem(onAction),
  ];
}

export function getViewMenuItems(callbacks: MenuCallbacks): ContextMenuItem[] {
  const { onAction } = callbacks;
  return [
    ...exportItem("export_data", onAction, "Export data"),
    refreshItem(onAction),
  ];
}

export function getCollectionMenuItems(
  callbacks: MenuCallbacks
): ContextMenuItem[] {
  const { onAction } = callbacks;
  return [
    ...exportItem("export_collection", onAction, "Export collection"),
    refreshItem(onAction),
  ];
}

export function getRedisKeysFolderMenuItems(
  callbacks: MenuCallbacks
): ContextMenuItem[] {
  const { onAction } = callbacks;
  return [refreshItem(onAction)];
}

export function getRedisKeyMenuItems(
  callbacks: MenuCallbacks
): ContextMenuItem[] {
  const { onAction } = callbacks;
  return [
    ...exportItem("export_redis_key", onAction, "Export key"),
    refreshItem(onAction),
  ];
}
