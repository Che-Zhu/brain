import { useModalForm } from "@data-browser/components/ui/ModalForm";
import { Textarea } from "@data-browser/components/ui/Textarea";
import { useI18n } from "@data-browser/i18n/useI18n";
import { useRedisKeyCtx } from "./RedisKeyProvider";

/** Editor for Redis string values in create mode and supported string-only edit mode. */
export function RedisKeyStringEditor() {
  const { t } = useI18n();
  const { draft, setStringValue } = useRedisKeyCtx();
  const { state } = useModalForm();

  return (
    <div className="flex flex-col gap-2">
      <label className="font-medium text-foreground text-sm">
        {t("redis.key.value")}
      </label>
      <Textarea
        className="min-h-[220px] font-mono"
        disabled={state.isSubmitting}
        onChange={(event) => setStringValue(event.target.value)}
        placeholder={t("redis.key.stringPlaceholder")}
        value={draft.stringValue}
      />
    </div>
  );
}
