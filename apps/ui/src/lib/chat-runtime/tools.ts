import "server-only";

import {
  buildEmitGenUISpecDescription,
  executeEmitGenUISpec,
  genUISpecInputSchema,
} from "@workspace/ui/lib/gen-ui-tool";
import { type ToolSet, tool } from "ai";
import type { AssistantContextPayload } from "@/lib/chat-persistence/types";
import { createChatBashTool } from "@/lib/tool/chat-bash-tool";
import { navigateAppTool } from "@/lib/tool/chat-navigate-app-tool";
import {
  buildChatSkillsDiscoveryPrompt,
  createLoadSkillTool,
  discoverPublicSkills,
} from "@/lib/tool/chat-skill-tool";

import { CHAT_BASE_SYSTEM_PROMPT } from "./model";
import { buildAssistantWorkspaceContextPrompt } from "./workspace-context-prompt";

const emitGenUISpec = tool({
  description: buildEmitGenUISpecDescription(),
  inputSchema: genUISpecInputSchema,
  execute: executeEmitGenUISpec,
});

export interface ChatToolset {
  systemPrompt: string;
  tools: ToolSet;
}

/**
 * Assemble the per-request tool registry + system prompt.
 *
 * - Skill index drives both the `loadSkill` tool and the discovery prompt addendum.
 * - Bash tool sandbox is created lazily; it does not start a Vercel Sandbox until the
 *   model actually invokes a bash subtool.
 */
export async function buildChatToolset({
  kubeconfig,
  kubernetesNamespace,
  assistantContext,
}: {
  kubeconfig: string;
  kubernetesNamespace: string;
  assistantContext?: AssistantContextPayload;
}): Promise<ChatToolset> {
  const [skillIndex, { tools: bashTools }] = await Promise.all([
    discoverPublicSkills(),
    createChatBashTool({ kubeconfig }),
  ]);

  const tools = {
    emitGenUISpec,
    navigateApp: navigateAppTool,
    loadSkill: createLoadSkillTool(skillIndex),
    ...bashTools,
  } as unknown as ToolSet;

  const workspaceBlock = buildAssistantWorkspaceContextPrompt({
    kubernetesNamespace,
    assistantContext,
  }).trimEnd();

  const systemPromptParts = [
    CHAT_BASE_SYSTEM_PROMPT,
    ...(workspaceBlock.length > 0 ? [workspaceBlock] : []),
    buildChatSkillsDiscoveryPrompt(skillIndex),
  ];

  const systemPrompt = systemPromptParts.join("\n\n");

  return { tools, systemPrompt };
}
