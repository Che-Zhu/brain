import { Input } from "@data-browser/components/ui/Input";
import { AlertTriangle } from "lucide-react";
import React from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./alert-dialog";
import { Button } from "./Button";

interface ConfirmationModalProps {
  cancelText?: string;
  confirmText?: string;
  isDestructive?: boolean;
  isOpen: boolean;
  message: string;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  verificationLabel?: string;
  verificationText?: string;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  isDestructive = false,
  verificationText,
  verificationLabel,
}: ConfirmationModalProps) {
  const [inputValue, setInputValue] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const resolvedCancelText = cancelText ?? "Cancel";
  const resolvedConfirmText = confirmText ?? "Confirm";

  React.useEffect(() => {
    if (isOpen) {
      setInputValue("");
      setIsLoading(false);
    }
  }, [isOpen]);

  const isConfirmDisabled =
    (verificationText && inputValue !== verificationText) || isLoading;

  const handleConfirm = async () => {
    if (isConfirmDisabled) {
      return;
    }

    setIsLoading(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open={isOpen}
    >
      <AlertDialogContent aria-describedby={undefined}>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {isDestructive && (
              <AlertTriangle className="h-5 w-5 text-foreground" />
            )}
            {title}
          </AlertDialogTitle>
        </AlertDialogHeader>

        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-destructive/10 bg-destructive/5 p-4 font-medium text-destructive text-sm">
            {message}
          </div>

          {verificationText && (
            <div className="flex flex-col gap-2">
              <label className="font-medium text-foreground text-sm">
                {verificationLabel ?? `Type ${verificationText} to confirm.`}
              </label>
              <Input
                className="font-mono"
                onChange={(e) => setInputValue(e.target.value)}
                onPaste={(e) => e.preventDefault()}
                placeholder={verificationText}
                type="text"
                value={inputValue}
              />
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <Button disabled={isLoading} onClick={onClose} variant="ghost">
            {resolvedCancelText}
          </Button>
          <Button
            className="min-w-[80px]"
            disabled={isConfirmDisabled}
            onClick={handleConfirm}
            variant="default"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {"Processing..."}
              </div>
            ) : (
              resolvedConfirmText
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
