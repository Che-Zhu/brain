"use client";

import type { TimeRange } from "@shadcn/ui/time-range-selector";
import {
  createContext,
  use,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export interface LogEntry {
  time: string;
  message: string;
  pod: string;
  container: string;
  stream: string;
  node: string;
}

export type LogsData = LogEntry[];

interface LogViewerContextValue {
  entries: LogEntry[];
  filteredEntries: LogEntry[];
  selectedPods: string[];
  setSelectedPods: (pods: string[]) => void;
  uniquePods: string[];
  selectedContainers: string[];
  setSelectedContainers: (containers: string[]) => void;
  uniqueContainers: string[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  isLive: boolean;
  setIsLive: (v: boolean) => void;
  onRefresh?: () => void;
}

const LogViewerContext = createContext<LogViewerContextValue | null>(null);

export function useLogViewerContext() {
  const ctx = use(LogViewerContext);
  if (!ctx) {
    throw new Error(
      "LogViewer compound components must be used within LogViewer.Provider"
    );
  }
  return ctx;
}

export function LogViewerProvider({
  logs,
  children,
  onRefresh,
  externalTimeRange,
  onTimeRangeChange,
  externalSearchQuery,
  onSearchQueryChange,
}: {
  logs: LogsData;
  children: React.ReactNode;
  onRefresh?: () => void;
  externalTimeRange?: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
  externalSearchQuery?: string;
  onSearchQueryChange?: (q: string) => void;
}) {
  const [selectedPods, setSelectedPods] = useState<string[]>([]);
  const [selectedContainers, setSelectedContainers] = useState<string[]>([]);
  const [internalSearchQuery, setInternalSearchQuery] = useState("");
  const [internalTimeRange, setInternalTimeRange] = useState<TimeRange>({
    mode: "quick",
    ms: 5 * 60_000,
  });
  const [isLive, setIsLive] = useState(true);

  // Controlled-or-uncontrolled pattern
  const searchQuery =
    externalSearchQuery !== undefined
      ? externalSearchQuery
      : internalSearchQuery;
  const setSearchQuery = onSearchQueryChange ?? setInternalSearchQuery;
  const timeRange = externalTimeRange ?? internalTimeRange;
  const setTimeRange = onTimeRangeChange ?? setInternalTimeRange;
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (!(isLive && onRefreshRef.current)) {
      return;
    }
    const id = setInterval(() => {
      onRefreshRef.current?.();
    }, 3000);
    return () => clearInterval(id);
  }, [isLive]);

  const uniquePods = useMemo(
    () => [...new Set(logs.map((e) => e.pod))].sort(),
    [logs]
  );

  const uniqueContainers = useMemo(
    () => [...new Set(logs.map((e) => e.container))].sort(),
    [logs]
  );

  const filteredEntries = useMemo(() => {
    let result = logs;
    // Time range filter
    if (timeRange.mode === "quick") {
      const cutoff = new Date(Date.now() - timeRange.ms).toISOString();
      result = result.filter((e) => e.time >= cutoff);
    } else {
      const start = timeRange.start.toISOString();
      const end = timeRange.end.toISOString();
      result = result.filter((e) => e.time >= start && e.time <= end);
    }
    if (selectedPods.length > 0) {
      result = result.filter((e) => selectedPods.includes(e.pod));
    }
    if (selectedContainers.length > 0) {
      result = result.filter((e) => selectedContainers.includes(e.container));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((e) => e.message.toLowerCase().includes(q));
    }
    return result;
  }, [logs, timeRange, selectedPods, selectedContainers, searchQuery]);

  const value: LogViewerContextValue = useMemo(
    () => ({
      entries: logs,
      filteredEntries,
      selectedPods,
      setSelectedPods,
      uniquePods,
      selectedContainers,
      setSelectedContainers,
      uniqueContainers,
      searchQuery,
      setSearchQuery,
      timeRange,
      setTimeRange,
      isLive,
      setIsLive,
      onRefresh,
    }),
    [
      logs,
      filteredEntries,
      selectedPods,
      uniquePods,
      selectedContainers,
      uniqueContainers,
      searchQuery,
      setSearchQuery,
      timeRange,
      setTimeRange,
      isLive,
      onRefresh,
    ]
  );

  return (
    <LogViewerContext.Provider value={value}>
      {children}
    </LogViewerContext.Provider>
  );
}
