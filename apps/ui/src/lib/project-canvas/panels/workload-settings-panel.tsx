"use client";

import type { CanvasPanelBodyProps } from "@workspace/ui/components/canvas/canvas.types";
import { ContainerSettingsPane } from "@workspace/ui/components/container-settings-pane/container-settings-pane";
import { useAtomValue } from "jotai";
import { memo } from "react";

import {
  containerStatesFromNode,
  workloadClaimKindFromStates,
} from "@/lib/project-canvas/flow/container-node-workload";
import { k8sGetClaimBody } from "@/lib/project-canvas/k8s/claim-mapper";
import type { CanvasContainerNodeData } from "@/lib/project-canvas/nodes/types";
import { useWorkloadClaimSettings } from "@/lib/project-canvas/panels/use-workload-claim-settings";
import { kubeconfigAtom, namespaceAtom } from "@/store/auth-store";
import { WORKLOAD_PANEL_REPLICAS } from "@/store/canvas-store";

export const WorkloadSettingsCanvasPanel = memo(
  function WorkloadSettingsCanvasPanel({ node }: CanvasPanelBodyProps) {
    const kubeconfig = useAtomValue(kubeconfigAtom);
    const ns = useAtomValue(namespaceAtom).trim();

    const states = containerStatesFromNode(node);
    const data =
      node.data != null && typeof node.data === "object"
        ? (node.data as CanvasContainerNodeData)
        : undefined;
    const name = states?.name ?? "";
    const workloadKind = workloadClaimKindFromStates(states);
    const settingsReadOnly = data?.settingsAccess?.readOnly === true;
    const settingsShareToken = data?.settingsAccess?.shareToken?.trim() ?? "";
    const canEditAp = workloadKind === "AP" && !settingsReadOnly;

    const {
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
      onPortsChange,
      onResourceQuotasCommit,
      claimPayload,
    } = useWorkloadClaimSettings({
      dbDsnReferenceSources: data?.dbDsnReferenceSources,
      kubeconfig: settingsReadOnly ? "" : kubeconfig,
      name,
      namespace: ns,
      onAddDbDsnReferenceMutationStart: data?.onAddDbDsnReferenceMutationStart,
      onWorkloadMutation: data?.onWorkloadMutation,
      readOnly: settingsReadOnly,
      shareToken: settingsShareToken,
      workloadKind,
    });

    if (ns === "" || name === "") {
      return (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <p className="text-muted-foreground text-sm">
            Select a workload with a name and configure namespace in settings.
          </p>
        </div>
      );
    }

    if (error != null) {
      return (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <p className="text-destructive text-sm" role="alert">
            Could not load claim: {error.message}
          </p>
        </div>
      );
    }

    if (isLoading && k8sGetClaimBody(claimPayload) == null) {
      return (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <p className="text-muted-foreground text-sm">Loading workload…</p>
        </div>
      );
    }

    return (
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <ContainerSettingsPane
          addDbDsnReferenceIntent={data?.addDbDsnReferenceIntent}
          className="gap-4"
          cpuQuota={{
            max: 8,
            min: 0.25,
            onValueChange: ignoreQuota,
            step: 0.25,
            value: display.cpuCores,
          }}
          dbDsnReferenceSources={data?.dbDsnReferenceSources}
          env={display.env}
          image={display.image}
          memoryQuota={{
            max: 16_384,
            min: 512,
            onValueChange: ignoreQuota,
            step: 128,
            value: display.memoryMib,
          }}
          network={display.network}
          onAddDbDsnReferenceIntentConsumed={
            data?.onAddDbDsnReferenceIntentConsumed
          }
          onEnvChange={canEditAp ? onEnvChange : ignoreEnv}
          onImageChange={canEditAp ? onImageChange : ignoreImage}
          onNetworkChange={canEditAp ? onNetworkChange : ignoreNetwork}
          onPortsChange={canEditAp ? onPortsChange : ignorePorts}
          onResourceQuotasCommit={
            canEditAp ? onResourceQuotasCommit : undefined
          }
          ports={display.ports}
          readOnly={!isApWorkload || settingsReadOnly}
          replicasQuota={
            canEditAp
              ? {
                  ...WORKLOAD_PANEL_REPLICAS,
                  onValueChange: ignoreReplicas,
                  step: 1,
                  value: display.replicas,
                }
              : undefined
          }
        />
      </div>
    );
  }
);

WorkloadSettingsCanvasPanel.displayName = "WorkloadSettingsCanvasPanel";
