import type { Alert } from "@data-browser/components/database/shared/types";
import type { TableData } from "@data-browser/utils/graphql-transforms";

export type ChangesetCellValue = string | null;
export type ChangesetRowKey = string;

export interface UndoEntryCell {
  column: string;
  kind: "cell";
  newValue: ChangesetCellValue;
  oldValue: ChangesetCellValue;
  rowKey: ChangesetRowKey;
}

export interface UndoEntryAddRow {
  kind: "add-row";
  rowKey: ChangesetRowKey;
}

export interface UndoEntryDeleteRows {
  kind: "delete-rows";
  previousChanges: Array<[ChangesetRowKey, RowChange | undefined]>;
  rowKeys: ChangesetRowKey[];
}

export type UndoEntry = UndoEntryCell | UndoEntryAddRow | UndoEntryDeleteRows;

export interface RowChange {
  cells: Record<string, { old: ChangesetCellValue; new: ChangesetCellValue }>;
  originalRow: Record<string, ChangesetCellValue>;
  type: "update" | "insert" | "delete";
  values: Record<string, ChangesetCellValue>;
}

export interface RenderedTableRow {
  changeType: RowChange["type"] | null;
  isDeleted: boolean;
  isInserted: boolean;
  originalRow: Record<string, ChangesetCellValue>;
  rowKey: ChangesetRowKey;
  rowNumber: number | null;
  sourceRowIndex: number | null;
  values: Record<string, ChangesetCellValue>;
}

export type ChangesetAction =
  | {
      type: "activate-cell";
      rowKey: ChangesetRowKey;
      column: string;
      initialValue?: string;
    }
  | { type: "deactivate-cell" }
  | { type: "update-active-draft"; value: string }
  | {
      type: "commit-active-cell";
      rowKey: ChangesetRowKey;
      column: string;
      originalRow: Record<string, ChangesetCellValue>;
      previousValue: ChangesetCellValue;
      value: ChangesetCellValue;
    }
  | { type: "toggle-selection"; rowKey: ChangesetRowKey }
  | {
      type: "add-row";
      rowKey: ChangesetRowKey;
      initialValues: Record<string, ChangesetCellValue>;
    }
  | {
      type: "delete-selected";
      rows: Array<{
        rowKey: ChangesetRowKey;
        originalRow: Record<string, ChangesetCellValue>;
        isInserted?: boolean;
      }>;
    }
  | { type: "undo" }
  | { type: "discard-all" }
  | { type: "prune-successes"; rowKeys: ChangesetRowKey[] }
  | { type: "set-show-preview-modal"; open: boolean }
  | { type: "set-show-submit-modal"; open: boolean }
  | { type: "set-show-discard-modal"; open: boolean };

/** Context value exposed by TableViewProvider. */
export interface TableViewContextValue {
  actions: TableViewActions;
  state: TableViewState;
}

/** All state managed by the TableView provider. */
export interface TableViewState {
  activeCell: { rowKey: ChangesetRowKey; column: string } | null;
  activeColumnMenu: string | null;
  activeDraftValue: string;
  alert: Alert | null;
  canEdit: boolean;
  changes: Map<ChangesetRowKey, RowChange>;
  columnWidths: Record<string, number>;
  currentPage: number;
  data: TableData | null;
  error: string | null;
  filterConditions: FilterCondition[];
  foreignKeyColumns: string[];
  hasPendingChanges: boolean;
  isFilterModalOpen: boolean;
  loading: boolean;
  pageSize: number;
  pendingChangeCount: number;
  primaryKey: string | null;
  renderedRows: RenderedTableRow[];
  resizedColumns: Set<string>;
  resizingColumn: string | null;
  searchTerm: string;
  selectedRowKeys: Set<ChangesetRowKey>;
  showDiscardModal: boolean;
  showExportModal: boolean;
  showPreviewModal: boolean;
  showSubmitModal: boolean;
  sortColumn: string | null;
  sortDirection: "asc" | "desc" | null;
  total: number;
  totalPages: number;
  undoStack: UndoEntry[];
  visibleColumns: string[];
}

/** All actions exposed by the TableView provider. */
export interface TableViewActions {
  activateCell: (rowKey: ChangesetRowKey, column: string) => void;
  addPendingRow: () => void;
  clearSort: () => void;
  closeAlert: () => void;
  confirmDiscardAndContinue: () => void;
  deactivateCell: () => void;
  discardChanges: () => void;
  handleFilterApply: (cols: string[], conditions: FilterCondition[]) => void;
  handlePageChange: (page: number) => void;
  handlePageSizeChange: (size: number) => void;
  handleResizeStart: (e: React.MouseEvent, column: string) => void;
  handleSearchSubmit: () => void;
  handleSort: (column: string, direction: "asc" | "desc") => void;
  handleSubmitRequest: (overridePageOffset?: number) => Promise<void>;
  markSelectedRowsForDelete: () => void;
  moveActiveCell: (direction: "left" | "right" | "up" | "down") => void;
  refresh: () => void;
  setActiveColumnMenu: (col: string | null) => void;
  setIsFilterModalOpen: (open: boolean) => void;
  setSearchTerm: (term: string) => void;
  setShowDiscardModal: (open: boolean) => void;
  setShowExportModal: (open: boolean) => void;
  setShowPreviewModal: (open: boolean) => void;
  setShowSubmitModal: (open: boolean) => void;
  showAlert: (title: string, message: string, type: Alert["type"]) => void;
  submitChanges: () => Promise<void>;
  toggleRowSelection: (rowKey: ChangesetRowKey) => void;
  undoLastChange: () => void;
  updateActiveCellValue: (value: string) => void;
}

/** A single filter condition for SQL WHERE clause. */
export interface FilterCondition {
  column: string;
  id: string;
  operator: string;
  value: string;
}
