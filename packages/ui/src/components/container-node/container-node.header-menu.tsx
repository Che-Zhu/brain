"use client";

import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { type ReactNode, useState } from "react";

import { useContainerNode } from "./container-node.context";
import { ContainerNodeDeleteDialog } from "./container-node.delete-dialog";
import { ContainerNodeScaleDialog } from "./container-node.scale-dialog";

export function ContainerNodeHeaderMenu({ menu }: { menu?: ReactNode }) {
  const { actions, states } = useContainerNode();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [scaleDialogOpen, setScaleDialogOpen] = useState(false);

  if (menu != null) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              aria-label="Open menu"
              className="size-7 shrink-0"
              size="icon"
              variant="ghost"
            />
          }
        >
          <MoreHorizontal className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="rounded-xl">
          {menu}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              aria-label="Open menu"
              className="size-7 shrink-0"
              size="icon"
              variant="ghost"
            />
          }
        >
          <MoreHorizontal className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="rounded-xl">
          <DropdownMenuItem
            className="rounded-xl text-xs"
            onClick={() => setScaleDialogOpen(true)}
          >
            Scale
          </DropdownMenuItem>
          <DropdownMenuItem
            className="rounded-xl text-xs"
            onClick={actions.onRestart}
          >
            Restart
          </DropdownMenuItem>
          <DropdownMenuItem
            className="rounded-xl text-xs"
            onClick={actions.onViewLogs}
          >
            View logs
          </DropdownMenuItem>
          <DropdownMenuItem
            className="rounded-xl text-xs"
            onClick={actions.onOpenShell}
          >
            Open shell
          </DropdownMenuItem>
          <DropdownMenuItem
            className="rounded-xl text-xs"
            onClick={() => setDeleteDialogOpen(true)}
            variant="destructive"
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ContainerNodeScaleDialog
        onOpenChange={setScaleDialogOpen}
        onScale={actions.onScale}
        open={scaleDialogOpen}
        replicas={states.replicas ?? 0}
      />
      <ContainerNodeDeleteDialog
        name={states.name}
        onConfirmDelete={actions.onDelete}
        onOpenChange={setDeleteDialogOpen}
        open={deleteDialogOpen}
      />
    </>
  );
}
