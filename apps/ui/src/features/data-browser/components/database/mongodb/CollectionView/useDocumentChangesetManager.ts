import type { Alert } from "@data-browser/components/database/shared/types";
import {
  useDeleteRowMutation,
  useRawExecuteLazyQuery,
  useUpdateStorageUnitMutation,
} from "@data-browser/generated/graphql";
import { useConnectionStore } from "@data-browser/stores/useConnectionStore";
import { resolveSchemaParam } from "@data-browser/utils/database-features";
import {
  buildMongoInsertOneCommand,
  parseMongoDocumentInput,
} from "@data-browser/utils/mongodb-shell";
import { useCallback, useReducer } from "react";
import type {
  DocumentChange,
  DocumentChangesetRowKey,
  DocumentUndoEntry,
} from "./types";

// ---- State ----

interface ChangesetState {
  addContent: string;
  changes: Map<DocumentChangesetRowKey, DocumentChange>;
  editContent: string;
  editingRowKey: DocumentChangesetRowKey | null;
  newRowCounter: number;
  newRowOrder: DocumentChangesetRowKey[];
  selectedRowKeys: Set<DocumentChangesetRowKey>;
  showAddModal: boolean;
  showDiscardModal: boolean;
  showPreviewModal: boolean;
  showSubmitModal: boolean;
  undoStack: DocumentUndoEntry[];
}

function createInitialState(): ChangesetState {
  return {
    changes: new Map(),
    undoStack: [],
    selectedRowKeys: new Set(),
    newRowCounter: 0,
    newRowOrder: [],
    showPreviewModal: false,
    showSubmitModal: false,
    showDiscardModal: false,
    showAddModal: false,
    addContent: "{\n  \n}",
    editingRowKey: null,
    editContent: "",
  };
}

// ---- Reducer ----

type ChangesetAction =
  | { type: "toggle-selection"; rowKey: DocumentChangesetRowKey }
  | {
      type: "stage-add";
      rowKey: DocumentChangesetRowKey;
      document: Record<string, unknown>;
    }
  | {
      type: "stage-edit";
      rowKey: DocumentChangesetRowKey;
      originalDocument: Record<string, unknown>;
      document: Record<string, unknown>;
      isInsert: boolean;
    }
  | {
      type: "delete-selected";
      rows: Array<{
        rowKey: DocumentChangesetRowKey;
        originalDocument: Record<string, unknown>;
        isInserted: boolean;
      }>;
    }
  | { type: "undo" }
  | { type: "discard-all" }
  | { type: "prune-successes"; rowKeys: DocumentChangesetRowKey[] }
  | { type: "set-show-preview-modal"; open: boolean }
  | { type: "set-show-submit-modal"; open: boolean }
  | { type: "set-show-discard-modal"; open: boolean }
  | { type: "open-add-modal"; content: string }
  | { type: "set-add-content"; content: string }
  | { type: "close-add-modal" }
  | {
      type: "open-edit-modal";
      rowKey: DocumentChangesetRowKey;
      content: string;
    }
  | { type: "set-edit-content"; content: string }
  | { type: "close-edit-modal" };

const sortedStringify = (obj: Record<string, unknown>) =>
  JSON.stringify(obj, Object.keys(obj).sort());

