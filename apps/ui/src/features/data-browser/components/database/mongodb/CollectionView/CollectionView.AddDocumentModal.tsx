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
  return (
    <DocumentEditorDialog
      description={"Create a new document using JSON."}
      placeholder="{ ... }"
      submitLabel={"Add document"}
      title={"Add document"}
      {...props}
    />
  );
}
