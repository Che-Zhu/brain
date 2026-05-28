import {
  ExportFooter,
  ExportProgress,
} from "@data-browser/components/database/shared/ExportProgress";
import {
  type FormatOption,
  FormatSelector,
} from "@data-browser/components/database/shared/FormatSelector";
import { Dialog, DialogContent } from "@data-browser/components/ui/dialog";
import { Input } from "@data-browser/components/ui/Input";
import { ModalForm, useModalForm } from "@data-browser/components/ui/ModalForm";
import { Textarea } from "@data-browser/components/ui/Textarea";
import { useRawExecuteLazyQuery } from "@data-browser/generated/graphql";
import { useI18n } from "@data-browser/i18n/useI18n";
import { useConnectionStore } from "@data-browser/stores/useConnectionStore";
import { buildStorageUnitReference } from "@data-browser/utils/ddl-sql";
import {
  downloadBlob,
  toCSV,
  toExcel,
  toJSON,
  toSQL,
} from "@data-browser/utils/export-utils";
import {
  FileCode,
  FileJson,
  FileSpreadsheet,
  FileText,
  Table2,
} from "lucide-react";
import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useState,
} from "react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type ExportFormat = "csv" | "json" | "sql" | "excel";

const FORMAT_OPTIONS: FormatOption<ExportFormat>[] = [
  { id: "csv", label: "CSV", icon: FileText },
  { id: "json", label: "JSON", icon: FileJson },
  { id: "sql", label: "SQL", icon: FileCode },
  { id: "excel", label: "Excel", icon: FileSpreadsheet },
];

