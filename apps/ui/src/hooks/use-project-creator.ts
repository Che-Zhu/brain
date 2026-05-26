"use client";

import type { DatabaseDeploymentSettings } from "@workspace/ui/components/database-deployer";
import type { DockerDeploymentSettings } from "@workspace/ui/components/docker-deployer";
import type { GithubDeployerRepo } from "@workspace/ui/components/github-deployer/github-deployer.types";
import type { ProjectCreatorRootProps } from "@workspace/ui/components/project-creator/project-creator.context";
import type {
  ProjectCreatorActions,
  ProjectCreatorDatabaseChoice,
} from "@workspace/ui/components/project-creator/project-creator.types";
import type { ProjectExplorerProject } from "@workspace/ui/components/project-explorer/project-explorer";
import { validateDockerDeploymentSettings } from "@workspace/ui/lib/docker-deployment-settings";
import { randomName } from "@workspace/ui/lib/random-name";
import { useCallback, useMemo, useReducer, useState } from "react";
import { toast } from "sonner";

import {
  initialProjectCreationPaneState,
  type ProjectCreationPaneEntryMode,
  projectCreationPaneStateReducer,
} from "@/components/project-creation-pane-state";
import { useApCompositions } from "@/hooks/compositions/use-ap-composition";
import { useDbCompositions } from "@/hooks/compositions/use-db-compositions";
import { useProjectCompositions } from "@/hooks/compositions/use-project-composition";
import { useGithubAuth } from "@/hooks/use-github-auth";
import { useGithubRepos } from "@/hooks/use-github-repos";
import type { CompositionListItem } from "@/lib/crossplane-composition-list";
import { dbDeploymentChoicesFromCompositionRows } from "@/lib/db-composition-options";
import { renderDbDeploymentYaml } from "@/lib/db-deployment-yaml";
import {
  DEFAULT_DOCKER_AP_COMPOSITION_NAME,
  renderDockerDeploymentYaml,
} from "@/lib/docker-deployment-yaml";
import { deriveDockerProjectDisplayName } from "@/lib/docker-project-display-name";
import { fetchProjectUidByName } from "@/lib/fetch-project-uid";
import { deriveGithubProjectDisplayName } from "@/lib/github-project-display-name";
import { routingDomainFromKubeconfig } from "@/lib/kubeconfig-routing-domain";
import { k8sApplyYaml } from "@/lib/project-canvas/k8s/http/apply-yaml";
import { childResourceName } from "@/lib/project-child-resource-name";
import { mergeProjectMetadataDisplayName } from "@/lib/project-yaml-metadata";
import { isProjectDisplayNameTaken } from "@/lib/projects-to-explorer-projects";
import {
  joinKubeYamlDocuments,
  renderCrossplaneCompositionTemplate,
} from "@/lib/render-crossplane-template";

/** Matches {@link packages/crossplane/public/service/project/project-instance-composition.yaml}. */
const DEFAULT_PROJECT_COMPOSITION_NAME = "project-instance-go-templating";
const EMPTY_PROJECTS: readonly ProjectExplorerProject[] = [];

type CreatorRootPropsForCreationPane = Pick<
  ProjectCreatorRootProps,
  | "actions"
  | "confirmApplying"
  | "databaseOptions"
  | "existingProjectDisplayNames"
  | "githubDeployer"
>;

function pickProjectTemplate(
  rows: CompositionListItem[] | undefined
): string | undefined {
  return (
    rows?.find(
      (r) => r.metadata.compositionName === DEFAULT_PROJECT_COMPOSITION_NAME
    )?.template ?? rows?.find((r) => r.kind === "Project")?.template
  );
}

function pickApTemplate(
  rows: CompositionListItem[] | undefined
): string | undefined {
  return (
    rows?.find(
      (r) => r.metadata.compositionName === DEFAULT_DOCKER_AP_COMPOSITION_NAME
    )?.template ?? rows?.find((r) => r.kind === "AP")?.template
  );
}

function projectDisplayNameValidationError(
  existingProjects: readonly ProjectExplorerProject[],
  displayName: string
): string | null {
  const trimmed = displayName.trim();
  if (!trimmed) {
    return "Project name is required.";
  }
  if (isProjectDisplayNameTaken(existingProjects, trimmed)) {
    return `A project named "${trimmed}" already exists.`;
  }
  return null;
}

export interface UseProjectCreatorOptions {
  /** Existing Project rows in the namespace, used for display-name uniqueness checks. */
  existingProjects?: readonly ProjectExplorerProject[];
  /** Loads composition options from the API when set (same kubeconfig as explorer). */
  kubeconfig?: string;
  /** Target namespace for rendered claim `metadata.namespace`. */
  namespace?: string;
  /**
   * Called after a Project + child claim apply succeeds.
   * `projectUid` is `metadata.uid` when the API returns the Project in time; otherwise `undefined`.
   */
  onProjectCreated?: (projectUid: string | undefined) => void | Promise<void>;
}

