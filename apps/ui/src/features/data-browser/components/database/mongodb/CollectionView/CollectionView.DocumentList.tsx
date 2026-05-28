import { FindBarContext } from "@data-browser/components/database/shared/FindBar.Provider";
import { useI18n } from "@data-browser/i18n/useI18n";
import { cn } from "@data-browser/lib/utils";
import { FileJson } from "lucide-react";
import { use, useMemo } from "react";
import { useCollectionView } from "./CollectionViewProvider";
import { buildExistingRowKey } from "./useDocumentChangesetManager";

const LEADING_OBJECT_BRACE_PATTERN = /^\{\n/;
const TRAILING_OBJECT_BRACE_PATTERN = /\n\}$/;

/** List of MongoDB document cards with selection checkboxes and change indicators. */
export function CollectionViewDocumentList() {
  const { t } = useI18n();
  const { state } = useCollectionView();
  const findBar = use(FindBarContext);

  const pageOffset = (state.currentPage - 1) * state.pageSize;

  const renderedDocs = useMemo(() => {
    // Pending inserts first — use newRowOrder for stable ordering
    const inserted = state.newRowOrder
      .map((rowKey) => {
        const change = state.changes.get(rowKey);
        if (!change) {
          return null;
        }
        return {
          rowKey,
          doc: change.document,
          changeType: "insert" as const,
          isDeleted: false,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    // Existing documents
    const existing = state.documents.map((doc, idx) => {
      const rowKey = buildExistingRowKey(pageOffset, idx);
      const change = state.changes.get(rowKey);
      return {
        rowKey,
        doc: change?.document ?? doc,
        changeType: change?.type ?? null,
        isDeleted: change?.type === "delete",
      };
    });

    return [...inserted, ...existing];
  }, [state.changes, state.newRowOrder, state.documents, pageOffset]);

  if (state.documents.length === 0 && state.newRowOrder.length === 0) {
    return (
      <div
        className="py-12 text-center"
        data-qa-module="mongodb"
        data-qa-object="document-list"
        data-qa-state="empty"
        data-testid="mongodb.collection.document-list-empty"
      >
        <FileJson className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground text-sm">
          {t("mongodb.collection.noDocuments")}
        </p>
      </div>
    );
  }

  return (
    <>
      {renderedDocs.map((item) => {
        // FindBar matching only applies to existing documents (not pending inserts)
        const existingIdx = state.documents.indexOf(item.doc);
        const findBarIdx = existingIdx >= 0 ? existingIdx : -1;
        const hasMatch =
          findBarIdx >= 0 && findBar?.state.total
            ? findBar.state.matches.some((m) => m.rowIndex === findBarIdx)
            : false;
        const hasCurrentMatch =
          findBarIdx >= 0 && findBar?.state.total
            ? findBar.state.matches[findBar.state.currentMatchIndex]
                ?.rowIndex === findBarIdx
            : false;

        return (
          <div
            className={cn(
              "group relative rounded-xl p-4 transition-colors duration-200",
              // Change type styling
              item.changeType === "insert" &&
                "border border-blue-200 bg-blue-50",
              item.changeType === "delete" &&
                "border border-red-200 bg-red-50/60 opacity-60",
              item.changeType === "update" &&
                "border border-green-200 bg-green-50/60",
              // FindBar match styling (only when no change type)
              !item.changeType &&
                hasCurrentMatch &&
                "border border-blue-300 bg-blue-100 shadow-sm",
              !(item.changeType || hasCurrentMatch) &&
                hasMatch &&
                "border border-blue-200 bg-blue-50/60",
              // Default styling
              !(item.changeType || hasMatch) &&
                "border border-border/50 bg-background hover:bg-muted/30 hover:shadow-sm"
            )}
            data-find-current={hasCurrentMatch ? "true" : undefined}
            data-qa-module="mongodb"
            data-qa-object="document"
            data-qa-resource-id={item.rowKey}
            data-qa-resource-type="document"
            data-qa-state={item.changeType ?? "ready"}
            data-testid="mongodb.collection.document-card"
            key={item.rowKey}
          >
            <div className="relative">
              <pre
                className={cn(
                  "overflow-x-auto font-mono text-foreground/80 text-sm",
                  item.isDeleted && "line-through"
                )}
              >
                {JSON.stringify(item.doc, null, 2)
                  .replace(LEADING_OBJECT_BRACE_PATTERN, "")
                  .replace(TRAILING_OBJECT_BRACE_PATTERN, "")}
              </pre>
            </div>
          </div>
        );
      })}
    </>
  );
}
