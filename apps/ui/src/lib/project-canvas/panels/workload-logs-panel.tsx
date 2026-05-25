"use client";

import type { Node } from "@xyflow/react";
import { ScrollText } from "lucide-react";
import { memo } from "react";

import { containerStatesFromNode } from "@/lib/project-canvas/flow/container-node-workload";
import { CanvasResourcePane } from "./canvas-resource-pane";

export const WorkloadLogsPane = memo(function WorkloadLogsPane({
  node,
  onClose,
}: {
  node: Node;
  onClose: () => void;
}) {
  const states = containerStatesFromNode(node);
  const title =
    states?.name === "" || states?.name == null ? "Logs" : states.name;

  return (
    <CanvasResourcePane
      closeAriaLabel="Close workload logs"
      icon={
        <ScrollText
          aria-hidden
          className="size-4 shrink-0 text-database-metrics-chart"
        />
      }
      onClose={onClose}
      subtitle={states?.kind ?? "Workload"}
      title={`${title} Logs`}
    >
      <p className="text-muted-foreground text-sm">Log stream not connected.</p>
    </CanvasResourcePane>
  );
});

WorkloadLogsPane.displayName = "WorkloadLogsPane";