export function useProjectCreator(options?: UseProjectCreatorOptions): {
  creatorRootProps: CreatorRootPropsForCreationPane;
  creatorResetKey: number;
  creationPaneOpen: boolean;
  creationPaneEntryMode: ProjectCreationPaneEntryMode;
  /** True while GitHub auth or repository list is loading for the deployer. */
  githubDeployerLoading: boolean;
  lastConfirmedKind: string | null;
  onCreationPaneOpenChange: (open: boolean) => void;
  openCreationPane: (entryMode?: ProjectCreationPaneEntryMode) => void;
} {
  const kubeconfig = options?.kubeconfig?.trim() ?? "";
  const namespace = options?.namespace?.trim() ?? "";
  const onProjectCreated = options?.onProjectCreated;
  const existingProjects = options?.existingProjects ?? EMPTY_PROJECTS;
  const hasKubeconfig = kubeconfig !== "";

  const [creationPaneState, dispatchCreationPaneState] = useReducer(
    projectCreationPaneStateReducer,
    initialProjectCreationPaneState
  );
  const [confirmApplying, setConfirmApplying] = useState(false);
  const [lastConfirmedKind, setLastConfirmedKind] = useState<string | null>(
    null
  );

  const { items: dbCompositionRows } = useDbCompositions({
    kubeconfig,
    toItems: true,
  });
  const { items: projectCompositionRows } = useProjectCompositions({
    kubeconfig,
    toItems: true,
  });
  const { items: apCompositionRows } = useApCompositions({
    kubeconfig,
    toItems: true,
  });

  const {
    githubToken,
    initiateGithubAuth,
    isLoading: githubAuthLoading,
  } = useGithubAuth();

  const { isLoading: githubReposLoading, repos: githubRepos } =
    useGithubRepos(githubToken);

  const openCreationPane = useCallback(
    (entryMode: ProjectCreationPaneEntryMode = "general") => {
      setConfirmApplying(false);
      dispatchCreationPaneState({ entryMode, type: "open" });
    },
    []
  );

  const onCreationPaneOpenChange = useCallback((open: boolean) => {
    if (open) {
      dispatchCreationPaneState({ entryMode: "general", type: "open" });
      return;
    }
    dispatchCreationPaneState({ type: "close" });
    setConfirmApplying(false);
  }, []);

  const databaseOptions = useMemo((): ProjectCreatorDatabaseChoice[] => {
    if (!hasKubeconfig) {
      return [];
    }
    return dbDeploymentChoicesFromCompositionRows(dbCompositionRows);
  }, [dbCompositionRows, hasKubeconfig]);

  const handleGithubDeploy = useCallback(
    (repo: GithubDeployerRepo) => {
      const displayName = deriveGithubProjectDisplayName({
        existingProjectDisplayNames: existingProjects.map(
          (project) => project.name
        ),
        repository: repo,
      });
      setLastConfirmedKind(
        `github:${repo.fullName ?? repo.name}:${displayName}`
      );
      toast.info(
        `GitHub project creation for "${displayName}" isn’t ready yet — this feature is incomplete.`
      );
    },
    [existingProjects]
  );

  const githubDeployerLoading =
    githubAuthLoading || (!!githubToken?.trim() && githubReposLoading);

  const githubDeployer = useMemo(
    () => ({
      actions: {
        onAuthorize: initiateGithubAuth,
        onDeploy: handleGithubDeploy,
      },
      states: {
        deployedRepo: null,
        githubToken: githubToken ?? "",
        isLoading: githubDeployerLoading,
        repos: githubRepos,
      },
    }),
    [
      githubDeployerLoading,
      githubRepos,
      githubToken,
      handleGithubDeploy,
      initiateGithubAuth,
    ]
  );

  const applyWithBusyState = useCallback(
    async (fn: () => Promise<void>): Promise<void> => {
      setConfirmApplying(true);
      try {
        await fn();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Apply failed");
      } finally {
        setConfirmApplying(false);
      }
    },
    []
  );

  const actions = useMemo<ProjectCreatorActions>(
    () => ({
      deriveDockerProjectDisplayName: (imageRef: string) =>
        deriveDockerProjectDisplayName({
          existingProjectDisplayNames: existingProjects.map(
            (project) => project.name
          ),
          imageRef,
        }),
      onDockerConfirm: async (
        settings: DockerDeploymentSettings,
        projectDisplayName
      ) => {
        const displayName = projectDisplayName.trim();
        const displayNameError = projectDisplayNameValidationError(
          existingProjects,
          displayName
        );
        const settingsValidation = validateDockerDeploymentSettings(settings);
        if (!(kubeconfig && namespace)) {
          toast.error("Kubeconfig or namespace is missing.");
          return;
        }
        if (displayNameError) {
          toast.error(displayNameError);
          return;
        }
        if (!settingsValidation.valid) {
          toast.error(
            settingsValidation.errors[0]?.message ??
              "Docker deployment settings are invalid."
          );
          return;
        }

        const projectTpl = pickProjectTemplate(projectCompositionRows);
        const apTpl = pickApTemplate(apCompositionRows);

        if (!projectTpl?.trim()) {
          toast.error(
            "Could not load a Project composition template from the cluster."
          );
          return;
        }
        if (!apTpl?.trim()) {
          toast.error(
            "Could not load an AP composition template from the cluster."
          );
          return;
        }

        const projectClaimName = randomName();
        const apClaimName = childResourceName(projectClaimName);
        const routingDomain = routingDomainFromKubeconfig(kubeconfig);

        const projectYaml = mergeProjectMetadataDisplayName(
          renderCrossplaneCompositionTemplate(projectTpl, {
            name: projectClaimName,
            namespace,
          }),
          displayName
        );
        const apYaml = renderDockerDeploymentYaml({
          name: apClaimName,
          namespace,
          projectName: projectClaimName,
          routingDomain,
          settings,
          template: apTpl,
        });

        await applyWithBusyState(async () => {
          await k8sApplyYaml(
            kubeconfig,
            joinKubeYamlDocuments([projectYaml, apYaml])
          );
          toast.success(
            `Applied project "${displayName}" and AP "${apClaimName}".`
          );
          setLastConfirmedKind(`docker:${settings.image}:${projectClaimName}`);
          dispatchCreationPaneState({ type: "close" });
          const projectUid = await fetchProjectUidByName(
            kubeconfig,
            namespace,
            projectClaimName
          );
          await onProjectCreated?.(projectUid);
        });
      },
      onDatabaseConfirm: async (
        settings: DatabaseDeploymentSettings,
        projectDisplayName
      ) => {
        const choice = databaseOptions.find(
          (d) => d.id === settings.databaseId
        );
        const displayName = projectDisplayName.trim();
        const displayNameError = projectDisplayNameValidationError(
          existingProjects,
          displayName
        );
        if (!(kubeconfig && namespace)) {
          toast.error("Kubeconfig or namespace is missing.");
          return;
        }
        if (displayNameError) {
          toast.error(displayNameError);
          return;
        }
        if (choice == null) {
          toast.error("Choose a database engine.");
          return;
        }

        const projectTpl = pickProjectTemplate(projectCompositionRows);
        if (!projectTpl?.trim()) {
          toast.error(
            "Could not load a Project composition template from the cluster."
          );
          return;
        }

        const projectClaimName = randomName();
        const dbClaimName = childResourceName(projectClaimName);

        const projectYaml = mergeProjectMetadataDisplayName(
          renderCrossplaneCompositionTemplate(projectTpl, {
            name: projectClaimName,
            namespace,
          }),
          displayName
        );
        const dbYaml = renderDbDeploymentYaml({
          compositionName: choice.id,
          engine: choice.engine,
          name: dbClaimName,
          namespace,
          projectName: projectClaimName,
          quota: settings.instancePreset,
          replicas: settings.replicas,
          template: choice.template,
        });

        await applyWithBusyState(async () => {
          await k8sApplyYaml(
            kubeconfig,
            joinKubeYamlDocuments([projectYaml, dbYaml])
          );
          toast.success(
            `Applied project "${displayName}" and database "${dbClaimName}".`
          );
          setLastConfirmedKind(
            `database:${settings.databaseId}:${projectClaimName}`
          );
          dispatchCreationPaneState({ type: "close" });
          const projectUid = await fetchProjectUidByName(
            kubeconfig,
            namespace,
            projectClaimName
          );
          await onProjectCreated?.(projectUid);
        });
      },
    }),
    [
      applyWithBusyState,
      apCompositionRows,
      databaseOptions,
      existingProjects,
      kubeconfig,
      namespace,
      onProjectCreated,
      projectCompositionRows,
    ]
  );

  const creatorRootProps = useMemo(
    () => ({
      actions,
      confirmApplying,
      databaseOptions,
      existingProjectDisplayNames: existingProjects.map(
        (project) => project.name
      ),
      githubDeployer,
    }),
    [
      actions,
      confirmApplying,
      databaseOptions,
      existingProjects,
      githubDeployer,
    ]
  );

  return {
    creationPaneEntryMode: creationPaneState.entryMode,
    creationPaneOpen: creationPaneState.open,
    creatorRootProps,
    creatorResetKey: creationPaneState.resetKey,
    githubDeployerLoading,
    lastConfirmedKind,
    onCreationPaneOpenChange,
    openCreationPane,
  };
}
