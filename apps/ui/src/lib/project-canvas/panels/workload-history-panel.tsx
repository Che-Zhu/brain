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
import type { CanvasPanelBodyProps } from "@workspace/ui/components/canvas/canvas.types";
import { ContainerHistoryPane } from "@workspace/ui/components/container-history-pane/container-history-pane";
import { useAtomValue } from "jotai";
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

export const WorkloadHistoryCanvasPanel = memo(
  function WorkloadHistoryCanvasPanel({ node }: CanvasPanelBodyProps) {
    const kubeconfig = useAtomValue(kubeconfigAtom);
    const ns = useAtomValue(namespaceAtom).trim();

    const states = containerStatesFromNode(node);
    const name = states?.name ?? "";
    const workloadKind = workloadClaimKindFromStates(states);
    const pluralKind = k8sPluralKindForWorkload(workloadKind);

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
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <p className="text-muted-foreground text-sm">
            Select a workload with a name and configure namespace in settings.
          </p>
        </div>
      );
    }

    if (workloadKind !== "AP") {
      return (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <p className="text-muted-foreground text-sm">
            Config snapshot history applies to AP workloads. Database claims use
            a different backup model.
          </p>
        </div>
      );
    }

    if (error != null) {
      return (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <p className="text-destructive text-sm" role="alert">
            Could not load workload: {error.message}
          </p>
        </div>
      );
    }

    if (isLoading && k8sGetClaimBody(claimPayload) == null) {
      return (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <p className="text-muted-foreground text-sm">Loading history…</p>
        </div>
      );
    }

    return (
      <>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          <ContainerHistoryPane
            className="min-h-0"
            onLoadConfigYaml={onLoadConfigYaml}
            onRollback={requestRollbackConfirm}
            rollbackBusyConfigMapName={rollbackBusyCm}
            rows={rows}
            workloadName={name}
          />
        </div>
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
                The AP{" "}
                <span className="font-medium text-foreground">{name}</span> spec
                will be patched to match the embedded effective spec from{" "}
                <span className="break-all font-mono text-foreground">
                  {rollbackConfirmCm ?? ""}
                </span>
                . This rolls configuration forward via the claim (Crossplane
                then reconciles workloads).
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
  }
);

WorkloadHistoryCanvasPanel.displayName = "WorkloadHistoryCanvasPanel";