function changesetReducer(
  state: ChangesetState,
  action: ChangesetAction
): ChangesetState {
  switch (action.type) {
    case "toggle-selection": {
      const next = new Set(state.selectedRowKeys);
      if (next.has(action.rowKey)) {
        next.delete(action.rowKey);
      } else {
        next.add(action.rowKey);
      }
      return { ...state, selectedRowKeys: next };
    }

    case "stage-add": {
      const nextChanges = new Map(state.changes);
      nextChanges.set(action.rowKey, {
        type: "insert",
        originalDocument: {},
        document: action.document,
      });

      return {
        ...state,
        changes: nextChanges,
        newRowOrder: [...state.newRowOrder, action.rowKey],
        newRowCounter: state.newRowCounter + 1,
        undoStack: [...state.undoStack, { kind: "add", rowKey: action.rowKey }],
        showAddModal: false,
      };
    }

    case "stage-edit": {
      const nextChanges = new Map(state.changes);
      const previousDocument = action.isInsert
        ? nextChanges.get(action.rowKey)!.document
        : action.originalDocument;

      if (action.isInsert) {
        nextChanges.set(action.rowKey, {
          type: "insert",
          originalDocument: {},
          document: action.document,
        });
      } else {
        nextChanges.set(action.rowKey, {
          type: "update",
          originalDocument: action.originalDocument,
          document: action.document,
        });
      }

      return {
        ...state,
        changes: nextChanges,
        undoStack: [
          ...state.undoStack,
          { kind: "edit", rowKey: action.rowKey, previousDocument },
        ],
        editingRowKey: null,
        editContent: "",
      };
    }

    case "delete-selected": {
      if (action.rows.length === 0) {
        return state;
      }

      const nextChanges = new Map(state.changes);
      const rowKeys = action.rows.map((r) => r.rowKey);
      const previousChanges = action.rows.map(
        (r) =>
          [r.rowKey, nextChanges.get(r.rowKey)] as [
            DocumentChangesetRowKey,
            DocumentChange | undefined,
          ]
      );
      const nextNewRowOrder = [...state.newRowOrder];

      for (const row of action.rows) {
        if (row.isInserted) {
          nextChanges.delete(row.rowKey);
          const idx = nextNewRowOrder.indexOf(row.rowKey);
          if (idx >= 0) {
            nextNewRowOrder.splice(idx, 1);
          }
          continue;
        }

        nextChanges.set(row.rowKey, {
          type: "delete",
          originalDocument: row.originalDocument,
          document: row.originalDocument,
        });
      }

      return {
        ...state,
        changes: nextChanges,
        newRowOrder: nextNewRowOrder,
        selectedRowKeys: new Set(),
        undoStack: [
          ...state.undoStack.filter((entry) => {
            if (entry.kind !== "edit") {
              return true;
            }
            return !rowKeys.includes(entry.rowKey);
          }),
          { kind: "delete", rowKeys, previousChanges },
        ],
      };
    }

    case "undo": {
      const lastEntry = state.undoStack.at(-1);
      if (!lastEntry) {
        return state;
      }

      const nextUndoStack = state.undoStack.slice(0, -1);
      const nextChanges = new Map(state.changes);

      if (lastEntry.kind === "edit") {
        const current = nextChanges.get(lastEntry.rowKey);
        if (current?.type === "insert") {
          nextChanges.set(lastEntry.rowKey, {
            ...current,
            document: lastEntry.previousDocument,
          });
        } else if (current) {
          if (
            sortedStringify(lastEntry.previousDocument) ===
            sortedStringify(current.originalDocument)
          ) {
            nextChanges.delete(lastEntry.rowKey);
          } else {
            nextChanges.set(lastEntry.rowKey, {
              ...current,
              document: lastEntry.previousDocument,
            });
          }
        }

        return { ...state, changes: nextChanges, undoStack: nextUndoStack };
      }

      if (lastEntry.kind === "add") {
        nextChanges.delete(lastEntry.rowKey);
        return {
          ...state,
          changes: nextChanges,
          undoStack: nextUndoStack,
          newRowOrder: state.newRowOrder.filter((k) => k !== lastEntry.rowKey),
        };
      }

      // kind === 'delete'
      for (const [rowKey, previousChange] of lastEntry.previousChanges) {
        if (previousChange) {
          nextChanges.set(rowKey, previousChange);
        } else {
          nextChanges.delete(rowKey);
        }
      }

      const nextNewRowOrder = [...state.newRowOrder];
      for (const [rowKey, previousChange] of lastEntry.previousChanges) {
        if (
          previousChange?.type === "insert" &&
          !nextNewRowOrder.includes(rowKey)
        ) {
          nextNewRowOrder.push(rowKey);
        }
      }

      return {
        ...state,
        changes: nextChanges,
        newRowOrder: nextNewRowOrder,
        undoStack: nextUndoStack,
      };
    }

    case "discard-all":
      return createInitialState();

    case "prune-successes": {
      const nextChanges = new Map(state.changes);
      for (const rowKey of action.rowKeys) {
        nextChanges.delete(rowKey);
      }

      const nextUndoStack: DocumentUndoEntry[] = [];
      for (const entry of state.undoStack) {
        if (entry.kind === "edit" || entry.kind === "add") {
          if (!action.rowKeys.includes(entry.rowKey)) {
            nextUndoStack.push(entry);
          }
          continue;
        }

        const nextRowKeys = entry.rowKeys.filter(
          (k) => !action.rowKeys.includes(k)
        );
        const nextPreviousChanges = entry.previousChanges.filter(
          ([k]) => !action.rowKeys.includes(k)
        );
        if (nextRowKeys.length === 0) {
          continue;
        }
        nextUndoStack.push({
          ...entry,
          rowKeys: nextRowKeys,
          previousChanges: nextPreviousChanges,
        });
      }

      return {
        ...state,
        changes: nextChanges,
        newRowOrder: state.newRowOrder.filter(
          (k) => !action.rowKeys.includes(k)
        ),
        selectedRowKeys: new Set(
          [...state.selectedRowKeys].filter((k) => !action.rowKeys.includes(k))
        ),
        undoStack: nextUndoStack,
      };
    }

    case "set-show-preview-modal":
      return { ...state, showPreviewModal: action.open };

    case "set-show-submit-modal":
      return { ...state, showSubmitModal: action.open };

    case "set-show-discard-modal":
      return { ...state, showDiscardModal: action.open };

    case "open-add-modal":
      return { ...state, showAddModal: true, addContent: action.content };

    case "set-add-content":
      return { ...state, addContent: action.content };

    case "close-add-modal":
      return { ...state, showAddModal: false };

    case "open-edit-modal":
      return {
        ...state,
        editingRowKey: action.rowKey,
        editContent: action.content,
      };

    case "set-edit-content":
      return { ...state, editContent: action.content };

    case "close-edit-modal":
      return { ...state, editingRowKey: null, editContent: "" };
  }
}

