"use client";

import type { TimeRange } from "@shadcn/ui/time-range-selector";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { type LogsData, LogViewerProvider } from "./log-viewer-context";
import { LogViewerCountChart } from "./log-viewer-count-chart";
import { LogViewerListContent, LogViewerListHeader } from "./log-viewer-list";
import { LogViewerToolbar } from "./log-viewer-toolbar";

function LogViewerRoot({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-1 flex-col gap-2 overflow-hidden p-1",
        className
      )}
      data-slot="log-viewer"
    >
      {children}
    </div>
  );
}

function LogViewerList({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border",
        className
      )}
      data-slot="log-viewer-list"
    >
      {children}
    </div>
  );
}

function LogViewerVariant0({
  logs,
  className,
  onRefresh,
  timeRange,
  onTimeRangeChange,
  searchQuery,
  onSearchQueryChange,
}: {
  logs: LogsData;
  className?: string;
  onRefresh?: () => void;
  timeRange?: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
  searchQuery?: string;
  onSearchQueryChange?: (q: string) => void;
}) {
  return (
    <LogViewerProvider
      externalSearchQuery={searchQuery}
      externalTimeRange={timeRange}
      logs={logs}
      onRefresh={onRefresh}
      onSearchQueryChange={onSearchQueryChange}
      onTimeRangeChange={onTimeRangeChange}
    >
      <LogViewerRoot className={className}>
        <LogViewerToolbar />
        <LogViewerCountChart />
        <LogViewerList>
          <LogViewerListHeader />
          <LogViewerListContent />
        </LogViewerList>
      </LogViewerRoot>
    </LogViewerProvider>
  );
}

export const LogViewer = {
  Provider: LogViewerProvider,
  Root: LogViewerRoot,
  Toolbar: LogViewerToolbar,
  CountChart: LogViewerCountChart,
  List: LogViewerList,
  ListHeader: LogViewerListHeader,
  ListContent: LogViewerListContent,
  Variant0: LogViewerVariant0,
};
