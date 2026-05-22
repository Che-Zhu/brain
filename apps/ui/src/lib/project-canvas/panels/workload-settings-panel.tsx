"use client";

import { ContainerSettingsPane } from "@workspace/ui/components/container-settings-pane/container-settings-pane";
import type { Node } from "@xyflow/react";
import { useAtomValue } from "jotai";
import { Settings2 } from "lucide-react";
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
import { CanvasResourcePane } from "./canvas-resource-pane";

function workloadSettingsSubtitle({
  image,
  kind,
}: {
  image: string | undefined;
  kind: string;
}) {
  const imageValue = image?.trim() ?? "";
  return imageValue === "" ? kind : `${kind} · ${imageValue}`;
}

export const WorkloadSettingsPane = memo(function WorkloadSettingsPane({
  node,
  onClose,
}: {
  node: Node;
  onClose: () => void;
}) {
  const kubeconfig = useAtomValue(kubeconfigAtom);
  const namespaceFallback = useAtomValue(namespaceAtom).trim();

  const states = containerStatesFromNode(node);
  const data =
    node.data != null && typeof node.data === "object"
      ? (node.data as CanvasContainerNodeData)
      : undefined;
  const name = states?.name ?? "";
  const ns = states?.namespace?.trim() || namespaceFallback;
  const workloadKind = workloadClaimKindFromStates(states);
  const settingsReadOnly = data?.settingsAccess?.readOnly === true;
  const settingsShareToken = data?.settingsAccess?.shareToken?.trim() ?? "";
  const canEditAp = workloadKind === "AP" && !settingsReadOnly;
  const title = name === "" ? "Workload Settings" : name;
  const subtitle = workloadSettingsSubtitle({
    image: states?.image,
    kind: workloadKind,
  });

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
      <CanvasResourcePane
        closeAriaLabel="Close workload settings"
        icon={
          <Settings2
            aria-hidden
            className="size-4 shrink-0 text-database-metrics-chart"
          />
        }
        onClose={onClose}
        status={states?.status}
        subtitle={subtitle}
        title={title}
      >
        <p className="text-muted-foreground text-sm">
          Select a workload with a name and configure namespace in settings.
        </p>
      </CanvasResourcePane>
    );
  }

  if (error != null) {
    return (
      <CanvasResourcePane
        closeAriaLabel="Close workload settings"
        icon={
          <Settings2
            aria-hidden
            className="size-4 shrink-0 text-database-metrics-chart"
          />
        }
        onClose={onClose}
        status={states?.status}
        subtitle={subtitle}
        title={title}
      >
        <p className="text-destructive text-sm" role="alert">
          Could not load claim: {error.message}
        </p>
      </CanvasResourcePane>
    );
  }

  if (isLoading && k8sGetClaimBody(claimPayload) == null) {
    return (
      <CanvasResourcePane
        closeAriaLabel="Close workload settings"
        icon={
          <Settings2
            aria-hidden
            className="size-4 shrink-0 text-database-metrics-chart"
          />
        }
        onClose={onClose}
        status={states?.status}
        subtitle={subtitle}
        title={title}
      >
        <p className="text-muted-foreground text-sm">Loading workload…</p>
      </CanvasResourcePane>
    );
  }

  return (
    <CanvasResourcePane
      closeAriaLabel="Close workload settings"
      icon={
        <Settings2
          aria-hidden
          className="size-4 shrink-0 text-database-metrics-chart"
        />
      }
      onClose={onClose}
      status={states?.status}
      subtitle={subtitle}
      title={title}
    >
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
        onPortsChange={ignorePorts}
        onResourceQuotasCommit={canEditAp ? onResourceQuotasCommit : undefined}
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
    </CanvasResourcePane>
  );
});

WorkloadSettingsPane.displayName = "WorkloadSettingsPane";
