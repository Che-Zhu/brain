"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";
import { useCallback, useId, useMemo, useState } from "react";

import { PortsTableContext } from "./ports-table.context";
import { parsePortNumberDigits } from "./ports-table.helpers";
import { PortsTableNewButton } from "./ports-table.parts";
import type { PortsTableRootProps } from "./ports-table.types";

function PortsTableRoot({
  ports,
  onUpdate,
  onDelete,
  onAdd,
  className,
  children,
  ...props
}: PortsTableRootProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [draftNumber, setDraftNumber] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  const [updateOpen, setUpdateOpen] = useState(false);
  const [updatePreviousNumber, setUpdatePreviousNumber] = useState<
    number | null
  >(null);
  const [updateDraftNumber, setUpdateDraftNumber] = useState("");
  const [updateError, setUpdateError] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePortNumber, setDeletePortNumber] = useState<number | null>(null);

  const deleteSnapshot = useMemo(
    () =>
      deletePortNumber == null
        ? undefined
        : ports.find((p) => p.number === deletePortNumber),
    [deletePortNumber, ports]
  );

  const baseId = useId();
  const addInputId = `${baseId}-add-number`;
  const updateNumberId = `${baseId}-update-number`;

  const openAddDialog = useCallback(() => {
    setDraftNumber("");
    setAddError(null);
    setAddOpen(true);
  }, []);

  const handleAddOpenChange = useCallback((open: boolean) => {
    setAddOpen(open);
    if (!open) {
      setAddError(null);
    }
  }, []);

  const requestUpdate = useCallback((portNumber: number) => {
    setUpdatePreviousNumber(portNumber);
    setUpdateDraftNumber(String(portNumber));
    setUpdateError(null);
    setUpdateOpen(true);
  }, []);

  const handleUpdateOpenChange = useCallback((open: boolean) => {
    setUpdateOpen(open);
    if (!open) {
      setUpdatePreviousNumber(null);
      setUpdateError(null);
    }
  }, []);

  const requestDelete = useCallback((portNumber: number) => {
    setDeletePortNumber(portNumber);
    setDeleteOpen(true);
  }, []);

  const handleDeleteOpenChange = useCallback((open: boolean) => {
    setDeleteOpen(open);
    if (!open) {
      setDeletePortNumber(null);
    }
  }, []);

  const commitAdd = useCallback(() => {
    if (!onAdd) {
      return;
    }
    const parsed = parsePortNumberDigits(draftNumber.trim());
    if (!parsed.ok) {
      setAddError(parsed.message);
      return;
    }
    if (ports.some((p) => p.number === parsed.n)) {
      setAddError("That port is already listed.");
      return;
    }
    onAdd(parsed.n);
    setAddOpen(false);
    setDraftNumber("");
    setAddError(null);
  }, [draftNumber, onAdd, ports]);

  const commitUpdate = useCallback(() => {
    if (!(onUpdate && updatePreviousNumber != null)) {
      return;
    }
    const parsed = parsePortNumberDigits(updateDraftNumber.trim());
    if (!parsed.ok) {
      setUpdateError(parsed.message);
      return;
    }
    const n = parsed.n;
    const duplicateNumber = ports.some(
      (p) => p.number === n && p.number !== updatePreviousNumber
    );
    if (duplicateNumber) {
      setUpdateError("That port number is already used by another row.");
      return;
    }

    if (n !== updatePreviousNumber) {
      onUpdate(updatePreviousNumber, n);
    }
    setUpdateOpen(false);
    setUpdatePreviousNumber(null);
    setUpdateError(null);
  }, [onUpdate, ports, updateDraftNumber, updatePreviousNumber]);

  const commitDelete = useCallback(() => {
    if (!(onDelete && deletePortNumber != null)) {
      return;
    }
    onDelete(deletePortNumber);
    setDeleteOpen(false);
    setDeletePortNumber(null);
  }, [deletePortNumber, onDelete]);

  return (
    <PortsTableContext.Provider
      value={{
        onAdd,
        onDelete,
        onUpdate,
        openAddDialog,
        requestDelete,
        requestUpdate,
      }}
    >
      <div
        className={cn("w-full", className)}
        data-slot="ports-table"
        {...props}
      >
        <div className="mb-2 flex min-w-0 items-center justify-between gap-2">
          <h3 className="font-medium text-foreground text-sm leading-snug">
            Ports
          </h3>
          <PortsTableNewButton />
        </div>
        <div className="min-w-0 overflow-hidden rounded-md border [&_[data-slot=table-container]]:overflow-x-hidden">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 whitespace-nowrap">Number</TableHead>
                <TableHead className="min-w-0">Private address</TableHead>
                <TableHead className="min-w-0">Public address</TableHead>
                <TableHead aria-label="Actions" className="w-12 shrink-0" />
              </TableRow>
            </TableHeader>
            <TableBody>{children}</TableBody>
          </Table>
        </div>
      </div>

      <Dialog onOpenChange={handleAddOpenChange} open={addOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add port</DialogTitle>
            <DialogDescription>
              Enter a container port between 1 and 65535.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor={addInputId}>Port number</Label>
            <Input
              aria-describedby={addError ? `${addInputId}-error` : undefined}
              aria-invalid={addError != null}
              className="font-mono"
              id={addInputId}
              inputMode="numeric"
              onChange={(e) => {
                setDraftNumber(e.target.value);
                setAddError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitAdd();
                }
              }}
              placeholder="e.g. 8080"
              type="text"
              value={draftNumber}
            />
            {addError ? (
              <p
                className="text-destructive text-xs"
                id={`${addInputId}-error`}
                role="alert"
              >
                {addError}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              onClick={() => handleAddOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={!onAdd} onClick={commitAdd} type="button">
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={handleUpdateOpenChange} open={updateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update port</DialogTitle>
            <DialogDescription>
              Change the port number. Addresses stay under host control outside
              this dialog.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor={updateNumberId}>Port number</Label>
            <Input
              aria-describedby={
                updateError ? `${updateNumberId}-error` : undefined
              }
              aria-invalid={updateError != null}
              className="font-mono"
              id={updateNumberId}
              inputMode="numeric"
              onChange={(e) => {
                setUpdateDraftNumber(e.target.value);
                setUpdateError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitUpdate();
                }
              }}
              type="text"
              value={updateDraftNumber}
            />
            {updateError ? (
              <p
                className="text-destructive text-xs"
                id={`${updateNumberId}-error`}
                role="alert"
              >
                {updateError}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              onClick={() => handleUpdateOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={
                !(onUpdate && updatePreviousNumber != null && updateDraftNumber)
              }
              onClick={commitUpdate}
              type="button"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={handleDeleteOpenChange} open={deleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete port</DialogTitle>
            <DialogDescription>
              This removes the port from the list. Re-add it later with New if
              needed.
            </DialogDescription>
          </DialogHeader>
          {deletePortNumber == null ? null : (
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-muted-foreground text-sm">
              <p className="text-foreground">{deletePortNumber}</p>
              {deleteSnapshot ? (
                <>
                  <p className="truncate">{deleteSnapshot.privateAddress}</p>
                  <p className="truncate">{deleteSnapshot.publicAddress}</p>
                </>
              ) : null}
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => handleDeleteOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={!(onDelete && deletePortNumber != null)}
              onClick={commitDelete}
              type="button"
              variant="destructive"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortsTableContext.Provider>
  );
}

export { PortsTableRoot };
