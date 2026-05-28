import { Button } from "@data-browser/components/ui/Button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@data-browser/components/ui/tooltip";
import { cn } from "@data-browser/lib/utils";
import { Download, RefreshCw } from "lucide-react";
import { useTableView } from "./TableViewProvider";

interface TableViewToolbarProps {
  databaseName: string;
  dbServiceKey: string;
  schema?: string;
  tableName: string;
}

export function TableViewToolbar({
  databaseName,
  dbServiceKey,
  tableName,
  schema,
}: TableViewToolbarProps) {
  const { state, actions } = useTableView();
  return (
    <div
      className="flex h-11 items-center justify-between px-2"
      data-qa-database={databaseName}
      data-qa-db-service-key={dbServiceKey}
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
      <div className="flex items-center gap-1">
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
          <TooltipContent>{"Refresh"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-label="Export"
              data-qa-action="export"
              data-qa-module="sql"
              data-qa-object="table-data"
              data-testid="sql.table.export-button"
              onClick={() => actions.setShowExportModal(true)}
              size="icon"
              variant="ghost"
            >
              <Download className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{"Export"}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
