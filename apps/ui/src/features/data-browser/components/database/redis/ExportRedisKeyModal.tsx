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
import { useGetStorageUnitRowsLazyQuery } from "@data-browser/generated/graphql";
import { useI18n } from "@data-browser/i18n/useI18n";
import { useConnectionStore } from "@data-browser/stores/useConnectionStore";
import { resolveSchemaParam } from "@data-browser/utils/database-features";
import {
  downloadBlob,
  toCSV,
  toExcel,
  toJSON,
} from "@data-browser/utils/export-utils";
import { Download, FileJson, FileSpreadsheet, FileText } from "lucide-react";
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

type ExportFormat = "csv" | "json" | "excel";

const FORMAT_OPTIONS: FormatOption<ExportFormat>[] = [
  { id: "csv", label: "CSV", icon: FileText },
  { id: "json", label: "JSON", icon: FileJson },
  { id: "excel", label: "Excel", icon: FileSpreadsheet },
];

const FORMAT_EXTENSIONS: Record<ExportFormat, string> = {
  csv: "csv",
  json: "json",
  excel: "xlsx",
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface ExportRedisKeyCtxValue {
  format: ExportFormat;
  handleExport: () => void;
  isSuccess: boolean;
  rowLimit: number | "";
  setFormat: (v: ExportFormat) => void;
  setRowLimit: (v: number | "") => void;
}

const ExportRedisKeyCtx = createContext<ExportRedisKeyCtxValue | null>(null);

function useExportRedisKeyCtx(): ExportRedisKeyCtxValue {
  const ctx = use(ExportRedisKeyCtx);
  if (!ctx) {
    throw new Error(
      "useExportRedisKeyCtx must be used within ExportRedisKeyProvider"
    );
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

function ExportRedisKeyProvider({
  connectionId,
  databaseName,
  keyName,
  children,
}: {
  connectionId: string;
  databaseName: string;
  keyName: string;
  children: ReactNode;
}) {
  const { t } = useI18n();

  return (
    <ModalForm.Provider
      meta={{ title: t("redis.export.title"), icon: Download }}
    >
      <ExportRedisKeyBridge
        connectionId={connectionId}
        databaseName={databaseName}
        keyName={keyName}
      >
        {children}
      </ExportRedisKeyBridge>
    </ModalForm.Provider>
  );
}

function ExportRedisKeyBridge({
  connectionId,
  databaseName,
  keyName,
  children,
}: {
  connectionId: string;
  databaseName: string;
  keyName: string;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [rowLimit, setRowLimit] = useState<number | "">("");
  const [isSuccess, setIsSuccess] = useState(false);
  const { actions } = useModalForm();
  const [getRows] = useGetStorageUnitRowsLazyQuery({ fetchPolicy: "no-cache" });
  const connections = useConnectionStore((s) => s.connections);

  const handleExport = useCallback(async () => {
    actions.setSubmitting(true);
    actions.closeAlert();
    setIsSuccess(false);

    try {
      const conn = connections.find((c) => c.id === connectionId);
      if (!conn) {
        throw new Error("Connection not found");
      }

      const schema = resolveSchemaParam(conn.type, databaseName);
      const pageSize = rowLimit === "" ? 100_000 : rowLimit;

      const { data: result, error: gqlError } = await getRows({
        variables: { schema, storageUnit: keyName, pageSize, pageOffset: 0 },
        context: { database: databaseName },
      });

      if (gqlError) {
        throw new Error(gqlError.message);
      }

      const columns = result?.Row?.Columns;
      const rows = result?.Row?.Rows;
      if (!(columns?.length && rows?.length)) {
        actions.setAlert({
          type: "error",
          title: t("redis.export.failed"),
          message: t("redis.export.noData"),
        });
        return;
      }

      let blob: Blob;
      switch (format) {
        case "csv":
          blob = toCSV(columns, rows);
          break;
        case "json":
          blob = toJSON(columns, rows);
          break;
        case "excel":
          blob = toExcel(keyName, columns, rows);
          break;
      }

      downloadBlob(blob, `${keyName}.${FORMAT_EXTENSIONS[format]}`);
      setIsSuccess(true);
    } catch (err: any) {
      actions.setAlert({
        type: "error",
        title: t("redis.export.failed"),
        message: err.message || String(err),
      });
    } finally {
      actions.setSubmitting(false);
    }
  }, [
    actions,
    connectionId,
    connections,
    databaseName,
    format,
    getRows,
    keyName,
    rowLimit,
    t,
  ]);

  return (
    <ExportRedisKeyCtx
      value={{
        format,
        setFormat,
        rowLimit,
        setRowLimit,
        isSuccess,
        handleExport,
      }}
    >
      {children}
    </ExportRedisKeyCtx>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function ExportRedisKeyFields() {
  const { t } = useI18n();
  const { format, setFormat, rowLimit, setRowLimit, isSuccess } =
    useExportRedisKeyCtx();
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
          {t("redis.export.rowLimit")}
        </label>
        <Input
          disabled={disabled}
          min={1}
          onChange={(e) =>
            setRowLimit(
              e.target.value === "" ? "" : Number.parseInt(e.target.value, 10)
            )
          }
          placeholder={t("redis.export.rowLimitPlaceholder")}
          type="number"
          value={rowLimit}
        />
        <p className="text-muted-foreground text-xs">
          {t("redis.export.rowLimitHint")}
        </p>
      </div>

      <ExportProgress isExporting={state.isSubmitting} isSuccess={isSuccess} />
    </div>
  );
}

function ExportRedisKeyFooterBridge() {
  const { isSuccess, handleExport } = useExportRedisKeyCtx();
  return <ExportFooter isSuccess={isSuccess} onClick={handleExport} />;
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

interface ExportRedisKeyModalProps {
  connectionId: string;
  databaseName: string;
  keyName: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export function ExportRedisKeyModal({
  open,
  onOpenChange,
  connectionId,
  databaseName,
  keyName,
}: ExportRedisKeyModalProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-lg">
        <ExportRedisKeyProvider
          connectionId={connectionId}
          databaseName={databaseName}
          keyName={keyName}
        >
          <ModalForm.Header />
          <ExportRedisKeyFields />
          <ModalForm.Alert />
          <ExportRedisKeyFooterBridge />
        </ExportRedisKeyProvider>
      </DialogContent>
    </Dialog>
  );
}
