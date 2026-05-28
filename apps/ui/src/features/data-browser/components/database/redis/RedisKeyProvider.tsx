import { ModalForm, useModalForm } from "@data-browser/components/ui/ModalForm";
import { useDbAccessReadOnlyActions } from "@data-browser/state/db-access-session";
import { List } from "lucide-react";
import {
  createContext,
  type JSX,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useState,
} from "react";
import type {
  RedisHashPairDraft,
  RedisKeyDraft,
  RedisKeyType,
  RedisListItemDraft,
  RedisZSetItemDraft,
} from "./redis-key.types";
import { buildRedisFields, hasRedisDraftPayload } from "./redis-key.utils";

/**
 * Domain context for Redis key create/edit draft state.
 *
 * The modal shell consumes this context to render identity fields and one
 * explicit editor variant for the current draft type.
 */
export interface RedisKeyCtxValue {
  canEditKeyName: boolean;
  canEditType: boolean;
  draft: RedisKeyDraft;
  isEditMode: boolean;
  isStringEdit: boolean;
  setHashPairs: (value: RedisHashPairDraft[]) => void;
  setKey: (value: string) => void;
  setListItems: (value: RedisListItemDraft[]) => void;
  setSetItems: (value: RedisListItemDraft[]) => void;
  setStringValue: (value: string) => void;
  setType: (value: RedisKeyType) => void;
  setZsetItems: (value: RedisZSetItemDraft[]) => void;
}

const RedisKeyCtx = createContext<RedisKeyCtxValue | null>(null);

/** Accessor for Redis key modal draft context. Throws outside the provider. */
export function useRedisKeyCtx(): RedisKeyCtxValue {
  const ctx = use(RedisKeyCtx);
  if (!ctx) {
    throw new Error("useRedisKeyCtx must be used within RedisKeyProvider");
  }
  return ctx;
}

interface RedisKeyProviderProps {
  children: ReactNode;
  databaseName: string;
  initialData?: RedisKeyDraft | null;
  onSuccess?: () => void;
  open: boolean;
}

const DEFAULT_HASH_PAIRS: RedisHashPairDraft[] = [{ field: "", value: "" }];
const DEFAULT_LIST_ITEMS: RedisListItemDraft[] = [{ value: "" }];
const DEFAULT_ZSET_ITEMS: RedisZSetItemDraft[] = [{ member: "", score: "0" }];

function cloneHashPairs(pairs: RedisHashPairDraft[]): RedisHashPairDraft[] {
  return pairs.map((pair) => ({ ...pair }));
}

function cloneListItems(items: RedisListItemDraft[]): RedisListItemDraft[] {
  return items.map((item) => ({ ...item }));
}

function cloneZsetItems(items: RedisZSetItemDraft[]): RedisZSetItemDraft[] {
  return items.map((item) => ({ ...item }));
}

function createEmptyDraft(): RedisKeyDraft {
  return {
    mode: "create",
    key: "",
    type: "string",
    stringValue: "",
    hashPairs: cloneHashPairs(DEFAULT_HASH_PAIRS),
    listItems: cloneListItems(DEFAULT_LIST_ITEMS),
    setItems: cloneListItems(DEFAULT_LIST_ITEMS),
    zsetItems: cloneZsetItems(DEFAULT_ZSET_ITEMS),
  };
}

function normalizeHashPairs(
  pairs: RedisHashPairDraft[] | undefined
): RedisHashPairDraft[] {
  return pairs && pairs.length > 0
    ? cloneHashPairs(pairs)
    : cloneHashPairs(DEFAULT_HASH_PAIRS);
}

function normalizeListItems(
  items: RedisListItemDraft[] | undefined
): RedisListItemDraft[] {
  return items && items.length > 0
    ? cloneListItems(items)
    : cloneListItems(DEFAULT_LIST_ITEMS);
}

function normalizeZsetItems(
  items: RedisZSetItemDraft[] | undefined
): RedisZSetItemDraft[] {
  return items && items.length > 0
    ? cloneZsetItems(items)
    : cloneZsetItems(DEFAULT_ZSET_ITEMS);
}

