import type { LucideIcon } from "lucide-react";

/** Base state shared by all modal providers. Per-modal Providers extend this with domain-specific fields. */
export interface ModalState {
  alert: ModalAlert | null;
  isSubmitting: boolean;
}

/** Alert data displayed inline within a modal. */
export interface ModalAlert {
  message: string;
  title: string;
  type: "success" | "error" | "info";
}

/** Unified alert type. `null` = no alert active. Replaces both ModalAlert and AlertState. */
export type Alert = ModalAlert;

/** Base actions shared by all modal providers. */
export interface ModalActions {
  closeAlert: () => void;
  reset: () => void;
  setAlert: (alert: ModalAlert | null) => void;
  setSubmitting: (v: boolean) => void;
  /** Only present when onSubmit was provided to ModalForm.Provider. */
  submit?: () => Promise<void>;
}

/** Display metadata for a modal — title, icon, destructive flag. */
export interface ModalMeta {
  description?: string;
  icon?: LucideIcon;
  isDestructive?: boolean;
  title: string;
}

/** Combined context value consumed by ModalForm compound components. */
export interface ModalContextValue {
  actions: ModalActions;
  meta: ModalMeta;
  state: ModalState;
}
