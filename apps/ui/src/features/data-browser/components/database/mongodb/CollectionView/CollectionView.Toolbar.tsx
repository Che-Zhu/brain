import { Button } from "@data-browser/components/ui/Button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@data-browser/components/ui/tooltip";
import { cn } from "@data-browser/lib/utils";
import { Download, RefreshCw } from "lucide-react";
import { useCollectionView } from "./CollectionViewProvider";

interface CollectionViewToolbarProps {
  collectionName: string;
  connectionId: string;
  databaseName: string;
}

export function CollectionViewToolbar({
  connectionId,
  databaseName,
  collectionName,
}: CollectionViewToolbarProps) {
  const { state, actions } = useCollectionView();
  return (
    <div
      className="flex h-12 items-center justify-between px-2"
      data-qa-connection-id={connectionId}
      data-qa-database={databaseName}
      data-qa-module="mongodb"
      data-qa-object="collection-toolbar"
      data-qa-resource-id={collectionName}
      data-qa-resource-type="collection"
      data-qa-state={
        state.loading ? "loading" : state.hasPendingChanges ? "dirty" : "ready"
      }
      data-testid="mongodb.collection.toolbar"
    >
      <div className="flex items-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-qa-action="refresh"
              data-qa-disabled-reason={state.loading ? "loading" : undefined}
              data-qa-module="mongodb"
              data-qa-object="collection-data"
              data-qa-state={state.loading ? "loading" : "ready"}
              data-testid="mongodb.collection.refresh-button"
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
      </div>
      <div className="flex items-center gap-2">
        <Button
          className="min-w-[86px] gap-2.5 rounded-lg"
          data-qa-action="export"
          data-qa-module="mongodb"
          data-qa-object="collection-data"
          data-testid="mongodb.collection.export-button"
          onClick={() => actions.setShowExportModal(true)}
        >
          <Download className="h-4 w-4" />
          {"Export"}
        </Button>
      </div>
    </div>
  );
}
