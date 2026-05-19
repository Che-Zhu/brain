import "server-only";

import { API_ROUTES } from "@workspace/api/constants";
import { cookies } from "next/headers";
import { unauthorized } from "next/navigation";
import { authInfo, authWarn, secretMeta } from "@/lib/auth-log";

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
 * `NEXT_PUBLIC_DEV_ENCODED_KUBECONFIG` or `NEXT_PUBLIC_DEV_NS` is set.
 */
export function hasDevCredentialBypass(): boolean {
  return (
    envTrimDecoded(process.env.NEXT_PUBLIC_DEV_ENCODED_KUBECONFIG) !== "" ||
    (process.env.NEXT_PUBLIC_DEV_NS ?? "").trim() !== ""
  );
}

/**
 * Loads cluster credentials or invokes Next.js {@link unauthorized} when there is
 * no kubeconfig from the region token API and no dev env bypass.
 */
export async function fetchProjectCredentialsOrUnauthorized(): Promise<ServerCredentials> {
  authInfo("project credentials: checking access");

  const devBypass = hasDevCredentialBypass();
  if (devBypass) {
    authInfo("project credentials: dev bypass active", {
      devKubeconfig: secretMeta(
        process.env.NEXT_PUBLIC_DEV_ENCODED_KUBECONFIG ?? ""
      ),
      devNamespace: secretMeta(process.env.NEXT_PUBLIC_DEV_NS ?? ""),
    });
  }

  const creds = await fetchServerCredentials();
  const hasKubeconfig = creds.serverEncodedKubeconfig.trim() !== "";

  if (hasKubeconfig) {
    authInfo("project credentials: authorized via region token exchange", {
      namespace: creds.serverNamespace || "(empty)",
      encodedKubeconfig: secretMeta(creds.serverEncodedKubeconfig),
    });
    return creds;
  }

  if (devBypass) {
    authInfo("project credentials: authorized via dev bypass (no server kubeconfig)");
    return creds;
  }

  authWarn("project credentials: unauthorized — no kubeconfig and no dev bypass");
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
    authWarn("region token exchange: skipped — API_URL is not configured");
    return empty();
  }

  const cookieStore = await cookies();
  const regionToken =
    cookieStore.get(SEALOS_AUTH_TOKEN_COOKIE)?.value?.trim() ?? "";
  if (regionToken === "") {
    authWarn("region token exchange: skipped — sealos_auth_token cookie missing");
    return empty();
  }

  const url = new URL(API_ROUTES.auth.regionToken, apiUrlRaw);
  authInfo("region token exchange: requesting credentials", {
    apiUrl: apiUrlRaw,
    route: API_ROUTES.auth.regionToken,
    regionToken: secretMeta(regionToken),
  });

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regionToken }),
      cache: "no-store",
    });
  } catch (error) {
    authWarn("region token exchange: fetch failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return empty();
  }

  if (!response.ok) {
    let bodySnippet = "";
    try {
      bodySnippet = (await response.text()).slice(0, 200);
    } catch {
      bodySnippet = "(unreadable)";
    }
    authWarn("region token exchange: API returned error", {
      status: response.status,
      body: bodySnippet,
    });
    return empty();
  }

  let raw: RegionTokenResponse;
  try {
    raw = (await response.json()) as RegionTokenResponse;
  } catch (error) {
    authWarn("region token exchange: invalid JSON response", {
      error: error instanceof Error ? error.message : String(error),
    });
    return empty();
  }

  const encodedKubeconfig = pickString(
    raw.encodedKubeconfig,
    raw.body?.encodedKubeconfig
  );
  const namespace = pickString(raw.namespace, raw.body?.namespace);

  if (encodedKubeconfig.trim() === "") {
    authWarn("region token exchange: API ok but encodedKubeconfig empty", {
      namespace: namespace || "(empty)",
    });
    return empty();
  }

  authInfo("region token exchange: success", {
    namespace: namespace || "(empty)",
    encodedKubeconfig: secretMeta(encodedKubeconfig),
  });

  return {
    serverEncodedKubeconfig: encodedKubeconfig,
    serverNamespace: namespace,
  };
}
