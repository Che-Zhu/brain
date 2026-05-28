import { Dialog, DialogContent } from "@data-browser/components/ui/dialog";
import { Input } from "@data-browser/components/ui/Input";
import { ModalForm, useModalForm } from "@data-browser/components/ui/ModalForm";
import {
  RadioGroup,
  RadioGroupItem,
} from "@data-browser/components/ui/radio-group";
import { useI18n } from "@data-browser/i18n/useI18n";
import { useConnectionStore } from "@data-browser/stores/useConnectionStore";
import { Copy } from "lucide-react";
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

interface CopyTableCtxValue {
  copyOption: "structure" | "structure_data";
  newTableName: string;
  setCopyOption: (v: "structure" | "structure_data") => void;
  setNewTableName: (v: string) => void;
  tableName: string;
}

const CopyTableCtx = createContext<CopyTableCtxValue | null>(null);

/** Hook to access CopyTable domain context. Throws outside provider. */
function useCopyTableCtx(): CopyTableCtxValue {
  const ctx = use(CopyTableCtx);
  if (!ctx) {
    throw new Error("useCopyTableCtx must be used within CopyTableProvider");
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/** Owns business logic for copying a SQL table (structure only or with data). */
function CopyTableProvider({
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
  const { t } = useI18n();
  const { copyTable } = useConnectionStore();
  const [newTableName, setNewTableName] = useState(`${tableName}_copy`);
  const [copyOption, setCopyOption] = useState<"structure" | "structure_data">(
    "structure_data"
  );

  const handleSubmit = useCallback(async () => {
    if (!newTableName.trim()) {
      return;
    }
    const copyData = copyOption === "structure_data";
    const result = await copyTable(
      databaseName,
      schema,
      tableName,
      newTableName,
      copyData
    );
    if (result.success) {
      onSuccess?.();
    } else {
      throw new Error(result.message ?? t("common.unknownError"));
    }
  }, [
    newTableName,
    copyOption,
    databaseName,
    schema,
    tableName,
    copyTable,
    onSuccess,
    t,
  ]);

  return (
    <CopyTableCtx
      value={{
        newTableName,
        setNewTableName,
        copyOption,
        setCopyOption,
        tableName,
      }}
    >
      <ModalForm.Provider
        meta={{ title: t("sql.copyTable.title"), icon: Copy }}
        onSubmit={handleSubmit}
      >
        {children}
      </ModalForm.Provider>
    </CopyTableCtx>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

/** Source table (disabled), new table name input, and copy option radios. */
function CopyTableFields() {
  const { t } = useI18n();
  const {
    newTableName,
    setNewTableName,
    copyOption,
    setCopyOption,
    tableName,
  } = useCopyTableCtx();
  const { state } = useModalForm();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="font-medium text-foreground text-sm">
          {t("sql.copyTable.sourceTable")}
        </label>
        <Input disabled value={tableName} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="font-medium text-foreground text-sm">
          {t("sql.copyTable.newTableName")}
        </label>
        <Input
          disabled={state.isSubmitting}
          onChange={(e) => setNewTableName(e.target.value)}
          placeholder={t("sql.copyTable.newTableNamePlaceholder")}
          value={newTableName}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label className="font-medium text-foreground text-sm">
          {t("sql.copyTable.options")}
        </label>
        <RadioGroup
          disabled={state.isSubmitting}
          onValueChange={(v) => setCopyOption(v as typeof copyOption)}
          value={copyOption}
        >
          <label className="flex cursor-pointer items-center gap-2">
            <RadioGroupItem value="structure" />
            <span className="text-sm">{t("sql.copyTable.structureOnly")}</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <RadioGroupItem value="structure_data" />
            <span className="text-sm">
              {t("sql.copyTable.structureAndData")}
            </span>
          </label>
        </RadioGroup>
      </div>
    </div>
  );
}

/** Submit button disabled when new table name is empty. */
function CopyTableSubmitButton() {
  const { t } = useI18n();
  const { newTableName } = useCopyTableCtx();
  return (
    <ModalForm.SubmitButton
      disabled={!newTableName.trim()}
      label={t("sql.copyTable.submit")}
    />
  );
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

interface CopyTableModalProps {
  databaseName: string;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  open: boolean;
  schema?: string;
  tableName: string;
}

/** Modal for copying a SQL table's structure and optionally data. */
export function CopyTableModal({
  open,
  onOpenChange,
  databaseName,
  schema,
  tableName,
  onSuccess,
}: CopyTableModalProps) {
  const handleSuccess = useCallback(() => {
    onSuccess?.();
    onOpenChange(false);
  }, [onSuccess, onOpenChange]);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <CopyTableProvider
          databaseName={databaseName}
          onSuccess={handleSuccess}
          schema={schema}
          tableName={tableName}
        >
          <ModalForm.Header />
          <CopyTableFields />
          <ModalForm.Alert />
          <ModalForm.Footer>
            <ModalForm.CancelButton />
            <CopyTableSubmitButton />
          </ModalForm.Footer>
        </CopyTableProvider>
      </DialogContent>
    </Dialog>
  );
}
