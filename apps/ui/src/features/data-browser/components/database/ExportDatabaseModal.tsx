import {
  ExportFooter,
  ExportProgress,
} from "@data-browser/components/database/shared/ExportProgress";
import {
  type FormatOption,
  FormatSelector,
} from "@data-browser/components/database/shared/FormatSelector";
import { Dialog, DialogContent } from "@data-browser/components/ui/dialog";
import { ModalForm, useModalForm } from "@data-browser/components/ui/ModalForm";
import { useRawExecuteLazyQuery } from "@data-browser/generated/graphql";
import { useConnectionStore } from "@data-browser/stores/useConnectionStore";
import {
  buildDatabaseExportPlan,
  formatDatabaseExportEntryName,
  formatDatabaseExportTargetName,
} from "@data-browser/utils/database-export";
import { buildStorageUnitReference } from "@data-browser/utils/ddl-sql";
import {
  downloadBlob,
  toCSV,
  toExcel,
  toJSON,
  toSQL,
} from "@data-browser/utils/export-utils";
import JSZip from "jszip";
import {
  Database,
  FileCode,
  FileJson,
  FileSpreadsheet,
  FileText,
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
  { id: "sql", label: "SQL", icon: FileCode },
  { id: "json", label: "JSON", icon: FileJson },
  { id: "csv", label: "CSV", icon: FileText },
  { id: "excel", label: "Excel", icon: FileSpreadsheet },
];

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface ExportDatabaseCtxValue {
  format: ExportFormat;
  handleExport: () => void;
  isSuccess: boolean;
  setFormat: (v: ExportFormat) => void;
  statusText: string;
}

const ExportDatabaseCtx = createContext<ExportDatabaseCtxValue | null>(null);

