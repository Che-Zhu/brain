import type { FlatMongoFilter } from "@data-browser/components/database/mongodb/filter-collection.types";
import type { Alert } from "@data-browser/components/database/shared/types";

// ---- Document changeset types ----

export type DocumentChangesetRowKey = string;

export interface DocumentChange {
  document: Record<string, unknown>;
  originalDocument: Record<string, unknown>;
  type: "update" | "insert" | "delete";
}

export interface DocumentUndoEntryEdit {
  kind: "edit";
  previousDocument: Record<string, unknown>;
  rowKey: DocumentChangesetRowKey;
}

export interface DocumentUndoEntryAdd {
  kind: "add";
  rowKey: DocumentChangesetRowKey;
}

export interface DocumentUndoEntryDelete {
  kind: "delete";
  previousChanges: Array<[DocumentChangesetRowKey, DocumentChange | undefined]>;
  rowKeys: DocumentChangesetRowKey[];
}

export type DocumentUndoEntry =
  | DocumentUndoEntryEdit
  | DocumentUndoEntryAdd
  | DocumentUndoEntryDelete;

/** Context value exposed by CollectionViewProvider. */
export interface CollectionViewContextValue {
  actions: CollectionViewActions;
  state: CollectionViewState;
}

/** All state managed by the CollectionView provider. */
export interface CollectionViewState {
  activeFilter: FlatMongoFilter;
  addContent: string;
  alert: Alert | null;
  availableFields: string[];

  // Changeset state
  changes: Map<DocumentChangesetRowKey, DocumentChange>;
  currentPage: number;
  documents: any[];
  editContent: string;
  editingRowKey: DocumentChangesetRowKey | null;
  error: string | null;
  hasPendingChanges: boolean;
  isFilterModalOpen: boolean;
  loading: boolean;
  newRowOrder: DocumentChangesetRowKey[];
  pageSize: number;
  pendingChangeCount: number;
  searchTerm: string;
  selectedRowKeys: Set<DocumentChangesetRowKey>;

  // Document editing (modal-based add/edit)
  showAddModal: boolean;
  showDiscardModal: boolean;
  showExportModal: boolean;
  showPreviewModal: boolean;
  showSubmitModal: boolean;
  total: number;
  totalPages: number;
  undoStack: DocumentUndoEntry[];
}

/** All actions exposed by the CollectionView provider. */
export interface CollectionViewActions {
  cancelEdit: () => void;
  closeAlert: () => void;
  confirmDiscardAndContinue: () => void;
  discardChanges: () => void;

  // Document editing (modal-based add/edit)
  handleAddClick: () => void;
  handleAddSave: () => Promise<void>;
  handleEditClick: (rowKey: DocumentChangesetRowKey) => void;
  handleEditSave: () => Promise<void>;
  handleFilterApply: (filter: FlatMongoFilter) => void;
  handlePageChange: (page: number) => void;
  handlePageSizeChange: (size: number) => void;
  markSelectedForDelete: () => void;
  refresh: () => void;
  setAddContent: (content: string) => void;
  setEditContent: (content: string) => void;
  setIsFilterModalOpen: (open: boolean) => void;
  setSearchTerm: (term: string) => void;
  setShowAddModal: (open: boolean) => void;
  setShowDiscardModal: (open: boolean) => void;
  setShowExportModal: (open: boolean) => void;
  setShowPreviewModal: (open: boolean) => void;
  setShowSubmitModal: (open: boolean) => void;
  showAlert: (title: string, message: string, type: Alert["type"]) => void;
  submitChanges: () => Promise<void>;

  // Changeset actions
  toggleRowSelection: (rowKey: DocumentChangesetRowKey) => void;
  undoLastChange: () => void;
}
