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
  description: string;
  /** Category under the style, e.g. `blocks` | `components` */
  group: string;
  /** URL segment / leaf id, e.g. `log-viewer` */
  name: string;
  /** Design / build / review / shipped — drives sidebar icon. */
  state: RegistryPreviewState;
  /** Registry style pack folder, e.g. `linear` */
  style: string;
  title: string;
}

/** One sidebar section: items under `style` / `group`. */
export interface RegistrySidebarSection {
  group: string;
  items: RegistryNavItem[];
  style: string;
}
