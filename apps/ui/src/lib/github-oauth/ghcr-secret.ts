import "server-only";

import { applyGhcrSecret } from "@workspace/api/api.actions";
import {
  KUBECONFIG_DEFAULT_NAMESPACE,
  namespaceFromKubeconfigText,
} from "@/lib/chat-runtime/kubeconfig-namespace";

function safeDecodeKubeconfig(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
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
  input: { githubLogin: string; token: string }
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
    const namespace =
      namespaceFromKubeconfigText(kubeconfig) ?? KUBECONFIG_DEFAULT_NAMESPACE;
    await applyGhcrSecret(kubeconfig, {
      githubToken: input.token,
      namespace,
      owner: input.githubLogin,
    });
  } catch (error) {
    console.error("[github-oauth] applyGhcrSecret failed:", error);
  }
}
