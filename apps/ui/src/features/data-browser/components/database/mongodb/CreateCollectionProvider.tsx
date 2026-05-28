import { ModalForm } from "@data-browser/components/ui/ModalForm";
import {
  useDbAccessReadOnlyActions,
  useDbAccessService,
} from "@data-browser/state/db-access-session";
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
  databaseName,
  onSuccess,
  children,
}: {
  dbServiceKey: string;
  databaseName: string;
  onSuccess?: () => void;
  children: ReactNode;
}): JSX.Element {
  const { createTable } = useDbAccessReadOnlyActions();
  const dbService = useDbAccessService();
  const [collectionName, setCollectionName] = useState("");

  const handleSubmit = useCallback(async () => {
    if (!collectionName) {
      return;
    }
    const schemaParam = resolveSchemaParam(dbService.engineType, databaseName);
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
    databaseName,
    dbService.engineType,
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
