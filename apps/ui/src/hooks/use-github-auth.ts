"use client";

import { API_ROUTES } from "@workspace/api/constants";
import { fetcher } from "@workspace/api/fetch";
import {
  type K8sGetQuery,
  k8sGetQuerySchema,
} from "@workspace/api/schemas/k8s-get";
import { ApiUrl } from "@workspace/api/utils";
import { useAtomValue } from "jotai";
import { useCallback, useMemo } from "react";
import useSWR from "swr";

import {
  GHCR_CRED_SECRET_NAME,
  GHCR_CRED_TOKEN_KEY,
  GITHUB_OAUTH_CALLBACK_PATH,
} from "@/lib/github-oauth/constants";
import { encodedKubeconfigAtom, namespaceAtom } from "@/store/auth-store";

/** True when GET k8s `secrets/ghcr-cred` succeeds in the current namespace (GHCR wired). */
function isGhcrCredResponse(body: unknown): boolean {
  if (body === null || typeof body !== "object") {
    return false;
  }
  const o = body as Record<string, unknown>;
  const meta = o.metadata;
  if (meta === null || typeof meta !== "object") {
    return false;
  }
  const name = (meta as Record<string, unknown>).name;
  return (
    o.kind === "Secret" &&
    typeof name === "string" &&
    name === GHCR_CRED_SECRET_NAME
  );
}

/** Decodes Kubernetes Secret `data` values (RFC4648 base64). */
function decodeSecretDataEntry(base64: string): string | undefined {
  try {
    const binary = Uint8Array.from(atob(base64.trim()), (c) => c.charCodeAt(0));
    return new TextDecoder().decode(binary);
  } catch {
    return undefined;
  }
}

/**
 * Reads `githubToken` from `.data` (normal API GET) or `.stringData` if present (rare client-side).
 */
function githubTokenFromGhcrCredSecret(body: unknown): string | undefined {
  if (!isGhcrCredResponse(body)) {
    return undefined;
  }
  const o = body as Record<string, unknown>;

  const stringData = o.stringData;
  if (
    stringData !== null &&
    typeof stringData === "object" &&
    GHCR_CRED_TOKEN_KEY in stringData
  ) {
    const raw = (stringData as Record<string, unknown>)[GHCR_CRED_TOKEN_KEY];
    if (typeof raw === "string" && raw !== "") {
      return raw;
    }
  }

  const data = o.data;
  if (data === null || typeof data !== "object") {
    return undefined;
  }
  const encoded = (data as Record<string, unknown>)[GHCR_CRED_TOKEN_KEY];
  if (typeof encoded !== "string" || encoded === "") {
    return undefined;
  }
  const decoded = decodeSecretDataEntry(encoded);
  return decoded === "" ? undefined : decoded;
}

export interface UseGithubAuthResult {
  canCheck: boolean;
  error: Error | undefined;
  githubToken: string | undefined;
  /**
   * Starts GitHub OAuth (same entry as sidebar GitHub OAuth link) when not yet authorized.
   * No-op while the GHCR secret fetch is in flight or when already authorized.
   */
  initiateGithubAuth: () => void;
  isAuthorized: boolean;
  isLoading: boolean;
}

export function useGithubAuth(): UseGithubAuthResult {
  const kubeconfig = useAtomValue(encodedKubeconfigAtom);
  const namespace = useAtomValue(namespaceAtom).trim();

  const authHeader = useMemo((): Record<string, string> => {
    const k = kubeconfig.trim();
    return { Authorization: `Bearer ${encodeURIComponent(k)}` };
  }, [kubeconfig]);

  const getParams: K8sGetQuery = useMemo(
    () =>
      k8sGetQuerySchema.parse({
        kind: "secrets",
        name: GHCR_CRED_SECRET_NAME,
        ...(namespace === "" ? {} : { namespace }),
      }),
    [namespace]
  );

  const canCheck = kubeconfig.trim() !== "" && namespace !== "";

  const swrKey = canCheck
    ? ([API_ROUTES.k8s.get, "github-ghcr-cred", getParams] as const)
    : null;

  const { data, error, isLoading } = useSWR(
    swrKey,
    () =>
      fetcher({
        base: ApiUrl(),
        path: API_ROUTES.k8s.get,
        query: getParams,
        header: authHeader,
        method: "GET",
      }),
    { shouldRetryOnError: false }
  );

  const isAuthorized = !!(data !== undefined && isGhcrCredResponse(data));

  const githubToken =
    data === undefined ? undefined : githubTokenFromGhcrCredSecret(data);

  let err: Error | undefined;
  if (error instanceof Error) {
    err = error;
  } else if (error != null) {
    err = new Error(String(error));
  }

  const initiateGithubAuth = useCallback(() => {
    if (isAuthorized) {
      return;
    }
    if (canCheck && isLoading) {
      return;
    }
    const next = `${window.location.pathname}${window.location.search}`;
    window.location.assign(
      `${GITHUB_OAUTH_CALLBACK_PATH}?next=${encodeURIComponent(next)}`
    );
  }, [canCheck, isAuthorized, isLoading]);

  return {
    canCheck,
    error: err,
    githubToken,
    initiateGithubAuth,
    isAuthorized,
    isLoading: canCheck ? isLoading : false,
  };
}
