import { useI18n } from "@data-browser/i18n/useI18n";
import {
  DocumentEditorDialog,
  type DocumentEditorDialogProps,
} from "./CollectionView.DocumentEditorDialog";

/** Dialog for editing an existing MongoDB document with JSON textarea. */
export function EditDocumentModal(
  props: Omit<DocumentEditorDialogProps, "title" | "submitLabel">
) {
  const { t } = useI18n();

  return (
    <DocumentEditorDialog
      submitLabel={t("mongodb.document.saveChanges")}
      title={t("mongodb.document.editTitle")}
      {...props}
    />
  );
}
