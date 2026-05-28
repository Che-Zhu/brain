import { Button } from "@data-browser/components/ui/Button";
import { Checkbox } from "@data-browser/components/ui/checkbox";
import { Dialog, DialogContent } from "@data-browser/components/ui/dialog";
import { Input } from "@data-browser/components/ui/Input";
import { ModalForm, useModalForm } from "@data-browser/components/ui/ModalForm";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@data-browser/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@data-browser/components/ui/tooltip";
import type { RecordInput } from "@data-browser/generated/graphql";
import { useI18n } from "@data-browser/i18n/useI18n";
import { useConnectionStore } from "@data-browser/stores/useConnectionStore";
import { resolveSchemaParam } from "@data-browser/utils/database-features";
import { Plus, Table, Trash2 } from "lucide-react";
import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useState,
} from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ColumnDefinition {
  id: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  name: string;
  type: string;
}

const COLUMN_TYPES = [
  "INT",
  "VARCHAR(255)",
  "TEXT",
  "BOOLEAN",
  "DATE",
  "DATETIME",
  "DECIMAL",
  "FLOAT",
  "JSON",
];

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface CreateTableCtxValue {
  addColumn: () => void;
  columns: ColumnDefinition[];
  removeColumn: (id: string) => void;
  setTableName: (v: string) => void;
  tableName: string;
  updateColumn: (
    id: string,
    field: keyof ColumnDefinition,
    value: string | boolean
  ) => void;
}

const CreateTableCtx = createContext<CreateTableCtxValue | null>(null);

