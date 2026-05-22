"use client";

import { useK8sGetResource } from "@workspace/api/hooks";
import type { K8sGetResponse } from "@workspace/api/schemas/k8s-get";
import type {
  ContainerEnvVar,
  ContainerPort,
  ContainerSettingsPaneConfirmedAddDbDsnReference,
  ContainerSettingsPaneEnvChangeMeta,
} from "@workspace/ui/components/container-settings-pane/container-settings-pane";
import type { ContainerEnvDbDsnSource } from "@workspace/ui/lib/container-env-rows";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { k8sPluralKindForWorkload } from "@/lib/project-canvas/flow/container-node-workload";
import {
  applyApEnv,
  applyApImage,
  applyApNetwork,
  applyApResourceQuotas,
} from "@/lib/project-canvas/k8s/ap-json-patch";
import {
  type ClaimContainerSettings,
  claimToContainerSettings,
  k8sGetClaimBody,
  type WorkloadClaimKind,
} from "@/lib/project-canvas/k8s/claim-mapper";

export type ContainerSettingsOnPortsChange = (ports: ContainerPort[]) => void;

const WORKLOAD_RECONCILE_POLL_MS = 1000;
const WORKLOAD_RECONCILE_POLL_WINDOW_MS = 30_000;

export interface UseWorkloadClaimSettingsOptions {
  dbDsnReferenceSources?: ContainerEnvDbDsnSource[];
  kubeconfig?: string;
  name: string;
  namespace: string;
  onAddDbDsnReferenceMutationStart?: (
    references: readonly ContainerSettingsPaneConfirmedAddDbDsnReference[]
  ) => (() => void) | undefined;
  onWorkloadMutation?: () => Promise<unknown>;
  readOnly?: boolean;
  shareToken?: string;
  workloadKind: WorkloadClaimKind;
}

/**
 * Fetches the AP/DB claim, maps it to {@link ContainerSettingsPane} props, and exposes
 * JSON Patch–backed mutators for AP workloads (DB stays read-only in the pane).
 */
