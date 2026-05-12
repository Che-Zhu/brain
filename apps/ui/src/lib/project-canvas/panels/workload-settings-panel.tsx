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
import { useWorkloadClaimSettings } from "@/lib/project-canvas/panels/use-workload-claim-settings";
import { kubeconfigAtom, namespaceAtom } from "@/store/auth-store";

export const WorkloadSettingsCanvasPanel = memo(
  function WorkloadSettingsCanvasPanel({ node }: CanvasPanelBodyProps) {
    const kubeconfig = useAtomValue(kubeconfigAtom);
    const ns = useAtomValue(namespaceAtom).trim();

    const states = containerStatesFromNode(node);
    const name = states?.name ?? "";
    const workloadKind = workloadClaimKindFromStates(states);

    const {
      display,
      error,
      ignoreEnv,
      ignoreImage,
      ignorePorts,
      ignoreQuota,
      isApWorkload,
      isLoading,
      onEnvChange,
      onImageChange,
      onPortsChange,
      onResourceQuotasCommit,
      claimPayload,
    } = useWorkloadClaimSettings({
      kubeconfig,
      name,
      namespace: ns,
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
          className="gap-4"
          cpuQuota={{
            max: 8,
            min: 0.25,
            onValueChange: ignoreQuota,
            step: 0.25,
            value: display.cpuCores,
          }}
          env={display.env}
          image={display.image}
          memoryQuota={{
            max: 16_384,
            min: 512,
            onValueChange: ignoreQuota,
            step: 128,
            value: display.memoryMib,
          }}
          onEnvChange={isApWorkload ? onEnvChange : ignoreEnv}
          onImageChange={isApWorkload ? onImageChange : ignoreImage}
          onPortsChange={isApWorkload ? onPortsChange : ignorePorts}
          onResourceQuotasCommit={
            isApWorkload ? onResourceQuotasCommit : undefined
          }
          ports={display.ports}
          readOnly={!isApWorkload}
        />
      </div>
    );
  }
);

WorkloadSettingsCanvasPanel.displayName = "WorkloadSettingsCanvasPanel";
