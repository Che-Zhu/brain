import "server-only";

import type { ChatOpenAiConnection } from "@/lib/chat-runtime/model";

import { fetchOrCreateAiProxyToken } from "./create-token";
import { aiProxyOpenAiBaseUrl } from "./endpoints";
import { clusterHostnameFromKubeconfigText } from "./kubeconfig-hostname";

/** Default POST /tokens `{ name }` when not using DEV_OPENAI_* env. Idempotent server-side when name exists in group. */
const DEFAULT_AI_PROXY_TOKEN_NAME = "sealos-brain";

export type ResolveChatOpenAiOutcome =
  | { ok: true; connection: ChatOpenAiConnection }
  | { ok: false; status: number; message: string };

function trimmedEnv(value: string | undefined): string | undefined {
  const t = value?.trim();
  return t && t.length > 0 ? t : undefined;
}

/**
 * Resolves `{ apiKey, baseURL }` for OpenAI-compatible chat:
 * - If `DEV_OPENAI_API_KEY` and `DEV_OPENAI_API_BASE_URL` are both non-empty → use those.
 * - Else create or fetch token from AI proxy (`POST /api/v2alpha/tokens`), using `encodedKubeconfig` as `Authorization`,
 *   and derive `baseURL` as `https://aiproxy.<cluster-host>/v1` from kubeconfig YAML.
 */
export async function resolveChatOpenAiConnection(options: {
  encodedKubeconfig: string | undefined;
  kubeconfigText: string;
}): Promise<ResolveChatOpenAiOutcome> {
  const devApiKey = trimmedEnv(process.env.DEV_OPENAI_API_KEY);
  const devBaseUrl = trimmedEnv(process.env.DEV_OPENAI_API_BASE_URL);
  if (devApiKey && devBaseUrl) {
    return {
      ok: true,
      connection: { apiKey: devApiKey, baseURL: devBaseUrl },
    };
  }

  const authorization = options.encodedKubeconfig?.trim();
  if (!authorization) {
    return {
      ok: false,
      status: 400,
      message:
        "Missing kubeconfig credential for AI proxy (set DEV_OPENAI_API_KEY and DEV_OPENAI_API_BASE_URL for local dev).",
    };
  }

  const hostname = clusterHostnameFromKubeconfigText(options.kubeconfigText);
  if (!hostname) {
    return {
      ok: false,
      status: 400,
      message:
        "Could not read Kubernetes API server hostname from kubeconfig for AI proxy.",
    };
  }

  const rawName =
    trimmedEnv(process.env.AI_PROXY_TOKEN_NAME) ?? DEFAULT_AI_PROXY_TOKEN_NAME;
  const tokenName = rawName.length > 100 ? rawName.slice(0, 100) : rawName;

  const tokenResult = await fetchOrCreateAiProxyToken({
    clusterHostname: hostname,
    authorizationEncodedKubeconfig: authorization,
    name: tokenName,
  });

  if (!tokenResult.ok) {
    const detail =
      tokenResult.bodyText.length > 0 && tokenResult.bodyText.length < 400
        ? tokenResult.bodyText
        : "AI proxy rejected the token request.";
    const fallbackStatus =
      tokenResult.status >= 400 && tokenResult.status < 600
        ? tokenResult.status
        : 502;
    return {
      ok: false,
      status: fallbackStatus,
      message: detail,
    };
  }

  return {
    ok: true,
    connection: {
      apiKey: tokenResult.token.key,
      baseURL: aiProxyOpenAiBaseUrl(hostname),
    },
  };
}
