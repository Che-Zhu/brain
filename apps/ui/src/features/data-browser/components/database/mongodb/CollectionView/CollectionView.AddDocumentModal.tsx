import { useI18n } from "@data-browser/i18n/useI18n";
import {
  DocumentEditorDialog,
  type DocumentEditorDialogProps,
} from "./CollectionView.DocumentEditorDialog";

/** Dialog for adding a new MongoDB document with JSON textarea input. */
export function AddDocumentModal(
  props: Omit<
    DocumentEditorDialogProps,
    "title" | "submitLabel" | "description" | "placeholder"
  >
) {
  const { t } = useI18n();

  return (
    <DocumentEditorDialog
      description={t("mongodb.document.addDescription")}
      placeholder="{ ... }"
      submitLabel={t("mongodb.document.add")}
      title={t("mongodb.document.addTitle")}
      {...props}
    />
  );
}
