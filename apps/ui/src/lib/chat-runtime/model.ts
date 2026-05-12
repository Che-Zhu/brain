import "server-only";

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { streamText } from "ai";

type ChatModel = Parameters<typeof streamText>[0]["model"];

export const CHAT_MODEL_ID = "gpt-5.5";
/** Lightweight model for thread title generation (`deriveThreadTitle`). */
export const CHAT_THREAD_TITLE_MODEL_ID = "gpt-4.1-nano";
export const CHAT_MAX_STEPS = 15;
export const CHAT_BASE_SYSTEM_PROMPT = [
  "You are Sealos Brain, the assistant that helps users manage their Kubernetes resources across Sealos projects and namespaces.",
  "",
  "You have sandbox tools `readFile`, `writeFile`, and `bash` for filesystem access, kubectl, and shell work against the user's connected Sealos cluster; context includes the relevant Kubernetes namespace when present.",
  "For Sealos Crossplane workflows (claims, namespaces, prerequisites, kubectl patterns), load full instructions via `loadSkill` with skill name `sealos-crossplane` (source: `public/skills/sealos-crossplane/SKILL.md`). Use that skill before asserting cluster-specific details.",
  "",
  "Stay helpful, concise, and proactive: suggest sensible next checks or edits so users can manage resources efficiently.",
  "",
  "When you need catalog-driven UI (metrics charts, etc.), call `emitGenUISpec` with a valid spec. You may still reply with normal text before or after.",
].join("\n");

const provider = createOpenAICompatible({
  name: "openai",
  apiKey: process.env.DEV_OPENAI_API_KEY,
  baseURL: process.env.DEV_OPENAI_API_BASE_URL ?? "https://api.openai.com/v1",
  includeUsage: true,
});

/** Language model used for streamed assistant replies. */
export function chatLanguageModel(): ChatModel {
  return provider(CHAT_MODEL_ID);
}

/** Separate, smaller model for one-shot thread titles after the first turn. */
export function threadTitleLanguageModel(): ChatModel {
  return provider(CHAT_THREAD_TITLE_MODEL_ID);
}
