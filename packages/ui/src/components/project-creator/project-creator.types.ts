import type {
  GithubDeployerActions,
  GithubDeployerStates,
} from "../github-deployer/github-deployer.types";

/** First step for project creation (breadcrumb + body). */
export type ProjectCreatorSourceKind = "github" | "docker-image" | "database";

export interface ProjectCreatorDatabaseChoice {
  /** Optional logo (e.g. Crossplane `meta.crossplane.io/icon-url`). */
  iconUrl?: string;
  id: string;
  label: string;
  /** Optional example claim YAML (`meta.crossplane.io/template`) when the cluster returns it. */
  template?: string;
}

export const PROJECT_CREATOR_SOURCE_LABEL: Record<
  ProjectCreatorSourceKind,
  string
> = {
  github: "GitHub",
  "docker-image": "Docker Image",
  database: "Database",
};

export interface ProjectCreatorActions {
  onDatabaseConfirm?: (
    databaseId: string,
    projectDisplayName: string
  ) => void | Promise<void>;
  onDockerConfirm?: (
    imageRef: string,
    projectDisplayName: string
  ) => void | Promise<void>;
  onGithubConfirm?: (
    url: string,
    projectDisplayName: string
  ) => void | Promise<void>;
}

export interface ProjectCreatorStates {
  /** When true after validation, disables Docker/DB Confirm and shows applying UI. */
  confirmApplying: boolean;
  /** User-facing Project Display Name entered before choosing a creation source. */
  projectDisplayName: string;
  /** Field-level validation message for the Project Display Name entry. */
  projectDisplayNameError: string | null;
  /** `null` shows the three-option column. */
  step: ProjectCreatorSourceKind | null;
}

export interface ProjectCreatorGithubDeployerSlot {
  actions?: GithubDeployerActions;
  states: GithubDeployerStates;
}

export interface ProjectCreatorValue {
  actions: {
    pick: (kind: ProjectCreatorSourceKind) => void;
    reset: () => void;
    setProjectDisplayName: (value: string) => void;
  } & ProjectCreatorActions;
  meta: {
    databaseOptions: ProjectCreatorDatabaseChoice[];
    /** Enables `GithubDeployer` in the GitHub step (`ProjectCreatorStage`). Omit for an empty/disabled-looking deploy shell. */
    githubDeployer?: ProjectCreatorGithubDeployerSlot;
  };
  states: ProjectCreatorStates;
}
