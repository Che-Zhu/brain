"use client";

import type { GithubDeployerRepo } from "@workspace/ui/components/github-deployer/github-deployer.types";
import type { ProjectCreatorRootProps } from "@workspace/ui/components/project-creator/project-creator.context";
import type {
  ProjectCreatorActions,
  ProjectCreatorDatabaseChoice,
} from "@workspace/ui/components/project-creator/project-creator.types";
import { randomNano } from "@workspace/ui/lib/generator";
import { randomName } from "@workspace/ui/lib/random-name";
import { useCallback, useMemo, useReducer, useState } from "react";
import { toast } from "sonner";

import {
  initialProjectCreationPaneState,
  projectCreationPaneStateReducer,
} from "@/components/project-creation-pane-state";
import { useApCompositions } from "@/hooks/compositions/use-ap-composition";
import { useDbCompositions } from "@/hooks/compositions/use-db-compositions";
import { useProjectCompositions } from "@/hooks/compositions/use-project-composition";
import { useGithubAuth } from "@/hooks/use-github-auth";
import { useGithubRepos } from "@/hooks/use-github-repos";
import {
  mergeApMetadataRegion,
  mergeApSpecProjectName,
  mergeDbSpecProjectName,
} from "@/lib/ap-yaml-merge-project";
import type { CompositionListItem } from "@/lib/crossplane-composition-list";
import { fetchProjectUidByName } from "@/lib/fetch-project-uid";
import { routingDomainFromKubeconfig } from "@/lib/kubeconfig-routing-domain";
import { k8sApplyYaml } from "@/lib/project-canvas/k8s/http/apply-yaml";
import {
  joinKubeYamlDocuments,
  renderCrossplaneCompositionTemplate,
} from "@/lib/render-crossplane-template";

/** Matches {@link packages/crossplane/public/service/project/project-instance-composition.yaml}. */
const DEFAULT_PROJECT_COMPOSITION_NAME = "project-instance-go-templating";
/** Matches {@link packages/crossplane/public/service/ap/aps-deployment-ingress-go-templating.yaml}. */
const DEFAULT_AP_COMPOSITION_NAME = "aps-deployment-ingress-go-templating";

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
      (r) => r.metadata.compositionName === DEFAULT_AP_COMPOSITION_NAME
    )?.template ?? rows?.find((r) => r.kind === "AP")?.template
  );
}

/** Child claim name: `{projectName}-{randomNano}` (≤63 chars, DNS label). */
function childResourceName(projectName: string): string {
  const nano = randomNano();
  const max = 63;
  const sep = "-";
  const tail = `${sep}${nano}`;
  const cap = max - tail.length;
  const base =
    projectName.length <= cap
      ? projectName
      : projectName.slice(0, cap).replace(/-+$/g, "");
  return `${base}${tail}`;
}

export interface UseProjectCreatorOptions {
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
  creatorRootProps: Pick<
    ProjectCreatorRootProps,
    "actions" | "confirmApplying" | "databaseOptions" | "githubDeployer"
  >;
  creatorResetKey: number;
  creationPaneOpen: boolean;
  /** True while GitHub auth or repository list is loading for the deployer. */
  githubDeployerLoading: boolean;
  lastConfirmedKind: string | null;
  onCreationPaneOpenChange: (open: boolean) => void;
  openCreationPane: () => void;
} {
  const kubeconfig = options?.kubeconfig?.trim() ?? "";
  const namespace = options?.namespace?.trim() ?? "";
  const onProjectCreated = options?.onProjectCreated;
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

  const openCreationPane = useCallback(() => {
    setConfirmApplying(false);
    dispatchCreationPaneState({ type: "open" });
  }, []);

  const onCreationPaneOpenChange = useCallback((open: boolean) => {
    if (open) {
      dispatchCreationPaneState({ type: "open" });
      return;
    }
    dispatchCreationPaneState({ type: "close" });
    setConfirmApplying(false);
  }, []);

  const databaseOptions = useMemo((): ProjectCreatorDatabaseChoice[] => {
    if (!hasKubeconfig) {
      return [];
    }
    return (
      dbCompositionRows?.map((row) => ({
        iconUrl: row.iconUrl,
        id: row.metadata.compositionName,
        label: row.name,
        template: row.template,
      })) ?? []
    );
  }, [dbCompositionRows, hasKubeconfig]);

  const handleGithubDeploy = useCallback((_repo: GithubDeployerRepo) => {
    toast.info("GitHub deploy isn’t ready yet — this feature is incomplete.");
  }, []);

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
      onDockerConfirm: async (imageRef) => {
        const trimmed = imageRef.trim();
        if (!(kubeconfig && namespace)) {
          toast.error("Kubeconfig or namespace is missing.");
          return;
        }
        if (!trimmed) {
          toast.error("Image reference is empty.");
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

        const vars = {
          image: trimmed,
          name: apClaimName,
          namespace,
          region: routingDomain,
        };

        let apYaml = renderCrossplaneCompositionTemplate(apTpl, vars);
        apYaml = mergeApSpecProjectName(apYaml, projectClaimName);
        apYaml = mergeApMetadataRegion(apYaml, routingDomain);

        const projectYaml = renderCrossplaneCompositionTemplate(projectTpl, {
          name: projectClaimName,
          namespace,
        });

        await applyWithBusyState(async () => {
          await k8sApplyYaml(
            kubeconfig,
            joinKubeYamlDocuments([projectYaml, apYaml])
          );
          toast.success(
            `Applied project "${projectClaimName}" and AP "${apClaimName}".`
          );
          setLastConfirmedKind(`docker:${trimmed}:${projectClaimName}`);
          dispatchCreationPaneState({ type: "close" });
          const projectUid = await fetchProjectUidByName(
            kubeconfig,
            namespace,
            projectClaimName
          );
          await onProjectCreated?.(projectUid);
        });
      },
      onDatabaseConfirm: async (compositionName) => {
        const choice = databaseOptions.find((d) => d.id === compositionName);
        if (!(kubeconfig && namespace)) {
          toast.error("Kubeconfig or namespace is missing.");
          return;
        }
        if (!choice?.template?.trim()) {
          toast.error("No embedded template for this database composition.");
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
        const routingDomain = routingDomainFromKubeconfig(kubeconfig);

        const projectYaml = renderCrossplaneCompositionTemplate(projectTpl, {
          name: projectClaimName,
          namespace,
        });
        let dbYaml = renderCrossplaneCompositionTemplate(choice.template, {
          name: dbClaimName,
          namespace,
          region: routingDomain,
        });
        dbYaml = mergeDbSpecProjectName(dbYaml, projectClaimName);

        await applyWithBusyState(async () => {
          await k8sApplyYaml(
            kubeconfig,
            joinKubeYamlDocuments([projectYaml, dbYaml])
          );
          toast.success(
            `Applied project "${projectClaimName}" and database "${dbClaimName}".`
          );
          setLastConfirmedKind(
            `database:${compositionName}:${projectClaimName}`
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
      githubDeployer,
    }),
    [actions, confirmApplying, databaseOptions, githubDeployer]
  );

  return {
    creationPaneOpen: creationPaneState.open,
    creatorRootProps,
    creatorResetKey: creationPaneState.resetKey,
    githubDeployerLoading,
    lastConfirmedKind,
    onCreationPaneOpenChange,
    openCreationPane,
  };
}
