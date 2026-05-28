"use client";

import { Button } from "@workspace/ui/components/button";
import { Database, X } from "lucide-react";
import { useEffect } from "react";

import { DataBrowserPane } from "@/features/data-browser/DataBrowserPane";
import type { CanvasDatabaseNodeData } from "@/lib/project-canvas/nodes/types";
import { CANVAS_ACTION } from "@/store/canvas-store";

export interface CanvasActionSurfaceProps {
  action: string | null | undefined;
  dbAccessEnabled?: boolean;
  kubeconfig: string;
  namespace: string;
  onClose: () => void;
  projectUid: string;
  selectedDatabaseData: CanvasDatabaseNodeData | null;
}

export function CanvasActionSurface({
  action,
  dbAccessEnabled = true,
  kubeconfig,
  namespace,
  onClose,
  projectUid,
  selectedDatabaseData,
}: CanvasActionSurfaceProps) {
  const open =
    dbAccessEnabled &&
    action === CANVAS_ACTION.dbAccess &&
    selectedDatabaseData != null;

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  const { states } = selectedDatabaseData;
  const subtitle = `Database ${states.displayEngine}${states.formattedVersion ? ` ${states.formattedVersion}` : ""}`;

  return (
    <section
      aria-label="Canvas action surface"
      className="resource-pane-surface absolute inset-0 z-30 flex min-h-0 min-w-0 flex-col overflow-hidden bg-resource-pane text-resource-pane-foreground"
      data-slot="canvas-action-surface"
    >
      <header className="grid h-13 shrink-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] items-center border-resource-pane-border border-b px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-4 shrink-0 items-center justify-center text-blue-400">
            <Database aria-hidden className="size-4" strokeWidth={2} />
          </span>
          <h2
            className="min-w-0 truncate font-medium text-lg text-resource-pane-foreground leading-none"
            title={states.name}
          >
            {states.name}
          </h2>
        </div>
        <p
          className="min-w-0 truncate px-4 text-center text-resource-pane-primary text-sm leading-5"
          title={subtitle}
        >
          {subtitle}
        </p>
        <div className="flex min-w-0 justify-end">
          <Button
            aria-label="Close canvas action surface"
            className="hoverable size-7 shrink-0 text-resource-pane-muted hover:text-resource-pane-foreground"
            onClick={onClose}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X aria-hidden className="size-4" />
          </Button>
        </div>
      </header>
      <div className="min-h-0 flex-1" data-slot="canvas-action-surface-body">
        <DataBrowserPane
          kubeconfig={kubeconfig}
          namespace={namespace}
          projectUid={projectUid}
          selectedDatabaseData={selectedDatabaseData}
        />
      </div>
    </section>
  );
}
