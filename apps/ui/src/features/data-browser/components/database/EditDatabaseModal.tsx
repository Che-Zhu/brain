import { Dialog, DialogContent } from "@data-browser/components/ui/dialog";
import { Input } from "@data-browser/components/ui/Input";
import { ModalForm, useModalForm } from "@data-browser/components/ui/ModalForm";
import { useI18n } from "@data-browser/i18n/useI18n";
import { useConnectionStore } from "@data-browser/stores/useConnectionStore";
import { Database } from "lucide-react";
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

interface EditDatabaseCtxValue {
  databaseName: string;
  newName: string;
  setNewName: (v: string) => void;
}

const EditDatabaseCtx = createContext<EditDatabaseCtxValue | null>(null);

function useEditDatabaseCtx(): EditDatabaseCtxValue {
  const ctx = use(EditDatabaseCtx);
  if (!ctx) {
    throw new Error(
      "useEditDatabaseCtx must be used within EditDatabaseProvider"
    );
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/** Owns business logic for renaming a database. */
function EditDatabaseProvider({
  databaseName,
  onSuccess,
  children,
}: {
  databaseName: string;
  onSuccess?: () => void;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const { renameDatabase } = useConnectionStore();
  const [newName, setNewName] = useState(databaseName);

  const handleSubmit = useCallback(async () => {
    if (!newName.trim() || newName === databaseName) {
      return;
    }
    const result = await renameDatabase(databaseName, newName);
    if (result.success) {
      onSuccess?.();
    } else {
      throw new Error(result.message ?? t("common.unknownError"));
    }
  }, [newName, databaseName, renameDatabase, onSuccess, t]);

  return (
    <EditDatabaseCtx value={{ newName, setNewName, databaseName }}>
      <ModalForm.Provider
        meta={{ title: t("database.rename.title"), icon: Database }}
        onSubmit={handleSubmit}
      >
        {children}
      </ModalForm.Provider>
    </EditDatabaseCtx>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

/** Shows current database name (disabled) and new name input. */
function EditDatabaseFields() {
  const { t } = useI18n();
  const { newName, setNewName, databaseName } = useEditDatabaseCtx();
  const { state } = useModalForm();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="font-medium text-foreground text-sm">
          {t("database.rename.currentName")}
        </label>
        <Input disabled value={databaseName} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="font-medium text-foreground text-sm">
          {t("database.rename.newName")}
        </label>
        <Input
          autoFocus
          disabled={state.isSubmitting}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={t("database.rename.newNamePlaceholder")}
          value={newName}
        />
      </div>
    </div>
  );
}

/** Submit button disabled when name is empty or unchanged. */
function EditSubmitButton() {
  const { t } = useI18n();
  const { newName, databaseName } = useEditDatabaseCtx();
  return (
    <ModalForm.SubmitButton
      disabled={!newName.trim() || newName === databaseName}
      label={t("database.rename.submit")}
    />
  );
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

interface EditDatabaseModalProps {
  databaseName: string;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  open: boolean;
}

/** Modal for renaming a database. */
export function EditDatabaseModal({
  open,
  onOpenChange,
  databaseName,
  onSuccess,
}: EditDatabaseModalProps) {
  const handleSuccess = useCallback(() => {
    onSuccess?.();
    onOpenChange(false);
  }, [onSuccess, onOpenChange]);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <EditDatabaseProvider
          databaseName={databaseName}
          onSuccess={handleSuccess}
        >
          <ModalForm.Header />
          <EditDatabaseFields />
          <ModalForm.Alert />
          <ModalForm.Footer>
            <ModalForm.CancelButton />
            <EditSubmitButton />
          </ModalForm.Footer>
        </EditDatabaseProvider>
      </DialogContent>
    </Dialog>
  );
}