/** Hook to access ExportDatabaseModal domain state. Throws if used outside the provider. */
function useExportDatabaseCtx(): ExportDatabaseCtxValue {
  const ctx = use(ExportDatabaseCtx);
  if (!ctx) {
    throw new Error(
      "useExportDatabaseCtx must be used within ExportDatabaseProvider"
    );
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/** Wraps ModalForm.Provider (complex mode, no onSubmit) and domain context for database ZIP export. */
function ExportDatabaseProvider({
  connectionId,
  databaseName,
  schema,
  children,
}: {
  connectionId: string;
  databaseName: string;
  schema: string;
  children: ReactNode;
}) {
  return (
    <ModalForm.Provider
      meta={{
        title: "Export database",
        description: databaseName,
        icon: Database,
      }}
    >
      <ExportDatabaseBridge
        connectionId={connectionId}
        databaseName={databaseName}
        schema={schema}
      >
        {children}
      </ExportDatabaseBridge>
    </ModalForm.Provider>
  );
}

/**
 * Inner bridge that owns domain state and multi-table export logic.
 * Fetches table list via GraphQL, iterates each table, converts to selected format,
 * bundles into ZIP via JSZip, triggers download. Partial failures surface as an info alert.
 */
function ExportDatabaseBridge({
  connectionId,
  databaseName,
  schema,
  children,
}: {
  connectionId: string;
  databaseName: string;
  schema: string;
  children: ReactNode;
}) {
  const [format, setFormat] = useState<ExportFormat>("sql");
  const [isSuccess, setIsSuccess] = useState(false);
  const [statusText, setStatusText] = useState("");
  const { actions } = useModalForm();
  const [executeQuery] = useRawExecuteLazyQuery({ fetchPolicy: "no-cache" });
  const connections = useConnectionStore((s) => s.connections);
  const fetchSchemas = useConnectionStore((s) => s.fetchSchemas);
  const fetchTables = useConnectionStore((s) => s.fetchTables);
  const systemSchemas = useConnectionStore((s) => s.systemSchemas);
  const showSystemObjectsFor = useConnectionStore(
    (s) => s.showSystemObjectsFor
  );

  const handleExport = useCallback(async () => {
    actions.setSubmitting(true);
    actions.closeAlert();
    setIsSuccess(false);
    setStatusText("Fetching table list...");

    try {
      const connectionType = connections.find(
        (connection) => connection.id === connectionId
      )?.type;
      const databaseNodeId = `${connectionId}-${databaseName}`;
      const allSchemas =
        connectionType === "POSTGRES"
          ? await fetchSchemas(connectionId, databaseName)
          : [];
      const schemasToExport = buildDatabaseExportPlan({
        connectionType,
        fallbackSchema: schema,
        allSchemas,
        systemSchemas,
        includeSystemSchemas: showSystemObjectsFor.has(databaseNodeId),
      });
      const exportTargets: Array<{ schema: string; tableName: string }> = [];

      for (const schemaName of schemasToExport) {
        const tables = await fetchTables(
          connectionId,
          databaseName,
          schemaName
        );
        for (const table of tables) {
          exportTargets.push({ schema: schemaName, tableName: table.name });
        }
      }

      if (exportTargets.length === 0) {
        throw new Error("No tables found to export.");
      }

      const zip = new JSZip();
      const failedTables: string[] = [];

      for (let i = 0; i < exportTargets.length; i++) {
        const target = exportTargets[i];
        if (!target) {
          continue;
        }
        const targetLabel = formatDatabaseExportTargetName(
          connectionType,
          target.schema,
          target.tableName
        );
        setStatusText(
          `Exporting table ${targetLabel} (${i + 1}/${exportTargets.length})...`
        );

        try {
          const qualifiedName = buildStorageUnitReference(
            connectionType,
            target.tableName,
            target.schema
          );
          const { data, error } = await executeQuery({
            variables: { query: `SELECT * FROM ${qualifiedName}` },
            context: { database: databaseName },
          });

          if (error || !data?.RawExecute) {
            failedTables.push(targetLabel);
            continue;
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
              blob = toExcel(target.tableName, Columns, Rows);
              break;
          }

          zip.file(
            formatDatabaseExportEntryName(
              connectionType,
              target.schema,
              target.tableName,
              format
            ),
            blob
          );
        } catch {
          failedTables.push(targetLabel);
        }
      }

      setStatusText("Generating ZIP archive...");

      const zipBlob = await zip.generateAsync({ type: "blob" });
      downloadBlob(zipBlob, `export_${databaseName}.zip`);

      setIsSuccess(true);

      if (failedTables.length > 0) {
        actions.setAlert({
          type: "info",
          title: "Export completed with skipped tables",
          message: `Exported ${exportTargets.length - failedTables.length} of ${exportTargets.length} tables. Failed: ${failedTables.join(", ")}`,
        });
      }
    } catch (err: any) {
      actions.setAlert({
        type: "error",
        title: "Export failed",
        message: err.message || "Unknown error",
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
    fetchSchemas,
    fetchTables,
    format,
    schema,
    showSystemObjectsFor,
    systemSchemas,
  ]);

  return (
    <ExportDatabaseCtx
      value={{ format, setFormat, isSuccess, statusText, handleExport }}
    >
      {children}
    </ExportDatabaseCtx>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

/** Format selector and progress display for database export. */
function ExportDatabaseFields() {
  const { format, setFormat, isSuccess, statusText } = useExportDatabaseCtx();
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
      <ExportProgress
        isExporting={state.isSubmitting}
        isSuccess={isSuccess}
        statusText={statusText}
      />
    </div>
  );
}

/** Footer bridge: reads isSuccess and handleExport from domain context, delegates to shared ExportFooter. */
function ExportDatabaseFooterBridge() {
  const { isSuccess, handleExport } = useExportDatabaseCtx();
  return <ExportFooter isSuccess={isSuccess} onClick={handleExport} />;
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

interface ExportDatabaseModalProps {
  connectionId: string;
  databaseName: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  schema: string;
}

/** Modal for exporting all tables in a database as a ZIP archive. */
export function ExportDatabaseModal({
  open,
  onOpenChange,
  connectionId,
  databaseName,
  schema,
}: ExportDatabaseModalProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-lg">
        <ExportDatabaseProvider
          connectionId={connectionId}
          databaseName={databaseName}
          schema={schema}
        >
          <ModalForm.Header />
          <ExportDatabaseFields />
          <ModalForm.Alert />
          <ExportDatabaseFooterBridge />
        </ExportDatabaseProvider>
      </DialogContent>
    </Dialog>
  );
}
