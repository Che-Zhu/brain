"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

const DELETE_TITLE = "Delete workload?";

function WorkloadDeleteCopy({
  kind,
  name,
}: {
  kind?: string;
  name: string;
}) {
  const k = kind?.trim();
  return (
    <>
      This will delete{" "}
      <span className="font-medium text-foreground">{name}</span>
      {k != null && k !== "" ? (
        <>
          {" "}
          (<span className="font-mono">{k}</span>)
        </>
      ) : null}{" "}
      from the cluster. This cannot be undone.
    </>
  );
}

export interface ContainerNodeDeleteDialogPanelProps {
  className?: string;
  kind?: string;
  name: string;
  onCancel: () => void;
  onConfirmDelete?: () => void;
}

/** In-flow panel (no portal). Use in previews or custom layouts. */
export function ContainerNodeDeleteDialogPanel({
  className,
  kind,
  name,
  onCancel,
  onConfirmDelete,
}: ContainerNodeDeleteDialogPanelProps) {
  return (
    <div
      className={cn(
        "grid w-full max-w-md gap-6 rounded-xl bg-background p-6 text-sm ring-1 ring-foreground/10",
        className
      )}
    >
      <div className="flex flex-col gap-2">
        <h3 className="font-medium leading-none">{DELETE_TITLE}</h3>
        <p className="text-balance text-muted-foreground text-sm md:text-pretty">
          <WorkloadDeleteCopy kind={kind} name={name} />
        </p>
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button onClick={onCancel} variant="outline">
          Cancel
        </Button>
        <Button
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          onClick={() => {
            onConfirmDelete?.();
          }}
          type="button"
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
  /** Shown in monospace after the name (e.g. `AP`, `DB`), like project resource id. */
  kind?: string;
  onConfirmDelete?: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export function ContainerNodeDeleteDialog({
  open,
  onOpenChange,
  kind,
  name,
  onConfirmDelete,
}: ContainerNodeDeleteDialogProps) {
  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent data-slot="container-node-delete-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>{DELETE_TITLE}</AlertDialogTitle>
          <AlertDialogDescription>
            <WorkloadDeleteCopy kind={kind} name={name} />
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              onConfirmDelete?.();
              onOpenChange(false);
            }}
            type="button"
            variant="destructive"
          >
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

ContainerNodeDeleteDialog.displayName = "ContainerNodeDeleteDialog";
