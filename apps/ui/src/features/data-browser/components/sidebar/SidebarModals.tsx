import { SingleObjectExportModal } from "@data-browser/components/database/shared/SingleObjectExportModal";
import { AlertModal } from "@data-browser/components/ui/AlertModal";
import type { Alert } from "@data-browser/components/ui/types";
import type { ModalState } from "./Sidebar";
import type { TreeNodeData } from "./SidebarTree/types";

interface SidebarModalsProps {
  activeModal: ModalState | null;
  alert: Alert | null;
  closeAlert: () => void;
  closeModal: () => void;
  refreshNode: (node: TreeNodeData) => void;
}

export function SidebarModals({
  activeModal,
  alert,
  closeAlert,
  closeModal,
}: SidebarModalsProps) {
  return (
    <>
      {activeModal?.type === "export_data" && (
        <SingleObjectExportModal
          objectRef={activeModal.params.objectRef}
          onOpenChange={(open) => {
            if (!open) {
              closeModal();
            }
          }}
          open
          title={activeModal.params.tableName}
        />
      )}

      {activeModal?.type === "export_collection" && (
        <SingleObjectExportModal
          objectRef={activeModal.params.objectRef}
          onOpenChange={(open) => {
            if (!open) {
              closeModal();
            }
          }}
          open
          title={activeModal.params.collectionName}
        />
      )}

      {activeModal?.type === "export_redis_key" && (
        <SingleObjectExportModal
          objectRef={activeModal.params.objectRef}
          onOpenChange={(open) => {
            if (!open) {
              closeModal();
            }
          }}
          open
          title={activeModal.params.keyName}
        />
      )}

      <AlertModal
        isOpen={alert !== null}
        message={alert?.message ?? ""}
        onClose={closeAlert}
        title={alert?.title ?? ""}
        type={alert?.type}
      />
    </>
  );
}
