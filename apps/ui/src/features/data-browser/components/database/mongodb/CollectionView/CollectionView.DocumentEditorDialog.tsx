import { Dialog, DialogContent } from "@data-browser/components/ui/dialog";
import { ModalForm } from "@data-browser/components/ui/ModalForm";
import { Textarea } from "@data-browser/components/ui/Textarea";

export interface DocumentEditorDialogProps {
  content: string;
  description?: string;
  onContentChange: (content: string) => void;
  onOpenChange: (open: boolean) => void;
  onSave: () => Promise<void>;
  open: boolean;
  placeholder?: string;
  submitLabel: string;
  title: string;
}

/** Shared dialog shell for document add/edit modals. Owns layout, not behavior. */
export function DocumentEditorDialog({
  open,
  onOpenChange,
  title,
  submitLabel,
  description,
  placeholder,
  content,
  onContentChange,
  onSave,
}: DocumentEditorDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="flex max-h-[80vh] max-w-2xl flex-col">
        <ModalForm.Provider meta={{ title, description }} onSubmit={onSave}>
          <ModalForm.Header />
          <div className="flex-1 overflow-hidden">
            <Textarea
              className="h-full min-h-[300px] resize-none p-4 font-mono"
              onChange={(e) => onContentChange(e.target.value)}
              placeholder={placeholder}
              value={content}
            />
          </div>
          <ModalForm.Alert />
          <ModalForm.Footer>
            <ModalForm.CancelButton />
            <ModalForm.SubmitButton label={submitLabel} />
          </ModalForm.Footer>
        </ModalForm.Provider>
      </DialogContent>
    </Dialog>
  );
}
