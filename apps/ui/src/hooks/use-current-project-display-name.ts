"use client";

import { API_ROUTES } from "@workspace/api/constants";
import { fetcher } from "@workspace/api/fetch";
import {
  type K8sGetResponse,
  k8sGetQuerySchema,
  k8sGetResponseSchema,
} from "@workspace/api/schemas/k8s-get";
import { ApiUrl } from "@workspace/api/utils";
import { useMemo } from "react";
import useSWR from "swr";

import {
  projectDisplayName,
  projectItemsFromK8sGetResponse,
} from "@/lib/projects-to-explorer-projects";

export function useCurrentProjectDisplayName(options: {
  kubeconfig: string;
  namespace: string;
  projectUid: string;
}) {
  const kubeconfig = options.kubeconfig.trim();
  const namespace = options.namespace.trim();
  const projectUid = options.projectUid.trim();
  const enabled = kubeconfig !== "" && projectUid !== "";

  const getParams = useMemo(
    () =>
      k8sGetQuerySchema.parse({
        kind: "projects",
        ...(namespace === "" ? {} : { namespace }),
      }),
    [namespace]
  );

  const { data, error, isLoading } = useSWR(
    enabled ? ([API_ROUTES.k8s.get, getParams] as const) : null,
    () =>
      fetcher<K8sGetResponse>({
        base: ApiUrl(),
        path: API_ROUTES.k8s.get,
        query: { ...getParams },
        header: {
          Authorization: `Bearer ${encodeURIComponent(kubeconfig)}`,
        },
        method: "GET",
        select: (raw) => k8sGetResponseSchema.parse(raw),
      })
  );

  const displayName = useMemo(() => {
    const hit = (projectItemsFromK8sGetResponse(data) ?? []).find(
      (item) => item.metadata?.uid === projectUid
    );
    if (hit == null) {
      return undefined;
    }
    return projectDisplayName(hit) ?? hit.metadata?.name;
  }, [data, projectUid]);

  return {
    displayName,
    error: error instanceof Error ? error : undefined,
    isLoading: enabled && isLoading,
  };
}
