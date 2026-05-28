import { ModalForm } from "@data-browser/components/ui/ModalForm";
import { useConnectionStore } from "@data-browser/stores/useConnectionStore";
import { resolveSchemaParam } from "@data-browser/utils/database-features";
import { Database } from "lucide-react";
import {
  createContext,
  type JSX,
  type ReactNode,
  use,
  useCallback,
  useState,
} from "react";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

/** Domain state for CreateCollection modal. */
export interface CreateCollectionCtxValue {
  collectionName: string;
  setCollectionName: (value: string) => void;
}

const CreateCollectionCtx = createContext<CreateCollectionCtxValue | null>(
  null
);

/** Accessor for CreateCollection domain context. Throws outside provider. */
export function useCreateCollectionCtx(): CreateCollectionCtxValue {
  const ctx = use(CreateCollectionCtx);
  if (!ctx) {
    throw new Error(
      "useCreateCollectionCtx must be used within CreateCollectionProvider"
    );
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/** Owns business logic for creating a MongoDB collection. */
export function CreateCollectionProvider({
  connectionId,
  databaseName,
  onSuccess,
  children,
}: {
  connectionId: string;
  databaseName: string;
  onSuccess?: () => void;
  children: ReactNode;
}): JSX.Element {
  const { createTable, connections } = useConnectionStore();
  const [collectionName, setCollectionName] = useState("");

  const handleSubmit = useCallback(async () => {
    if (!collectionName) {
      return;
    }
    const conn = connections.find((c) => c.id === connectionId);
    const schemaParam = resolveSchemaParam(conn?.type, databaseName);
    const result = await createTable(
      databaseName,
      schemaParam,
      collectionName,
      []
    );

    if (result.success) {
      onSuccess?.();
    } else {
      throw new Error(result.message ?? "Unknown error");
    }
  }, [
    collectionName,
    connections,
    connectionId,
    databaseName,
    createTable,
    onSuccess,
  ]);

  return (
    <CreateCollectionCtx value={{ collectionName, setCollectionName }}>
      <ModalForm.Provider
        meta={{ title: "Create collection", icon: Database }}
        onSubmit={handleSubmit}
      >
        {children}
      </ModalForm.Provider>
    </CreateCollectionCtx>
  );
}
