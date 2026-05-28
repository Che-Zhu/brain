import { Dialog, DialogContent } from "@data-browser/components/ui/dialog";
import { Input } from "@data-browser/components/ui/Input";
import { ModalForm, useModalForm } from "@data-browser/components/ui/ModalForm";
import { useI18n } from "@data-browser/i18n/useI18n";
import { useCallback } from "react";
import {
  DropCollectionProvider,
  useDropCollectionCtx,
} from "./DropCollectionProvider";

interface DropCollectionModalProps {
  collectionName: string;
  databaseName: string;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  open: boolean;
}

/** Modal for dropping a MongoDB collection with name confirmation. */
export function DropCollectionModal({
  open,
  onOpenChange,
  databaseName,
  collectionName,
  onSuccess,
}: DropCollectionModalProps) {
  const handleSuccess = useCallback(() => {
    onSuccess?.();
    onOpenChange(false);
  }, [onSuccess, onOpenChange]);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DropCollectionProvider
          collectionName={collectionName}
          databaseName={databaseName}
          onSuccess={handleSuccess}
        >
          <ModalForm.Header />
          <DropCollectionWarning />
          <DropCollectionConfirmation />
          <ModalForm.Alert />
          <ModalForm.Footer>
            <ModalForm.CancelButton />
            <DropCollectionSubmitButton />
          </ModalForm.Footer>
        </DropCollectionProvider>
      </DialogContent>
    </Dialog>
  );
}

/** Warning banner explaining the destructive action. */
function DropCollectionWarning() {
  const { t } = useI18n();
  const { collectionName } = useDropCollectionCtx();

  return (
    <div className="rounded-lg border border-destructive/10 bg-destructive/5 p-4 text-sm">
      <p className="font-medium text-destructive">
        {t("mongodb.collection.warningTitle")}
      </p>
      <p className="mt-1 text-muted-foreground">
        {t("mongodb.collection.warningMessage", { collectionName })}
      </p>
    </div>
  );
}

/** Confirmation input — user must type the collection name to enable drop. */
function DropCollectionConfirmation() {
  const { t } = useI18n();
  const { confirmName, setConfirmName, collectionName } =
    useDropCollectionCtx();
  const { state } = useModalForm();

  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-medium text-foreground text-sm">
        {t("mongodb.collection.confirmName")}
      </label>
      <Input
        disabled={state.isSubmitting}
        onChange={(e) => setConfirmName(e.target.value)}
        placeholder={collectionName}
        value={confirmName}
      />
    </div>
  );
}

/** Submit button disabled until confirmation name matches. */
function DropCollectionSubmitButton() {
  const { t } = useI18n();
  const { canDrop } = useDropCollectionCtx();
  return (
    <ModalForm.SubmitButton
      disabled={!canDrop}
      label={t("mongodb.collection.drop")}
    />
  );
}
