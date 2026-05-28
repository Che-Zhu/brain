import { Button } from "@data-browser/components/ui/Button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@data-browser/components/ui/tooltip";
import { useI18n } from "@data-browser/i18n/useI18n";
import { cn } from "@data-browser/lib/utils";
import { Download, RefreshCw } from "lucide-react";
import { useTableView } from "./TableViewProvider";

interface TableViewToolbarProps {
  connectionId: string;
  databaseName: string;
  schema?: string;
  tableName: string;
}

export function TableViewToolbar({
  connectionId,
  databaseName,
  tableName,
  schema,
}: TableViewToolbarProps) {
  const { t } = useI18n();
  const { state, actions } = useTableView();
  return (
    <div
      className="flex h-12 items-center justify-between px-2"
      data-qa-connection-id={connectionId}
      data-qa-database={databaseName}
      data-qa-module="sql"
      data-qa-object="table-toolbar"
      data-qa-resource-id={tableName}
      data-qa-resource-type="table"
      data-qa-schema={schema}
      data-qa-state={
        state.loading ? "loading" : state.hasPendingChanges ? "dirty" : "ready"
      }
      data-testid="sql.table.toolbar"
    >
      <div className="flex items-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-qa-action="refresh"
              data-qa-disabled-reason={state.loading ? "loading" : undefined}
              data-qa-module="sql"
              data-qa-object="table-data"
              data-qa-state={state.loading ? "loading" : "ready"}
              data-testid="sql.table.refresh-button"
              disabled={state.loading}
              onClick={actions.refresh}
              size="icon"
              variant="ghost"
            >
              <RefreshCw
                className={cn("h-4 w-4", state.loading && "animate-spin")}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("common.actions.refresh")}</TooltipContent>
        </Tooltip>
      </div>
      <div className="flex items-center gap-2">
        <Button
          className="min-w-[86px] gap-2.5 rounded-lg"
          data-qa-action="export"
          data-qa-module="sql"
          data-qa-object="table-data"
          data-testid="sql.table.export-button"
          onClick={() => actions.setShowExportModal(true)}
        >
          <Download className="h-4 w-4" />
          {t("common.actions.export")}
        </Button>
      </div>
    </div>
  );
}
