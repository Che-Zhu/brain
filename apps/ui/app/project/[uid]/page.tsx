"use client";

import { API_ROUTES } from "@workspace/api/constants";
import { fetcher } from "@workspace/api/fetch";
import {
  k8sGetQuerySchema,
  k8sGetResponseSchema,
  type K8sGetResponse,
} from "@workspace/api/schemas/k8s-get";
import { ApiUrl } from "@workspace/api/utils";
import { PROJECT_UID_LABEL } from "@workspace/crossplane/constants";
import { useAtomValue } from "jotai";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import useSWR from "swr";
import {
  devEncodedKubeconfigAtom,
  devNamespaceAtom,
} from "@/atom/auth-atom";
import { apNamesFromList } from "@/lib/ap-names-from-k8s-list";

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

  const { data, error, isLoading } = useSWR(API_ROUTES.k8s.get, () =>
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
  const apNames = useMemo(() => apNamesFromList(data), [data]);

  return (
    <div className="flex min-h-svh flex-col gap-4 p-6">
      <div className="flex flex-col gap-2 text-sm">
        <Link
          className="text-muted-foreground text-xs underline-offset-4 hover:underline"
          href="/"
        >
          ← Projects
        </Link>
        <h1 className="font-medium">Project</h1>
        <p className="break-all font-mono text-muted-foreground text-xs">
          {uid}
        </p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium text-sm">APs</h2>
        <p className="text-muted-foreground text-xs">
          Listed by label <span className="font-mono">{PROJECT_UID_LABEL}</span>
        </p>
        {kubeconfig === "" && (
          <p className="text-muted-foreground text-sm">Sign in to load APs.</p>
        )}
        {kubeconfig !== "" && isLoading && (
          <p className="text-muted-foreground text-sm">Loading…</p>
        )}
        {kubeconfig !== "" && !isLoading && error != null && (
          <p className="text-destructive text-sm">
            {error instanceof Error ? error.message : String(error)}
          </p>
        )}
        {kubeconfig !== "" &&
          !isLoading &&
          error == null &&
          apNames.length === 0 && (
            <p className="text-muted-foreground text-sm">
              No APs with this project UID in the current namespace.
            </p>
          )}
        {kubeconfig !== "" &&
          !isLoading &&
          error == null &&
          apNames.length > 0 && (
            <ul className="list-inside list-disc font-mono text-sm">
              {apNames.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          )}
      </section>
    </div>
  );
}
