import { Button } from "@data-browser/components/ui/Button";
import { ContextMenu } from "@data-browser/components/ui/ContextMenu";
import { ScrollArea } from "@data-browser/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@data-browser/components/ui/tooltip";
import { useI18n } from "@data-browser/i18n/useI18n";
import { cn } from "@data-browser/lib/utils";
import {
  type Tab,
  type TabType,
  useTabStore,
} from "@data-browser/stores/useTabStore";
import {
  Database,
  FileCode,
  SplitSquareHorizontal,
  Table,
  X,
} from "lucide-react";
import type React from "react";
import { useState } from "react";

function getTabIcon(type: TabType) {
  switch (type) {
    case "query":
      return <FileCode className="h-4 w-4" />;
    case "table":
      return <Table className="h-4 w-4" />;
    case "collection":
      return <Database className="h-4 w-4" />;
    default:
      return <FileCode className="h-4 w-4" />;
  }
}

interface TabItemProps {
  closeTitle: string;
  isActive: boolean;
  onActivate: () => void;
  onClose: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  tab: Tab;
}

function TabItem({
  tab,
  isActive,
  onActivate,
  onClose,
  onContextMenu,
  closeTitle,
}: TabItemProps) {
  return (
    <div
      className={cn(
        "group flex h-9 cursor-pointer select-none items-center gap-1 border-sidebar-border border-r p-2 pl-3 transition-colors duration-150",
        isActive ? "bg-input text-foreground" : "text-foreground hover:bg-muted"
      )}
      data-qa-action="activate"
      data-qa-connection-id={tab.connectionId}
      data-qa-database={tab.databaseName}
      data-qa-module="layout"
      data-qa-object="tab"
      data-qa-resource-id={tab.id}
      data-qa-resource-type="tab"
      data-qa-schema={tab.schemaName}
      data-qa-state={[
        isActive ? "active" : "inactive",
        tab.isDirty ? "dirty" : null,
      ]
        .filter(Boolean)
        .join(" ")}
      data-qa-tab-type={tab.type}
      data-testid="layout.tab.item"
      onClick={onActivate}
      onContextMenu={onContextMenu}
    >
      <span className="mr-1 flex-shrink-0">{getTabIcon(tab.type)}</span>
      <span className="truncate whitespace-nowrap font-normal text-sm">
        {tab.title}
        {tab.isDirty && <span className="ml-1 text-primary">•</span>}
      </span>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className={cn(
              "flex-shrink-0 cursor-pointer text-muted-foreground transition-colors",
              isActive ? "hover:bg-muted-foreground/20" : "hover:bg-input"
            )}
            data-qa-action="close"
            data-qa-module="layout"
            data-qa-object="tab"
            data-qa-resource-id={tab.id}
            data-qa-resource-type="tab"
            data-testid="layout.tab.close-button"
            onClick={onClose}
            size="icon-xs"
            variant="ghost"
          >
            <X className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{closeTitle}</TooltipContent>
      </Tooltip>
    </div>
  );
}

export function TabBar() {
  const {
    tabs,
    activeTabId,
    setActiveTab,
    closeTab,
    closeOtherTabs,
    closeAllTabs,
  } = useTabStore();
  const { t } = useI18n();
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    tabId: string;
  } | null>(null);

  if (tabs.length === 0) {
    return null;
  }

  const handleClose = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    closeTab(tabId);
  };

  const handleContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, tabId });
  };

  const handleMenuAction = (action: "close" | "closeOthers" | "closeAll") => {
    if (!contextMenu) {
      return;
    }

    switch (action) {
      case "close":
        closeTab(contextMenu.tabId);
        break;
      case "closeOthers":
        closeOtherTabs(contextMenu.tabId);
        break;
      case "closeAll":
        closeAllTabs();
        break;
    }
    setContextMenu(null);
  };

  return (
    <ScrollArea
      className="mb-2 border-sidebar-border border-b"
      data-qa-module="layout"
      data-qa-object="tab-bar"
      data-qa-state={tabs.length > 0 ? "ready" : "empty"}
      data-testid="layout.tab-bar"
    >
      <div className="flex items-center pr-2">
        {tabs.map((tab) => (
          <TabItem
            closeTitle={t("layout.tab.close")}
            isActive={tab.id === activeTabId}
            key={tab.id}
            onActivate={() => setActiveTab(tab.id)}
            onClose={(e) => handleClose(e, tab.id)}
            onContextMenu={(e) => handleContextMenu(e, tab.id)}
            tab={tab}
          />
        ))}
      </div>

      {contextMenu && (
        <ContextMenu
          items={[
            {
              label: t("layout.tab.close"),
              onClick: () => handleMenuAction("close"),
              icon: <X className="h-4 w-4" />,
            },
            {
              label: t("layout.tab.closeOthers"),
              onClick: () => handleMenuAction("closeOthers"),
              icon: <SplitSquareHorizontal className="h-4 w-4" />,
            },
            { separator: true } as const,
            {
              label: t("layout.tab.closeAll"),
              onClick: () => handleMenuAction("closeAll"),
              icon: <X className="h-4 w-4" />,
            },
          ]}
          onClose={() => setContextMenu(null)}
          x={contextMenu.x}
          y={contextMenu.y}
        />
      )}
    </ScrollArea>
  );
}
