import { useModalForm } from "@data-browser/components/ui/ModalForm";
import { Textarea } from "@data-browser/components/ui/Textarea";
import { useRedisKeyCtx } from "./RedisKeyProvider";

/** Editor for Redis string values in create mode and supported string-only edit mode. */
export function RedisKeyStringEditor() {
  const { draft, setStringValue } = useRedisKeyCtx();
  const { state } = useModalForm();

  return (
    <div className="flex flex-col gap-2">
      <label className="font-medium text-foreground text-sm">{"Value"}</label>
      <Textarea
        className="min-h-[220px] font-mono"
        disabled={state.isSubmitting}
        onChange={(event) => setStringValue(event.target.value)}
        placeholder={"String value"}
        value={draft.stringValue}
      />
    </div>
  );
}
