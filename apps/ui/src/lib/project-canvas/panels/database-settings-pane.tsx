"use client";

import { useDbSettingsOperations } from "@workspace/api/hooks";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import type { DatabaseNodeStatus } from "@workspace/ui/components/database-node/database-node";
import { ScaleSlider } from "@workspace/ui/components/scale-slider/scale-slider";
import { Separator } from "@workspace/ui/components/separator";
import { cn } from "@workspace/ui/lib/utils";
import { Layers, Settings, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import type { CanvasDatabaseNodeData } from "@/lib/project-canvas/nodes/types";
import {
  buildDbSettingsPatch,
  type DatabaseSettingsDraft,
  DB_SETTINGS_REPLICAS,
  dbSettingsDraftFromNodeData,
  dbSettingsDraftIsDirty,
  normalizeDbSettingsReplicas,
} from "./database-settings-draft";

interface DatabaseSettingsPaneProps {
  data: CanvasDatabaseNodeData;
  kubeconfig?: string;
  onClose: () => void;
  onUpdated?: () => Promise<unknown>;
}

function statusPillClassName(status: DatabaseNodeStatus | undefined) {
  switch (status?.tone?.trim().toLowerCase() ?? status?.label.toLowerCase()) {
    case "running":
    case "ready":
      return "bg-database-metrics-status-running text-primary";
    case "failed":
    case "error":
      return "bg-destructive/25 text-destructive";
    case "paused":
    case "stopped":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-primary/10 text-primary";
  }
}

function engineSubtitle({
  displayEngine,
  formattedVersion,
}: CanvasDatabaseNodeData["states"]) {
  return `${displayEngine}${formattedVersion ? ` ${formattedVersion}` : ""}`;
}

export function DatabaseSettingsPane({
  data,
  kubeconfig,
  onClose,
  onUpdated,
}: DatabaseSettingsPaneProps) {
  const readOnly = data.settingsAccess?.readOnly === true;
  const shareToken = data.settingsAccess?.shareToken?.trim() ?? "";
  const original = useMemo(() => dbSettingsDraftFromNodeData(data), [data]);
  const [draft, setDraft] = useState<DatabaseSettingsDraft>(original);

  useEffect(() => {
    setDraft(original);
  }, [original]);

  const { isUpdating, updateSettings } = useDbSettingsOperations({
    kubeconfig: readOnly ? undefined : kubeconfig,
    shareToken: readOnly ? undefined : shareToken,
  });

  const workload = data.workload;
  const updating = isUpdating(workload);
  const dirty = dbSettingsDraftIsDirty(original, draft);
  const canUpdate = !readOnly && dirty && !updating;
  const statusLabel = data.states.status?.label ?? "Unknown";
  const subtitle = engineSubtitle(data.states);

  const handleCancel = useCallback(() => {
    setDraft(original);
  }, [original]);

  const handleUpdate = useCallback(async () => {
    const patch = buildDbSettingsPatch(original, draft);
    if (patch === null) {
      return;
    }
    try {
      await updateSettings(workload, patch);
      toast.success("Database settings updated.");
      await onUpdated?.();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not update database settings."
      );
    }
  }, [draft, onUpdated, original, updateSettings, workload]);

  return (
    <aside className="database-metrics-pane-surface pointer-events-auto absolute top-0 right-0 bottom-0 z-20 flex w-full min-w-0 max-w-xl flex-col gap-6 overflow-hidden px-2.5 py-5 shadow-lg">
      <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-2.5">
        <header className="flex shrink-0 items-start justify-between gap-3 px-2.5">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Settings
                  aria-hidden
                  className="size-4 shrink-0 text-database-metrics-chart"
                />
                <h2
                  className="truncate font-semibold text-lg text-primary leading-none"
                  title={data.states.name}
                >
                  {data.states.name}
                </h2>
              </div>
              <span
                className={cn(
                  "inline-flex h-5 shrink-0 items-center rounded-full px-2.5 text-xs leading-none",
                  statusPillClassName(data.states.status)
                )}
              >
                {statusLabel}
              </span>
            </div>
            <p className="truncate text-muted-foreground text-sm leading-5">
              {subtitle}
            </p>
          </div>
          <Button
            aria-label="Close database settings"
            className="hoverable -mt-1 size-7 shrink-0"
            onClick={onClose}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X aria-hidden className="size-3.5" />
          </Button>
        </header>

        <section className="flex min-w-0 flex-col gap-5 rounded-lg bg-database-metrics-card p-4">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <h3 className="font-medium text-card-foreground text-sm leading-5">
                Configuration
              </h3>
              <p className="text-muted-foreground text-xs leading-4">
                {dirty ? "Unsaved changes" : "No unsaved changes"}
              </p>
            </div>
            {dirty ? <Badge variant="outline">Draft</Badge> : null}
          </div>

          <Separator />

          <ScaleSlider.Root
            disabled={readOnly || updating}
            max={DB_SETTINGS_REPLICAS.max}
            maxDecimals={0}
            min={DB_SETTINGS_REPLICAS.min}
            onValueChange={(value) => {
              setDraft((current) => ({
                ...current,
                replicas: normalizeDbSettingsReplicas(value),
              }));
            }}
            step={1}
            value={draft.replicas}
            valueDisplay="number"
          >
            <ScaleSlider.Stack className="w-full">
              <ScaleSlider.Header className="min-h-6">
                <ScaleSlider.Group className="min-w-0 gap-2">
                  <ScaleSlider.Icon className="shrink-0" icon={Layers} />
                  <ScaleSlider.Label className="text-card-foreground">
                    Replicas
                  </ScaleSlider.Label>
                </ScaleSlider.Group>
                <div className="flex h-6 min-w-0 items-center justify-end">
                  <ScaleSlider.Value />
                </div>
              </ScaleSlider.Header>
              <ScaleSlider.Control aria-label="Database replica count">
                <ScaleSlider.Track>
                  <ScaleSlider.Range />
                </ScaleSlider.Track>
                <ScaleSlider.Thumb />
              </ScaleSlider.Control>
            </ScaleSlider.Stack>
          </ScaleSlider.Root>

          <div className="flex shrink-0 items-center justify-end gap-2">
            <Button
              disabled={!dirty || updating}
              onClick={handleCancel}
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button disabled={!canUpdate} onClick={handleUpdate} type="button">
              Update
            </Button>
          </div>
        </section>
      </div>
    </aside>
  );
}
