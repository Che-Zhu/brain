import { Dialog, DialogContent } from "@data-browser/components/ui/dialog";
import { Input } from "@data-browser/components/ui/Input";
import { ModalForm, useModalForm } from "@data-browser/components/ui/ModalForm";
import { useDbAccessReadOnlyActions } from "@data-browser/state/db-access-session";
import { Table } from "lucide-react";
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

interface RenameTableCtxValue {
  newName: string;
  setNewName: (v: string) => void;
  tableName: string;
}

const RenameTableCtx = createContext<RenameTableCtxValue | null>(null);

/** Hook to access RenameTable domain context. Throws outside provider. */
function useRenameTableCtx(): RenameTableCtxValue {
  const ctx = use(RenameTableCtx);
  if (!ctx) {
    throw new Error(
      "useRenameTableCtx must be used within RenameTableProvider"
    );
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/** Owns business logic for renaming a SQL table. */
function RenameTableProvider({
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
  const { renameTable } = useDbAccessReadOnlyActions();
  const [newName, setNewName] = useState(tableName);

  const handleSubmit = useCallback(async () => {
    if (!newName.trim() || newName === tableName) {
      return;
    }
    const result = await renameTable(databaseName, schema, tableName, newName);
    if (result.success) {
      onSuccess?.();
    } else {
      throw new Error(result.message ?? "Unknown error");
    }
  }, [newName, tableName, databaseName, schema, renameTable, onSuccess]);

  return (
    <RenameTableCtx value={{ newName, setNewName, tableName }}>
      <ModalForm.Provider
        meta={{ title: "Rename table", icon: Table }}
        onSubmit={handleSubmit}
      >
        {children}
      </ModalForm.Provider>
    </RenameTableCtx>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

/** Shows current table name (disabled) and new name input. */
function RenameTableFields() {
  const { newName, setNewName, tableName } = useRenameTableCtx();
  const { state } = useModalForm();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="font-medium text-foreground text-sm">
          {"Current name"}
        </label>
        <Input disabled value={tableName} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="font-medium text-foreground text-sm">
          {"New name"}
        </label>
        <Input
          autoFocus
          disabled={state.isSubmitting}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={"Enter new table name"}
          value={newName}
        />
      </div>
    </div>
  );
}

/** Submit button disabled when name is empty or unchanged. */
function RenameTableSubmitButton() {
  const { newName, tableName } = useRenameTableCtx();
  return (
    <ModalForm.SubmitButton
      disabled={!newName.trim() || newName === tableName}
      label={"Rename table"}
    />
  );
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

interface RenameTableModalProps {
  databaseName: string;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  open: boolean;
  schema?: string;
  tableName: string;
}

/** Modal for renaming a SQL table. */
export function RenameTableModal({
  open,
  onOpenChange,
  databaseName,
  schema,
  tableName,
  onSuccess,
}: RenameTableModalProps) {
  const handleSuccess = useCallback(() => {
    onSuccess?.();
    onOpenChange(false);
  }, [onSuccess, onOpenChange]);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <RenameTableProvider
          databaseName={databaseName}
          onSuccess={handleSuccess}
          schema={schema}
          tableName={tableName}
        >
          <ModalForm.Header />
          <RenameTableFields />
          <ModalForm.Alert />
          <ModalForm.Footer>
            <ModalForm.CancelButton />
            <RenameTableSubmitButton />
          </ModalForm.Footer>
        </RenameTableProvider>
      </DialogContent>
    </Dialog>
  );
}
