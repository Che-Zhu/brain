import "server-only";

import { decodeKubeconfig } from "@/lib/chat-runtime/kubeconfig";
import { resolveAuthoritativeChatNamespace } from "@/lib/chat-runtime/resolve-chat-namespace";

export interface DeployTaskRequestNamespace {
  message?: string;
  namespace?: string;
  ok: boolean;
  status?: number;
}

export async function resolveDeployTaskRequestNamespace(input: {
  clientNamespace?: string;
  encodedKubeconfig?: string;
}): Promise<DeployTaskRequestNamespace> {
  const kubeconfig = decodeKubeconfig(input.encodedKubeconfig);
  if (kubeconfig == null) {
    return {
      message: "Missing or invalid kubeconfig",
      ok: false,
      status: 400,
    };
  }

  const namespaceResolved = await resolveAuthoritativeChatNamespace({
    clientNamespace: input.clientNamespace ?? "",
    encodedKubeconfig: input.encodedKubeconfig,
  });
  if (!namespaceResolved.ok) {
    return {
      message: namespaceResolved.message,
      ok: false,
      status: namespaceResolved.status,
    };
  }

  return {
    namespace: namespaceResolved.namespace,
    ok: true,
  };
}

export function deployTaskRequestParams(request: Request): {
  encodedKubeconfig?: string;
  namespace?: string;
} {
  const url = new URL(request.url);
  return {
    encodedKubeconfig: url.searchParams.get("encodedKubeconfig") ?? undefined,
    namespace: url.searchParams.get("namespace") ?? undefined,
  };
}
