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

interface DeleteTableCtxValue {
  canDelete: boolean;
  confirmName: string;
  setConfirmName: (v: string) => void;
  tableName: string;
}

const DeleteTableCtx = createContext<DeleteTableCtxValue | null>(null);

/** Hook to access DeleteTable domain context. Throws outside provider. */
function useDeleteTableCtx(): DeleteTableCtxValue {
  const ctx = use(DeleteTableCtx);
  if (!ctx) {
    throw new Error(
      "useDeleteTableCtx must be used within DeleteTableProvider"
    );
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/** Owns business logic for deleting a SQL table with name confirmation. */
function DeleteTableProvider({
  databaseName,
  schema,
  tableName,
  onSuccess,
  children,
}: {
  databaseName: string;
  schema?: string;
  tableName: string;
  onSuccess?: () => void;
  children: ReactNode;
}) {
  const { deleteTable } = useConnectionStore();
  const [confirmName, setConfirmName] = useState("");
  const canDelete = confirmName === tableName;

  const handleSubmit = useCallback(async () => {
    if (!canDelete) {
      return;
    }
    const result = await deleteTable(databaseName, schema, tableName);
    if (result.success) {
      onSuccess?.();
    } else {
      throw new Error(result.message ?? "Unknown error");
    }
  }, [canDelete, databaseName, schema, tableName, deleteTable, onSuccess]);

  return (
    <DeleteTableCtx
      value={{ confirmName, setConfirmName, tableName, canDelete }}
    >
      <ModalForm.Provider
        meta={{
          title: "Delete table",
          icon: AlertTriangle,
          isDestructive: true,
        }}
        onSubmit={handleSubmit}
      >
        {children}
      </ModalForm.Provider>
    </DeleteTableCtx>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

/** Warning banner explaining the destructive action. */
function DeleteTableWarning() {
  const { tableName } = useDeleteTableCtx();

  return (
    <div className="rounded-lg border border-destructive/10 bg-destructive/5 p-4 text-sm">
      <p className="font-medium text-destructive">
        {"This action cannot be undone"}
      </p>
      <p className="mt-1 text-muted-foreground">
        {`Table "${tableName}" will be permanently deleted.`}
      </p>
    </div>
  );
}

/** Confirmation input — user must type the table name to enable deletion. */
function DeleteTableConfirmation() {
  const { confirmName, setConfirmName, tableName } = useDeleteTableCtx();
  const { state } = useModalForm();

  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-medium text-foreground text-sm">
        {"Type the table name to confirm."}
      </label>
      <Input
        disabled={state.isSubmitting}
        onChange={(e) => setConfirmName(e.target.value)}
        placeholder={tableName}
        value={confirmName}
      />
    </div>
  );
}

/** Submit button disabled until confirmation name matches. */
function DeleteTableSubmitButton() {
  const { canDelete } = useDeleteTableCtx();
  return (
    <ModalForm.SubmitButton disabled={!canDelete} label={"Delete table"} />
  );
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

interface DeleteTableModalProps {
  databaseName: string;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  open: boolean;
  schema?: string;
  tableName: string;
}

/** Modal for deleting a SQL table with name confirmation. */
export function DeleteTableModal({
  open,
  onOpenChange,
  databaseName,
  schema,
  tableName,
  onSuccess,
}: DeleteTableModalProps) {
  const handleSuccess = useCallback(() => {
    onSuccess?.();
    onOpenChange(false);
  }, [onSuccess, onOpenChange]);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DeleteTableProvider
          databaseName={databaseName}
          onSuccess={handleSuccess}
          schema={schema}
          tableName={tableName}
        >
          <ModalForm.Header />
          <DeleteTableWarning />
          <DeleteTableConfirmation />
          <ModalForm.Alert />
          <ModalForm.Footer>
            <ModalForm.CancelButton />
            <DeleteTableSubmitButton />
          </ModalForm.Footer>
        </DeleteTableProvider>
      </DialogContent>
    </Dialog>
  );
}
