import { Dialog, DialogContent } from "@data-browser/components/ui/dialog";
import { Input } from "@data-browser/components/ui/Input";
import { ModalForm, useModalForm } from "@data-browser/components/ui/ModalForm";
import { useDeleteRowMutation } from "@data-browser/generated/graphql";
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

interface DeleteRedisKeyCtxValue {
  canDelete: boolean;
  confirmName: string;
  keyName: string;
  setConfirmName: (v: string) => void;
}

const DeleteRedisKeyCtx = createContext<DeleteRedisKeyCtxValue | null>(null);

function useDeleteRedisKeyCtx(): DeleteRedisKeyCtxValue {
  const ctx = use(DeleteRedisKeyCtx);
  if (!ctx) {
    throw new Error(
      "useDeleteRedisKeyCtx must be used within DeleteRedisKeyProvider"
    );
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

function DeleteRedisKeyProvider({
  databaseName,
  keyName,
  onSuccess,
  children,
}: {
  databaseName: string;
  keyName: string;
  onSuccess?: () => void;
  children: ReactNode;
}) {
  const [deleteRow] = useDeleteRowMutation();
  const [confirmName, setConfirmName] = useState("");
  const canDelete = confirmName === keyName;

  const handleSubmit = useCallback(async () => {
    if (!canDelete) {
      return;
    }
    const { errors } = await deleteRow({
      variables: {
        schema: databaseName,
        storageUnit: keyName,
        values: [{ Key: "key", Value: keyName }],
      },
      context: { database: databaseName },
    });
    if (errors?.length) {
      throw new Error(errors[0]?.message ?? "Unknown error");
    }
    onSuccess?.();
  }, [canDelete, databaseName, keyName, deleteRow, onSuccess]);

  return (
    <DeleteRedisKeyCtx
      value={{ confirmName, setConfirmName, keyName, canDelete }}
    >
      <ModalForm.Provider
        meta={{
          title: "Delete Redis key",
          icon: AlertTriangle,
          isDestructive: true,
        }}
        onSubmit={handleSubmit}
      >
        {children}
      </ModalForm.Provider>
    </DeleteRedisKeyCtx>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function DeleteRedisKeyWarning() {
  const { keyName } = useDeleteRedisKeyCtx();

  return (
    <div className="rounded-lg border border-destructive/10 bg-destructive/5 p-4 text-sm">
      <p className="font-medium text-destructive">
        {"This action cannot be undone"}
      </p>
      <p className="mt-1 text-muted-foreground">
        {`Redis key "${keyName}" will be permanently deleted.`}
      </p>
    </div>
  );
}

function DeleteRedisKeyConfirmation() {
  const { confirmName, setConfirmName, keyName } = useDeleteRedisKeyCtx();
  const { state } = useModalForm();

  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-medium text-foreground text-sm">
        {"Type the key name to confirm."}
      </label>
      <Input
        disabled={state.isSubmitting}
        onChange={(e) => setConfirmName(e.target.value)}
        placeholder={keyName}
        value={confirmName}
      />
    </div>
  );
}

function DeleteRedisKeySubmitButton() {
  const { canDelete } = useDeleteRedisKeyCtx();
  return <ModalForm.SubmitButton disabled={!canDelete} label={"Delete key"} />;
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

interface DeleteRedisKeyModalProps {
  databaseName: string;
  keyName: string;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  open: boolean;
}

/** Modal for deleting a Redis key with name confirmation. */
export function DeleteRedisKeyModal({
  open,
  onOpenChange,
  databaseName,
  keyName,
  onSuccess,
}: DeleteRedisKeyModalProps) {
  const handleSuccess = useCallback(() => {
    onSuccess?.();
    onOpenChange(false);
  }, [onSuccess, onOpenChange]);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DeleteRedisKeyProvider
          databaseName={databaseName}
          keyName={keyName}
          onSuccess={handleSuccess}
        >
          <ModalForm.Header />
          <DeleteRedisKeyWarning />
          <DeleteRedisKeyConfirmation />
          <ModalForm.Alert />
          <ModalForm.Footer>
            <ModalForm.CancelButton />
            <DeleteRedisKeySubmitButton />
          </ModalForm.Footer>
        </DeleteRedisKeyProvider>
      </DialogContent>
    </Dialog>
  );
}