const FORMAT_EXTENSIONS: Record<ExportFormat, string> = {
  csv: "csv",
  json: "json",
  sql: "sql",
  excel: "xlsx",
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface ExportDataCtxValue {
  filter: string;
  format: ExportFormat;
  handleExport: () => void;
  isSuccess: boolean;
  rowCount: number | "";
  setFilter: (v: string) => void;
  setFormat: (v: ExportFormat) => void;
  setRowCount: (v: number | "") => void;
}

const ExportDataCtx = createContext<ExportDataCtxValue | null>(null);

/** Hook to access ExportDataModal domain state. Throws if used outside the provider. */
function useExportDataCtx(): ExportDataCtxValue {
  const ctx = use(ExportDataCtx);
  if (!ctx) {
    throw new Error("useExportDataCtx must be used within ExportDataProvider");
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/** Wraps ModalForm.Provider (complex mode, no onSubmit) and domain context for SQL table export. */
function ExportDataProvider({
  connectionId,
  databaseName,
  schema,
  tableName,
  children,
}: {
  connectionId: string;
  databaseName: string;
  schema?: string | null;
  tableName: string;
  children: ReactNode;
}) {
  const { t } = useI18n();

  return (
    <ModalForm.Provider
      meta={{
        title: t("sql.export.title"),
        description: schema
          ? `${databaseName}.${schema}.${tableName}`
          : `${databaseName}.${tableName}`,
        icon: Table2,
      }}
    >
      <ExportDataBridge
        connectionId={connectionId}
        databaseName={databaseName}
        schema={schema}
        tableName={tableName}
      >
        {children}
      </ExportDataBridge>
    </ModalForm.Provider>
  );
}

/** Inner bridge that owns domain state and export logic, accessing ModalForm actions via useModalForm(). */
function ExportDataBridge({
  connectionId,
  databaseName,
  schema,
  tableName,
  children,
}: {
  connectionId: string;
  databaseName: string;
  schema?: string | null;
  tableName: string;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [rowCount, setRowCount] = useState<number | "">(1000);
  const [filter, setFilter] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const { actions } = useModalForm();
  const [executeQuery] = useRawExecuteLazyQuery({ fetchPolicy: "no-cache" });
  const connections = useConnectionStore((s) => s.connections);

  const handleExport = useCallback(async () => {
    actions.setSubmitting(true);
    actions.closeAlert();
    setIsSuccess(false);

    try {
      const connectionType = connections.find(
        (connection) => connection.id === connectionId
      )?.type;
      const qualifiedName = buildStorageUnitReference(
        connectionType,
        tableName,
        schema ?? undefined
      );
      let query = `SELECT * FROM ${qualifiedName}`;
      if (filter.trim()) {
        query += ` WHERE ${filter.trim()}`;
      }
      if (rowCount !== "") {
        query += ` LIMIT ${rowCount}`;
      }

      const { data, error } = await executeQuery({
        variables: { query },
        context: { database: databaseName },
      });

      if (error) {
        throw new Error(error.message);
      }
      if (!data?.RawExecute) {
        throw new Error(t("sql.export.noDataReturned"));
      }

      const { Columns, Rows } = data.RawExecute;
      let blob: Blob;

      switch (format) {
        case "csv":
          blob = toCSV(Columns, Rows);
          break;
        case "json":
          blob = toJSON(Columns, Rows);
          break;
        case "sql":
          blob = toSQL(qualifiedName, Columns, Rows);
          break;
        case "excel":
          blob = toExcel(tableName, Columns, Rows);
          break;
      }

      downloadBlob(blob, `${tableName}.${FORMAT_EXTENSIONS[format]}`);
      setIsSuccess(true);
    } catch (err: any) {
      actions.setAlert({
        type: "error",
        title: t("sql.export.failed"),
        message: err.message || t("common.unknownError"),
      });
    } finally {
      actions.setSubmitting(false);
    }
  }, [
    actions,
    connectionId,
    connections,
    databaseName,
    executeQuery,
    filter,
    format,
    rowCount,
    schema,
    t,
    tableName,
  ]);

  return (
    <ExportDataCtx
      value={{
        format,
        setFormat,
        rowCount,
        setRowCount,
        filter,
        setFilter,
        isSuccess,
        handleExport,
      }}
    >
      {children}
    </ExportDataCtx>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

/** Format selector, row limit, filter, and progress display. */
function ExportDataFields() {
  const { t } = useI18n();
  const {
    format,
    setFormat,
    rowCount,
    setRowCount,
    filter,
    setFilter,
    isSuccess,
  } = useExportDataCtx();
  const { state } = useModalForm();
  const disabled = state.isSubmitting || isSuccess;

  return (
    <div className="flex flex-col gap-4">
      <FormatSelector
        disabled={disabled}
        onChange={setFormat}
        options={FORMAT_OPTIONS}
        value={format}
      />

      <div className="flex flex-col gap-2">
        <label className="font-medium text-foreground text-sm">
          {t("sql.export.rowLimit")}
        </label>
        <Input
          disabled={disabled}
          onChange={(e) =>
            setRowCount(
              e.target.value === "" ? "" : Number.parseInt(e.target.value, 10)
            )
          }
          placeholder={t("sql.export.rowLimitPlaceholder")}
          type="number"
          value={rowCount}
        />
        <p className="text-muted-foreground text-xs">
          {t("sql.export.rowLimitHint")}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="font-medium text-foreground text-sm">
          {t("sql.export.filterOptional")}
        </label>
        <Textarea
          className="h-24 resize-none font-mono"
          disabled={disabled}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={t("sql.export.filterPlaceholder")}
          value={filter}
        />
      </div>

      <ExportProgress isExporting={state.isSubmitting} isSuccess={isSuccess} />
    </div>
  );
}

/** Footer bridge: reads isSuccess and handleExport from domain context, delegates to shared ExportFooter. */
function ExportDataFooterBridge() {
  const { isSuccess, handleExport } = useExportDataCtx();
  return <ExportFooter isSuccess={isSuccess} onClick={handleExport} />;
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

interface ExportDataModalProps {
  connectionId: string;
  databaseName: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  schema?: string | null;
  tableName: string;
}

/** Modal for exporting a single SQL table with optional row limit and WHERE filter. */
export function ExportDataModal({
  open,
  onOpenChange,
  connectionId,
  databaseName,
  schema,
  tableName,
}: ExportDataModalProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-lg">
        <ExportDataProvider
          connectionId={connectionId}
          databaseName={databaseName}
          schema={schema}
          tableName={tableName}
        >
          <ModalForm.Header />
          <ExportDataFields />
          <ModalForm.Alert />
          <ExportDataFooterBridge />
        </ExportDataProvider>
      </DialogContent>
    </Dialog>
  );
}
