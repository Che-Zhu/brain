import { Dialog, DialogContent } from "@data-browser/components/ui/dialog";
import { Input } from "@data-browser/components/ui/Input";
import { ModalForm, useModalForm } from "@data-browser/components/ui/ModalForm";
import { useConnectionStore } from "@data-browser/stores/useConnectionStore";
import { resolveSchemaParam } from "@data-browser/utils/database-features";
import { Database } from "lucide-react";
import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useState,
} from "react";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface CreateDatabaseCtxValue {
  dbName: string;
  initialCollectionName: string;
  isMongoConnection: boolean;
  setDbName: (v: string) => void;
  setInitialCollectionName: (v: string) => void;
}

const CreateDatabaseCtx = createContext<CreateDatabaseCtxValue | null>(null);

function useCreateDatabaseCtx(): CreateDatabaseCtxValue {
  const ctx = use(CreateDatabaseCtx);
  if (!ctx) {
    throw new Error(
      "useCreateDatabaseCtx must be used within CreateDatabaseProvider"
    );
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/** Owns business logic for creating a new database. */
function CreateDatabaseProvider({
  connectionId,
  onSuccess,
  children,
}: {
  connectionId: string;
  onSuccess?: () => void;
  children: ReactNode;
}) {
  const { connections, createDatabase, createTable } = useConnectionStore();
  const [dbName, setDbName] = useState("");
  const [initialCollectionName, setInitialCollectionName] = useState("");
  const connection = connections.find((item) => item.id === connectionId);
  const isMongoConnection = connection?.type === "MONGODB";

  const handleSubmit = useCallback(async () => {
    if (!dbName) {
      return;
    }
    if (isMongoConnection) {
      if (!initialCollectionName) {
        return;
      }
      const schemaParam = resolveSchemaParam(connection?.type, dbName);
      const result = await createTable(
        dbName,
        schemaParam,
        initialCollectionName,
        []
      );
      if (result.success) {
        onSuccess?.();
      } else {
        throw new Error(result.message ?? "Unknown error");
      }
      return;
    }

    const result = await createDatabase(dbName);
    if (result.success) {
      onSuccess?.();
    } else {
      throw new Error(result.message ?? "Unknown error");
    }
  }, [
    connection?.type,
    createDatabase,
    createTable,
    dbName,
    initialCollectionName,
    isMongoConnection,
    onSuccess,
  ]);

  return (
    <CreateDatabaseCtx
      value={{
        dbName,
        setDbName,
        initialCollectionName,
        setInitialCollectionName,
        isMongoConnection,
      }}
    >
      <ModalForm.Provider
        meta={{ title: "Create database", icon: Database }}
        onSubmit={handleSubmit}
      >
        {children}
      </ModalForm.Provider>
    </CreateDatabaseCtx>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

/** Input field for the new database name. */
function CreateDatabaseFields() {
  const {
    dbName,
    setDbName,
    initialCollectionName,
    setInitialCollectionName,
    isMongoConnection,
  } = useCreateDatabaseCtx();
  const { state } = useModalForm();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="font-medium text-foreground text-sm">
          {"Database name"}
        </label>
        <Input
          disabled={state.isSubmitting}
          onChange={(e) => setDbName(e.target.value)}
          placeholder={"Enter database name"}
          value={dbName}
        />
      </div>

      {isMongoConnection && (
        <div className="flex flex-col gap-1.5">
          <label className="font-medium text-foreground text-sm">
            {"Collection name"}
          </label>
          <Input
            disabled={state.isSubmitting}
            onChange={(e) => setInitialCollectionName(e.target.value)}
            placeholder={"Enter collection name"}
            value={initialCollectionName}
          />
        </div>
      )}
    </div>
  );
}

/** Submit button disabled when database name is empty. */
function CreateSubmitButton() {
  const { dbName, initialCollectionName, isMongoConnection } =
    useCreateDatabaseCtx();
  const isDisabled = !dbName || (isMongoConnection && !initialCollectionName);
  return (
    <ModalForm.SubmitButton disabled={isDisabled} label={"Create database"} />
  );
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

interface CreateDatabaseModalProps {
  connectionId: string;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  open: boolean;
}

/** Modal for creating a new database. */
export function CreateDatabaseModal({
  open,
  onOpenChange,
  connectionId,
  onSuccess,
}: CreateDatabaseModalProps) {
  const handleSuccess = useCallback(() => {
    onSuccess?.();
    onOpenChange(false);
  }, [onSuccess, onOpenChange]);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <CreateDatabaseProvider
          connectionId={connectionId}
          onSuccess={handleSuccess}
        >
          <ModalForm.Header />
          <CreateDatabaseFields />
          <ModalForm.Alert />
          <ModalForm.Footer>
            <ModalForm.CancelButton />
            <CreateSubmitButton />
          </ModalForm.Footer>
        </CreateDatabaseProvider>
      </DialogContent>
    </Dialog>
  );
}
