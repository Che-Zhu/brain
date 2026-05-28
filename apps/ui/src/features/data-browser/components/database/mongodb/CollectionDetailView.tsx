import { DataView } from "@data-browser/components/database/shared/DataView";
import { FindBar } from "@data-browser/components/database/shared/FindBar";
import { SingleObjectExportModal } from "@data-browser/components/database/shared/SingleObjectExportModal";
import { AlertModal } from "@data-browser/components/ui/AlertModal";
import { ConfirmationModal } from "@data-browser/components/ui/ConfirmationModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@data-browser/components/ui/dialog";
import { ScrollArea } from "@data-browser/components/ui/scroll-area";
import { useI18n } from "@data-browser/i18n/useI18n";
import { useMemo } from "react";
import { AddDocumentModal } from "./CollectionView/CollectionView.AddDocumentModal";
import { CollectionViewDocumentList } from "./CollectionView/CollectionView.DocumentList";
import { EditDocumentModal } from "./CollectionView/CollectionView.EditDocumentModal";
import { CollectionViewToolbar } from "./CollectionView/CollectionView.Toolbar";
import {
  CollectionViewProvider,
  useCollectionView,
} from "./CollectionView/CollectionViewProvider";
import {
  buildPreviewCommands,
  summarizeChanges,
} from "./CollectionView/changeset-mongo-preview";

interface CollectionDetailViewProps {
  collectionName: string;
  connectionId: string;
  databaseName: string;
}

/** MongoDB collection detail view composed from Provider + subcomponents. */
export function CollectionDetailView(props: CollectionDetailViewProps) {
  return (
    <CollectionViewProvider {...props}>
      <CollectionDetailViewContent {...props} />
    </CollectionViewProvider>
  );
}

/** Inner content rendered within the CollectionViewProvider context. */
function CollectionDetailViewContent({
  databaseName,
  collectionName,
  connectionId,
}: CollectionDetailViewProps) {
  const { t } = useI18n();
  const { state, actions } = useCollectionView();

  const previewCommands = buildPreviewCommands(collectionName, state.changes);
  const summary = summarizeChanges(state.changes);

  /** Extract all top-level field names from visible documents for FindBar. */
  const docColumns = useMemo(() => {
    const keys = new Set<string>();
    for (const doc of state.documents) {
      if (typeof doc === "object" && doc !== null) {
        for (const key of Object.keys(doc)) {
          keys.add(key);
        }
      }
    }
    return Array.from(keys);
  }, [state.documents]);

  if (state.loading && !state.documents.length && !state.showAddModal) {
    return (
      <div
        className="flex h-full"
        data-qa-connection-id={connectionId}
        data-qa-database={databaseName}
        data-qa-loading="true"
        data-qa-module="mongodb"
        data-qa-object="collection-detail"
        data-qa-resource-id={collectionName}
        data-qa-resource-type="collection"
        data-qa-state="loading"
        data-testid="mongodb.collection.detail-loading"
      >
        <DataView.Loading />
      </div>
    );
  }

  return (
    <div
      className="flex h-full flex-col bg-background"
      data-qa-connection-id={connectionId}
      data-qa-database={databaseName}
      data-qa-loading={state.loading ? "true" : "false"}
      data-qa-module="mongodb"
      data-qa-object="collection-detail"
      data-qa-resource-id={collectionName}
      data-qa-resource-type="collection"
      data-qa-state={
        state.error ? "error" : state.loading ? "loading" : "ready"
      }
      data-testid="mongodb.collection.detail"
    >
      <CollectionViewToolbar
        collectionName={collectionName}
        connectionId={connectionId}
        databaseName={databaseName}
      />

      {state.error ? (
        <DataView.Error message={state.error} />
      ) : (
        <FindBar.Provider
          columns={docColumns}
          onSearchTermChange={actions.setSearchTerm}
          rows={state.documents}
          searchTerm={state.searchTerm}
        >
          <FindBar.Bar />
          <div
            className="flex-1 space-y-4 overflow-auto p-4"
            data-qa-module="mongodb"
            data-qa-object="document-list"
            data-qa-state={state.documents.length > 0 ? "ready" : "empty"}
            data-testid="mongodb.collection.document-list-region"
          >
            <CollectionViewDocumentList />
          </div>
        </FindBar.Provider>
      )}

      {state.total > 0 && (
        <DataView.Pagination
          currentPage={state.currentPage}
          itemLabel={t("mongodb.collection.documents")}
          loading={state.loading}
          onPageChange={actions.handlePageChange}
          onPageSizeChange={actions.handlePageSizeChange}
          pageSize={state.pageSize}
          total={state.total}
          totalPages={state.totalPages}
        />
      )}

      <AddDocumentModal
        content={state.addContent}
        onContentChange={actions.setAddContent}
        onOpenChange={actions.setShowAddModal}
        onSave={actions.handleAddSave}
        open={state.showAddModal}
      />

      <EditDocumentModal
        content={state.editContent}
        onContentChange={actions.setEditContent}
        onOpenChange={(open) => {
          if (!open) {
            actions.cancelEdit();
          }
        }}
        onSave={actions.handleEditSave}
        open={state.editingRowKey !== null}
      />

      <SingleObjectExportModal
        objectRef={{ kind: "collection", path: [databaseName, collectionName] }}
        onOpenChange={(open) => {
          if (!open) {
            actions.setShowExportModal(false);
          }
        }}
        open={state.showExportModal}
        title={collectionName}
      />

      <Dialog
        onOpenChange={actions.setShowPreviewModal}
        open={state.showPreviewModal}
      >
        <DialogContent
          className="sm:max-w-3xl"
          data-qa-module="mongodb"
          data-qa-object="changes-preview"
          data-qa-resource-id={collectionName}
          data-qa-resource-type="collection"
          data-qa-risk="resource_mutation"
          data-qa-state="open"
          data-testid="mongodb.collection.changes-preview-dialog"
        >
          <DialogHeader>
            <DialogTitle>{t("mongodb.changes.previewTitle")}</DialogTitle>
            <DialogDescription>
              {t("mongodb.changes.previewDescription", {
                count: state.pendingChangeCount,
              })}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] rounded-md border bg-muted/20">
            <pre
              className="whitespace-pre-wrap p-4 font-mono text-xs"
              data-qa-module="mongodb"
              data-qa-object="changes-preview"
              data-qa-state={state.pendingChangeCount > 0 ? "ready" : "empty"}
              data-testid="mongodb.collection.changes-preview-command"
            >
              {previewCommands.join("\n\n")}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <ConfirmationModal
        confirmText={t("common.actions.confirm")}
        isOpen={state.showSubmitModal}
        message={t("mongodb.changes.submitConfirmMessage", {
          updates: summary.updates,
          inserts: summary.inserts,
          deletes: summary.deletes,
        })}
        onClose={() => actions.setShowSubmitModal(false)}
        onConfirm={actions.submitChanges}
        title={t("mongodb.changes.submitConfirmTitle", {
          count: state.pendingChangeCount,
        })}
      />

      <ConfirmationModal
        confirmText={t("common.actions.discard")}
        isOpen={state.showDiscardModal}
        message={t("mongodb.changes.discardMessage", {
          count: state.pendingChangeCount,
        })}
        onClose={() => actions.setShowDiscardModal(false)}
        onConfirm={actions.confirmDiscardAndContinue}
        title={t("mongodb.changes.discardTitle")}
      />

      {state.alert && (
        <AlertModal isOpen onClose={actions.closeAlert} {...state.alert} />
      )}
    </div>
  );
}
