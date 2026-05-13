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

const LOG_PREFIX = "[fetchServerCredentials]" as const;

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
    console.info(`${LOG_PREFIX} skip: API_URL unset`);
    return empty();
  }

  const cookieStore = await cookies();
  const regionToken =
    cookieStore.get(SEALOS_AUTH_TOKEN_COOKIE)?.value?.trim() ?? "";
  if (regionToken === "") {
    console.info(
      `${LOG_PREFIX} skip: cookie ${SEALOS_AUTH_TOKEN_COOKIE} missing or empty`
    );
    return empty();
  }

  const tokenChars = regionToken.length;
  const url = new URL(API_ROUTES.auth.regionToken, apiUrlRaw);
  console.info(
    `${LOG_PREFIX} POST ${url.pathname} → origin=${url.origin} (regionToken chars=${tokenChars})`
  );

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regionToken }),
      cache: "no-store",
    });
  } catch (err: unknown) {
    console.warn(
      `${LOG_PREFIX} fetch failed:`,
      err instanceof Error ? err.message : err
    );
    return empty();
  }

  if (!response.ok) {
    let bodySnippet = "";
    try {
      bodySnippet = (await response.text()).slice(0, 500);
    } catch {
      /* ignore */
    }
    console.warn(
      `${LOG_PREFIX} HTTP ${String(response.status)} ${response.statusText}${bodySnippet ? ` body=${bodySnippet}` : ""}`
    );
    return empty();
  }

  let raw: RegionTokenResponse;
  try {
    raw = (await response.json()) as RegionTokenResponse;
  } catch (err: unknown) {
    console.warn(
      `${LOG_PREFIX} JSON parse failed:`,
      err instanceof Error ? err.message : err
    );
    return empty();
  }

  const serverEncodedKubeconfig = pickString(
    raw.encodedKubeconfig,
    raw.body?.encodedKubeconfig
  );
  const serverNamespace = pickString(raw.namespace, raw.body?.namespace);

  console.info(
    `${LOG_PREFIX} ok: encodedKubeconfig chars=${String(serverEncodedKubeconfig.length)} namespace=${JSON.stringify(serverNamespace)}`
  );

  return {
    serverEncodedKubeconfig,
    serverNamespace,
  };
}