// ---- Helpers ----

export function buildExistingRowKey(
  pageOffset: number,
  index: number
): DocumentChangesetRowKey {
  return `existing-${pageOffset + index}`;
}

function buildInsertedRowKey(counter: number): DocumentChangesetRowKey {
  return `new-${counter + 1}`;
}

// ---- Hook ----

interface UseDocumentChangesetManagerParams {
  collectionName: string;
  connectionId: string;
  databaseName: string;
  documents: any[];
  pageOffset: number;
  refresh: () => void;
  showAlert: (title: string, message: string, type: Alert["type"]) => void;
}

export function useDocumentChangesetManager({
  connectionId,
  databaseName,
  collectionName,
  documents,
  pageOffset,
  refresh,
  showAlert,
}: UseDocumentChangesetManagerParams) {
  const { connections } = useConnectionStore();
  const [deleteRowMutation] = useDeleteRowMutation();
  const [updateStorageUnitMutation] = useUpdateStorageUnitMutation();
  const [rawExecute] = useRawExecuteLazyQuery({ fetchPolicy: "no-cache" });
  const [state, dispatch] = useReducer(
    changesetReducer,
    undefined,
    createInitialState
  );

  // ---- Selection ----

  const toggleRowSelection = useCallback((rowKey: DocumentChangesetRowKey) => {
    dispatch({ type: "toggle-selection", rowKey });
  }, []);

  // ---- Add document ----

  const handleAddClick = useCallback(() => {
    let content = "{\n  \n}";
    if (
      documents.length > 0 &&
      typeof documents[0] === "object" &&
      documents[0] !== null
    ) {
      const template: Record<string, string> = {};
      for (const key of Object.keys(documents[0])) {
        if (key !== "_id") {
          template[key] = "";
        }
      }
      content = JSON.stringify(template, null, 2);
    }
    dispatch({ type: "open-add-modal", content });
  }, [documents]);

  const setAddContent = useCallback((content: string) => {
    dispatch({ type: "set-add-content", content });
  }, []);

  const handleAddSave = useCallback(async () => {
    try {
      const newDoc = parseMongoDocumentInput(state.addContent);
      if (Object.keys(newDoc).length === 0) {
        showAlert("Error", "Document cannot be empty.", "error");
        return;
      }

      const rowKey = buildInsertedRowKey(state.newRowCounter);
      dispatch({ type: "stage-add", rowKey, document: newDoc });
    } catch (e: any) {
      showAlert(
        "Error",
        `Invalid JSON for new document: ${e.message}`,
        "error"
      );
    }
  }, [showAlert, state.addContent, state.newRowCounter]);

  const setShowAddModal = useCallback(
    (open: boolean) => {
      if (open) {
        dispatch({ type: "open-add-modal", content: state.addContent });
      } else {
        dispatch({ type: "close-add-modal" });
      }
    },
    [state.addContent]
  );

  // ---- Edit document ----

  const handleEditClick = useCallback(
    (rowKey: DocumentChangesetRowKey) => {
      const change = state.changes.get(rowKey);
      let doc: Record<string, unknown> | undefined;

      if (change) {
        doc =
          change.type === "delete" ? change.originalDocument : change.document;
      } else {
        const match = rowKey.match(/^existing-(\d+)$/);
        if (match?.[1]) {
          const globalIndex = Number.parseInt(match[1], 10);
          const localIndex = globalIndex - pageOffset;
          if (localIndex >= 0 && localIndex < documents.length) {
            doc = documents[localIndex];
          }
        }
      }

      if (!doc) {
        return;
      }

      const { _id: _, ...rest } = doc;
      dispatch({
        type: "open-edit-modal",
        rowKey,
        content: JSON.stringify(rest, null, 2),
      });
    },
    [documents, pageOffset, state.changes]
  );

  const setEditContent = useCallback((content: string) => {
    dispatch({ type: "set-edit-content", content });
  }, []);

  const handleEditSave = useCallback(async () => {
    if (!state.editingRowKey) {
      return;
    }

    try {
      const parsed = parseMongoDocumentInput(state.editContent);
      const change = state.changes.get(state.editingRowKey);
      const isInsert = change?.type === "insert";

      let originalDocument: Record<string, unknown>;
      if (isInsert) {
        originalDocument = {};
      } else if (change) {
        originalDocument = change.originalDocument;
      } else {
        const match = state.editingRowKey.match(/^existing-(\d+)$/);
        if (!match?.[1]) {
          return;
        }
        const localIndex = Number.parseInt(match[1], 10) - pageOffset;
        if (localIndex < 0 || localIndex >= documents.length) {
          return;
        }
        originalDocument = documents[localIndex];
      }

      // Preserve _id from original document
      const { _id } = isInsert ? change!.document : originalDocument;
      const document = _id === undefined ? parsed : { ...parsed, _id };

      dispatch({
        type: "stage-edit",
        rowKey: state.editingRowKey,
        originalDocument,
        document,
        isInsert,
      });
    } catch (e: any) {
      showAlert(
        "Error",
        `Invalid JSON for updated document: ${e.message}`,
        "error"
      );
    }
  }, [
    documents,
    pageOffset,
    showAlert,
    state.changes,
    state.editContent,
    state.editingRowKey,
  ]);

  const cancelEdit = useCallback(() => {
    dispatch({ type: "close-edit-modal" });
  }, []);

  // ---- Delete ----

  const markSelectedForDelete = useCallback(() => {
    const rows = [...state.selectedRowKeys]
      .map((rowKey) => {
        const change = state.changes.get(rowKey);
        const isInserted = change?.type === "insert";

        let originalDocument: Record<string, unknown>;
        if (change) {
          originalDocument = change.originalDocument;
        } else {
          const match = rowKey.match(/^existing-(\d+)$/);
          const localIndex = match?.[1]
            ? Number.parseInt(match[1], 10) - pageOffset
            : -1;
          const document = documents[localIndex];
          if (!document) {
            return null;
          }
          originalDocument = document;
        }

        return { rowKey, originalDocument, isInserted: !!isInserted };
      })
      .filter(
        (
          row
        ): row is {
          rowKey: DocumentChangesetRowKey;
          originalDocument: Record<string, unknown>;
          isInserted: boolean;
        } => row !== null
      );

    dispatch({ type: "delete-selected", rows });
  }, [documents, pageOffset, state.changes, state.selectedRowKeys]);

  // ---- Undo / Discard ----

  const undoLastChange = useCallback(() => {
    dispatch({ type: "undo" });
  }, []);

  const discardChanges = useCallback(() => {
    dispatch({ type: "discard-all" });
  }, []);

  // ---- Modals ----

  const setShowPreviewModal = useCallback((open: boolean) => {
    dispatch({ type: "set-show-preview-modal", open });
  }, []);

  const setShowSubmitModal = useCallback((open: boolean) => {
    dispatch({ type: "set-show-submit-modal", open });
  }, []);

  const setShowDiscardModal = useCallback((open: boolean) => {
    dispatch({ type: "set-show-discard-modal", open });
  }, []);

  // ---- Submit ----

  const submitChanges = useCallback(async () => {
    const conn = connections.find((c) => c.id === connectionId);
    if (!conn || state.changes.size === 0) {
      return;
    }

    const graphqlSchema = resolveSchemaParam(conn.type, databaseName);
    const successfulRowKeys: DocumentChangesetRowKey[] = [];
    const failedMessages: string[] = [];

    const orderedEntries = [...state.changes.entries()].sort(
      ([, left], [, right]) => {
        const rank = { delete: 0, update: 1, insert: 2 } as const;
        return rank[left.type] - rank[right.type];
      }
    );

    for (const [rowKey, change] of orderedEntries) {
      try {
        if (change.type === "delete") {
          const { data: result, errors } = await deleteRowMutation({
            variables: {
              schema: graphqlSchema,
              storageUnit: collectionName,
              values: [
                {
                  Key: "document",
                  Value: JSON.stringify({ _id: change.originalDocument._id }),
                },
              ],
            },
            context: { database: databaseName },
          });

          if (errors?.length || !result?.DeleteRow.Status) {
            throw new Error(
              errors?.[0]?.message ?? "Failed to delete document"
            );
          }
        } else if (change.type === "update") {
          const { data: result, errors } = await updateStorageUnitMutation({
            variables: {
              schema: graphqlSchema,
              storageUnit: collectionName,
              values: [
                {
                  Key: "document",
                  Value: JSON.stringify({
                    ...change.document,
                    _id: change.originalDocument._id,
                  }),
                },
              ],
              updatedColumns: Object.keys(change.document).filter(
                (k) => k !== "_id"
              ),
            },
            context: { database: databaseName },
          });

          if (errors?.length || !result?.UpdateStorageUnit.Status) {
            throw new Error(
              errors?.[0]?.message ?? "Failed to update document"
            );
          }
        } else {
          const { data: result, error } = await rawExecute({
            variables: {
              query: buildMongoInsertOneCommand(
                collectionName,
                change.document
              ),
            },
            context: { database: databaseName },
          });

          if (error || !result?.RawExecute) {
            throw new Error(error?.message ?? "Failed to add document");
          }
        }

        successfulRowKeys.push(rowKey);
      } catch (error) {
        failedMessages.push(
          error instanceof Error ? error.message : String(error)
        );
      }
    }

    if (failedMessages.length === 0) {
      dispatch({ type: "discard-all" });
      refresh();
      showAlert(
        "Success",
        "Document changes submitted successfully.",
        "success"
      );
      return;
    }

    dispatch({ type: "prune-successes", rowKeys: successfulRowKeys });
    refresh();
    const summary = `${failedMessages.length} document change(s) failed.`;
    const details = failedMessages.join("\n");
    showAlert("Error", `${summary}\n\n${details}`, "error");
  }, [
    collectionName,
    connectionId,
    connections,
    databaseName,
    deleteRowMutation,
    rawExecute,
    refresh,
    showAlert,
    state.changes,
    updateStorageUnitMutation,
  ]);

  return {
    state: {
      changes: state.changes,
      undoStack: state.undoStack,
      selectedRowKeys: state.selectedRowKeys,
      newRowOrder: state.newRowOrder,
      pendingChangeCount: state.changes.size,
      hasPendingChanges: state.changes.size > 0,
      showPreviewModal: state.showPreviewModal,
      showSubmitModal: state.showSubmitModal,
      showDiscardModal: state.showDiscardModal,
      showAddModal: state.showAddModal,
      addContent: state.addContent,
      editingRowKey: state.editingRowKey,
      editContent: state.editContent,
    },
    actions: {
      toggleRowSelection,
      handleAddClick,
      setAddContent,
      handleAddSave,
      setShowAddModal,
      handleEditClick,
      setEditContent,
      handleEditSave,
      cancelEdit,
      markSelectedForDelete,
      undoLastChange,
      discardChanges,
      submitChanges,
      setShowPreviewModal,
      setShowSubmitModal,
      setShowDiscardModal,
    },
  };
}
