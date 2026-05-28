import { Dialog, DialogContent } from "@data-browser/components/ui/dialog";
import { Input } from "@data-browser/components/ui/Input";
import { ModalForm, useModalForm } from "@data-browser/components/ui/ModalForm";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@data-browser/components/ui/select";
import { useI18n } from "@data-browser/i18n/useI18n";
import { useCallback } from "react";
import { RedisKeyHashEditor } from "./RedisKey.HashEditor";
import { RedisKeyListEditor } from "./RedisKey.ListEditor";
import { RedisKeySetEditor } from "./RedisKey.SetEditor";
import { RedisKeyStringEditor } from "./RedisKey.StringEditor";
import { RedisKeyZSetEditor } from "./RedisKey.ZSetEditor";
import { RedisKeyProvider, useRedisKeyCtx } from "./RedisKeyProvider";
import type { RedisKeyDraft, RedisKeyType } from "./redis-key.types";
import { hasRedisDraftPayload } from "./redis-key.utils";

interface RedisKeyModalProps {
  databaseName: string;
  initialData?: RedisKeyDraft | null;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  open: boolean;
}

const REDIS_TYPES: RedisKeyType[] = ["string", "hash", "list", "set", "zset"];

/** Modal for creating Redis keys and editing existing string-key values. */
export function RedisKeyModal({
  open,
  onOpenChange,
  databaseName,
  onSuccess,
  initialData,
}: RedisKeyModalProps) {
  const handleSuccess = useCallback(() => {
    onSuccess?.();
    onOpenChange(false);
  }, [onSuccess, onOpenChange]);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <RedisKeyProvider
          databaseName={databaseName}
          initialData={initialData}
          onSuccess={handleSuccess}
          open={open}
        >
          <ModalForm.Header />
          <RedisKeyIdentityFields />
          <RedisKeyEditorSwitch />
          <ModalForm.Alert />
          <RedisKeyFooter />
        </RedisKeyProvider>
      </DialogContent>
    </Dialog>
  );
}

/** Shared key identity fields with create-only type/name editing. */
function RedisKeyIdentityFields() {
  const { t } = useI18n();
  const { draft, setKey, setType, canEditKeyName, canEditType, isEditMode } =
    useRedisKeyCtx();
  const { state } = useModalForm();

  return (
    <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
      <div className="flex flex-col gap-1.5">
        <label className="font-medium text-foreground text-sm">
          {t("redis.key.name")}
        </label>
        <Input
          className={
            canEditKeyName ? undefined : "border-primary/20 bg-primary/5"
          }
          disabled={state.isSubmitting || !canEditKeyName}
          onChange={(event) => setKey(event.target.value)}
          placeholder={t("redis.key.namePlaceholder")}
          value={draft.key}
        />
        {isEditMode && !canEditKeyName && (
          <p className="text-muted-foreground text-xs">
            {t("redis.key.nameReadonly")}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="font-medium text-foreground text-sm">
          {t("redis.key.type")}
        </label>
        <Select
          disabled={state.isSubmitting || !canEditType}
          onValueChange={(value) => setType(value as RedisKeyType)}
          value={draft.type}
        >
          <SelectTrigger
            className={
              canEditType ? "w-full" : "w-full border-primary/20 bg-primary/5"
            }
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REDIS_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type.toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isEditMode && !canEditType && (
          <p className="text-muted-foreground text-xs">
            {t("redis.key.typeReadonly")}
          </p>
        )}
      </div>
    </div>
  );
}

function RedisKeyEditorSwitch() {
  const { t } = useI18n();
  const { draft, isEditMode, isStringEdit } = useRedisKeyCtx();

  if (isEditMode && !isStringEdit) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-muted-foreground text-sm">
        {t("redis.key.editOnlyString")}
      </div>
    );
  }

  switch (draft.type) {
    case "string":
      return <RedisKeyStringEditor />;
    case "hash":
      return <RedisKeyHashEditor />;
    case "list":
      return <RedisKeyListEditor />;
    case "set":
      return <RedisKeySetEditor />;
    case "zset":
      return <RedisKeyZSetEditor />;
    default:
      return null;
  }
}

function RedisKeyFooter() {
  const { t } = useI18n();
  const { draft, isEditMode, isStringEdit } = useRedisKeyCtx();
  const { state } = useModalForm();
  const submitLabel =
    draft.mode === "edit"
      ? t("redis.key.saveAction")
      : t("redis.key.createAction");
  const isCreateDisabled =
    draft.mode === "create" && !hasRedisDraftPayload(draft);
  const isSubmitDisabled =
    !draft.key.trim() ||
    state.isSubmitting ||
    (isEditMode && !isStringEdit) ||
    isCreateDisabled;

  return (
    <ModalForm.Footer>
      <ModalForm.CancelButton />
      <ModalForm.SubmitButton disabled={isSubmitDisabled} label={submitLabel} />
    </ModalForm.Footer>
  );
}