function normalizeDraft(initialData?: RedisKeyDraft | null): RedisKeyDraft {
  if (!initialData) {
    return createEmptyDraft();
  }

  return {
    mode: initialData.mode,
    key: initialData.key,
    type: initialData.type,
    stringValue: initialData.stringValue,
    hashPairs: normalizeHashPairs(initialData.hashPairs),
    listItems: normalizeListItems(initialData.listItems),
    setItems: normalizeListItems(initialData.setItems),
    zsetItems: normalizeZsetItems(initialData.zsetItems),
  };
}

/** Resets ModalForm state when the dialog opens. Must be rendered inside ModalForm.Provider. */
function ResetOnOpen({
  open,
  children,
}: {
  open: boolean;
  children: ReactNode;
}) {
  const { actions } = useModalForm();

  useEffect(() => {
    if (open) {
      actions.reset();
    }
  }, [open, actions]);

  return children;
}

/** Owns Redis key draft state and submits via store mutation. */
export function RedisKeyProvider({
  open,
  databaseName,
  onSuccess,
  initialData,
  children,
}: RedisKeyProviderProps): JSX.Element {
  const { createTable } = useDbAccessReadOnlyActions();
  const [draft, setDraft] = useState<RedisKeyDraft>(() =>
    normalizeDraft(initialData)
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    setDraft(normalizeDraft(initialData));
  }, [open, initialData]);

  const setKey = useCallback((value: string) => {
    setDraft((prev) => ({ ...prev, key: value }));
  }, []);

  const setType = useCallback((value: RedisKeyType) => {
    setDraft((prev) => {
      if (prev.mode === "edit") {
        return prev;
      }

      return {
        ...prev,
        type: value,
        stringValue: "",
        hashPairs: cloneHashPairs(DEFAULT_HASH_PAIRS),
        listItems: cloneListItems(DEFAULT_LIST_ITEMS),
        setItems: cloneListItems(DEFAULT_LIST_ITEMS),
        zsetItems: cloneZsetItems(DEFAULT_ZSET_ITEMS),
      };
    });
  }, []);

  const setStringValue = useCallback((value: string) => {
    setDraft((prev) => ({ ...prev, stringValue: value }));
  }, []);

  const setHashPairs = useCallback((value: RedisHashPairDraft[]) => {
    setDraft((prev) => ({ ...prev, hashPairs: normalizeHashPairs(value) }));
  }, []);

  const setListItems = useCallback((value: RedisListItemDraft[]) => {
    setDraft((prev) => ({ ...prev, listItems: normalizeListItems(value) }));
  }, []);

  const setSetItems = useCallback((value: RedisListItemDraft[]) => {
    setDraft((prev) => ({ ...prev, setItems: normalizeListItems(value) }));
  }, []);

  const setZsetItems = useCallback((value: RedisZSetItemDraft[]) => {
    setDraft((prev) => ({ ...prev, zsetItems: normalizeZsetItems(value) }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!draft.key.trim()) {
      return;
    }
    if (draft.mode === "create" && !hasRedisDraftPayload(draft)) {
      throw new Error("Value is required.");
    }
    if (draft.mode === "edit" && draft.type !== "string") {
      throw new Error("This Redis key type cannot be edited here.");
    }
    const fields = buildRedisFields(draft);
    const result = await createTable(
      databaseName,
      databaseName,
      draft.key,
      fields
    );
    if (result.success) {
      onSuccess?.();
    } else {
      throw new Error(result.message ?? "Unknown error");
    }
  }, [draft, databaseName, createTable, onSuccess]);

  const isEditMode = draft.mode === "edit";
  const isStringEdit = isEditMode && draft.type === "string";
  const canEditType = !isEditMode;
  const canEditKeyName = !isEditMode;

  return (
    <RedisKeyCtx
      value={{
        draft,
        setKey,
        setType,
        setStringValue,
        setHashPairs,
        setListItems,
        setSetItems,
        setZsetItems,
        isEditMode,
        isStringEdit,
        canEditType,
        canEditKeyName,
      }}
    >
      <ModalForm.Provider
        meta={{
          title: isEditMode ? "Edit Redis key" : "Create Redis key",
          description: isEditMode ? "Update this Redis key value." : undefined,
          icon: List,
        }}
        onSubmit={handleSubmit}
      >
        <ResetOnOpen open={open}>{children}</ResetOnOpen>
      </ModalForm.Provider>
    </RedisKeyCtx>
  );
}
