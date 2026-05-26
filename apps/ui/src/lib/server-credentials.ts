import "server-only";

import { API_ROUTES } from "@workspace/api/constants";
import { cookies } from "next/headers";
import { unauthorized } from "next/navigation";
import { namespaceFromKubeconfigText } from "@/lib/chat-runtime/kubeconfig-namespace-core";

/** Region JWT cookie (desktop / cluster auth). */
export const SEALOS_AUTH_TOKEN_COOKIE = "sealos_auth_token" as const;

interface RegionTokenResponse {
  body?: { encodedKubeconfig?: unknown; namespace?: unknown };
  encodedKubeconfig?: unknown;
  namespace?: unknown;
}

function pickString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string") {
      return value;
    }
  }
  return "";
}

export interface ServerCredentials {
  serverEncodedKubeconfig: string;
  serverNamespace: string;
}

function envTrimDecoded(raw: string | undefined): string {
  try {
    return decodeURIComponent(raw ?? "").trim();
  } catch {
    return (raw ?? "").trim();
  }
}

/**
 * Matches client {@link AuthBootstrap}: local dev can skip SealOS cookies when
 * `NEXT_PUBLIC_DEV_ENCODED_KUBECONFIG` is set.
 */
export function hasDevCredentialBypass(): boolean {
  return envTrimDecoded(process.env.NEXT_PUBLIC_DEV_ENCODED_KUBECONFIG) !== "";
}

/** Local dev overrides (`AuthBootstrap`); not used in production auth. */
export function devCredentialsFromEnv(): {
  encodedKubeconfig: string;
  namespace: string;
} {
  const encodedKubeconfig = envTrimDecoded(
    process.env.NEXT_PUBLIC_DEV_ENCODED_KUBECONFIG
  );
  return {
    encodedKubeconfig,
    namespace: namespaceFromKubeconfigText(encodedKubeconfig) ?? "",
  };
}

/**
 * Loads cluster credentials or invokes Next.js {@link unauthorized} when there is
 * no kubeconfig from the region token API and no dev env bypass.
 */
export async function fetchProjectCredentialsOrUnauthorized(): Promise<ServerCredentials> {
  const creds = await fetchServerCredentials();
  if (creds.serverEncodedKubeconfig.trim() !== "" || hasDevCredentialBypass()) {
    return creds;
  }
  unauthorized();
}

/**
 * Resolve encoded kubeconfig + namespace from {@link SEALOS_AUTH_TOKEN_COOKIE}
 * via POST `API_ROUTES.auth.regionToken` against `API_URL`.
 */
export async function fetchServerCredentials(): Promise<ServerCredentials> {
  const empty = (): ServerCredentials => ({
    serverEncodedKubeconfig: "",
    serverNamespace: "",
  });

  const apiUrlRaw = process.env.API_URL?.trim();
  if (!apiUrlRaw) {
    return empty();
  }

  const cookieStore = await cookies();
  const regionToken =
    cookieStore.get(SEALOS_AUTH_TOKEN_COOKIE)?.value?.trim() ?? "";
  if (regionToken === "") {
    return empty();
  }

  const url = new URL(API_ROUTES.auth.regionToken, apiUrlRaw);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regionToken }),
      cache: "no-store",
    });
  } catch {
    return empty();
  }

  if (!response.ok) {
    return empty();
  }

  let raw: RegionTokenResponse;
  try {
    raw = (await response.json()) as RegionTokenResponse;
  } catch {
    return empty();
  }

  return {
    serverEncodedKubeconfig: pickString(
      raw.encodedKubeconfig,
      raw.body?.encodedKubeconfig
    ),
    serverNamespace: pickString(raw.namespace, raw.body?.namespace),
  };
}
