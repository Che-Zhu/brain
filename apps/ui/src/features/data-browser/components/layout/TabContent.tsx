import { CollectionDetailView } from "@data-browser/components/database/mongodb/CollectionDetailView";
import { RedisKeyDetailView } from "@data-browser/components/database/redis/RedisKeyDetailView";
import { TableDetailView } from "@data-browser/components/database/sql/TableDetailView";
import { SQLEditorView } from "@data-browser/components/editor/SQLEditorView";
import { useI18n } from "@data-browser/i18n/useI18n";
import { type Tab, useTabStore } from "@data-browser/stores/useTabStore";
import { Database } from "lucide-react";
import { useMemo } from "react";

export function TabContent() {
  const { tabs, activeTabId, updateTab } = useTabStore();
  const { t } = useI18n();

  const activeTab = useMemo(() => {
    return tabs.find((t) => t.id === activeTabId);
  }, [tabs, activeTabId]);

  // When no tabs are open, show empty state
  if (!activeTab) {
    return (
      <div
        className="flex flex-1 flex-col items-center justify-center bg-muted/10 text-muted-foreground"
        data-qa-module="layout"
        data-qa-object="tab-content"
        data-qa-state="empty"
        data-testid="layout.tab-content.empty"
      >
        <Database className="mb-4 h-16 w-16 opacity-20" />
        <p className="font-medium text-lg">{t("layout.empty.noTabsTitle")}</p>
        <p className="text-sm">{t("layout.empty.noTabsDescription")}</p>
      </div>
    );
  }

  // Render content based on tab type
  const renderTabContent = (tab: Tab) => {
    switch (tab.type) {
      case "query":
        return (
          <SQLEditorView
            context={{
              connectionId: tab.connectionId,
              databaseName: tab.databaseName,
              schemaName: tab.schemaName,
            }}
            initialSql={tab.sqlContent}
            key={tab.id}
            onSqlChange={(sql) => {
              updateTab(tab.id, { sqlContent: sql, isDirty: true });
            }}
            tabId={tab.id}
          />
        );
      case "table":
        if (!(tab.databaseName && tab.tableName && tab.objectRef)) {
          return (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              {t("layout.invalid.tableConfig")}
            </div>
          );
        }
        return (
          <TableDetailView
            connectionId={tab.connectionId}
            databaseName={tab.databaseName}
            key={tab.id}
            objectRef={tab.objectRef}
            schema={tab.schemaName}
            tableName={tab.tableName}
          />
        );
      case "collection":
        if (!(tab.databaseName && tab.collectionName && tab.objectRef)) {
          return (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              {t("layout.invalid.collectionConfig")}
            </div>
          );
        }
        return (
          <CollectionDetailView
            collectionName={tab.collectionName}
            connectionId={tab.connectionId}
            databaseName={tab.databaseName}
            key={tab.id}
            objectRef={tab.objectRef}
          />
        );
      case "redis_key_detail":
        if (!(tab.databaseName && tab.tableName && tab.objectRef)) {
          return (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              {t("layout.invalid.tableConfig")}
            </div>
          );
        }
        return (
          <RedisKeyDetailView
            connectionId={tab.connectionId}
            databaseName={tab.databaseName}
            key={tab.id}
            keyName={tab.tableName}
            objectRef={tab.objectRef}
          />
        );
      default:
        return (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            {t("layout.invalid.unknownTabType")}
          </div>
        );
    }
  };

  // Render all tabs but only show the active one
  // This preserves state for inactive tabs
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden p-2 pt-0">
      {tabs.map((tab) => (
        <div
          className={
            tab.id === activeTabId
              ? "flex flex-1 flex-col overflow-hidden rounded-lg border border-border bg-background"
              : "hidden"
          }
          data-qa-connection-id={tab.connectionId}
          data-qa-database={tab.databaseName}
          data-qa-module="layout"
          data-qa-object="tab-content"
          data-qa-resource-id={tab.id}
          data-qa-resource-type="tab"
          data-qa-schema={tab.schemaName}
          data-qa-state={tab.id === activeTabId ? "active" : "inactive"}
          data-qa-tab-type={tab.type}
          data-testid="layout.tab-content.panel"
          key={tab.id}
        >
          {renderTabContent(tab)}
        </div>
      ))}
    </div>
  );
}
