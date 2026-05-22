import { apItemsFromList } from "@workspace/api/lib/ap-list";
import type { K8sGetResponse } from "@workspace/api/schemas/k8s-get";

import { hasApPublicExposure } from "@/lib/project-canvas/k8s/ap-spec-access";

export const ENTRYPOINT_FAST_REFRESH_MS = 1000;
export const ENTRYPOINT_STEADY_REFRESH_MS = 5000;

const WORKLOAD_TRANSIENT_PHASES = new Set([
  "binding",
  "creating",
  "deleting",
  "pending",
  "progressing",
  "reconciling",
  "restarting",
  "starting",
  "stopping",
  "updating",
]);

function normalizeWorkloadPhase(input: unknown) {
  return typeof input === "string"
    ? input
        .trim()
        .toLowerCase()
        .replace(/[\s_]+/g, "-")
    : "";
}

function hasNetworkPublicAddresses(network: unknown) {
  if (network == null || typeof network !== "object") {
    return false;
  }
  const publicAddresses = (network as Record<string, unknown>).publicAddresses;
  return Array.isArray(publicAddresses) && publicAddresses.length > 0;
}

export function hasTransientWorkloadPhase(data: K8sGetResponse | undefined) {
  return apItemsFromList(data).some((item) => {
    const status =
      item != null && typeof item === "object" && "status" in item
        ? item.status
        : undefined;
    const phase =
      status != null && typeof status === "object" && "phase" in status
        ? phaseFromStatus(status)
        : undefined;
    return WORKLOAD_TRANSIENT_PHASES.has(normalizeWorkloadPhase(phase));
  });
}

export function hasPublicApEndpoint(data: K8sGetResponse | undefined) {
  return apItemsFromList(data).some((item) => {
    if (item == null || typeof item !== "object") {
      return false;
    }
    const root = item as Record<string, unknown>;
    const status =
      root.status != null && typeof root.status === "object"
        ? (root.status as Record<string, unknown>)
        : undefined;
    const statusEndpoints = Array.isArray(status?.endpoints)
      ? status.endpoints
      : [];
    if (hasNetworkPublicAddresses(status?.network)) {
      return true;
    }
    if (
      statusEndpoints.some(
        (endpoint) =>
          endpoint != null &&
          typeof endpoint === "object" &&
          typeof (endpoint as Record<string, unknown>).publicAddress ===
            "string"
      )
    ) {
      return true;
    }

    const spec =
      root.spec != null && typeof root.spec === "object"
        ? (root.spec as Record<string, unknown>)
        : undefined;
    if (spec != null) {
      return hasApPublicExposure(spec);
    }
    return false;
  });
}

export function entryPointRefreshIntervalForLifecycle({
  apsData,
  entryPointsData,
  now = Date.now(),
  workloadReconcilePollUntil,
}: {
  apsData: K8sGetResponse | undefined;
  entryPointsData: K8sGetResponse | undefined;
  now?: number;
  workloadReconcilePollUntil: number;
}) {
  if (
    workloadReconcilePollUntil > now ||
    hasTransientWorkloadPhase(apsData) ||
    (hasPublicApEndpoint(apsData) &&
      apItemsFromList(entryPointsData).length === 0)
  ) {
    return ENTRYPOINT_FAST_REFRESH_MS;
  }

  if (apItemsFromList(entryPointsData).length > 0) {
    return ENTRYPOINT_STEADY_REFRESH_MS;
  }

  return 0;
}

function phaseFromStatus(status: object) {
  return (status as { phase?: unknown }).phase;
}
