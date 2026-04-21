"use client";

import { API_ROUTES } from "@workspace/api/constants";
import { fetcher } from "@workspace/api/fetch";
import {
  type K8sGetResponse,
  k8sGetQuerySchema,
  k8sGetResponseSchema,
} from "@workspace/api/schemas/k8s-get";
import { ApiUrl } from "@workspace/api/utils";
import { PROJECT_UID_LABEL } from "@workspace/crossplane/constants";
import { ProjectFlow } from "@workspace/ui/components/project-flow/project-flow";
import { useAtomValue } from "jotai";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import useSWR from "swr";
import { devEncodedKubeconfigAtom, devNamespaceAtom } from "@/atom/auth-atom";
import { apsToProjectFlowState } from "@/lib/ap-to-project-flow";

export default function ProjectUidPage() {
  const params = useParams<{ uid: string }>();
  const uid = decodeURIComponent(params.uid ?? "");
  const kubeconfig = useAtomValue(devEncodedKubeconfigAtom);
  const namespace = useAtomValue(devNamespaceAtom);

  const getParams = useMemo(
    () =>
      k8sGetQuerySchema.parse({
        kind: "aps",
        "label-selector": `${PROJECT_UID_LABEL}=${uid}`,
        ...(namespace ? { namespace } : {}),
      }),
    [namespace, uid]
  );

  const { data, error, isLoading } = useSWR(
    [API_ROUTES.k8s.get, getParams] as const,
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
  const projectFlowState = useMemo(() => apsToProjectFlowState(data), [data]);

  return (
    <div className="flex h-svh min-h-0 flex-col gap-4 overflow-hidden p-6">
      {kubeconfig !== "" &&
        !isLoading &&
        error == null &&
        projectFlowState.initialNodes.length > 0 && (
          <ProjectFlow.Root
            states={{
              initialEdges: projectFlowState.initialEdges,
              initialNodes: projectFlowState.initialNodes,
            }}
          >
            <ProjectFlow.Variant0 className="min-h-0 flex-1" />
          </ProjectFlow.Root>
        )}
    </div>
  );
}
