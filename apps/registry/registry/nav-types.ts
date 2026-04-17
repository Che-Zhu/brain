/** Serializable registry metadata for client UI (no lazy components). */

export const REGISTRY_PREVIEW_STATES = [
  "designing",
  "coding",
  "reviewing",
  "done",
] as const;

/** Lifecycle for registry previews (sidebar icon). */
export type RegistryPreviewState = (typeof REGISTRY_PREVIEW_STATES)[number];

export interface RegistryNavItem {
  /** Registry style pack folder, e.g. `linear` */
  style: string;
  /** Category under the style, e.g. `blocks` | `components` */
  group: string;
  /** URL segment / leaf id, e.g. `log-viewer` */
  name: string;
  title: string;
  description: string;
  /** Design / build / review / shipped — drives sidebar icon. */
  state: RegistryPreviewState;
}

/** One sidebar section: items under `style` / `group`. */
export interface RegistrySidebarSection {
  style: string;
  group: string;
  items: RegistryNavItem[];
}
