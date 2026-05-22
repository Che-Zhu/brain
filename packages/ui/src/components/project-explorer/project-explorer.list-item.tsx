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
import { CanvasNodeStatusDot } from "@workspace/ui/components/canvas-node/canvas-node.status";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { cn } from "@workspace/ui/lib/utils";
import { EllipsisVertical, SquarePen, Trash2 } from "lucide-react";
import { type KeyboardEvent, useCallback, useEffect, useState } from "react";

import { useProjectExplorer } from "./project-explorer.context";
import type { ProjectExplorerProject } from "./project-explorer.types";
import { formatCreatedAt, toDate } from "./project-explorer.utils";

function k8sName(project: ProjectExplorerProject): string {
  return project.resourceName ?? project.name;
}

export function ProjectExplorerListItem({
  className,
  project,
}: {
  className?: string;
  project: ProjectExplorerProject;
}) {
  const { actions } = useProjectExplorer();
  const interactive = actions.onProjectClick != null;
  const canRename = actions.onProjectRename != null;
  const canDelete = actions.onProjectDelete != null;
  const showRowMenu = canRename || canDelete;

  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState(project.name);
  const [renameBusy, setRenameBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    if (renameOpen) {
      setRenameDraft(project.name);
    }
  }, [renameOpen, project.name]);

  const created = toDate(project.createdAt);
  const iso = Number.isNaN(created.getTime())
    ? undefined
    : created.toISOString();

  const handleRowActivate = useCallback(() => {
    actions.onProjectClick?.(project);
  }, [actions, project]);

  const handleRowKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleRowActivate();
      }
    },
    [handleRowActivate]
  );

  const submitRename = useCallback(async () => {
    const next = renameDraft.trim();
    if (next === "" || next === project.name) {
      setRenameOpen(false);
      return;
    }
    if (!actions.onProjectRename) {
      return;
    }
    setRenameBusy(true);
    try {
      await actions.onProjectRename(project, next);
      setRenameOpen(false);
    } finally {
      setRenameBusy(false);
    }
  }, [actions, project, renameDraft]);

  const submitDelete = useCallback(async () => {
    if (!actions.onProjectDelete) {
      return;
    }
    setDeleteBusy(true);
    try {
      await actions.onProjectDelete(project);
      setDeleteOpen(false);
    } finally {
      setDeleteBusy(false);
    }
  }, [actions, project]);

  return (
    <li
      className={cn("rounded-xl", className)}
      data-slot="project-explorer-item"
    >
      <div className="hoverable flex min-w-0 items-center gap-2 rounded-xl p-2.5">
        <CanvasNodeStatusDot
          size="small"
          status={{ label: "", visualTone: project.status }}
        />
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-row items-baseline justify-between gap-3 text-start",
            interactive && "cursor-pointer"
          )}
          {...(interactive
            ? {
                role: "button" as const,
                tabIndex: 0,
                onClick: handleRowActivate,
                onKeyDown: handleRowKeyDown,
              }
            : {})}
        >
          <span className="min-w-0 truncate font-medium text-foreground text-sm">
            {project.name}
          </span>
          <time
            className="shrink-0 text-muted-foreground text-xs tabular-nums"
            dateTime={iso}
          >
            {formatCreatedAt(project.createdAt)}
          </time>
        </div>
        {showRowMenu ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  aria-label={`Actions for ${project.name}`}
                  className="size-9 shrink-0 rounded-lg text-foreground hover:bg-input/50 hover:text-foreground aria-expanded:bg-input/50 data-popup-open:bg-input/50"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  size={null}
                  type="button"
                  variant="ghost"
                />
              }
            >
              <EllipsisVertical aria-hidden className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-38 min-w-38 rounded-md border border-border bg-input/30 p-1 text-foreground shadow-none ring-0! backdrop-blur-xl"
              side="right"
              sideOffset={14}
            >
              {canRename ? (
                <DropdownMenuItem
                  className="project-explorer-action-menu-item h-7 cursor-pointer rounded-md px-2 py-0 font-normal text-foreground text-sm leading-none hover:bg-input hover:text-foreground focus:bg-input focus:text-foreground"
                  onClick={() => setRenameOpen(true)}
                >
                  <SquarePen aria-hidden className="size-4" />
                  Rename
                </DropdownMenuItem>
              ) : null}
              {canDelete ? (
                <DropdownMenuItem
                  className="project-explorer-action-menu-item h-7 cursor-pointer rounded-md px-2 py-0 font-normal text-foreground text-sm leading-none hover:bg-input hover:text-foreground focus:bg-input focus:text-foreground"
                  data-tone="destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 aria-hidden className="size-4" />
                  Delete
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      <Dialog onOpenChange={setRenameOpen} open={renameOpen}>
        <DialogContent
          className="gap-4"
          data-slot="project-explorer-rename-dialog"
          onClick={(e) => e.stopPropagation()}
          showCloseButton
        >
          <DialogHeader>
            <DialogTitle>Rename project</DialogTitle>
            <DialogDescription>
              Sets{" "}
              <span className="font-mono text-foreground">
                metadata.annotations.displayName
              </span>{" "}
              on project{" "}
              <span className="font-mono text-foreground">
                {k8sName(project)}
              </span>
              . The Kubernetes resource name does not change.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`project-rename-${project.id}`}>Name</Label>
            <Input
              autoComplete="off"
              id={`project-rename-${project.id}`}
              onChange={(e) => setRenameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitRename().catch(() => undefined);
                }
              }}
              value={renameDraft}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              disabled={renameBusy}
              onClick={() => setRenameOpen(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={
                renameBusy ||
                renameDraft.trim() === "" ||
                renameDraft.trim() === project.name
              }
              onClick={() => submitRename().catch(() => undefined)}
              type="button"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog onOpenChange={setDeleteOpen} open={deleteOpen}>
        <AlertDialogContent
          data-slot="project-explorer-delete-dialog"
          onClick={(e) => e.stopPropagation()}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete{" "}
              <span className="font-medium text-foreground">
                {project.name}
              </span>{" "}
              (<span className="font-mono">{k8sName(project)}</span>) from the
              cluster. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>Cancel</AlertDialogCancel>
            <Button
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteBusy}
              onClick={(e) => {
                e.stopPropagation();
                submitDelete().catch(() => undefined);
              }}
              type="button"
              variant="destructive"
            >
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}
