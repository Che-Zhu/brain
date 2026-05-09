"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import type { SyntheticEvent } from "react";

const DELETE_TITLE = "Delete container?";

function stopCanvasNodeClick(e: SyntheticEvent) {
  e.stopPropagation();
}

function deleteDescriptionText(name: string) {
  return `This will permanently delete "${name}". This action cannot be undone.`;
}

export interface ContainerNodeDeleteDialogPanelProps {
  className?: string;
  name: string;
  onCancel: () => void;
  onConfirmDelete?: () => void;
}

/** In-flow panel (no portal). Use in previews or custom layouts. */
export function ContainerNodeDeleteDialogPanel({
  className,
  name,
  onCancel,
  onConfirmDelete,
}: ContainerNodeDeleteDialogPanelProps) {
  return (
    <div
      className={cn(
        "grid w-full max-w-xs gap-6 rounded-xl bg-background p-6 ring-1 ring-foreground/10",
        className
      )}
    >
      <div className="grid grid-rows-[auto_1fr] place-items-center gap-1.5 text-center">
        <h3 className="font-medium text-lg">{DELETE_TITLE}</h3>
        <p className="text-balance text-muted-foreground text-sm md:text-pretty">
          {deleteDescriptionText(name)}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:justify-end">
        <Button className="text-xs" onClick={onCancel} variant="outline">
          Cancel
        </Button>
        <Button
          className="text-xs"
          onClick={() => {
            onConfirmDelete?.();
          }}
          variant="destructive"
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

ContainerNodeDeleteDialogPanel.displayName = "ContainerNodeDeleteDialogPanel";

export interface ContainerNodeDeleteDialogProps {
  /** Workload display name shown in the copy. */
  name: string;
  onConfirmDelete?: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export function ContainerNodeDeleteDialog({
  open,
  onOpenChange,
  name,
  onConfirmDelete,
}: ContainerNodeDeleteDialogProps) {
  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{DELETE_TITLE}</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete &quot;{name}&quot;. This action cannot
            be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            className="text-xs"
            onClick={stopCanvasNodeClick}
            onPointerDown={stopCanvasNodeClick}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className="text-xs"
            onClick={(event) => {
              stopCanvasNodeClick(event);
              onConfirmDelete?.();
              onOpenChange(false);
            }}
            onPointerDown={stopCanvasNodeClick}
            variant="destructive"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

ContainerNodeDeleteDialog.displayName = "ContainerNodeDeleteDialog";
