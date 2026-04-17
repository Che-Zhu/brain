"use client";

import { Box, Download, Search, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FacetedFilterAll } from "@shadcn/ui/faceted";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@shadcn/ui/input-group";
import { LivePauseToggle } from "@shadcn/ui/refresh-controls";
import { TimeRangeSelector } from "@shadcn/ui/time-range-selector";
import { type LogEntry, useLogViewerContext } from "./log-viewer-context";

export function LogViewerToolbar() {
  const {
    searchQuery,
    setSearchQuery,
    isLive,
    setIsLive,
    filteredEntries,
    timeRange,
    setTimeRange,
    selectedPods,
    setSelectedPods,
    uniquePods,
    selectedContainers,
    setSelectedContainers,
    uniqueContainers,
  } = useLogViewerContext();

  return (
    <div className="flex items-center gap-2" data-slot="log-viewer-toolbar">
      {/* Filters */}
      <div className="flex items-center gap-1">
        <FacetedFilterAll
          className="w-28 border-0 shadow-none"
          emptyText="No pods found."
          icon={<Server />}
          label="Pod"
          onValueChange={setSelectedPods}
          options={uniquePods}
          searchPlaceholder="Search pods..."
          showLabel={false}
          value={selectedPods}
        />
        <FacetedFilterAll
          className="w-28 border-0 shadow-none"
          emptyText="No containers found."
          icon={<Box />}
          label="Container"
          onValueChange={setSelectedContainers}
          options={uniqueContainers}
          searchPlaceholder="Search containers..."
          showLabel={false}
          value={selectedContainers}
        />
        <TimeRangeSelector
          className="border-0 shadow-none"
          onChange={setTimeRange}
          value={timeRange}
        />
      </div>

      {/* Search + Actions */}
      <div className="flex flex-1 items-center gap-2">
        <InputGroup className="h-8 flex-1 dark:bg-muted/50">
          <InputGroupAddon>
            <Search className="size-4" />
          </InputGroupAddon>
          <InputGroupInput
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search logs..."
            value={searchQuery}
          />
        </InputGroup>
        <LivePauseToggle isLive={isLive} onToggle={() => setIsLive(!isLive)} />
        <Button
          onClick={() => downloadLogs(filteredEntries)}
          size="icon-sm"
          variant="outline"
        >
          <Download className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function downloadLogs(entries: LogEntry[]) {
  const header = "time\tpod\tcontainer\tmessage";
  const lines = entries.map(
    (e) => `${e.time}\t${e.pod}\t${e.container}\t${e.message}`
  );
  const blob = new Blob([`${header}\n${lines.join("\n")}`], {
    type: "text/plain",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `logs-${new Date().toISOString().slice(0, 19)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
