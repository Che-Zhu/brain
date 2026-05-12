"use server";

import { after } from "next/server";

import { decodeKubeconfig } from "@/lib/chat-runtime/kubeconfig";
import { bootstrapChatSandboxIfNeeded } from "@/lib/tool/chat-bash-tool";

/**
 * Schedules sandbox create + kubectl bootstrap after the action returns, so the
 * client is not blocked on MicroVM startup. If a tagged sandbox for this
 * kubeconfig already exists, the background task no-ops.
 */
export async function scheduleChatSandboxWarmup(
  encodedKubeconfig: string
): Promise<{ ok: true } | { ok: false }> {
  const kubeconfig = decodeKubeconfig(encodedKubeconfig);
  if (kubeconfig == null || kubeconfig.trim() === "") {
    return { ok: false };
  }

  after(() => {
    bootstrapChatSandboxIfNeeded(kubeconfig).catch((err: unknown) => {
      console.error("[scheduleChatSandboxWarmup] background:", err);
    });
  });

  await Promise.resolve();
  return { ok: true };
}
