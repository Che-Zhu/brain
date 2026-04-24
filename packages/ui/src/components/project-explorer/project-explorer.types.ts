export interface ProjectExplorerProject {
  createdAt: Date | string;
  id: string;
  /** Display name shown in the list. */
  name: string;
  /** `spec.public` on the Project claim when known. */
  public?: boolean;
}

/** Copy shown when `projects` is empty (list uses defaults when fields are omitted). */
export interface ProjectExplorerEmptyState {
  /** Set to `""` to hide the secondary line. */
  description?: string;
  title?: string;
}

/** Display state for the explorer (passed into Root as `states`). */
export interface ProjectExplorerStates {
  /**
   * When `projects` has no items, the list shows an empty state.
   * Set `title` / `description` to customize; strings default when omitted.
   */
  empty?: ProjectExplorerEmptyState;
  projects: ProjectExplorerProject[];
}

/** Optional handlers for project rows. */
export interface ProjectExplorerActions {
  onProjectClick?: (project: ProjectExplorerProject) => void;
  /**
   * When set, a public/private switch is shown at the end of each row.
   * Use to PATCH `spec.public` (or your backend); called with the desired next value.
   */
  onProjectPublicChange?: (
    project: ProjectExplorerProject,
    isPublic: boolean
  ) => void | Promise<void>;
}

export interface ProjectExplorerValue {
  actions: ProjectExplorerActions;
  states: ProjectExplorerStates;
}
