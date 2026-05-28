import {
  type AccessExportFormat,
  DATA_BROWSER_EXPORT_FORMATS,
  exportObject,
} from "@data-browser/api/access-adapter";
import type { AccessObjectRef } from "@data-browser/api/access-types";
import { Button } from "@data-browser/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@data-browser/components/ui/dialog";
import { useDataBrowserRuntime } from "@data-browser/runtime";
import { downloadBlob } from "@data-browser/utils/export-utils";
import { Download, FileText, Loader2 } from "lucide-react";
import { useState } from "react";

interface SingleObjectExportModalProps {
  objectRef: AccessObjectRef;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title?: string;
}

const FORMAT_LABELS: Record<AccessExportFormat, string> = {
  csv: "CSV",
  ndjson: "NDJSON",
};

export function SingleObjectExportModal({
  objectRef,
  onOpenChange,
  open,
  title,
}: SingleObjectExportModalProps) {
  const runtime = useDataBrowserRuntime();
  const [format, setFormat] = useState<AccessExportFormat>("csv");
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setIsExporting(true);
    setError(null);

    try {
      const result = await exportObject({ format, ref: objectRef, runtime });
      downloadBlob(result.blob, result.filename);
      onOpenChange(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unknown error");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title ?? "Export"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            {DATA_BROWSER_EXPORT_FORMATS.map((option) => (
              <Button
                className="justify-start gap-2"
                disabled={isExporting}
                key={option}
                onClick={() => setFormat(option)}
                type="button"
                variant={format === option ? "default" : "outline"}
              >
                <FileText className="h-4 w-4" />
                {FORMAT_LABELS[option]}
              </Button>
            ))}
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            className="gap-2"
            disabled={isExporting}
            onClick={handleExport}
            type="button"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {"Export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
