import "server-only";

import { API_ROUTES } from "@workspace/api/constants";
import { cookies } from "next/headers";

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

/**
 * Resolve encoded kubeconfig + namespace from {@link SEALOS_AUTH_TOKEN_COOKIE}
 * via POST `API_ROUTES.auth.regionToken` against `API_URL`.
 */
export async function fetchServerCredentials(): Promise<ServerCredentials> {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    return { serverEncodedKubeconfig: "", serverNamespace: "" };
  }

  const cookieStore = await cookies();
  const regionToken =
    cookieStore.get(SEALOS_AUTH_TOKEN_COOKIE)?.value?.trim() ?? "";
  if (regionToken === "") {
    return { serverEncodedKubeconfig: "", serverNamespace: "" };
  }

  let response: Response;
  try {
    response = await fetch(new URL(API_ROUTES.auth.regionToken, apiUrl), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regionToken }),
      cache: "no-store",
    });
  } catch {
    return { serverEncodedKubeconfig: "", serverNamespace: "" };
  }
  if (!response.ok) {
    return { serverEncodedKubeconfig: "", serverNamespace: "" };
  }

  let raw: RegionTokenResponse;
  try {
    raw = (await response.json()) as RegionTokenResponse;
  } catch {
    return { serverEncodedKubeconfig: "", serverNamespace: "" };
  }
  return {
    serverEncodedKubeconfig: pickString(
      raw.encodedKubeconfig,
      raw.body?.encodedKubeconfig
    ),
    serverNamespace: pickString(raw.namespace, raw.body?.namespace),
  };
}
