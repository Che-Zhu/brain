import {
  DocumentEditorDialog,
  type DocumentEditorDialogProps,
} from "./CollectionView.DocumentEditorDialog";

/** Dialog for editing an existing MongoDB document with JSON textarea. */
export function EditDocumentModal(
  props: Omit<DocumentEditorDialogProps, "title" | "submitLabel">
) {
  return (
    <DocumentEditorDialog
      submitLabel={"Save changes"}
      title={"Edit document"}
      {...props}
    />
  );
}
