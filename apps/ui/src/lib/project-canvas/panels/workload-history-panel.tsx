"use client";

import { useK8sGetResource } from "@workspace/api/hooks";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { ContainerHistoryPane } from "@workspace/ui/components/container-history-pane/container-history-pane";
import type { Node } from "@xyflow/react";
import { useAtomValue } from "jotai";
import { History } from "lucide-react";
import { memo, useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  containerStatesFromNode,
  k8sPluralKindForWorkload,
  workloadClaimKindFromStates,
} from "@/lib/project-canvas/flow/container-node-workload";
import { apConfigSnapshotRowsFromClaim } from "@/lib/project-canvas/k8s/ap-config-snapshots";
import { rollbackApFromEffectiveConfigYaml } from "@/lib/project-canvas/k8s/ap-json-patch";
import { k8sGetClaimBody } from "@/lib/project-canvas/k8s/claim-mapper";
import { fetchConfigMapConfigYaml } from "@/lib/project-canvas/k8s/fetch-configmap-config-yaml";
import { kubeconfigAtom, namespaceAtom } from "@/store/auth-store";
import { CanvasResourcePane } from "./canvas-resource-pane";

export const WorkloadHistoryPane = memo(function WorkloadHistoryPane({
  node,
  onClose,
}: {
  node: Node;
  onClose: () => void;
}) {
  const kubeconfig = useAtomValue(kubeconfigAtom);
  const namespaceFallback = useAtomValue(namespaceAtom).trim();

  const states = containerStatesFromNode(node);
  const name = states?.name ?? "";
  const ns = states?.namespace?.trim() || namespaceFallback;
  const workloadKind = workloadClaimKindFromStates(states);
  const pluralKind = k8sPluralKindForWorkload(workloadKind);
  const title = name === "" ? "History" : `${name} History`;

  const {
    data: claimPayload,
    error,
    isLoading,
    mutate: revalidateClaim,
  } = useK8sGetResource({
    kind: pluralKind,
    kubeconfig,
    name,
    namespace: ns,
  });

  const rows = useMemo(
    () =>
      workloadKind === "AP"
        ? apConfigSnapshotRowsFromClaim(k8sGetClaimBody(claimPayload))
        : [],
    [claimPayload, workloadKind]
  );

  const onLoadConfigYaml = useCallback(
    async (configMapName: string) =>
      fetchConfigMapConfigYaml({
        configMapName,
        kubeconfig,
        namespace: ns,
      }),
    [kubeconfig, ns]
  );

  const [rollbackConfirmCm, setRollbackConfirmCm] = useState<string | null>(
    null
  );
  const [rollbackBusyCm, setRollbackBusyCm] = useState<string | null>(null);

  const runRollback = useCallback(
    async (configMapName: string) => {
      const claim = k8sGetClaimBody(claimPayload);
      if (claim == null) {
        throw new Error("Workload claim is not loaded yet.");
      }
      const yaml = await fetchConfigMapConfigYaml({
        configMapName,
        kubeconfig,
        namespace: ns,
      });
      await rollbackApFromEffectiveConfigYaml(kubeconfig, claim, yaml);
      await revalidateClaim();
    },
    [claimPayload, kubeconfig, ns, revalidateClaim]
  );

  const confirmRollbackSnapshot = () => {
    const cm = rollbackConfirmCm;
    if (cm == null) {
      return;
    }
    setRollbackConfirmCm(null);
    toast.promise(
      (async () => {
        setRollbackBusyCm(cm);
        try {
          await runRollback(cm);
        } finally {
          setRollbackBusyCm(null);
        }
      })(),
      {
        loading: `Rolling back to ${cm}…`,
        success:
          "AP spec updated from the snapshot. Composition will reconcile shortly.",
        error: (e) =>
          e instanceof Error ? e.message : "Rollback failed unexpectedly.",
      }
    );
  };

  const requestRollbackConfirm = useCallback((configMapName: string) => {
    setRollbackConfirmCm(configMapName);
  }, []);

  if (ns === "" || name === "") {
    return (
      <CanvasResourcePane
        closeAriaLabel="Close workload history"
        icon={
          <History
            aria-hidden
            className="size-4 shrink-0 text-database-metrics-chart"
          />
        }
        onClose={onClose}
        status={states?.status}
        subtitle={workloadKind}
        title={title}
      >
        <p className="text-muted-foreground text-sm">
          Select a workload with a name and configure namespace in settings.
        </p>
      </CanvasResourcePane>
    );
  }

  if (workloadKind !== "AP") {
    return (
      <CanvasResourcePane
        closeAriaLabel="Close workload history"
        icon={
          <History
            aria-hidden
            className="size-4 shrink-0 text-database-metrics-chart"
          />
        }
        onClose={onClose}
        status={states?.status}
        subtitle={workloadKind}
        title={title}
      >
        <p className="text-muted-foreground text-sm">
          Config snapshot history applies to AP workloads. Database claims use a
          different backup model.
        </p>
      </CanvasResourcePane>
    );
  }

  if (error != null) {
    return (
      <CanvasResourcePane
        closeAriaLabel="Close workload history"
        icon={
          <History
            aria-hidden
            className="size-4 shrink-0 text-database-metrics-chart"
          />
        }
        onClose={onClose}
        status={states?.status}
        subtitle={workloadKind}
        title={title}
      >
        <p className="text-destructive text-sm" role="alert">
          Could not load workload: {error.message}
        </p>
      </CanvasResourcePane>
    );
  }

  if (isLoading && k8sGetClaimBody(claimPayload) == null) {
    return (
      <CanvasResourcePane
        closeAriaLabel="Close workload history"
        icon={
          <History
            aria-hidden
            className="size-4 shrink-0 text-database-metrics-chart"
          />
        }
        onClose={onClose}
        status={states?.status}
        subtitle={workloadKind}
        title={title}
      >
        <p className="text-muted-foreground text-sm">Loading history…</p>
      </CanvasResourcePane>
    );
  }

  return (
    <>
      <CanvasResourcePane
        closeAriaLabel="Close workload history"
        icon={
          <History
            aria-hidden
            className="size-4 shrink-0 text-database-metrics-chart"
          />
        }
        onClose={onClose}
        status={states?.status}
        subtitle={workloadKind}
        title={title}
      >
        <ContainerHistoryPane
          className="min-h-0"
          onLoadConfigYaml={onLoadConfigYaml}
          onRollback={requestRollbackConfirm}
          rollbackBusyConfigMapName={rollbackBusyCm}
          rows={rows}
          workloadName={name}
        />
      </CanvasResourcePane>
      <AlertDialog
        onOpenChange={(next) => {
          if (!next) {
            setRollbackConfirmCm(null);
          }
        }}
        open={rollbackConfirmCm !== null}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Rollback to this snapshot?</AlertDialogTitle>
            <AlertDialogDescription>
              The AP <span className="font-medium text-foreground">{name}</span>{" "}
              spec will be patched to match the embedded effective spec from{" "}
              <span className="break-all font-mono text-foreground">
                {rollbackConfirmCm ?? ""}
              </span>
              . This rolls configuration forward via the claim (Crossplane then
              reconciles workloads).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmRollbackSnapshot();
              }}
              type="button"
            >
              Rollback
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});

WorkloadHistoryPane.displayName = "WorkloadHistoryPane";
