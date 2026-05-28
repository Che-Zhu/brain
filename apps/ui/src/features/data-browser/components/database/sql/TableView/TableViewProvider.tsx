import type { AccessObjectRef } from "@data-browser/api/access-types";
import type { Alert } from "@data-browser/components/database/shared/types";
import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  FilterCondition,
  RenderedTableRow,
  TableViewActions,
  TableViewContextValue,
  TableViewState,
} from "./types";
import type { ChangesetManagerState } from "./useChangesetManager";
import { useColumnResize } from "./useColumnResize";
import { useDataQuery } from "./useDataQuery";

const TableViewCtx = createContext<TableViewContextValue | null>(null);

/** Hook to access TableView context. Throws if used outside TableViewProvider. */
export function useTableView(): TableViewContextValue {
  const ctx = use(TableViewCtx);
  if (!ctx) {
    throw new Error("useTableView must be used within TableViewProvider");
  }
  return ctx;
}

/** Simplify verbose PostgreSQL column type names for display. */
export function simplifyColumnType(typeStr: string): string {
  if (!typeStr) {
    return "";
  }
  return typeStr
    .replace(/ varying/gi, "")
    .replace(/ without time zone/gi, "")
    .replace(/ with time zone/gi, " tz")
    .replace(/character/gi, "char")
    .replace(/double precision/gi, "double")
    .trim();
}

interface TableViewProviderProps {
  children: ReactNode;
  connectionId: string;
  databaseName: string;
  objectRef: AccessObjectRef;
  schema?: string;
  tableName: string;
}

function buildExistingRowKey(pageOffset: number, sourceRowIndex: number) {
  return `existing-${pageOffset + sourceRowIndex}`;
}

const NOOP = (..._args: unknown[]) => undefined;
const ASYNC_NOOP = async (..._args: unknown[]) => undefined;
const EMPTY_SET = new Set<string>();

function normalizeCellValue(value: unknown) {
  return value == null ? null : String(value);
}

const EMPTY_CHANGESET_STATE: ChangesetManagerState = {
  activeCell: null,
  activeDraftValue: "",
  changes: new Map(),
  newRowCounter: 0,
  newRowOrder: [],
  selectedRowKeys: EMPTY_SET,
  showDiscardModal: false,
  showPreviewModal: false,
  showSubmitModal: false,
  undoStack: [],
};
const READ_ONLY_CHANGESET_ACTIONS = {
  activateCell: NOOP,
  deactivateCell: NOOP,
  updateActiveCellValue: NOOP,
  moveActiveCell: NOOP,
  toggleRowSelection: NOOP,
  addPendingRow: NOOP,
  markSelectedRowsForDelete: NOOP,
  undoLastChange: NOOP,
  discardChanges: NOOP,
  setShowPreviewModal: NOOP,
  setShowSubmitModal: NOOP,
  setShowDiscardModal: NOOP,
  submitChanges: ASYNC_NOOP,
};

