import "server-only";

import {
  buildEmitGenUISpecDescription,
  executeEmitGenUISpec,
  genUISpecInputSchema,
} from "@workspace/ui/lib/gen-ui-tool";
import { type ToolSet, tool } from "ai";

import { createChatBashTool } from "@/lib/tool/chat-bash-tool";
import { navigateAppTool } from "@/lib/tool/chat-navigate-app-tool";
import {
  buildChatSkillsDiscoveryPrompt,
  createLoadSkillTool,
  discoverPublicSkills,
} from "@/lib/tool/chat-skill-tool";

import { CHAT_BASE_SYSTEM_PROMPT } from "./model";

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
}: {
  kubeconfig: string;
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

  const systemPrompt = `${CHAT_BASE_SYSTEM_PROMPT}\n\n${buildChatSkillsDiscoveryPrompt(skillIndex)}`;

  return { tools, systemPrompt };
}
