import { getRows } from "@data-browser/api/access-adapter";
import type { AccessObjectRef } from "@data-browser/api/access-types";
import type { FlatMongoFilter } from "@data-browser/components/database/mongodb/filter-collection.types";
import type { Alert } from "@data-browser/components/database/shared/types";
import { useI18n } from "@data-browser/i18n/useI18n";
import { useConnectionStore } from "@data-browser/stores/useConnectionStore";
import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { CollectionViewContextValue } from "./types";

const CollectionViewCtx = createContext<CollectionViewContextValue | null>(
  null
);

/** Hook to access CollectionView context. Throws if used outside CollectionViewProvider. */
export function useCollectionView(): CollectionViewContextValue {
  const ctx = use(CollectionViewCtx);
  if (!ctx) {
    throw new Error(
      "useCollectionView must be used within CollectionViewProvider"
    );
  }
  return ctx;
}

interface CollectionViewProviderProps {
  children: ReactNode;
  collectionName: string;
  connectionId: string;
  databaseName: string;
  objectRef: AccessObjectRef;
}

const NOOP = (..._args: unknown[]) => undefined;
const ASYNC_NOOP = async (..._args: unknown[]) => undefined;
const EMPTY_CHANGESET = new Map();
const EMPTY_STRING_SET = new Set<string>();
const READ_ONLY_DOCUMENT_ACTIONS = {
  toggleRowSelection: NOOP,
  handleAddClick: NOOP,
  setShowAddModal: NOOP,
  setAddContent: NOOP,
  handleAddSave: ASYNC_NOOP,
  handleEditClick: NOOP,
  setEditContent: NOOP,
  cancelEdit: NOOP,
  handleEditSave: ASYNC_NOOP,
  markSelectedForDelete: NOOP,
  undoLastChange: NOOP,
  discardChanges: NOOP,
  setShowPreviewModal: NOOP,
  setShowSubmitModal: NOOP,
  setShowDiscardModal: NOOP,
  submitChanges: ASYNC_NOOP,
};

/** Provider that owns all CollectionDetailView state, GraphQL operations, and handlers. */
export function CollectionViewProvider({
  connectionId,
  objectRef,
  children,
}: CollectionViewProviderProps) {
  const { t } = useI18n();
  const { connections, collectionRefreshKey } = useConnectionStore();

  // ---- Core state ----
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // ---- Export state ----
  const [showExportModal, setShowExportModal] = useState(false);

  // ---- Filter state ----
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FlatMongoFilter>({});
  const [availableFields, setAvailableFields] = useState<string[]>([]);

  // ---- Alert state ----
  const [alert, setAlert] = useState<Alert | null>(null);

  // ---- Alert helpers ----
  const showAlert = useCallback(
    (title: string, message: string, type: Alert["type"] = "info") => {
      setAlert({ title, message, type });
    },
    []
  );

  const closeAlert = useCallback(() => setAlert(null), []);

  // ---- Refresh ----
  const refresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  // Hidden document writes remain compiled separately; the visible path is read-only.
  const changesetState = {
    changes: EMPTY_CHANGESET,
    undoStack: [],
    selectedRowKeys: EMPTY_STRING_SET,
    newRowOrder: [],
    showAddModal: false,
    addContent: "",
    editingRowKey: null,
    editContent: "",
    showPreviewModal: false,
    showSubmitModal: false,
    showDiscardModal: false,
    pendingChangeCount: 0,
    hasPendingChanges: false,
  };

  const changesetActions = READ_ONLY_DOCUMENT_ACTIONS;

  // ---- Discard guard ----
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

  // ---- beforeunload guard ----
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

  // ---- Extract available fields from documents ----
  useEffect(() => {
    if (documents.length > 0) {
      const keys = new Set<string>();
      documents.slice(0, 50).forEach((doc) => {
        if (typeof doc === "object" && doc !== null) {
          Object.keys(doc).forEach((k) => keys.add(k));
        }
      });
      setAvailableFields(Array.from(keys).sort());
    }
  }, [documents]);

  // ---- Guarded search term setter (resets to page 1) ----
  const setSearchTermGuarded = useCallback(
    (term: string) => {
      runWithDiscardGuard(() => {
        setSearchTerm(term);
        setCurrentPage(1);
      });
    },
    [runWithDiscardGuard]
  );

  // ---- Main data fetch ----
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      const conn = connections.find((c) => c.id === connectionId);
      if (!conn?.runtime) {
        setError(t("common.error.connectionNotFound"));
        setLoading(false);
        return;
      }

      try {
        const result = await getRows({
          runtime: conn.runtime,
          ref: objectRef,
          pageSize,
          pageOffset: (currentPage - 1) * pageSize,
        });

        const parsedDocs = result.rows.map((row) => {
          const rawDocument = row[0] ?? "{}";
          try {
            return JSON.parse(rawDocument);
          } catch {
            return { _raw: rawDocument };
          }
        });
        setDocuments(parsedDocs);
        setTotal(result.totalCount);
      } catch (err: any) {
        setError(err.message || t("mongodb.error.fetchCollectionData"));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [
    connectionId,
    connections,
    collectionRefreshKey,
    currentPage,
    pageSize,
    objectRef,
    refreshKey,
    t,
  ]);

  // ---- Page change ----
  const handlePageChange = useCallback(
    (page: number) => {
      runWithDiscardGuard(() => setCurrentPage(page));
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
    (filter: FlatMongoFilter) => {
      runWithDiscardGuard(() => {
        setActiveFilter(filter);
      });
    },
    [runWithDiscardGuard]
  );

  // ---- Derived values ----
  const totalPages = Math.ceil(total / pageSize);

  const state: CollectionViewContextValue["state"] = {
    loading,
    documents,
    error,
    currentPage,
    pageSize,
    total,
    totalPages,
    searchTerm,
    activeFilter,
    availableFields,
    showExportModal,
    isFilterModalOpen,
    alert,
    ...changesetState,
  };

  const actions: CollectionViewContextValue["actions"] = {
    refresh: () => runWithDiscardGuard(refresh),
    handlePageChange,
    handlePageSizeChange,
    setSearchTerm: setSearchTermGuarded,
    setIsFilterModalOpen,
    handleFilterApply,
    setShowExportModal,
    showAlert,
    closeAlert,
    confirmDiscardAndContinue,
    ...changesetActions,
  };

  return (
    <CollectionViewCtx value={{ state, actions }}>{children}</CollectionViewCtx>
  );
}
