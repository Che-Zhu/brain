"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import type {
  ProjectCreatorActions,
  ProjectCreatorDatabaseChoice,
  ProjectCreatorGithubDeployerSlot,
  ProjectCreatorSourceKind,
  ProjectCreatorValue,
} from "./project-creator.types";

const ProjectCreatorContext = createContext<ProjectCreatorValue | null>(null);

export function useProjectCreator(
  component = "ProjectCreator"
): ProjectCreatorValue {
  const ctx = useContext(ProjectCreatorContext);
  if (!ctx) {
    throw new Error(
      `${component} compound parts must be used within ProjectCreator.Root`
    );
  }
  return ctx;
}

const DEFAULT_DATABASE_OPTIONS: ProjectCreatorDatabaseChoice[] = [
  { id: "postgresql", label: "PostgreSQL" },
  { id: "mysql", label: "MySQL" },
  { id: "mongodb", label: "MongoDB" },
  { id: "redis", label: "Redis" },
];

export interface ProjectCreatorRootProps {
  actions?: ProjectCreatorActions;
  children: ReactNode;
  /** Options for the database step combobox. */
  databaseOptions?: ProjectCreatorDatabaseChoice[];
  /** Wired into the GitHub step’s `GithubDeployer` (authorize + repos + deploy). */
  githubDeployer?: ProjectCreatorGithubDeployerSlot;
}

export function ProjectCreatorRoot({
  actions: actionsProp,
  children,
  databaseOptions,
  githubDeployer: githubDeployerProp,
}: ProjectCreatorRootProps) {
  const [step, setStep] = useState<ProjectCreatorSourceKind | null>(null);
  const reset = useCallback(() => setStep(null), []);
  const pick = useCallback(
    (kind: ProjectCreatorSourceKind) => setStep(kind),
    []
  );

  const dbOptions = useMemo(
    () =>
      databaseOptions === undefined
        ? DEFAULT_DATABASE_OPTIONS
        : databaseOptions,
    [databaseOptions]
  );

  const value = useMemo<ProjectCreatorValue>(
    () => ({
      states: { step },
      actions: {
        pick,
        reset,
        onGithubConfirm: actionsProp?.onGithubConfirm,
        onDockerConfirm: actionsProp?.onDockerConfirm,
        onDatabaseConfirm: actionsProp?.onDatabaseConfirm,
      },
      meta: { databaseOptions: dbOptions, githubDeployer: githubDeployerProp },
    }),
    [step, reset, pick, actionsProp, dbOptions, githubDeployerProp]
  );

  return (
    <ProjectCreatorContext.Provider value={value}>
      {children}
    </ProjectCreatorContext.Provider>
  );
}

export { DEFAULT_DATABASE_OPTIONS, ProjectCreatorContext };
