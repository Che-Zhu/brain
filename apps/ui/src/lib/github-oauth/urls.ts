import { parseOAuthReturnPathParam } from "./oauth-return-path";

const TRAILING_SLASH_RE = /\/+$/;

/**
 * Canonical app origin (`NEXT_PUBLIC_APP_URL`, no trailing slash). Used so OAuth
 * `redirect_uri` matches the registered GitHub callback when not localhost.
 */
export function getPublicAppUrlFromEnv(): string | null {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) {
    return null;
  }
  return raw.replace(TRAILING_SLASH_RE, "");
}

function parseOriginUrl(origin: string): URL | null {
  try {
    return new URL(origin);
  } catch {
    return null;
  }
}

function isLoopbackHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

/**
 * Prefer runtime origin when env is loopback but the user opened a non-loopback host.
 */
export function resolvePublicAppOriginForOAuth(
  envOrigin: string | null,
  runtimeOrigin: string
): string {
  const normalizedRuntime = runtimeOrigin.replace(TRAILING_SLASH_RE, "");
  if (!envOrigin) {
    return normalizedRuntime;
  }
  const normalizedEnv = envOrigin.replace(TRAILING_SLASH_RE, "");
  const envParsed = parseOriginUrl(normalizedEnv);
  const runtimeParsed = parseOriginUrl(normalizedRuntime);
  if (!(envParsed && runtimeParsed)) {
    return normalizedEnv;
  }
  if (
    isLoopbackHostname(envParsed.hostname) &&
    !isLoopbackHostname(runtimeParsed.hostname)
  ) {
    return `${runtimeParsed.protocol}//${runtimeParsed.host}`;
  }
  return normalizedEnv;
}

function originFromRequest(request: Request): string {
  const proto = request.headers.get("x-forwarded-proto");
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    "localhost:3000";
  if (proto) {
    return `${proto}://${host}`;
  }
  return `http://${host}`;
}

export function getGitHubOAuthBaseUrl(request: Request): string {
  return resolvePublicAppOriginForOAuth(
    getPublicAppUrlFromEnv(),
    originFromRequest(request)
  );
}

/** Post-OAuth redirect: `GITHUB_OAUTH_NEXT_PATH` (default `/`) + optional `GITHUB_OAUTH_NEXT_SEARCH`. */
export function buildPostGitHubOAuthRedirectUrl(baseUrl: string): string {
  const root = baseUrl.replace(TRAILING_SLASH_RE, "");
  const pathRaw = (process.env.GITHUB_OAUTH_NEXT_PATH ?? "/").trim() || "/";
  const pathSeg = pathRaw.startsWith("/") ? pathRaw : `/${pathRaw}`;
  const searchRaw = process.env.GITHUB_OAUTH_NEXT_SEARCH?.trim();

  let search = "";
  if (searchRaw != null && searchRaw !== "") {
    search = searchRaw.startsWith("?") ? searchRaw : `?${searchRaw}`;
  }

  return `${root}${pathSeg}${search}`;
}

/** After successful token exchange: prefer stored relative path from cookie, else env defaults. */
export function buildGitHubOAuthSuccessRedirectUrl(
  baseUrl: string,
  storedReturnRaw: string | undefined
): string {
  const root = baseUrl.replace(TRAILING_SLASH_RE, "");
  const returnPath = storedReturnRaw
    ? parseOAuthReturnPathParam(storedReturnRaw)
    : null;
  if (returnPath != null) {
    return `${root}${returnPath}`;
  }
  return buildPostGitHubOAuthRedirectUrl(baseUrl);
}