/** Provider that owns all TableDetailView state, GraphQL operations, and handlers. */
export function TableViewProvider({
  connectionId,
  databaseName,
  tableName,
  objectRef,
  schema,
  children,
}: TableViewProviderProps) {
  // ---- UI state ----
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // ---- Sorting state ----
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(
    null
  );
  const [activeColumnMenu, setActiveColumnMenu] = useState<string | null>(null);

  // ---- Filter state ----
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>(
    []
  );

  // ---- Modal state ----
  const [showExportModal, setShowExportModal] = useState(false);

  // ---- Alert state ----
  const [alert, setAlert] = useState<Alert | null>(null);

  // ---- Refs ----
  const lastTableRef = useRef<string>("");

  // ---- Callback for initial visible columns population ----
  const onInitVisibleColumns = useCallback((columns: string[]) => {
    setVisibleColumns(columns);
  }, []);

  // ---- Data query (GraphQL fetch, loading/error, race condition prevention) ----
  const { state: queryState, actions: queryActions } = useDataQuery({
    connectionId,
    currentPage,
    pageSize,
    sortColumn,
    sortDirection,
    objectRef,
    visibleColumnsCount: visibleColumns.length,
    onInitVisibleColumns,
  });

  // ---- Column resizing ----
  const { columnWidths, resizingColumn, resizedColumns, handleResizeStart } =
    useColumnResize(queryState.data?.columns);

  // ---- Alert helpers ----
  const showAlert = useCallback(
    (title: string, message: string, type: Alert["type"] = "info") => {
      setAlert({ title, message, type });
    },
    []
  );

  const closeAlert = useCallback(() => setAlert(null), []);

  const pageOffset = (currentPage - 1) * pageSize;

  const renderedRows: RenderedTableRow[] = (queryState.data?.rows ?? []).map(
    (row, sourceRowIndex) => {
      const originalRow = Object.fromEntries(
        Object.entries(row).map(([column, value]) => [
          column,
          normalizeCellValue(value),
        ])
      );

      return {
        rowKey: buildExistingRowKey(pageOffset, sourceRowIndex),
        sourceRowIndex,
        rowNumber: pageOffset + sourceRowIndex + 1,
        originalRow,
        values: originalRow,
        changeType: null,
        isDeleted: false,
        isInserted: false,
      };
    }
  );

  // Hidden write support remains compiled separately; the visible migration path is read-only.
  const changesetState = {
    ...EMPTY_CHANGESET_STATE,
    renderedRows,
    pendingChangeCount: 0,
    hasPendingChanges: false,
  };

  const changesetActions = READ_ONLY_CHANGESET_ACTIONS;

  const pendingReloadActionRef = useRef<null | (() => void)>(null);

  const runWithDiscardGuard = useCallback(
    (action: () => void) => {
      if (!changesetState.hasPendingChanges) {
        action();
        return;
      }

      pendingReloadActionRef.current = action;
      changesetActions.setShowDiscardModal(true);
    },
    [changesetActions, changesetState.hasPendingChanges]
  );

  const confirmDiscardAndContinue = useCallback(() => {
    changesetActions.discardChanges();
    changesetActions.setShowDiscardModal(false);
    pendingReloadActionRef.current?.();
    pendingReloadActionRef.current = null;
  }, [changesetActions]);

  // ---- Table switch: reset state ----
  useEffect(() => {
    const currentTableKey = `${connectionId}:${databaseName}:${schema || ""}:${tableName}`;
    if (lastTableRef.current !== currentTableKey) {
      lastTableRef.current = currentTableKey;
      setVisibleColumns([]);
      setFilterConditions([]);
      setSortColumn(null);
      setSortDirection(null);
      setSearchTerm("");
      setCurrentPage(1);
      changesetActions.discardChanges();
    }
  }, [changesetActions, connectionId, databaseName, schema, tableName]);

  useEffect(() => {
    if (!changesetState.hasPendingChanges) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [changesetState.hasPendingChanges]);

  // ---- Search submit (reset to page 1) ----
  const handleSearchSubmit = useCallback(() => {
    runWithDiscardGuard(() => {
      setCurrentPage(1);
      queryActions.handleSubmitRequest(0);
    });
  }, [queryActions.handleSubmitRequest, runWithDiscardGuard]);

  // ---- Sorting ----
  const handleSort = useCallback(
    (column: string, direction: "asc" | "desc") => {
      runWithDiscardGuard(() => {
        setSortColumn(column);
        setSortDirection(direction);
        setActiveColumnMenu(null);
      });
    },
    [runWithDiscardGuard]
  );

  const clearSort = useCallback(() => {
    runWithDiscardGuard(() => {
      setSortColumn(null);
      setSortDirection(null);
      setActiveColumnMenu(null);
    });
  }, [runWithDiscardGuard]);

  // ---- Page change ----
  const handlePageChange = useCallback(
    (page: number) => {
      runWithDiscardGuard(() => {
        setCurrentPage(page);
      });
    },
    [runWithDiscardGuard]
  );

  // ---- Page size change ----
  const handlePageSizeChange = useCallback(
    (size: number) => {
      runWithDiscardGuard(() => {
        setPageSize(size);
        setCurrentPage(1);
      });
    },
    [runWithDiscardGuard]
  );

  // ---- Filter apply ----
  const handleFilterApply = useCallback(
    (cols: string[], conditions: FilterCondition[]) => {
      runWithDiscardGuard(() => {
        setVisibleColumns(cols);
        setFilterConditions(conditions);
        setCurrentPage(1);
        queryActions.refresh();
      });
    },
    [queryActions.refresh, runWithDiscardGuard]
  );

  const state: TableViewState = {
    ...queryState,
    currentPage,
    pageSize,
    searchTerm,
    visibleColumns,
    filterConditions,
    sortColumn,
    sortDirection,
    activeColumnMenu,
    ...changesetState,
    columnWidths,
    resizingColumn,
    resizedColumns,
    showExportModal,
    isFilterModalOpen,
    alert,
  };

  const actions: TableViewActions = {
    refresh: () => runWithDiscardGuard(queryActions.refresh),
    handleSubmitRequest: queryActions.handleSubmitRequest,
    handlePageChange,
    handlePageSizeChange,
    setSearchTerm,
    handleSearchSubmit,
    handleSort,
    clearSort,
    setActiveColumnMenu,
    ...changesetActions,
    handleResizeStart,
    setIsFilterModalOpen,
    handleFilterApply,
    setShowExportModal,
    confirmDiscardAndContinue,
    showAlert,
    closeAlert,
  };

  return <TableViewCtx value={{ state, actions }}>{children}</TableViewCtx>;
}
