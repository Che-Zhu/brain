"use client";

import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { TableCell, TableRow } from "@workspace/ui/components/table";
import { MoreHorizontal, Plus } from "lucide-react";
import type * as React from "react";
import { toast } from "sonner";

import { usePortsTableContext } from "./ports-table.context";
import type { PortRow } from "./ports-table.types";

async function copyPortAddress(value: string): Promise<void> {
  const text = value.trim();
  if (text === "") {
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  } catch {
    toast.error("Could not copy");
  }
}

function PortsTableAddressCell({ value }: { value: string }) {
  const trimmed = value.trim();
  if (trimmed === "") {
    return (
      <TableCell
        className="min-w-0 max-w-0 truncate font-mono text-muted-foreground"
        title={value}
      >
        {value}
      </TableCell>
    );
  }
  return (
    <TableCell className="min-w-0 max-w-0 p-0 align-middle">
      <button
        className="block w-full min-w-0 truncate px-2 py-2 text-left font-mono text-muted-foreground transition-colors hover:bg-muted/50"
        onClick={async () => {
          await copyPortAddress(value);
        }}
        title={`${value} — Click to copy`}
        type="button"
      >
        {value}
      </button>
    </TableCell>
  );
}

function PortsTableNewButton({
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { onAdd, openAddDialog } = usePortsTableContext();
  return (
    <Button
      disabled={!onAdd}
      onClick={(e) => {
        onClick?.(e);
        openAddDialog();
      }}
      size="sm"
      variant="outline"
      {...props}
    >
      <Plus className="size-4" />
      New
    </Button>
  );
}

function PortsTableRow({
  port,
  children,
  ...props
}: React.ComponentProps<typeof TableRow> & {
  port: PortRow;
  children?: React.ReactNode;
}) {
  return (
    <TableRow {...props}>
      <TableCell className="w-16 whitespace-nowrap font-mono">
        {port.number}
      </TableCell>
      <PortsTableAddressCell value={port.privateAddress} />
      <PortsTableAddressCell value={port.publicAddress} />
      <TableCell className="w-12 shrink-0">{children}</TableCell>
    </TableRow>
  );
}

function PortsTableActions({ port }: { port: PortRow }) {
  const { onUpdate, onDelete, requestDelete, requestUpdate } =
    usePortsTableContext();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            className="h-8 w-8"
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          disabled={!onUpdate}
          onClick={() => requestUpdate(port.number)}
        >
          Update
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!onDelete}
          onClick={() => requestDelete(port.number)}
          variant="destructive"
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { PortsTableActions, PortsTableNewButton, PortsTableRow };