export function useWorkloadClaimSettings(
  options: UseWorkloadClaimSettingsOptions
) {
  const {
    name,
    namespace,
    onAddDbDsnReferenceMutationStart,
    onWorkloadMutation,
    workloadKind,
  } = options;
  const kubeconfig = options.kubeconfig ?? "";
  const readOnly = options.readOnly === true;
  const shareToken = options.shareToken?.trim() ?? "";
  const dbDsnReferenceSources = options.dbDsnReferenceSources ?? [];
  const isApWorkload = workloadKind === "AP";
  const [claimReconcilePollUntil, setClaimReconcilePollUntil] = useState(0);

  const {
    data: claimPayload,
    error,
    isLoading,
    mutate: revalidateClaim,
  } = useK8sGetResource({
    kind: k8sPluralKindForWorkload(workloadKind),
    kubeconfig,
    name,
    namespace,
    refreshInterval:
      claimReconcilePollUntil > Date.now() ? WORKLOAD_RECONCILE_POLL_MS : 0,
    shareToken: shareToken === "" ? undefined : shareToken,
  });

  const claimBodyRef = useRef<Record<string, unknown> | undefined>(undefined);
  claimBodyRef.current = k8sGetClaimBody(claimPayload);

  const claimResourceVersion = useMemo(() => {
    const b = k8sGetClaimBody(claimPayload);
    const meta = b?.metadata;
    if (meta != null && typeof meta === "object" && "resourceVersion" in meta) {
      const rv = (meta as { resourceVersion?: unknown }).resourceVersion;
      return typeof rv === "string" ? rv : "";
    }
    return "";
  }, [claimPayload]);

  const [localOverride, setLocalOverride] =
    useState<Partial<ClaimContainerSettings> | null>(null);

  // Reset optimistic fields when the fetched claim revision changes (refetch / external edit).
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional — run when `claimResourceVersion` updates
  useEffect(() => {
    setLocalOverride(null);
  }, [claimResourceVersion]);

  const mapped = useMemo(
    () =>
      claimToContainerSettings(k8sGetClaimBody(claimPayload), workloadKind, {
        dbDsnReferenceSources,
      }),
    [claimPayload, dbDsnReferenceSources, workloadKind]
  );

  const display = useMemo(
    () => ({ ...mapped, ...(localOverride ?? {}) }),
    [localOverride, mapped]
  );
  const revalidateAfterApMutation = useCallback(async () => {
    setClaimReconcilePollUntil(Date.now() + WORKLOAD_RECONCILE_POLL_WINDOW_MS);
    await Promise.all([
      revalidateClaim(),
      onWorkloadMutation?.().catch(() => undefined),
    ]);
  }, [onWorkloadMutation, revalidateClaim]);

  const ignoreImage = useCallback((_image: string) => {
    /* read-only */
  }, []);
  const ignoreEnv = useCallback((_env: ContainerEnvVar[]) => {
    /* read-only */
  }, []);
  const ignorePorts = useCallback<ContainerSettingsOnPortsChange>((_ports) => {
    /* read-only: pane is controlled from K8s claim */
  }, []);
  const ignoreNetwork = useCallback(() => {
    /* read-only */
  }, []);
  const ignoreQuota = useCallback((_n: number) => {
    /* read-only */
  }, []);
  const ignoreReplicas = useCallback((_n: number) => {
    /* read-only */
  }, []);

  const onImageChange = useCallback(
    async (image: string) => {
      if (!isApWorkload || readOnly) {
        return;
      }
      const body = claimBodyRef.current;
      const kc = kubeconfig.trim();
      if (body == null || kc === "") {
        toast.error("Claim or kubeconfig missing.");
        return;
      }
      setLocalOverride((prev) => ({ ...(prev ?? {}), image }));
      try {
        await applyApImage(kc, body, image);
        toast.success("Image applied.");
        await revalidateAfterApMutation();
      } catch (e) {
        setLocalOverride(null);
        toast.error(e instanceof Error ? e.message : "Apply failed");
      }
    },
    [isApWorkload, kubeconfig, readOnly, revalidateAfterApMutation]
  );

  const onEnvChange = useCallback(
    async (
      env: ContainerEnvVar[],
      meta?: ContainerSettingsPaneEnvChangeMeta
    ) => {
      if (!isApWorkload || readOnly) {
        return;
      }
      const body = claimBodyRef.current;
      const kc = kubeconfig.trim();
      if (body == null || kc === "") {
        toast.error("Claim or kubeconfig missing.");
        return;
      }
      setLocalOverride((prev) => ({ ...(prev ?? {}), env }));
      const confirmedReferences = meta?.confirmedAddDbDsnReferences ?? [];
      const clearPendingReferences =
        confirmedReferences.length === 0
          ? undefined
          : onAddDbDsnReferenceMutationStart?.(confirmedReferences);
      try {
        await applyApEnv(kc, body, env);
        toast.success("Environment applied.");
        await revalidateAfterApMutation();
      } catch (e) {
        setLocalOverride(null);
        toast.error(e instanceof Error ? e.message : "Apply failed");
      } finally {
        clearPendingReferences?.();
      }
    },
    [
      isApWorkload,
      kubeconfig,
      onAddDbDsnReferenceMutationStart,
      readOnly,
      revalidateAfterApMutation,
    ]
  );

  const onNetworkChange = useCallback(
    async (network: NonNullable<ClaimContainerSettings["network"]>) => {
      if (!isApWorkload || readOnly) {
        return;
      }
      const body = claimBodyRef.current;
      const kc = kubeconfig.trim();
      if (body == null || kc === "") {
        toast.error("Claim or kubeconfig missing.");
        return;
      }
      setLocalOverride((prev) => ({ ...(prev ?? {}), network }));
      try {
        await applyApNetwork(kc, body, network);
        toast.success("Network applied.");
        await revalidateAfterApMutation();
      } catch (e) {
        setLocalOverride(null);
        toast.error(e instanceof Error ? e.message : "Apply failed");
      }
    },
    [isApWorkload, kubeconfig, readOnly, revalidateAfterApMutation]
  );

  const onResourceQuotasCommit = useCallback(
    async (next: { cpu: number; memory: number; replicas?: number }) => {
      if (!isApWorkload || readOnly) {
        return;
      }
      const body = claimBodyRef.current;
      const kc = kubeconfig.trim();
      if (body == null || kc === "") {
        toast.error("Claim or kubeconfig missing.");
        return;
      }
      const prevCpu = display.cpuCores;
      const prevMem = display.memoryMib;
      const prevReplicas = display.replicas;
      const nextRep =
        next.replicas === undefined ? undefined : Math.round(next.replicas);

      setLocalOverride((prev) => ({
        ...(prev ?? {}),
        cpuCores: next.cpu,
        memoryMib: next.memory,
        ...(nextRep === undefined ? {} : { replicas: nextRep }),
      }));
      try {
        await applyApResourceQuotas(
          kc,
          body,
          {
            cpuCores: next.cpu,
            memoryMib: next.memory,
            ...(nextRep === undefined ? {} : { replicas: nextRep }),
          },
          {
            cpuCores: prevCpu,
            memoryMib: prevMem,
            ...(nextRep === undefined ? {} : { replicas: prevReplicas }),
          }
        );
        toast.success("Resource quota applied.");
        await revalidateAfterApMutation();
      } catch (e) {
        setLocalOverride(null);
        toast.error(e instanceof Error ? e.message : "Apply failed");
      }
    },
    [
      display.cpuCores,
      display.memoryMib,
      display.replicas,
      isApWorkload,
      kubeconfig,
      readOnly,
      revalidateAfterApMutation,
    ]
  );

  return {
    claimPayload: claimPayload as K8sGetResponse | undefined,
    display,
    error,
    ignoreEnv,
    ignoreImage,
    ignoreNetwork,
    ignorePorts,
    ignoreQuota,
    ignoreReplicas,
    isApWorkload,
    isLoading,
    onEnvChange,
    onImageChange,
    onNetworkChange,
    onResourceQuotasCommit,
    revalidateClaim,
  };
}
