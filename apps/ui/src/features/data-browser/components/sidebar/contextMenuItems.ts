import { DATA_BROWSER_CAPABILITIES } from "@data-browser/capabilities";
import type { ContextMenuItem } from "@data-browser/components/ui/ContextMenu";
import type { MessageKey } from "@data-browser/i18n/messages";
import { Download, RefreshCw } from "lucide-react";
import React from "react";

type ConnectionType = "MYSQL" | "POSTGRES" | "MONGODB" | "REDIS" | "CLICKHOUSE";

interface MenuCallbacks {
  onAction: (action: string) => void;
  t: (key: MessageKey) => string;
}

interface SystemObjectsState {
  showSystemObjects: boolean;
  systemSchemas: string[];
}

function refreshItem(
  onAction: (action: string) => void,
  t: (key: MessageKey) => string
): ContextMenuItem {
  return {
    icon: React.createElement(RefreshCw, { className: "h-4 w-4" }),
    label: t("sidebar.menu.refresh"),
    onClick: () => onAction("refresh"),
  };
}

function exportItem(
  action: string,
  onAction: (action: string) => void,
  t: (key: MessageKey) => string,
  labelKey: MessageKey
): ContextMenuItem[] {
  if (!DATA_BROWSER_CAPABILITIES.actions.singleObjectExport) {
    return [];
  }

  return [
    {
      icon: React.createElement(Download, { className: "h-4 w-4" }),
      label: t(labelKey),
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
  const { onAction, t } = callbacks;
  return [refreshItem(onAction, t)];
}

export function getDatabaseMenuItems(
  _connectionType: ConnectionType,
  callbacks: MenuCallbacks,
  _systemObjectsState?: SystemObjectsState
): ContextMenuItem[] {
  const { onAction, t } = callbacks;
  return [refreshItem(onAction, t)];
}

export function getSchemaMenuItems(
  callbacks: MenuCallbacks
): ContextMenuItem[] {
  const { onAction, t } = callbacks;
  return [refreshItem(onAction, t)];
}

export function getTableFolderMenuItems(
  callbacks: MenuCallbacks
): ContextMenuItem[] {
  const { onAction, t } = callbacks;
  return [refreshItem(onAction, t)];
}

export function getViewFolderMenuItems(
  callbacks: MenuCallbacks
): ContextMenuItem[] {
  const { onAction, t } = callbacks;
  return [refreshItem(onAction, t)];
}

export function getTableMenuItems(
  _connectionType: ConnectionType,
  callbacks: MenuCallbacks
): ContextMenuItem[] {
  const { onAction, t } = callbacks;
  return [
    ...exportItem("export_data", onAction, t, "sidebar.menu.exportData"),
    refreshItem(onAction, t),
  ];
}

export function getViewMenuItems(callbacks: MenuCallbacks): ContextMenuItem[] {
  const { onAction, t } = callbacks;
  return [
    ...exportItem("export_data", onAction, t, "sidebar.menu.exportData"),
    refreshItem(onAction, t),
  ];
}

export function getCollectionMenuItems(
  callbacks: MenuCallbacks
): ContextMenuItem[] {
  const { onAction, t } = callbacks;
  return [
    ...exportItem(
      "export_collection",
      onAction,
      t,
      "sidebar.menu.exportCollection"
    ),
    refreshItem(onAction, t),
  ];
}

export function getRedisKeysFolderMenuItems(
  callbacks: MenuCallbacks
): ContextMenuItem[] {
  const { onAction, t } = callbacks;
  return [refreshItem(onAction, t)];
}

export function getRedisKeyMenuItems(
  callbacks: MenuCallbacks
): ContextMenuItem[] {
  const { onAction, t } = callbacks;
  return [
    ...exportItem("export_redis_key", onAction, t, "sidebar.menu.exportKey"),
    refreshItem(onAction, t),
  ];
}
