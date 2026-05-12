"use client";

import { memo } from "react";

export const WorkloadLogsCanvasPanel = memo(function WorkloadLogsCanvasPanel() {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-2">
      <p className="text-muted-foreground text-sm">Log stream not connected.</p>
    </div>
  );
});

WorkloadLogsCanvasPanel.displayName = "WorkloadLogsCanvasPanel";
