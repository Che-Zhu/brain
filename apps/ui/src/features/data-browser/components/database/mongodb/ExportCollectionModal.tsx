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
import { useConnectionStore } from "@data-browser/stores/useConnectionStore";
import { resolveSchemaParam } from "@data-browser/utils/database-features";
import { downloadBlob } from "@data-browser/utils/export-utils";
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

type CollectionExportFormat = "json" | "csv" | "excel";

const FORMAT_OPTIONS: FormatOption<CollectionExportFormat>[] = [
  { id: "json", label: "JSON", icon: FileJson },
  { id: "csv", label: "CSV", icon: FileText },
  { id: "excel", label: "Excel", icon: FileSpreadsheet },
];

const BACKEND_FORMATS: Record<
  CollectionExportFormat,
  "ndjson" | "csv" | "excel"
> = {
  json: "ndjson",
  csv: "csv",
  excel: "excel",
};

const FORMAT_EXTENSIONS: Record<CollectionExportFormat, string> = {
  json: "ndjson",
  csv: "csv",
  excel: "xlsx",
};

function addAuthHeader(headers: Record<string, string>, _databaseName: string) {
  return headers;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface ExportCollectionCtxValue {
  filter: string;
  format: CollectionExportFormat;
  handleExport: () => void;
  isSuccess: boolean;
  limit: number | "";
  setFilter: (v: string) => void;
  setFormat: (v: CollectionExportFormat) => void;
  setLimit: (v: number | "") => void;
}

const ExportCollectionCtx = createContext<ExportCollectionCtxValue | null>(
  null
);

/** Hook to access ExportCollectionModal domain state. Throws if used outside the provider. */
function useExportCollectionCtx(): ExportCollectionCtxValue {
  const ctx = use(ExportCollectionCtx);
  if (!ctx) {
    throw new Error(
      "useExportCollectionCtx must be used within ExportCollectionProvider"
    );
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/** Wraps ModalForm.Provider (complex mode, no onSubmit) and domain context for MongoDB collection export. */
function ExportCollectionProvider({
  connectionId,
  databaseName,
  collectionName,
  children,
}: {
  connectionId: string;
  databaseName: string;
  collectionName: string;
  children: ReactNode;
}) {
  return (
    <ModalForm.Provider
      meta={{
        title: "Export collection",
        description: collectionName,
        icon: Download,
      }}
    >
      <ExportCollectionBridge
        collectionName={collectionName}
        connectionId={connectionId}
        databaseName={databaseName}
      >
        {children}
      </ExportCollectionBridge>
    </ModalForm.Provider>
  );
}

/**
 * Inner bridge that owns domain state and export logic.
 * POSTs to REST `/api/export` endpoint (the only non-GraphQL export modal),
 * maps JSON to NDJSON for backend, triggers download via downloadBlob utility.
 */
function ExportCollectionBridge({
  connectionId,
  databaseName,
  collectionName,
  children,
}: {
  connectionId: string;
  databaseName: string;
  collectionName: string;
  children: ReactNode;
}) {
  const { connections } = useConnectionStore();
  const [format, setFormat] = useState<CollectionExportFormat>("json");
  const [filter, setFilter] = useState("");
  const [limit, setLimit] = useState<number | "">("");
  const [isSuccess, setIsSuccess] = useState(false);
  const { actions } = useModalForm();

  const handleExport = useCallback(async () => {
    actions.setSubmitting(true);
    actions.closeAlert();
    setIsSuccess(false);

    try {
      const connection = connections.find((c) => c.id === connectionId);
      if (!connection) {
        throw new Error("Connection not found");
      }

      const graphqlSchema = resolveSchemaParam(connection.type, databaseName);
      const backendFormat = BACKEND_FORMATS[format];

      const response = await fetch("/api/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...addAuthHeader({}, databaseName),
        },
        body: JSON.stringify({
          schema: graphqlSchema,
          storageUnit: collectionName,
          format: backendFormat,
          filter: filter.trim() || undefined,
          limit: typeof limit === "number" ? limit : undefined,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Export failed with status ${response.status}`);
      }

      const disposition = response.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename="(.+)"/);
      const filename =
        filenameMatch?.[1] ??
        `${collectionName}_export.${FORMAT_EXTENSIONS[format]}`;

      const blob = await response.blob();
      downloadBlob(blob, filename);

      setIsSuccess(true);
    } catch (e: any) {
      actions.setAlert({
        type: "error",
        title: "Export failed",
        message:
          e.message || "An error occurred while exporting the collection.",
      });
    } finally {
      actions.setSubmitting(false);
    }
  }, [
    actions,
    collectionName,
    connectionId,
    connections,
    databaseName,
    filter,
    format,
    limit,
  ]);

  return (
    <ExportCollectionCtx
      value={{
        format,
        setFormat,
        filter,
        setFilter,
        limit,
        setLimit,
        isSuccess,
        handleExport,
      }}
    >
      {children}
    </ExportCollectionCtx>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

/** Format selector, filter query, row limit, and progress display. */
function ExportCollectionFields() {
  const { format, setFormat, filter, setFilter, limit, setLimit, isSuccess } =
    useExportCollectionCtx();
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
          {"Filter query"}
        </label>
        <Input
          className="font-mono text-sm"
          disabled={disabled}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={"{ }"}
          value={filter}
        />
        <p className="text-muted-foreground text-xs">
          {'Use a MongoDB query filter, for example { status: "active" }.'}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="font-medium text-foreground text-sm">
          {"Limit rows"}
        </label>
        <Input
          className="font-mono text-sm"
          disabled={disabled}
          min={1}
          onChange={(e) =>
            setLimit(e.target.value ? Number.parseInt(e.target.value, 10) : "")
          }
          placeholder={"Optional row limit"}
          type="number"
          value={limit}
        />
      </div>

      <ExportProgress isExporting={state.isSubmitting} isSuccess={isSuccess} />
    </div>
  );
}

/** Footer bridge: reads isSuccess and handleExport from domain context, delegates to shared ExportFooter. */
function ExportCollectionFooterBridge() {
  const { isSuccess, handleExport } = useExportCollectionCtx();
  return <ExportFooter isSuccess={isSuccess} onClick={handleExport} />;
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

interface ExportCollectionModalProps {
  collectionName: string;
  connectionId: string;
  databaseName: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

/** Modal for exporting a MongoDB collection via REST `/api/export` endpoint. */
export function ExportCollectionModal({
  open,
  onOpenChange,
  connectionId,
  databaseName,
  collectionName,
}: ExportCollectionModalProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-lg">
        <ExportCollectionProvider
          collectionName={collectionName}
          connectionId={connectionId}
          databaseName={databaseName}
        >
          <ModalForm.Header />
          <ExportCollectionFields />
          <ModalForm.Alert />
          <ExportCollectionFooterBridge />
        </ExportCollectionProvider>
      </DialogContent>
    </Dialog>
  );
}
