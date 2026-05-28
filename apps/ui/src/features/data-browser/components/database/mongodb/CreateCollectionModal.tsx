import { Dialog, DialogContent } from "@data-browser/components/ui/dialog";
import { Input } from "@data-browser/components/ui/Input";
import { ModalForm, useModalForm } from "@data-browser/components/ui/ModalForm";
import { useCallback } from "react";
import {
  CreateCollectionProvider,
  useCreateCollectionCtx,
} from "./CreateCollectionProvider";

interface CreateCollectionModalProps {
  connectionId: string;
  databaseName: string;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  open: boolean;
}

/** Modal for creating a MongoDB collection using the composition pattern. */
export function CreateCollectionModal({
  open,
  onOpenChange,
  connectionId,
  databaseName,
  onSuccess,
}: CreateCollectionModalProps) {
  const handleSuccess = useCallback(() => {
    onSuccess?.();
    onOpenChange(false);
  }, [onSuccess, onOpenChange]);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <CreateCollectionProvider
          connectionId={connectionId}
          databaseName={databaseName}
          onSuccess={handleSuccess}
        >
          <ModalForm.Header />
          <CreateCollectionFields />
          <ModalForm.Alert />
          <ModalForm.Footer>
            <ModalForm.CancelButton />
            <CreateCollectionSubmitButton />
          </ModalForm.Footer>
        </CreateCollectionProvider>
      </DialogContent>
    </Dialog>
  );
}

/** Input field for the new collection name. */
function CreateCollectionFields() {
  const { collectionName, setCollectionName } = useCreateCollectionCtx();
  const { state, actions } = useModalForm();

  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-medium text-foreground text-sm">
        {"Collection name"}
      </label>
      <Input
        autoFocus
        disabled={state.isSubmitting}
        onChange={(e) => setCollectionName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && collectionName && !state.isSubmitting) {
            actions.submit?.();
          }
        }}
        placeholder={"Enter collection name"}
        value={collectionName}
      />
    </div>
  );
}

/** Submit button disabled when collection name is empty. */
function CreateCollectionSubmitButton() {
  const { collectionName } = useCreateCollectionCtx();
  return (
    <ModalForm.SubmitButton
      disabled={!collectionName}
      label={"Create collection"}
    />
  );
}
