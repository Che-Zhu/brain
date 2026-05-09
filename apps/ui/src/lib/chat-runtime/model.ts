import "server-only";

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { streamText } from "ai";

type ChatModel = Parameters<typeof streamText>[0]["model"];

export const CHAT_MODEL_ID = "gpt-4o-mini";
export const CHAT_MAX_STEPS = 15;
export const CHAT_BASE_SYSTEM_PROMPT =
  "You are a helpful assistant for the product UI. When you need to show catalog-driven UI (metrics chart, etc.), call `emitGenUISpec` with a valid spec. You may still reply with normal text before or after.";

const provider = createOpenAICompatible({
  name: "openai",
  apiKey: process.env.DEV_OPENAI_API_KEY,
  baseURL: process.env.DEV_OPENAI_API_BASE_URL ?? "https://api.openai.com/v1",
  includeUsage: true,
});

/** Single source of truth for the chat language model used across the streaming + auto-title flow. */
export function chatLanguageModel(): ChatModel {
  return provider(CHAT_MODEL_ID);
}
