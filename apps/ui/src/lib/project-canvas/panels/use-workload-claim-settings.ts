"use client";

import { useK8sGetResource } from "@workspace/api/hooks";
import type { K8sGetResponse } from "@workspace/api/schemas/k8s-get";
import type {
  ContainerEnvVar,
  ContainerSettingsPane,
} from "@workspace/ui/components/container-settings-pane/container-settings-pane";
import {
  type ComponentProps,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { k8sPluralKindForWorkload } from "@/lib/project-canvas/flow/container-node-workload";
import {
  applyApEnv,
  applyApImage,
  applyApPorts,
  applyApResourceQuotas,
} from "@/lib/project-canvas/k8s/ap-json-patch";
import {
  type ClaimContainerSettings,
  claimToContainerSettings,
  k8sGetClaimBody,
  type WorkloadClaimKind,
} from "@/lib/project-canvas/k8s/claim-mapper";

export type ContainerSettingsOnPortsChange = NonNullable<
  ComponentProps<typeof ContainerSettingsPane>["onPortsChange"]
>;

export interface UseWorkloadClaimSettingsOptions {
  kubeconfig: string;
  name: string;
  namespace: string;
  onWorkloadMutation?: () => Promise<unknown>;
  workloadKind: WorkloadClaimKind;
}

/**
 * Fetches the AP/DB claim, maps it to {@link ContainerSettingsPane} props, and exposes
 * JSON Patch–backed mutators for AP workloads (DB stays read-only in the pane).
 */
export function useWorkloadClaimSettings(
  options: UseWorkloadClaimSettingsOptions
) {
  const { kubeconfig, name, namespace, onWorkloadMutation, workloadKind } =
    options;
  const isApWorkload = workloadKind === "AP";

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
    () => claimToContainerSettings(k8sGetClaimBody(claimPayload), workloadKind),
    [claimPayload, workloadKind]
  );

  const display = useMemo(
    () => ({ ...mapped, ...(localOverride ?? {}) }),
    [localOverride, mapped]
  );
  const revalidateAfterApMutation = useCallback(async () => {
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
  const ignoreQuota = useCallback((_n: number) => {
    /* read-only */
  }, []);
  const ignoreReplicas = useCallback((_n: number) => {
    /* read-only */
  }, []);

  const onImageChange = useCallback(
    async (image: string) => {
      if (!isApWorkload) {
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
    [isApWorkload, kubeconfig, revalidateAfterApMutation]
  );

  const onEnvChange = useCallback(
    async (env: ContainerEnvVar[]) => {
      if (!isApWorkload) {
        return;
      }
      const body = claimBodyRef.current;
      const kc = kubeconfig.trim();
      if (body == null || kc === "") {
        toast.error("Claim or kubeconfig missing.");
        return;
      }
      setLocalOverride((prev) => ({ ...(prev ?? {}), env }));
      try {
        await applyApEnv(kc, body, env);
        toast.success("Environment applied.");
        await revalidateAfterApMutation();
      } catch (e) {
        setLocalOverride(null);
        toast.error(e instanceof Error ? e.message : "Apply failed");
      }
    },
    [isApWorkload, kubeconfig, revalidateAfterApMutation]
  );

  const onPortsChange = useCallback<ContainerSettingsOnPortsChange>(
    async (ports) => {
      if (!isApWorkload) {
        return;
      }
      const body = claimBodyRef.current;
      const kc = kubeconfig.trim();
      if (body == null || kc === "") {
        toast.error("Claim or kubeconfig missing.");
        return;
      }
      setLocalOverride((prev) => ({ ...(prev ?? {}), ports }));
      try {
        await applyApPorts(kc, body, ports);
        toast.success("Ports applied.");
        await revalidateAfterApMutation();
      } catch (e) {
        setLocalOverride(null);
        toast.error(e instanceof Error ? e.message : "Apply failed");
      }
    },
    [isApWorkload, kubeconfig, revalidateAfterApMutation]
  );

  const onResourceQuotasCommit = useCallback(
    async (next: { cpu: number; memory: number; replicas?: number }) => {
      if (!isApWorkload) {
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
      revalidateAfterApMutation,
    ]
  );

  return {
    claimPayload: claimPayload as K8sGetResponse | undefined,
    display,
    error,
    ignoreEnv,
    ignoreImage,
    ignorePorts,
    ignoreQuota,
    ignoreReplicas,
    isApWorkload,
    isLoading,
    onEnvChange,
    onImageChange,
    onPortsChange,
    onResourceQuotasCommit,
    revalidateClaim,
  };
}
