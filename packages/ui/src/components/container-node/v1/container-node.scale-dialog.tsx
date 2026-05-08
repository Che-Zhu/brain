"use client";

import { Dialog, DialogContent } from "@workspace/ui/components/dialog";
import { ScaleSlider } from "@workspace/ui/components/scale-slider/scale-slider";
import { cn } from "@workspace/ui/lib/utils";
import { useEffect, useMemo, useState } from "react";

export interface ContainerNodeScaleDialogPanelProps {
  className?: string;
  draft: number;
  max: number;
  onDraftChange: (next: number) => void;
  onScale?: (nextReplicas: number) => void;
}

/** In-flow scale controls (no portal). Use in previews or custom layouts. */
export function ContainerNodeScaleDialogPanel({
  className,
  draft,
  max,
  onDraftChange,
  onScale,
}: ContainerNodeScaleDialogPanelProps) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center p-6", className)}
    >
      <ScaleSlider.Root
        max={max}
        maxDecimals={0}
        min={0}
        onValueChange={onDraftChange}
        step={1}
        value={draft}
        valueDisplay="number"
      >
        <ScaleSlider.Stack className="w-full max-w-xs">
          <ScaleSlider.Header>
            <ScaleSlider.Label>Replicas</ScaleSlider.Label>
            <ScaleSlider.Value />
          </ScaleSlider.Header>
          <ScaleSlider.Control
            onValueCommit={(vals) => {
              const n = vals[0];
              if (n !== undefined) {
                onScale?.(n);
              }
            }}
          >
            <ScaleSlider.Track>
              <ScaleSlider.Range />
            </ScaleSlider.Track>
            <ScaleSlider.Thumb />
          </ScaleSlider.Control>
        </ScaleSlider.Stack>
      </ScaleSlider.Root>
    </div>
  );
}

ContainerNodeScaleDialogPanel.displayName = "ContainerNodeScaleDialogPanel";

export interface ContainerNodeScaleDialogProps {
  /** Upper bound for the slider (defaults to at least 20 and the current draft). */
  maxReplicas?: number;
  onOpenChange: (open: boolean) => void;
  /** Called when the user releases the thumb with a new replica count. */
  onScale?: (nextReplicas: number) => void;
  open: boolean;
  /** Current replica count when the dialog opens or `replicas` updates while open. */
  replicas: number;
}

export function ContainerNodeScaleDialog({
  open,
  onOpenChange,
  replicas,
  onScale,
  maxReplicas: maxReplicasProp,
}: ContainerNodeScaleDialogProps) {
  const [draft, setDraft] = useState(replicas);

  useEffect(() => {
    if (open) {
      setDraft(replicas);
    }
  }, [open, replicas]);

  const scaleMax = useMemo(
    () => maxReplicasProp ?? Math.max(20, replicas, draft, 1),
    [draft, maxReplicasProp, replicas]
  );

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="gap-0 p-0 sm:max-w-sm"
        closeButtonClassName="top-2 right-2 size-5"
      >
        <ContainerNodeScaleDialogPanel
          draft={draft}
          max={scaleMax}
          onDraftChange={setDraft}
          onScale={onScale}
        />
      </DialogContent>
    </Dialog>
  );
}

ContainerNodeScaleDialog.displayName = "ContainerNodeScaleDialog";
