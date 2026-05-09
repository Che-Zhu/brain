import "server-only";

import { applyGhcrSecret } from "@workspace/api/api.actions";

const GITHUB_USER_API = "https://api.github.com/user";
const NAMESPACE_RE = /^\s+namespace:\s*(\S+)/gm;

/** Resolve active namespace from raw kubeconfig text (Sealos/kubeconfig YAML). */
function namespaceFromKubeconfig(kubeconfig: string): string {
  const matches = [...kubeconfig.matchAll(NAMESPACE_RE)];
  return matches.at(-1)?.[1] ?? "default";
}

function safeDecodeKubeconfig(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}

async function fetchGithubLogin(accessToken: string): Promise<string> {
  const res = await fetch(GITHUB_USER_API, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = (await res.json()) as { login?: string };
  return body.login ?? "unknown";
}

/**
 * Provision (or refresh) the GHCR pull-secret in the user's namespace using the
 * GitHub access token issued in this OAuth round-trip. Best-effort: always
 * resolves so the caller can complete the OAuth redirect even on failure.
 *
 * `serverEncodedKubeconfig` follows the same encoded contract as
 * `fetchServerCredentials` / `AuthBootstrap`.
 */
export async function applyGhcrSecretIfAuthenticated(
  serverEncodedKubeconfig: string | undefined,
  accessToken: string
): Promise<void> {
  const trimmed = serverEncodedKubeconfig?.trim();
  if (!trimmed) {
    return;
  }
  try {
    const kubeconfig = safeDecodeKubeconfig(trimmed);
    if (kubeconfig === "") {
      return;
    }
    const owner = await fetchGithubLogin(accessToken);
    await applyGhcrSecret(kubeconfig, {
      githubToken: accessToken,
      namespace: namespaceFromKubeconfig(kubeconfig),
      owner,
    });
  } catch (error) {
    console.error("[github-oauth] applyGhcrSecret failed:", error);
  }
}