/** Hook to access CreateTable domain context. Throws outside provider. */
function useCreateTableCtx(): CreateTableCtxValue {
  const ctx = use(CreateTableCtx);
  if (!ctx) {
    throw new Error(
      "useCreateTableCtx must be used within CreateTableProvider"
    );
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/** Owns business logic for creating a SQL table with column definitions. */
function CreateTableProvider({
  connectionId,
  databaseName,
  schema,
  onSuccess,
  children,
}: {
  connectionId: string;
  databaseName: string;
  schema?: string;
  onSuccess?: () => void;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const { createTable, connections } = useConnectionStore();
  const [tableName, setTableName] = useState("");
  const [columns, setColumns] = useState<ColumnDefinition[]>([
    { id: "1", name: "id", type: "INT", isPrimaryKey: true, isNullable: false },
  ]);

  const addColumn = useCallback(() => {
    setColumns((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 11),
        name: "",
        type: "VARCHAR(255)",
        isPrimaryKey: false,
        isNullable: true,
      },
    ]);
  }, []);

  const removeColumn = useCallback((id: string) => {
    setColumns((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const updateColumn = useCallback(
    (id: string, field: keyof ColumnDefinition, value: string | boolean) => {
      setColumns((prev) =>
        prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
      );
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    if (!tableName || columns.length === 0) {
      return;
    }

    const conn = connections.find((c) => c.id === connectionId);
    const schemaParam = resolveSchemaParam(conn?.type, databaseName, schema);
    const fields: RecordInput[] = columns.map((col) => ({
      Key: col.name,
      Value: col.type,
      Extra: [
        { Key: "Nullable", Value: col.isNullable ? "true" : "false" },
        { Key: "Primary", Value: col.isPrimaryKey ? "true" : "false" },
      ],
    }));

    const result = await createTable(
      databaseName,
      schemaParam,
      tableName,
      fields
    );
    if (result.success) {
      onSuccess?.();
    } else {
      throw new Error(result.message ?? t("common.unknownError"));
    }
  }, [
    tableName,
    columns,
    connections,
    connectionId,
    databaseName,
    schema,
    createTable,
    onSuccess,
    t,
  ]);

  return (
    <CreateTableCtx
      value={{
        tableName,
        setTableName,
        columns,
        addColumn,
        removeColumn,
        updateColumn,
      }}
    >
      <ModalForm.Provider
        meta={{ title: t("sql.createTable.title"), icon: Table }}
        onSubmit={handleSubmit}
      >
        {children}
      </ModalForm.Provider>
    </CreateTableCtx>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

/** Input for the new table name. */
function CreateTableNameField() {
  const { t } = useI18n();
  const { tableName, setTableName } = useCreateTableCtx();
  const { state } = useModalForm();

  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-medium text-foreground text-sm">
        {t("sql.createTable.tableName")}
      </label>
      <Input
        className="max-w-md"
        disabled={state.isSubmitting}
        onChange={(e) => setTableName(e.target.value)}
        placeholder={t("sql.createTable.tableNamePlaceholder")}
        value={tableName}
      />
    </div>
  );
}

/** Editable table of column definitions with add/remove/update. */
function CreateTableColumnEditor() {
  const { t } = useI18n();
  const { columns, addColumn, removeColumn, updateColumn } =
    useCreateTableCtx();
  const { state } = useModalForm();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="font-medium text-foreground text-sm">
          {t("sql.createTable.columns")}
        </label>
        <Button
          className="h-7 gap-1 px-2 text-primary text-xs hover:text-primary"
          disabled={state.isSubmitting}
          onClick={addColumn}
          size="sm"
          type="button"
          variant="ghost"
        >
          <Plus className="h-3 w-3" />
          {t("sql.createTable.addColumn")}
        </Button>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
            <tr>
              <th className="px-4 py-2 text-left font-medium">
                {t("sql.createTable.name")}
              </th>
              <th className="px-4 py-2 text-left font-medium">
                {t("sql.createTable.type")}
              </th>
              <th className="w-20 px-4 py-2 text-center font-medium">
                {t("sql.createTable.pk")}
              </th>
              <th className="w-20 px-4 py-2 text-center font-medium">
                {t("sql.createTable.null")}
              </th>
              <th className="w-10 px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {columns.map((col) => (
              <tr className="group hover:bg-muted/30" key={col.id}>
                <td className="p-2">
                  <input
                    className="w-full rounded border-transparent bg-transparent px-2 py-1 text-sm outline-none focus:border-primary focus:bg-background"
                    disabled={state.isSubmitting}
                    onChange={(e) =>
                      updateColumn(col.id, "name", e.target.value)
                    }
                    placeholder={t("sql.createTable.columnNamePlaceholder")}
                    type="text"
                    value={col.name}
                  />
                </td>
                <td className="p-2">
                  <Select
                    disabled={state.isSubmitting}
                    onValueChange={(v) => updateColumn(col.id, "type", v)}
                    value={col.type}
                  >
                    <SelectTrigger className="w-full bg-transparent" size="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COLUMN_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-2 text-center">
                  <Checkbox
                    checked={col.isPrimaryKey}
                    disabled={state.isSubmitting}
                    onCheckedChange={(checked) =>
                      updateColumn(col.id, "isPrimaryKey", checked === true)
                    }
                  />
                </td>
                <td className="p-2 text-center">
                  <Checkbox
                    checked={col.isNullable}
                    disabled={state.isSubmitting}
                    onCheckedChange={(checked) =>
                      updateColumn(col.id, "isNullable", checked === true)
                    }
                  />
                </td>
                <td className="p-2 text-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive disabled:opacity-50 group-hover:opacity-100"
                        disabled={state.isSubmitting}
                        onClick={() => removeColumn(col.id)}
                        size="icon-sm"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {t("sql.createTable.removeColumn")}
                    </TooltipContent>
                  </Tooltip>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Submit button disabled when table name or columns are empty. */
function CreateTableSubmitButton() {
  const { t } = useI18n();
  const { tableName, columns } = useCreateTableCtx();
  return (
    <ModalForm.SubmitButton
      disabled={!tableName || columns.length === 0}
      label={t("sql.createTable.submit")}
    />
  );
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

interface CreateTableModalProps {
  connectionId: string;
  databaseName: string;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  open: boolean;
  schema?: string;
}

/** Modal for creating a SQL table with a dynamic column editor. */
export function CreateTableModal({
  open,
  onOpenChange,
  connectionId,
  databaseName,
  schema,
  onSuccess,
}: CreateTableModalProps) {
  const handleSuccess = useCallback(() => {
    onSuccess?.();
    onOpenChange(false);
  }, [onSuccess, onOpenChange]);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-4xl">
        <CreateTableProvider
          connectionId={connectionId}
          databaseName={databaseName}
          onSuccess={handleSuccess}
          schema={schema}
        >
          <ModalForm.Header />
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
            <CreateTableNameField />
            <CreateTableColumnEditor />
          </div>
          <ModalForm.Alert />
          <ModalForm.Footer>
            <ModalForm.CancelButton />
            <CreateTableSubmitButton />
          </ModalForm.Footer>
        </CreateTableProvider>
      </DialogContent>
    </Dialog>
  );
}
