import { Dialog, DialogContent } from "@data-browser/components/ui/dialog";
import { Input } from "@data-browser/components/ui/Input";
import { ModalForm, useModalForm } from "@data-browser/components/ui/ModalForm";
import { useConnectionStore } from "@data-browser/stores/useConnectionStore";
import { AlertTriangle } from "lucide-react";
import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useState,
} from "react";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface DeleteDatabaseCtxValue {
  canDelete: boolean;
  confirmName: string;
  databaseName: string;
  setConfirmName: (v: string) => void;
}

const DeleteDatabaseCtx = createContext<DeleteDatabaseCtxValue | null>(null);

function useDeleteDatabaseCtx(): DeleteDatabaseCtxValue {
  const ctx = use(DeleteDatabaseCtx);
  if (!ctx) {
    throw new Error(
      "useDeleteDatabaseCtx must be used within DeleteDatabaseProvider"
    );
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/** Owns business logic for deleting a database. */
function DeleteDatabaseProvider({
  databaseName,
  onSuccess,
  children,
}: {
  databaseName: string;
  onSuccess?: () => void;
  children: ReactNode;
}) {
  const { deleteDatabase } = useConnectionStore();
  const [confirmName, setConfirmName] = useState("");
  const canDelete = confirmName === databaseName;

  const handleSubmit = useCallback(async () => {
    if (!canDelete) {
      return;
    }
    const result = await deleteDatabase(databaseName);
    if (result.success) {
      onSuccess?.();
    } else {
      throw new Error(result.message ?? "Unknown error");
    }
  }, [canDelete, databaseName, deleteDatabase, onSuccess]);

  return (
    <DeleteDatabaseCtx
      value={{ confirmName, setConfirmName, databaseName, canDelete }}
    >
      <ModalForm.Provider
        meta={{
          title: "Delete database",
          icon: AlertTriangle,
          isDestructive: true,
        }}
        onSubmit={handleSubmit}
      >
        {children}
      </ModalForm.Provider>
    </DeleteDatabaseCtx>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

/** Warning banner explaining the destructive action. */
function DeleteDatabaseWarning() {
  const { databaseName } = useDeleteDatabaseCtx();

  return (
    <div className="rounded-lg border border-destructive/10 bg-destructive/5 p-4 text-sm">
      <p className="font-medium text-destructive">
        {"This action cannot be undone"}
      </p>
      <p className="mt-1 text-muted-foreground">
        {`Database "${databaseName}" will be permanently deleted.`}
      </p>
    </div>
  );
}

/** Confirmation input — user must type the database name to enable deletion. */
function DeleteDatabaseConfirmation() {
  const { confirmName, setConfirmName, databaseName } = useDeleteDatabaseCtx();
  const { state } = useModalForm();

  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-medium text-foreground text-sm">
        {"Type the database name to confirm."}
      </label>
      <Input
        disabled={state.isSubmitting}
        onChange={(e) => setConfirmName(e.target.value)}
        placeholder={databaseName}
        value={confirmName}
      />
    </div>
  );
}

/** Submit button disabled until confirmation name matches. */
function DeleteSubmitButton() {
  const { canDelete } = useDeleteDatabaseCtx();
  return (
    <ModalForm.SubmitButton disabled={!canDelete} label={"Delete database"} />
  );
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

interface DeleteDatabaseModalProps {
  connectionId: string;
  databaseName: string;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  open: boolean;
}

/** Modal for deleting a database with confirmation. */
export function DeleteDatabaseModal({
  open,
  onOpenChange,
  databaseName,
  onSuccess,
}: DeleteDatabaseModalProps) {
  const handleSuccess = useCallback(() => {
    onSuccess?.();
    onOpenChange(false);
  }, [onSuccess, onOpenChange]);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DeleteDatabaseProvider
          databaseName={databaseName}
          onSuccess={handleSuccess}
        >
          <ModalForm.Header />
          <DeleteDatabaseWarning />
          <DeleteDatabaseConfirmation />
          <ModalForm.Alert />
          <ModalForm.Footer>
            <ModalForm.CancelButton />
            <DeleteSubmitButton />
          </ModalForm.Footer>
        </DeleteDatabaseProvider>
      </DialogContent>
    </Dialog>
  );
}
