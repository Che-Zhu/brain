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
  github: "Github",
  "docker-image": "Docker Image",
  database: "Database",
};

export interface ProjectCreatorActions {
  onDatabaseConfirm?: (databaseId: string) => void | Promise<void>;
  onDockerConfirm?: (imageRef: string) => void | Promise<void>;
  onGithubConfirm?: (url: string) => void | Promise<void>;
}

export interface ProjectCreatorStates {
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
  } & ProjectCreatorActions;
  meta: {
    databaseOptions: ProjectCreatorDatabaseChoice[];
    /** Enables `GithubDeployer` in the GitHub step (`ProjectCreatorStage`). Omit for an empty/disabled-looking deploy shell. */
    githubDeployer?: ProjectCreatorGithubDeployerSlot;
  };
  states: ProjectCreatorStates;
}
