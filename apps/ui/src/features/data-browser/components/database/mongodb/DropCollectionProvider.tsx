import { ModalForm } from "@data-browser/components/ui/ModalForm";
import { useDbAccessReadOnlyActions } from "@data-browser/state/db-access-session";
import { AlertTriangle } from "lucide-react";
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

/** Domain state for DropCollection modal. */
export interface DropCollectionCtxValue {
  canDrop: boolean;
  collectionName: string;
  confirmName: string;
  setConfirmName: (v: string) => void;
}

const DropCollectionCtx = createContext<DropCollectionCtxValue | null>(null);

/** Accessor for DropCollection domain context. Throws outside provider. */
export function useDropCollectionCtx(): DropCollectionCtxValue {
  const ctx = use(DropCollectionCtx);
  if (!ctx) {
    throw new Error(
      "useDropCollectionCtx must be used within DropCollectionProvider"
    );
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/** Owns business logic for dropping a MongoDB collection with name confirmation. */
export function DropCollectionProvider({
  databaseName,
  collectionName,
  onSuccess,
  children,
}: {
  databaseName: string;
  collectionName: string;
  onSuccess?: () => void;
  children: ReactNode;
}): JSX.Element {
  const { dropCollection } = useDbAccessReadOnlyActions();
  const [confirmName, setConfirmName] = useState("");
  const canDrop = confirmName === collectionName;

  const handleSubmit = useCallback(async () => {
    if (!canDrop) {
      return;
    }
    const result = await dropCollection(databaseName, collectionName);
    if (result.success) {
      onSuccess?.();
    } else {
      throw new Error(result.message ?? "Unknown error");
    }
  }, [canDrop, dropCollection, databaseName, collectionName, onSuccess]);

  return (
    <DropCollectionCtx
      value={{ confirmName, setConfirmName, collectionName, canDrop }}
    >
      <ModalForm.Provider
        meta={{
          title: "Drop collection",
          icon: AlertTriangle,
          isDestructive: true,
        }}
        onSubmit={handleSubmit}
      >
        {children}
      </ModalForm.Provider>
    </DropCollectionCtx>
  );
}
